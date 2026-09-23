import sys
import os
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove
from scipy.ndimage import binary_erosion, gaussian_filter, maximum_filter


# ─────────────────────────────────────────────
#  WHITE-KEY MODE  (Color-to-Alpha)
# ─────────────────────────────────────────────

def clean_white_background(img, threshold=215.0, edge_blur=1.2):
    """
    Remove a white/near-white background using Color-to-Alpha keying.
    Includes adaptive illumination correction to clean up scanned/shadowed paper backgrounds.
    """
    # ── Step 1: Illumination Correction (Flatten shadows/gradients) ──
    # Convert image to grayscale to estimate background illumination
    img_gray = img.convert("L")
    data_gray = np.array(img_gray, dtype=np.float32)
    
    # Estimate background using a maximum filter (removes dark line drawings)
    max_dim = max(img.width, img.height)
    kernel_size = int(max_dim * 0.05)
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel_size = max(21, kernel_size)
    
    bg_est = maximum_filter(data_gray, size=kernel_size)
    bg_est = gaussian_filter(bg_est, sigma=kernel_size / 2.0)
    bg_safe = np.maximum(bg_est, 1.0)
    
    # Divide original image by background estimate to normalize illumination to white
    img_rgba = img.convert("RGBA")
    data_rgba = np.array(img_rgba, dtype=np.float32)
    r, g, b = data_rgba[:, :, 0], data_rgba[:, :, 1], data_rgba[:, :, 2]
    
    # Correct RGB channels
    r_corr = np.clip((r / bg_safe) * 255.0, 0.0, 255.0)
    g_corr = np.clip((g / bg_safe) * 255.0, 0.0, 255.0)
    b_corr = np.clip((b / bg_safe) * 255.0, 0.0, 255.0)
    
    # ── Step 2: Two-Threshold Min-RGB Keying ──
    # Use MIN channel so saturated colors are protected
    min_rgb = np.minimum(np.minimum(r_corr, g_corr), b_corr)

    low_threshold = threshold
    high_threshold = min(255.0, low_threshold + 10.0)

    # Alpha ramp: below low_threshold -> opaque, above high_threshold -> transparent,
    # in-between -> smooth transition
    alpha = np.where(
        min_rgb < low_threshold,
        255.0,
        np.where(
            min_rgb >= high_threshold,
            0.0,
            255.0 * (high_threshold - min_rgb) / (high_threshold - low_threshold + 1e-5)
        )
    )
    alpha = np.clip(alpha, 0.0, 255.0)

    # Smooth the alpha mask
    if edge_blur > 0:
        alpha = gaussian_filter(alpha, sigma=edge_blur)
        alpha = np.clip(alpha, 0.0, 255.0)

    alpha_norm      = alpha / 255.0
    alpha_norm_safe = np.maximum(alpha_norm, 1e-5)

    # Un-multiply using the corrected channels
    new_r = np.clip((r_corr - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_g = np.clip((g_corr - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_b = np.clip((b_corr - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)

    new_data = np.stack([new_r, new_g, new_b, alpha], axis=-1).astype(np.uint8)
    return Image.fromarray(new_data, "RGBA")


# ─────────────────────────────────────────────
#  AI (REMBG) MODE  — post-process pass
# ─────────────────────────────────────────────

def postprocess_rembg(img, erode_px=1, feather_px=2):
    """
    Clean up the alpha mask that rembg produces.

    rembg sometimes leaves a 1-2 px "fringe" of semi-transparent pixels
    that still carry background colour.  Two-step fix:

    1. Erode the alpha mask slightly to pull the edge inward (kills fringe).
    2. Gaussian-blur the eroded mask to re-soften the edge naturally.

    Args:
        img       : PIL Image in RGBA mode (output of rembg.remove)
        erode_px  : How many pixels to shrink the mask.  1-2 is safe.
        feather_px: Gaussian sigma for the final softening pass.
    """
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.float32)
    alpha = data[:, :, 3]

    # Build a hard binary mask, erode it, then soften back
    hard_mask = alpha > 10                              # anything slightly opaque
    if erode_px > 0:
        struct = np.ones((erode_px * 2 + 1, erode_px * 2 + 1), dtype=bool)
        hard_mask = binary_erosion(hard_mask, structure=struct)

    # Convert back to float alpha then feather
    alpha_clean = hard_mask.astype(np.float32) * 255.0
    if feather_px > 0:
        alpha_clean = gaussian_filter(alpha_clean, sigma=feather_px)
        alpha_clean = np.clip(alpha_clean, 0, 255)

    # Preserve original fine-grained alpha where the hard mask is ON
    # (so semi-transparent areas like hair tips stay smooth)
    alpha_final = np.where(hard_mask, np.minimum(alpha, alpha_clean + alpha * 0.3), alpha_clean)
    alpha_final = np.clip(alpha_final, 0, 255)

    data[:, :, 3] = alpha_final
    return Image.fromarray(data.astype(np.uint8), "RGBA")


# ─────────────────────────────────────────────
#  COMPOSITE & CANVAS HELPERS
# ─────────────────────────────────────────────

def get_canvas_size(aspect_ratio="16:9"):
    if aspect_ratio == "9:16":
        return 1080, 1920, int(1920 * 0.55), 350
    return 1920, 1080, int(1080 * 0.70), 150


def prepare_background(bg_path, out_path, aspect_ratio="16:9"):
    """
    Standardize a background image by scaling to fill the target aspect ratio canvas
    and center-cropping. Saves the fixed background once.
    """
    canvas_w, canvas_h, _, _ = get_canvas_size(aspect_ratio)
    bg_img = Image.open(bg_path).convert("RGB")

    bg_w, bg_h = bg_img.size
    scale = max(canvas_w / bg_w, canvas_h / bg_h)
    new_w, new_h = int(round(bg_w * scale)), int(round(bg_h * scale))
    bg_resized = bg_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    left = (new_w - canvas_w) // 2
    top = (new_h - canvas_h) // 2
    bg_cropped = bg_resized.crop((left, top, left + canvas_w, top + canvas_h))

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    bg_cropped.save(out_path, format="PNG")
    print(f"[prepare_background] Saved fixed background ({canvas_w}x{canvas_h}) -> {out_path}")
    return out_path


def create_transparent_scene(fg_nobg, aspect_ratio="16:9"):
    """
    Scale fg proportionally, center horizontally, and paste onto a transparent RGBA canvas
    matching the video dimensions and subtitle safe zone.
    """
    canvas_w, canvas_h, target_h, safe_zone_bottom = get_canvas_size(aspect_ratio)

    fg_w, fg_h = fg_nobg.size
    scale = target_h / fg_h

    fg_resized = fg_nobg.resize(
        (int(round(fg_w * scale)), target_h),
        Image.Resampling.LANCZOS
    )

    if fg_resized.width > canvas_w * 0.85:
        scale_w = (canvas_w * 0.85) / fg_resized.width
        fg_resized = fg_resized.resize(
            (
                int(round(fg_resized.width * scale_w)),
                int(round(fg_resized.height * scale_w))
            ),
            Image.Resampling.LANCZOS
        )

    paste_x = (canvas_w - fg_resized.width) // 2
    paste_y = canvas_h - fg_resized.height - safe_zone_bottom

    transparent_canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    transparent_canvas.paste(fg_resized, (paste_x, paste_y), fg_resized)
    return transparent_canvas


def composite(fg_nobg, bg_path, aspect_ratio="16:9"):
    """Resize bg to canvas size, scale fg proportionally, centre and paste."""
    canvas_w, canvas_h, target_h, safe_zone_bottom = get_canvas_size(aspect_ratio)

    bg_img = Image.open(bg_path).convert("RGBA").resize(
        (canvas_w, canvas_h),
        Image.Resampling.LANCZOS
    )

    fg_w, fg_h = fg_nobg.size
    scale = target_h / fg_h

    fg_resized = fg_nobg.resize(
        (int(round(fg_w * scale)), target_h),
        Image.Resampling.LANCZOS
    )

    if fg_resized.width > canvas_w * 0.85:
        scale_w = (canvas_w * 0.85) / fg_resized.width
        fg_resized = fg_resized.resize(
            (
                int(round(fg_resized.width * scale_w)),
                int(round(fg_resized.height * scale_w))
            ),
            Image.Resampling.LANCZOS
        )

    paste_x = (canvas_w - fg_resized.width) // 2
    paste_y = (
        canvas_h
        - fg_resized.height
        - safe_zone_bottom
    )

    bg_img.paste(fg_resized, (paste_x, paste_y), fg_resized)
    return bg_img



# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python remove_bg.py <input_fg> <output> <mode> [<input_bg>] [<aspect_ratio>] [<threshold>]")
        print("  python remove_bg.py --prepare-bg <input_bg> <output_bg> [<aspect_ratio>]")
        sys.exit(1)

    # ── Subcommand: prepare background only ──
    if sys.argv[1] == "--prepare-bg":
        if len(sys.argv) < 4:
            print("Usage: python remove_bg.py --prepare-bg <input_bg> <output_bg> [<aspect_ratio>]")
            sys.exit(1)
        bg_in = sys.argv[2]
        bg_out = sys.argv[3]
        aspect_ratio = "9:16" if "9:16" in sys.argv else "16:9"
        prepare_background(bg_in, bg_out, aspect_ratio)
        sys.exit(0)

    if len(sys.argv) < 4:
        print("Usage: python remove_bg.py <input_fg> <output> <mode> [<input_bg>] [<aspect_ratio>] [<threshold>]")
        print("  mode: whitekey | ai")
        sys.exit(1)

    fg_path   = sys.argv[1]
    out_path  = sys.argv[2]
    mode      = sys.argv[3]
    bg_path   = None
    threshold = 215.0
    aspect_ratio = "9:16" if "9:16" in sys.argv else "16:9"

    # Parse optional arguments
    for arg in sys.argv[4:]:
        if arg in ("16:9", "9:16"):
            aspect_ratio = arg
        elif arg.lower() in ("--nobg", "nobg", "none"):
            bg_path = None
        elif os.path.exists(arg) and not bg_path:
            bg_path = arg
        else:
            try:
                threshold = float(arg)
            except ValueError:
                pass

    # Load foreground
    try:
        fg_img = Image.open(fg_path)
    except Exception as e:
        print(f"Error opening foreground image: {e}")
        sys.exit(1)

    # Remove background
    try:
        if mode == "whitekey":
            print(f"[whitekey] Color-to-Alpha removal (threshold={threshold}) ...")
            fg_nobg = clean_white_background(fg_img, threshold=threshold, edge_blur=1.2)
        else:
            print("[ai] Removing background with rembg ...")
            fg_nobg = remove(fg_img)
            print("[ai] Post-processing alpha mask ...")
            fg_nobg = postprocess_rembg(fg_nobg, erode_px=1, feather_px=2)
    except Exception as e:
        print(f"Error during background removal: {e}")
        sys.exit(1)

    # Save result
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    try:
        if bg_path and os.path.exists(bg_path):
            print(f"Compositing onto background: {bg_path} (aspect ratio: {aspect_ratio})")
            result = composite(fg_nobg, bg_path, aspect_ratio)
            result.save(out_path, format="PNG")
        else:
            # Place foreground on transparent video canvas and save as PNG
            print(f"Placing on transparent canvas (aspect ratio: {aspect_ratio}) ...")
            transparent_scene = create_transparent_scene(fg_nobg, aspect_ratio)
            transparent_scene.save(out_path, format="PNG")
        print(f"Saved -> {out_path}")
    except Exception as e:
        print(f"Error saving output: {e}")
        # Fallback: try saving transparent fg directly
        try:
            fg_nobg.save(out_path, format="PNG")
            print(f"Fallback save -> {out_path}")
        except Exception as e2:
            print(f"Fallback save also failed: {e2}")
            sys.exit(1)


if __name__ == "__main__":
    main()
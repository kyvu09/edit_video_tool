import sys
import os
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove
from scipy.ndimage import binary_erosion, gaussian_filter


# ─────────────────────────────────────────────
#  WHITE-KEY MODE  (Color-to-Alpha)
# ─────────────────────────────────────────────

def clean_white_background(img, threshold=215.0, edge_blur=1.2):
    """
    Remove a white/near-white background using Color-to-Alpha keying.

    Improvements over original:
    - Alpha is computed from the MAX channel (not min), which is more
      correct for "how white is this pixel".
    - Edge smoothing via gaussian blur on the alpha mask to kill halo.
    - Un-multiplication is done with the blurred alpha so colours stay clean.

    Args:
        img        : PIL Image (any mode)
        threshold  : Pixels whose max-channel value is below this are kept
                     fully opaque (preserves dark lines/details).
        edge_blur  : Gaussian sigma applied to the alpha mask for soft edges.
                     0 = no blur. 1-2 is a good range.
    """
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.float32)
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]

    # Use MAX channel — a pixel is "white" when all channels are high.
    # Original code used MIN which can misfire on bright-coloured pixels.
    max_rgb = np.maximum(np.maximum(r, g), b)

    # Alpha ramp: below threshold → opaque, above → fade to transparent
    alpha = np.where(
        max_rgb < threshold,
        255.0,
        255.0 * (255.0 - max_rgb) / (255.0 - threshold + 1e-5)
    )
    alpha = np.clip(alpha, 0.0, 255.0)

    # ── Smooth the alpha mask to soften hard edges (kills most halo) ──
    if edge_blur > 0:
        alpha = gaussian_filter(alpha, sigma=edge_blur)
        alpha = np.clip(alpha, 0.0, 255.0)

    alpha_norm      = alpha / 255.0
    alpha_norm_safe = np.maximum(alpha_norm, 1e-5)

    # Un-multiply: recover the "true" foreground colour by subtracting
    # the white background's contribution proportional to transparency.
    new_r = np.clip((r - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_g = np.clip((g - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_b = np.clip((b - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)

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
#  COMPOSITE HELPER
# ─────────────────────────────────────────────

def composite(fg_nobg, bg_path, aspect_ratio="16:9"):
    """Resize bg to canvas size, scale fg proportionally, centre and paste."""
    if aspect_ratio == "9:16":
        canvas_w, canvas_h = 1080, 1920

    target_h = int(canvas_h * 0.55)

    bg_img = Image.open(bg_path).resize(
        (canvas_w, canvas_h),
        Image.Resampling.LANCZOS
    )

    fg_w, fg_h = fg_nobg.size
    scale = target_h / fg_h

    fg_resized = fg_nobg.resize(
        (int(fg_w * scale), target_h),
        Image.Resampling.LANCZOS
    )

    if fg_resized.width > canvas_w * 0.85:
        scale_w = (canvas_w * 0.85) / fg_resized.width
        fg_resized = fg_resized.resize(
            (
                int(fg_resized.width * scale_w),
                int(fg_resized.height * scale_w)
            ),
            Image.Resampling.LANCZOS
        )

    paste_x = (canvas_w - fg_resized.width) // 2

    SAFE_ZONE_BOTTOM = 350

    paste_y = (
        canvas_h
        - fg_resized.height
        - SAFE_ZONE_BOTTOM
    )

    bg_img.paste(fg_resized, (paste_x, paste_y), fg_resized)
    return bg_img



# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────

def main():
    if len(sys.argv) < 4:
        print("Usage: python remove_bg.py <input_fg> <output> <mode> [<input_bg>] [<threshold>]")
        print("  mode: whitekey | ai")
        sys.exit(1)

    fg_path   = sys.argv[1]
    out_path  = sys.argv[2]
    mode      = sys.argv[3]
    bg_path   = None
    threshold = 215.0

    # Parse optional args
    if len(sys.argv) == 5:
        try:
            threshold = float(sys.argv[4])
        except ValueError:
            bg_path = sys.argv[4]
    elif len(sys.argv) >= 6:
        bg_path = sys.argv[4]
        try:
            threshold = float(sys.argv[5])
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
        aspect_ratio = "9:16" if "9:16" in sys.argv else "16:9"
        if bg_path and os.path.exists(bg_path):
            print(f"Compositing onto background: {bg_path} (aspect ratio: {aspect_ratio})")
            result = composite(fg_nobg, bg_path, aspect_ratio)
            result.save(out_path, format="PNG")
        else:
            fg_nobg.save(out_path, format="PNG")
        print(f"Saved → {out_path}")
    except Exception as e:
        print(f"Error saving output: {e}")
        # Fallback: try saving transparent fg directly
        try:
            fg_nobg.save(out_path, format="PNG")
            print(f"Fallback save → {out_path}")
        except Exception as e2:
            print(f"Fallback save also failed: {e2}")
            sys.exit(1)


if __name__ == "__main__":
    main()
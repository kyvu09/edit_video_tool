import os
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

def clean_white_background_original(img, threshold=215.0, edge_blur=1.2):
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.float32)
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    max_rgb = np.maximum(np.maximum(r, g), b)
    alpha = np.where(
        max_rgb < threshold,
        255.0,
        255.0 * (255.0 - max_rgb) / (255.0 - threshold + 1e-5)
    )
    alpha = np.clip(alpha, 0.0, 255.0)
    if edge_blur > 0:
        alpha = gaussian_filter(alpha, sigma=edge_blur)
        alpha = np.clip(alpha, 0.0, 255.0)
    alpha_norm = alpha / 255.0
    alpha_norm_safe = np.maximum(alpha_norm, 1e-5)
    new_r = np.clip((r - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_g = np.clip((g - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_b = np.clip((b - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_data = np.stack([new_r, new_g, new_b, alpha], axis=-1).astype(np.uint8)
    return Image.fromarray(new_data, "RGBA")

def clean_white_background_proposed_max(img, threshold=215.0, tolerance=15.0, edge_blur=1.2):
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.float32)
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    max_rgb = np.maximum(np.maximum(r, g), b)
    
    low_threshold = threshold
    high_threshold = min(255.0, low_threshold + tolerance)
    
    alpha = np.where(
        max_rgb < low_threshold,
        255.0,
        np.where(
            max_rgb >= high_threshold,
            0.0,
            255.0 * (high_threshold - max_rgb) / (high_threshold - low_threshold + 1e-5)
        )
    )
    alpha = np.clip(alpha, 0.0, 255.0)
    if edge_blur > 0:
        alpha = gaussian_filter(alpha, sigma=edge_blur)
        alpha = np.clip(alpha, 0.0, 255.0)
    alpha_norm = alpha / 255.0
    alpha_norm_safe = np.maximum(alpha_norm, 1e-5)
    new_r = np.clip((r - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_g = np.clip((g - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_b = np.clip((b - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_data = np.stack([new_r, new_g, new_b, alpha], axis=-1).astype(np.uint8)
    return Image.fromarray(new_data, "RGBA")

def clean_white_background_proposed_min(img, threshold=215.0, tolerance=15.0, edge_blur=1.2):
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.float32)
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    min_rgb = np.minimum(np.minimum(r, g), b)
    
    low_threshold = threshold
    high_threshold = min(255.0, low_threshold + tolerance)
    
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
    if edge_blur > 0:
        alpha = gaussian_filter(alpha, sigma=edge_blur)
        alpha = np.clip(alpha, 0.0, 255.0)
    alpha_norm = alpha / 255.0
    alpha_norm_safe = np.maximum(alpha_norm, 1e-5)
    new_r = np.clip((r - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_g = np.clip((g - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_b = np.clip((b - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_data = np.stack([new_r, new_g, new_b, alpha], axis=-1).astype(np.uint8)
    return Image.fromarray(new_data, "RGBA")

if __name__ == '__main__':
    img_path = 'uploads/1780980347020-Stickman_running_with_paper_plan_202606091143.jpeg'
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        exit(1)
        
    img = Image.open(img_path)
    print("Testing original...")
    out1 = clean_white_background_original(img)
    out1.save('scratch/out_original.png')
    
    print("Testing proposed max...")
    out2 = clean_white_background_proposed_max(img)
    out2.save('scratch/out_proposed_max.png')
    
    print("Testing proposed min...")
    out3 = clean_white_background_proposed_min(img)
    out3.save('scratch/out_proposed_min.png')
    
    # Check alphas in the corner (should be background, i.e. 0)
    a1 = np.array(out1)[:, :, 3]
    a2 = np.array(out2)[:, :, 3]
    a3 = np.array(out3)[:, :, 3]
    print("Top-left pixel alphas:")
    print("  Original:", a1[0, 0])
    print("  Proposed Max:", a2[0, 0])
    print("  Proposed Min:", a3[0, 0])
    print("Bottom-right pixel alphas:")
    print("  Original:", a1[-1, -1])
    print("  Proposed Max:", a2[-1, -1])
    print("  Proposed Min:", a3[-1, -1])

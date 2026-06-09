import os
import numpy as np
from PIL import Image
import scipy.ndimage as ndimage

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
        alpha = ndimage.gaussian_filter(alpha, sigma=edge_blur)
        alpha = np.clip(alpha, 0.0, 255.0)
    alpha_norm = alpha / 255.0
    alpha_norm_safe = np.maximum(alpha_norm, 1e-5)
    new_r = np.clip((r - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_g = np.clip((g - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_b = np.clip((b - 255.0 * (1.0 - alpha_norm)) / alpha_norm_safe, 0, 255)
    new_data = np.stack([new_r, new_g, new_b, alpha], axis=-1).astype(np.uint8)
    return Image.fromarray(new_data, "RGBA")

def correct_illumination(img, kernel_size=41):
    img_gray = img.convert("L")
    data_gray = np.array(img_gray, dtype=np.float32)
    bg = ndimage.maximum_filter(data_gray, size=kernel_size)
    bg = ndimage.gaussian_filter(bg, sigma=kernel_size / 2)
    bg_safe = np.maximum(bg, 1.0)
    
    data = np.array(img, dtype=np.float32)
    corrected_data = np.zeros_like(data)
    for c in range(3):
        corrected_data[:, :, c] = np.clip((data[:, :, c] / bg_safe) * 255.0, 0, 255)
        
    return Image.fromarray(corrected_data.astype(np.uint8), "RGB")

if __name__ == '__main__':
    img_path = 'uploads/1780980347020-Stickman_running_with_paper_plan_202606091143.jpeg'
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        exit(1)
        
    img = Image.open(img_path)
    print("Correcting illumination...")
    corrected = correct_illumination(img)
    
    print("Running background removal...")
    nobg = clean_white_background_proposed_min(corrected, threshold=215.0, tolerance=15.0, edge_blur=1.2)
    nobg.save('scratch/out_corrected_nobg.png')
    print("Saved scratch/out_corrected_nobg.png")
    
    # Check alphas in the corner (should be background, i.e. 0)
    a = np.array(nobg)[:, :, 3]
    print("Top-left alpha:", a[0, 0])
    print("Top-right alpha:", a[0, -1])
    print("Bottom-left alpha:", a[-1, 0])
    print("Bottom-right alpha:", a[-1, -1])

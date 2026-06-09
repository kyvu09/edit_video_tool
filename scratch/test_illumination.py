import os
import numpy as np
from PIL import Image, ImageFilter
import scipy.ndimage as ndimage

def correct_illumination(img, kernel_size=41):
    # Convert to numpy float
    img_gray = img.convert("L")
    data_gray = np.array(img_gray, dtype=np.float32)
    
    # Estimate background by doing a maximum filter (dilation)
    # This removes the dark lines (since the lines are dark, the maximum in a window will be the bright paper background)
    bg = ndimage.maximum_filter(data_gray, size=kernel_size)
    # Smooth the background estimation
    bg = ndimage.gaussian_filter(bg, sigma=kernel_size / 2)
    
    # Divide the original image by the background estimation
    # Prevent division by zero
    bg_safe = np.maximum(bg, 1.0)
    
    # Process each channel of the original image
    data = np.array(img, dtype=np.float32)
    corrected_data = np.zeros_like(data)
    for c in range(3):
        corrected_data[:, :, c] = np.clip((data[:, :, c] / bg_safe) * 255.0, 0, 255)
        
    return Image.fromarray(corrected_data.astype(np.uint8), "RGB"), bg

if __name__ == '__main__':
    img_path = 'uploads/1780980347020-Stickman_running_with_paper_plan_202606091143.jpeg'
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        exit(1)
        
    img = Image.open(img_path)
    corrected, bg = correct_illumination(img)
    corrected.save('scratch/corrected.png')
    print("Saved scratch/corrected.png")
    
    # Let's inspect the corner pixels of the corrected image
    data_corr = np.array(corrected)
    print('Top-left corrected:', data_corr[0, 0])
    print('Top-right corrected:', data_corr[0, -1])
    print('Bottom-left corrected:', data_corr[-1, 0])
    print('Bottom-right corrected:', data_corr[-1, -1])

const form = document.getElementById('uploadForm');
const progressSection = document.getElementById('progress');
const successSection = document.getElementById('success');
const errorSection = document.getElementById('error');
const imageInput = document.getElementById('images');
const imagePreview = document.getElementById('imagePreview');
const uploadTrigger = document.getElementById('uploadTrigger');

let selectedImages = [];

// Trigger file input
uploadTrigger.addEventListener('click', () => {
    imageInput.click();
});

// Image preview functionality (appends files dynamically)
imageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const previewUrl = URL.createObjectURL(file);
        selectedImages.push({ file, previewUrl });
    });
    // Reset file input so the same files can be selected again
    imageInput.value = '';
    renderPreviews();
});

function renderPreviews() {
    imagePreview.innerHTML = '';
    selectedImages.forEach((imgObj, index) => {
        const card = document.createElement('div');
        card.className = 'preview-card';
        card.innerHTML = `
            <img src="${imgObj.previewUrl}" alt="Preview">
            <span class="preview-badge">Scene ${index + 1}</span>
            <div class="preview-card-controls">
                <button type="button" class="control-btn btn-prev" ${index === 0 ? 'disabled' : ''}>←</button>
                <button type="button" class="control-btn btn-delete">×</button>
                <button type="button" class="control-btn btn-next" ${index === selectedImages.length - 1 ? 'disabled' : ''}>→</button>
            </div>
        `;
        
        card.querySelector('.btn-prev').addEventListener('click', (e) => {
            e.stopPropagation();
            swapImages(index, index - 1);
        });
        
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            removeImage(index);
        });
        
        card.querySelector('.btn-next').addEventListener('click', (e) => {
            e.stopPropagation();
            swapImages(index, index + 1);
        });
        
        imagePreview.appendChild(card);
    });
}

function swapImages(idx1, idx2) {
    const temp = selectedImages[idx1];
    selectedImages[idx1] = selectedImages[idx2];
    selectedImages[idx2] = temp;
    renderPreviews();
}

function removeImage(index) {
    URL.revokeObjectURL(selectedImages[index].previewUrl);
    selectedImages.splice(index, 1);
    renderPreviews();
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedImages.length === 0) {
        alert('Please add at least one scene image.');
        return;
    }

    const formData = new FormData();
    
    const audioFile = document.getElementById('audio').files[0];
    const scriptFile = document.getElementById('script').files[0];

    formData.append('audio', audioFile);
    formData.append('script', scriptFile);
    
    selectedImages.forEach((imgObj) => {
        formData.append('images', imgObj.file);
    });

    // Show progress
    form.style.display = 'none';
    progressSection.style.display = 'block';
    successSection.style.display = 'none';
    errorSection.style.display = 'none';

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const result = await response.json();
        
        // Track progress using polling
        trackProgress(result.sessionId);

    } catch (error) {
        console.error('Error:', error);
        progressSection.style.display = 'none';
        errorSection.style.display = 'block';
        document.getElementById('errorMessage').textContent = error.message;
    }
});

function trackProgress(sessionId) {
    const steps = ['step-whisper', 'step-parse', 'step-timeline', 'step-subtitle', 'step-ffmpeg'];
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    function updateStepsUI(currentStep) {
        let foundCurrent = false;
        steps.forEach(stepId => {
            const el = document.getElementById(stepId);
            if (!el) return;
            
            const statusEl = el.querySelector('.step-status');
            
            if (stepId === currentStep) {
                el.classList.add('active');
                el.classList.remove('done');
                if (statusEl) {
                    statusEl.innerHTML = '<div class="spinner"></div>';
                }
                foundCurrent = true;
            } else if (!foundCurrent) {
                el.classList.add('done');
                el.classList.remove('active');
                if (statusEl) {
                    statusEl.innerHTML = '<svg class="checkmark-svg" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>';
                }
            } else {
                el.classList.remove('active');
                el.classList.remove('done');
                if (statusEl) {
                    statusEl.innerHTML = '<span class="step-bullet"></span>';
                }
            }
        });
    }

    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/api/progress/${sessionId}`);
            if (!res.ok) {
                throw new Error('Failed to fetch progress status');
            }
            const data = await res.json();
            
            // Update progress bar width
            progressFill.style.width = data.progress + '%';
            
            // Update progress status message
            progressText.textContent = data.statusMessage || 'Processing...';
            
            // Update step list active/done states
            updateStepsUI(data.currentStep);
            
            if (data.status === 'completed') {
                clearInterval(interval);
                steps.forEach(stepId => {
                    const el = document.getElementById(stepId);
                    if (el) {
                        el.classList.add('done');
                        el.classList.remove('active');
                        const statusEl = el.querySelector('.step-status');
                        if (statusEl) {
                            statusEl.innerHTML = '<svg class="checkmark-svg" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>';
                        }
                    }
                });
                progressFill.style.width = '100%';
                
                setTimeout(() => {
                    progressSection.style.display = 'none';
                    successSection.style.display = 'block';
                    document.getElementById('downloadLink').href = data.videoUrl;
                    
                    const videoPlayer = document.getElementById('videoPreviewPlayer');
                    if (videoPlayer && data.previewUrl) {
                        videoPlayer.src = data.previewUrl;
                        videoPlayer.load();
                    }
                }, 800);
            } else if (data.status === 'failed') {
                clearInterval(interval);
                progressSection.style.display = 'none';
                errorSection.style.display = 'block';
                document.getElementById('errorMessage').textContent = data.error || 'Unknown error occurred during video creation.';
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 1000);
}

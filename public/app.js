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

// Audio file selection display status
const audioInput = document.getElementById('audio');
const audioFileName = document.getElementById('audioFileName');
if (audioInput && audioFileName) {
    audioInput.addEventListener('change', () => {
        if (audioInput.files[0]) {
            audioFileName.textContent = `Đã chọn: ${audioInput.files[0].name}`;
            audioFileName.style.display = 'inline-block';
        } else {
            audioFileName.textContent = '';
            audioFileName.style.display = 'none';
        }
    });
}

// Script file selection display status
const scriptInput = document.getElementById('script');
const scriptFileName = document.getElementById('scriptFileName');
if (scriptInput && scriptFileName) {
    scriptInput.addEventListener('change', () => {
        if (scriptInput.files[0]) {
            scriptFileName.textContent = `Đã chọn: ${scriptInput.files[0].name}`;
            scriptFileName.style.display = 'inline-block';
        } else {
            scriptFileName.textContent = '';
            scriptFileName.style.display = 'none';
        }
    });
}

// Toggle Background removal mode dropdown & display status based on background image selection
const bgSelectorInput = document.getElementById('backgroundImage');
const bgModeSection = document.getElementById('bgModeSection');
const bgImageFileName = document.getElementById('bgImageFileName');
if (bgSelectorInput) {
    bgSelectorInput.addEventListener('change', () => {
        if (bgSelectorInput.files[0]) {
            if (bgModeSection) bgModeSection.style.display = 'block';
            if (bgImageFileName) {
                bgImageFileName.textContent = `Đã chọn: ${bgSelectorInput.files[0].name}`;
                bgImageFileName.style.display = 'inline-block';
            }
        } else {
            if (bgModeSection) bgModeSection.style.display = 'none';
            if (bgImageFileName) {
                bgImageFileName.textContent = '';
                bgImageFileName.style.display = 'none';
            }
        }
    });
}

// Background music selection handling (No Icons)
const bgmInput = document.getElementById('bgm');
const bgmVolumeContainer = document.getElementById('bgmVolumeContainer');
const bgmVolumeInput = document.getElementById('bgmVolume');
const bgmVolumeValText = document.getElementById('bgmVolumeValText');
const bgmFileName = document.getElementById('bgmFileName');

if (bgmInput) {
    bgmInput.addEventListener('change', () => {
        if (bgmInput.files[0]) {
            const file = bgmInput.files[0];
            bgmFileName.textContent = `Đã chọn: ${file.name}`;
            bgmFileName.style.display = 'inline-block';
            bgmVolumeContainer.style.display = 'block';
        } else {
            bgmFileName.textContent = '';
            bgmFileName.style.display = 'none';
            bgmVolumeContainer.style.display = 'none';
        }
    });
}

if (bgmVolumeInput && bgmVolumeValText) {
    bgmVolumeInput.addEventListener('input', (e) => {
        bgmVolumeValText.textContent = `${e.target.value}%`;
    });
}

const videoSpeedInput = document.getElementById('videoSpeed');
const videoSpeedValText = document.getElementById('videoSpeedValText');
if (videoSpeedInput && videoSpeedValText) {
    videoSpeedInput.addEventListener('input', (e) => {
        videoSpeedValText.textContent = `${parseFloat(e.target.value).toFixed(2)}x`;
    });
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
    
    const bgInput = document.getElementById('backgroundImage');
    if (bgInput && bgInput.files[0]) {
        formData.append('backgroundImage', bgInput.files[0]);
        const bgMode = document.getElementById('backgroundMode').value;
        formData.append('backgroundMode', bgMode);
    }

    const aspectRatio = document.getElementById('aspectRatio').value;
    formData.append('aspectRatio', aspectRatio);

    const videoSpeed = document.getElementById('videoSpeed') ? document.getElementById('videoSpeed').value : '1.0';
    formData.append('videoSpeed', videoSpeed);
    
    // Background music & volume submission (No Icons)
    const bgmFile = document.getElementById('bgm').files[0];
    if (bgmFile) {
        formData.append('bgm', bgmFile);
        const bgmVolume = document.getElementById('bgmVolume').value;
        formData.append('bgmVolume', bgmVolume);
    }
    
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
    const steps = ['step-rembg', 'step-whisper', 'step-parse', 'step-timeline', 'step-subtitle', 'step-ffmpeg'];
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

// --- OpenAI API Debug Tooling ---
const apiStatusDot = document.getElementById('apiStatusDot');
const apiStatusText = document.getElementById('apiStatusText');
const apiDetailsTooltip = document.getElementById('apiDetailsTooltip');
const btnCheckApi = document.getElementById('btnCheckApi');

async function checkOpenAIApi() {
    if (!apiStatusDot || !apiStatusText) return;
    
    // Set checking state
    apiStatusDot.className = 'api-status-dot checking';
    apiStatusText.textContent = 'Testing OpenAI API...';
    apiDetailsTooltip.textContent = 'Sending request to verify connectivity and key validity...';
    btnCheckApi.disabled = true;
    
    try {
        const response = await fetch('/api/debug-openai');
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Reset classes
        apiStatusDot.className = 'api-status-dot';
        
        // Apply status class and text
        if (data.status === 'active') {
            apiStatusDot.classList.add('active');
            apiStatusText.textContent = data.message;
            apiStatusText.style.color = '#10b981'; // Success emerald
        } else if (data.status === 'placeholder') {
            apiStatusDot.classList.add('placeholder');
            apiStatusText.textContent = data.message;
            apiStatusText.style.color = '#f59e0b'; // Amber yellow
        } else {
            apiStatusDot.classList.add('error');
            apiStatusText.textContent = data.message;
            apiStatusText.style.color = '#ef4444'; // Red
        }
        
        // Populate tooltip with details
        apiDetailsTooltip.innerHTML = `
            <strong>Status Details:</strong><br>
            ${data.details}<br><br>
            <span style="font-size: 0.85em; opacity: 0.8;">Click this widget to refresh status anytime.</span>
        `;
        
    } catch (error) {
        apiStatusDot.className = 'api-status-dot error';
        apiStatusText.textContent = 'API Offline / Error';
        apiStatusText.style.color = '#ef4444';
        apiDetailsTooltip.innerHTML = `
            <strong>Verification Error:</strong><br>
            ${error.message}<br><br>
            Make sure your backend server is running and accessible.
        `;
    } finally {
        btnCheckApi.disabled = false;
    }
}

// Register click trigger for manual check
if (btnCheckApi) {
    btnCheckApi.addEventListener('click', (e) => {
        e.stopPropagation();
        checkOpenAIApi();
    });
}

// Let users click the whole widget to refresh
const apiDebugWidget = document.getElementById('apiDebugWidget');
if (apiDebugWidget) {
    apiDebugWidget.addEventListener('click', () => {
        checkOpenAIApi();
    });
}

// --- Gemini API Debug Tooling ---
const geminiStatusDot = document.getElementById('geminiStatusDot');
const geminiStatusText = document.getElementById('geminiStatusText');
const geminiDetailsTooltip = document.getElementById('geminiDetailsTooltip');
const btnCheckGemini = document.getElementById('btnCheckGemini');

async function checkGeminiApi() {
    if (!geminiStatusDot || !geminiStatusText) return;
    
    // Set checking state
    geminiStatusDot.className = 'api-status-dot checking';
    geminiStatusText.textContent = 'Testing Gemini API...';
    geminiDetailsTooltip.textContent = 'Sending request to verify connectivity and key validity...';
    if (btnCheckGemini) btnCheckGemini.disabled = true;
    
    try {
        const response = await fetch('/api/debug-gemini');
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Reset classes
        geminiStatusDot.className = 'api-status-dot';
        
        // Apply status class and text
        if (data.status === 'active') {
            geminiStatusDot.classList.add('active');
            geminiStatusText.textContent = data.message;
            geminiStatusText.style.color = '#10b981'; // Success emerald
        } else if (data.status === 'placeholder') {
            geminiStatusDot.classList.add('placeholder');
            geminiStatusText.textContent = data.message;
            geminiStatusText.style.color = '#f59e0b'; // Amber yellow
        } else {
            geminiStatusDot.classList.add('error');
            geminiStatusText.textContent = data.message;
            geminiStatusText.style.color = '#ef4444'; // Red
        }
        
        // Populate tooltip with details
        geminiDetailsTooltip.innerHTML = `
            <strong>Status Details:</strong><br>
            ${data.details}<br><br>
            <span style="font-size: 0.85em; opacity: 0.8;">Click this widget to refresh status anytime.</span>
        `;
        
    } catch (error) {
        geminiStatusDot.className = 'api-status-dot error';
        geminiStatusText.textContent = 'API Offline / Error';
        geminiStatusText.style.color = '#ef4444';
        geminiDetailsTooltip.innerHTML = `
            <strong>Verification Error:</strong><br>
            ${error.message}<br><br>
            Make sure your backend server is running and accessible.
        `;
    } finally {
        if (btnCheckGemini) btnCheckGemini.disabled = false;
    }
}

// Register click trigger for manual check
if (btnCheckGemini) {
    btnCheckGemini.addEventListener('click', (e) => {
        e.stopPropagation();
        checkGeminiApi();
    });
}

// Let users click the whole widget to refresh
const geminiDebugWidget = document.getElementById('geminiDebugWidget');
if (geminiDebugWidget) {
    geminiDebugWidget.addEventListener('click', () => {
        checkGeminiApi();
    });
}

// Run status verification on initialization
document.addEventListener('DOMContentLoaded', () => {
    checkOpenAIApi();
    checkGeminiApi();
    initTabs();
    initAIAssistant();
});
checkOpenAIApi(); // Run immediately too in case DOM is already loaded
checkGeminiApi(); // Run immediately too in case DOM is already loaded


// --- Tab Switcher Logic ---
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) {
                targetEl.classList.add('active');
            }
        });
    });
}

// Helper to switch tab programmatically
function switchTab(tabId) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (btn) {
        btn.click();
    }
}

// --- AI Script Assistant Feature ---
function initAIAssistant() {
    const btnGenerate = document.getElementById('btnGenerateScenes');
    const txtRawScript = document.getElementById('rawScriptText');
    const aiProgress = document.getElementById('aiProgress');
    const aiProgressText = document.getElementById('aiProgressText');
    const aiResults = document.getElementById('aiResults');
    const txtScenesOutput = document.getElementById('aiScenesOutput');
    const txtScriptOutput = document.getElementById('aiScriptOutput');
    
    const btnCopyScenes = document.getElementById('btnCopyScenes');
    const btnCopyScript = document.getElementById('btnCopyScript');
    const btnApplyScript = document.getElementById('btnApplyScript');
    const btnDownloadScript = document.getElementById('btnDownloadScriptText');

    if (!btnGenerate) return;

    btnGenerate.addEventListener('click', async () => {
        const rawText = txtRawScript.value.trim();
        if (!rawText) {
            alert('Vui lòng nhập kịch bản thô của bạn trước.');
            return;
        }

        // Show loading state
        btnGenerate.disabled = true;
        aiProgress.style.display = 'block';
        aiResults.style.display = 'none';
        aiProgressText.textContent = 'Đang phân tích kịch bản thô bằng Gemini AI...';

        try {
            const response = await fetch('/api/generate-scenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawScriptText: rawText })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Lỗi từ API Gemini');
            }

            const data = await response.json();

            // Populate outputs
            txtScenesOutput.value = data.scenesAndPrompts;
            txtScriptOutput.value = data.separatedScript;

            // Show results
            aiProgress.style.display = 'none';
            aiResults.style.display = 'block';
        } catch (error) {
            console.error('Gemini Assistant Error:', error);
            alert('Không thể tạo phân cảnh: ' + error.message);
            aiProgress.style.display = 'none';
        } finally {
            btnGenerate.disabled = false;
        }
    });

    // Copy to clipboard helpers
    btnCopyScenes.addEventListener('click', () => {
        txtScenesOutput.select();
        navigator.clipboard.writeText(txtScenesOutput.value);
        const origText = btnCopyScenes.textContent;
        btnCopyScenes.textContent = '✅ Đã chép!';
        setTimeout(() => btnCopyScenes.textContent = origText, 2000);
    });

    btnCopyScript.addEventListener('click', () => {
        txtScriptOutput.select();
        navigator.clipboard.writeText(txtScriptOutput.value);
        const origText = btnCopyScript.textContent;
        btnCopyScript.textContent = '✅ Đã chép!';
        setTimeout(() => btnCopyScript.textContent = origText, 2000);
    });

    // Download script.txt helper
    btnDownloadScript.addEventListener('click', () => {
        const text = txtScriptOutput.value;
        if (!text) return;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'script.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Auto-fill form and switch tab helper
    btnApplyScript.addEventListener('click', () => {
        const text = txtScriptOutput.value.trim();
        if (!text) return;

        try {
            // Create a virtual file object and assign it to the file input
            const file = new File([text], 'script.txt', { type: 'text/plain' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            document.getElementById('script').files = dataTransfer.files;

            alert('Đã tự động điền kịch bản vào Form tạo Video!');
            
            // Switch back to create video tab
            switchTab('create-video-tab');
        } catch (e) {
            console.error('Virtual file assignment error:', e);
            alert('Không hỗ trợ tự động điền ở trình duyệt này. Vui lòng tải file .txt và upload thủ công.');
        }
    });
}



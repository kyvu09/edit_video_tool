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
                    
                    if (typeof initYoutubeSection === 'function') {
                        initYoutubeSection(sessionId, data.metadata);
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

// --- YouTube Integration ---
function initYoutubeSection(sessionId, metadata) {
    const authSection = document.getElementById('youtubeAuthSection');
    const formSection = document.getElementById('youtubeFormSection');
    const btnConnect = document.getElementById('btnYoutubeConnect');
    
    const ytTitle = document.getElementById('ytTitle');
    const ytDesc = document.getElementById('ytDescription');
    const ytTags = document.getElementById('ytTags');
    const btnUpload = document.getElementById('btnYoutubeUpload');
    const uploadProgress = document.getElementById('ytUploadProgress');
    const uploadStatus = document.getElementById('ytUploadStatus');
    const btnLogout = document.getElementById('btnYoutubeLogout');

    // Pre-fill metadata if available
    if (metadata) {
        if (metadata.title) ytTitle.value = metadata.title;
        
        let descText = metadata.description || '';
        if (metadata.hashtags && metadata.hashtags.length > 0) {
            descText += '\n\n' + metadata.hashtags.join(' ');
        }
        if (metadata.seo_keywords && metadata.seo_keywords.length > 0) {
            descText += '\n\nTừ khóa SEO: ' + metadata.seo_keywords.join(', ');
        }
        ytDesc.value = descText.trim();

        if (metadata.seo_keywords && Array.isArray(metadata.seo_keywords)) {
            ytTags.value = metadata.seo_keywords.join(', ');
        } else if (metadata.tags) {
             ytTags.value = Array.isArray(metadata.tags) ? metadata.tags.join(', ') : metadata.tags;
        }
    }

    async function checkAuth() {
        try {
            const res = await fetch('/api/youtube/status');
            const data = await res.json();
            if (data.authenticated) {
                authSection.style.display = 'none';
                formSection.style.display = 'block';
            } else {
                authSection.style.display = 'block';
                formSection.style.display = 'none';
            }
        } catch (e) {
            console.error('Failed to check YT auth status', e);
        }
    }

    checkAuth();

    // Prevent multiple event listeners by replacing the button clone
    const newBtnConnect = btnConnect.cloneNode(true);
    btnConnect.parentNode.replaceChild(newBtnConnect, btnConnect);
    newBtnConnect.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/youtube/auth');
            const data = await res.json();
            if (data.url) {
                // Open popup
                const w = 500;
                const h = 600;
                const left = (screen.width/2)-(w/2);
                const top = (screen.height/2)-(h/2);
                window.open(data.url, 'YouTubeLogin', 'width='+w+',height='+h+',top='+top+',left='+left);
            }
        } catch (e) {
            alert('Lỗi lấy link đăng nhập: ' + e.message);
        }
    });

    if (btnLogout) {
        const newBtnLogout = btnLogout.cloneNode(true);
        btnLogout.parentNode.replaceChild(newBtnLogout, btnLogout);
        newBtnLogout.addEventListener('click', async () => {
            try {
                await fetch('/api/youtube/logout', { method: 'POST' });
                checkAuth();
                alert('Đã đăng xuất khỏi YouTube thành công.');
            } catch (e) {
                console.error('Logout error', e);
            }
        });
    }

    // We only want to add this listener once globally, but for simplicity we can just add it. 
    // It's safe since it just calls checkAuth().
    window.addEventListener('message', (event) => {
        if (event.data === 'youtube_auth_success') {
            checkAuth();
        }
    });

    const newBtnUpload = btnUpload.cloneNode(true);
    btnUpload.parentNode.replaceChild(newBtnUpload, btnUpload);
    newBtnUpload.addEventListener('click', async () => {
        const title = ytTitle.value.trim();
        if (!title) {
            alert('Vui lòng nhập tiêu đề video');
            return;
        }

        newBtnUpload.disabled = true;
        uploadProgress.style.display = 'block';
        uploadStatus.textContent = 'Đang tải lên YouTube... Xin đừng đóng trang';

        try {
            const payload = {
                sessionId: sessionId,
                title: title,
                description: ytDesc.value.trim(),
                tags: ytTags.value.trim(),
                privacyStatus: document.getElementById('ytPrivacy').value
            };

            const res = await fetch('/api/youtube/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                uploadStatus.innerHTML = `✅ Thành công! Xem video tại: <a href="https://youtu.be/${data.videoId}" target="_blank" style="color:#a5b4fc;">https://youtu.be/${data.videoId}</a>`;
            } else {
                throw new Error(data.error || 'Lỗi không xác định');
            }
        } catch (e) {
            alert('Upload thất bại: ' + e.message);
            uploadProgress.style.display = 'none';
            newBtnUpload.disabled = false;
        }
    });
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
    initImageGenerator();
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

// ═══════════════════════════════════════════════════════════
// SHARED UTILITY — WhiskLab Format Prompt Extractor
// Parses the AI output that contains THUMBNAIL + SCENE sections
// ═══════════════════════════════════════════════════════════

/**
 * Extract image prompts from the AI's WhiskLab format output.
 *
 * Handles sections like:
 *   THUMBNAIL
 *   Thumbnail Prompt for WhiskLab:
 *   <prompt text...>
 *
 *   SCENE 1
 *   Script line: "..."
 *   Image prompt for WhiskLab:
 *   <prompt text...>
 *
 * @param {string} text  Raw scenes output from Gemini AI
 * @returns {Array<{ scene: number, label: string, prompt: string }>}
 *   scene = 0 for THUMBNAIL, 1..N for scenes
 */
function extractPromptsFromWhiskLabFormat(text) {
    if (!text || !text.trim()) return [];

    const results = [];

    // ── THUMBNAIL section ──────────────────────────────────────
    const thumbnailBlockMatch = text.match(/THUMBNAIL[\s\S]*?(?=\n\s*[─\-─]{3,}|\n\s*SCENE\s+\d|$)/i);
    if (thumbnailBlockMatch) {
        const thumbnailBlock = thumbnailBlockMatch[0];
        // Tìm chữ "prompt:" hoặc tương tự trong block THUMBNAIL
        const promptMatch = thumbnailBlock.match(/prompt[^:]*:\s*([\s\S]*)$/i);
        if (promptMatch) {
            const prompt = promptMatch[1].trim().replace(/\n+/g, ' ').trim();
            if (prompt) {
                results.push({ scene: 0, label: 'THUMBNAIL', prompt });
            }
        }
    }

    // ── SCENE sections ─────────────────────────────────────────
    const sceneRegex = /SCENE\s+(\d+)[\s\S]*?(?:prompt[^:]*:)\s*([\s\S]*?)(?=\n\s*SCENE\s+\d|\n\s*[─\-─]{3,}|$)/gi;
    let match;
    while ((match = sceneRegex.exec(text)) !== null) {
        const sceneNum = parseInt(match[1], 10);
        const prompt = match[2].trim().replace(/\n+/g, ' ').trim();
        if (prompt) {
            results.push({ scene: sceneNum, label: `Scene ${sceneNum}`, prompt });
        }
    }

    // Sort: THUMBNAIL (0) first, then by scene number
    results.sort((a, b) => a.scene - b.scene);

    return results;
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

    const btnGenerateMetadata = document.getElementById('btnGenerateMetadata');
    const aiMetadataProgress = document.getElementById('aiMetadataProgress');
    const aiMetadataResults = document.getElementById('aiMetadataResults');
    const txtMetadataTitle = document.getElementById('aiMetadataTitle');
    const txtMetadataDesc = document.getElementById('aiMetadataDesc');
    const btnCopyTitle = document.getElementById('btnCopyTitle');
    const btnCopyDesc = document.getElementById('btnCopyDesc');

    if (!btnGenerate) return;

    if (btnGenerateMetadata) {
        btnGenerateMetadata.addEventListener('click', async () => {
            const rawText = txtRawScript.value.trim();
            if (!rawText) {
                alert('Vui lòng nhập kịch bản thô của bạn trước khi tạo tiêu đề & mô tả.');
                return;
            }

            btnGenerateMetadata.disabled = true;
            aiMetadataProgress.style.display = 'block';
            aiMetadataResults.style.display = 'none';

            try {
                const response = await fetch('/api/generate-metadata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rawScriptText: rawText })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(errText || 'Lỗi từ API Gemini');
                }

                const data = await response.json();
                
                if (data.rawText) {
                     // Fallback to raw text if JSON parse failed
                     txtMetadataTitle.value = 'Lỗi phân tích JSON từ AI. Vui lòng xem ở dưới.';
                     txtMetadataDesc.value = data.rawText;
                } else {
                     txtMetadataTitle.value = data.title || '';
                     
                     let descText = data.description || '';
                     if (data.hashtags && data.hashtags.length > 0) {
                         descText += '\n\n' + data.hashtags.join(' ');
                     }
                     if (data.seo_keywords && data.seo_keywords.length > 0) {
                         descText += '\n\nTừ khóa SEO: ' + data.seo_keywords.join(', ');
                     }
                     txtMetadataDesc.value = descText;
                }

                aiMetadataProgress.style.display = 'none';
                aiMetadataResults.style.display = 'block';
            } catch (error) {
                console.error('Metadata Generation Error:', error);
                alert('Không thể tạo tiêu đề & mô tả: ' + error.message);
                aiMetadataProgress.style.display = 'none';
            } finally {
                btnGenerateMetadata.disabled = false;
            }
        });

        btnCopyTitle.addEventListener('click', () => {
            txtMetadataTitle.select();
            navigator.clipboard.writeText(txtMetadataTitle.value);
            const origText = btnCopyTitle.textContent;
            btnCopyTitle.textContent = '✅ Đã chép!';
            setTimeout(() => btnCopyTitle.textContent = origText, 2000);
        });

        btnCopyDesc.addEventListener('click', () => {
            txtMetadataDesc.select();
            navigator.clipboard.writeText(txtMetadataDesc.value);
            const origText = btnCopyDesc.textContent;
            btnCopyDesc.textContent = '✅ Đã chép!';
            setTimeout(() => btnCopyDesc.textContent = origText, 2000);
        });
    }

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

            // Extract prompts
            const extracted = extractPromptsFromWhiskLabFormat(data.scenesAndPrompts);

            // Render Individual Copy Buttons
            const individualCopyButtonsContainer = document.getElementById('individualCopyButtonsContainer');
            const individualCopyButtons = document.getElementById('individualCopyButtons');
            if (individualCopyButtonsContainer && individualCopyButtons) {
                if (extracted.length > 0) {
                    individualCopyButtons.innerHTML = '';
                    extracted.forEach((item, index) => {
                        const label = item.label || 'Scene ' + index;
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'btn-secondary-action';
                        btn.style.padding = '6px 12px';
                        btn.style.fontSize = '0.85em';
                        btn.innerHTML = `📋 Copy ${label}`;
                        
                        btn.addEventListener('click', () => {
                            navigator.clipboard.writeText(item.prompt).then(() => {
                                btn.innerHTML = `✅ Đã copy ${label}`;
                                btn.style.backgroundColor = '#10b981'; // Xanh lá cây
                                btn.style.color = '#ffffff';
                                btn.style.borderColor = '#10b981';
                            }).catch(err => {
                                alert('Lỗi copy: ' + err.message);
                            });
                        });
                        
                        individualCopyButtons.appendChild(btn);
                    });
                    individualCopyButtonsContainer.style.display = 'block';
                } else {
                    individualCopyButtonsContainer.style.display = 'none';
                }
            }

            // Render FlowAI buttons
            const flowAiContainer = document.getElementById('flowAiContainer');
            const flowAiButtons = document.getElementById('flowAiButtons');
            if (flowAiContainer && flowAiButtons && extracted.length > 0) {
                flowAiButtons.innerHTML = '';
                
                const btnAll = document.createElement('button');
                btnAll.type = 'button';
                btnAll.className = 'btn-submit';
                btnAll.style.backgroundColor = '#8b5cf6';
                btnAll.innerHTML = `🚀 Tự động dán tất cả (${extracted.length} scenes) sang Google Flow`;
                
                const statusText = document.createElement('div');
                statusText.style.marginTop = '10px';
                statusText.style.fontSize = '0.9em';
                statusText.style.color = '#10b981';

                btnAll.addEventListener('click', async () => {
                    btnAll.disabled = true;
                    
                    for (let i = 0; i < extracted.length; i++) {
                        const item = extracted[i];
                        const isFirst = (i === 0);
                        const isLast = (i === extracted.length - 1);
                        const label = item.label || 'Scene ' + i;
                        
                        btnAll.innerHTML = `⏳ Đang xử lý ${label}... (${i + 1}/${extracted.length})`;
                        statusText.innerHTML = `Đang dán ${label}... Vui lòng không chạm chuột/bàn phím.`;
                        
                        try {
                            const res = await fetch('/api/flow-ai', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prompt: item.prompt, isFirst: isFirst, isLast: isLast })
                            });
                            
                            const result = await res.json();
                            if (!result.success) throw new Error(result.error);
                            
                            if (!isLast) {
                                // Countdown 3s trước khi dán hình tiếp theo
                                for (let sec = 3; sec > 0; sec--) {
                                    statusText.innerHTML = `✅ Đã dán ${label}. Chờ ${sec}s trước khi dán tiếp...`;
                                    await new Promise(r => setTimeout(r, 1000));
                                }
                            }
                        } catch (e) {
                            alert(`Lỗi ở ${label}: ` + e.message);
                            break; // Dừng nếu lỗi
                        }
                    }
                    
                    btnAll.innerHTML = `✅ Hoàn thành dán tất cả!`;
                    statusText.innerHTML = `Đã xong toàn bộ ${extracted.length} scenes.`;
                    btnAll.disabled = false;
                });
                
                flowAiButtons.appendChild(btnAll);
                flowAiButtons.appendChild(statusText);
                flowAiContainer.style.display = 'block';
            } else if (flowAiContainer) {
                flowAiContainer.style.display = 'none';
            }

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

    // ── Send extracted prompts to Tab 3 ───────────────────────
    const btnSendToImageGen = document.getElementById('btnSendToImageGen');
    if (btnSendToImageGen) {
        btnSendToImageGen.addEventListener('click', () => {
            const raw = txtScenesOutput.value.trim();
            if (!raw) return;

            const extracted = extractPromptsFromWhiskLabFormat(raw);
            if (extracted.length === 0) {
                alert('Không tìm thấy prompt nào. Hãy chắc chắn output đúng format WhiskLab.');
                return;
            }

            // Format as one prompt per line: "THUMBNAIL: ..." or "Scene N: ..."
            const formatted = extracted.map(({ label, prompt }) => `${label}: ${prompt}`).join('\n');
            const imgGenPrompts = document.getElementById('imgGenPrompts');
            if (imgGenPrompts) imgGenPrompts.value = formatted;

            // Flash confirmation
            btnSendToImageGen.textContent = '✅ Đã gửi!';
            setTimeout(() => { btnSendToImageGen.textContent = ' Gửi Prompts → Tab Ảnh AI'; }, 2000);

            // Switch to Tab 3
            switchTab('image-gen-tab');
        });
    }

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

    // Audio Generation (Viettel AI) Helpers
    const btnGenerateTts = document.getElementById('btnGenerateTts');
    const ttsInput = document.getElementById('ttsInput');
    const btnFetchFromAI = document.getElementById('btnFetchFromAI');
    
    if (btnFetchFromAI) {
        btnFetchFromAI.addEventListener('click', () => {
            const aiScript = txtScriptOutput.value.trim();
            if (!aiScript) {
                alert('Chưa có kịch bản nào được tạo bên tab Trợ Lý Kịch Bản AI!');
                return;
            }
            ttsInput.value = aiScript;
            // Scroll to the TTS input for better UX
            ttsInput.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (btnGenerateTts && ttsInput) {
        btnGenerateTts.addEventListener('click', async () => {
            const scriptText = ttsInput.value.trim();
            if (!scriptText) {
                alert('Vui lòng dán hoặc lấy kịch bản vào ô trống trước khi tạo audio!');
                return;
            }
            
            btnGenerateTts.disabled = true;
            const origHtml = btnGenerateTts.innerHTML;
            btnGenerateTts.innerHTML = '⏳ Đang tạo Audio...';
            
            try {
                const provider = document.getElementById('ttsProvider') ? document.getElementById('ttsProvider').value : 'viettel';
                const res = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: scriptText, provider: provider })
                });
                
                if (!res.ok) {
                    let err;
                    try { err = await res.json(); } catch(e){}
                    throw new Error(err?.error || 'Lỗi tạo audio');
                }
                
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                
                // Show result container
                const ttsResultContainer = document.getElementById('ttsResultContainer');
                const ttsAudioPreview = document.getElementById('ttsAudioPreview');
                const btnDownloadTts = document.getElementById('btnDownloadTts');
                const btnApplyTtsToVideo = document.getElementById('btnApplyTtsToVideo');
                
                if (ttsResultContainer && ttsAudioPreview) {
                    ttsAudioPreview.src = url;
                    ttsResultContainer.style.display = 'block';
                    ttsAudioPreview.play().catch(e => console.log('Auto-play prevented:', e));
                    
                    // Xóa event cũ bằng cách clone node nếu cần, hoặc gán lại bằng cách override onclick
                    btnDownloadTts.onclick = () => {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'audio.mp3';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    };
                    
                    btnApplyTtsToVideo.onclick = () => {
                        const file = new File([blob], 'audio.mp3', { type: 'audio/mpeg' });
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        
                        const videoAudioInput = document.getElementById('audio');
                        if (videoAudioInput) {
                            videoAudioInput.files = dataTransfer.files;
                            
                            // Cập nhật tên hiển thị bên Tab Tạo Video
                            const audioFileName = document.getElementById('audioFileName');
                            if (audioFileName) {
                                audioFileName.textContent = "audio.mp3 (Từ AI)";
                                audioFileName.style.display = 'block';
                            }
                            
                            alert('Đã tự động điền Audio vào Form tạo Video!');
                            // Chuyển sang Tab Tạo Video
                            switchTab('create-video-tab');
                        }
                    };
                }
            } catch (e) {
                console.error('TTS Error:', e);
                alert('Lỗi: ' + e.message);
            } finally {
                btnGenerateTts.disabled = false;
                btnGenerateTts.innerHTML = origHtml;
            }
        });
    }

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


// ═══════════════════════════════════════════════════════════
// TAB 3 — AI IMAGE GENERATOR
// ═══════════════════════════════════════════════════════════

function initImageGenerator() {
    const btnGenVideoId   = document.getElementById('btnGenVideoId');
    const inputVideoId    = document.getElementById('imgGenVideoId');
    const btnImportPrompts = document.getElementById('btnImportPrompts');
    const txtPrompts      = document.getElementById('imgGenPrompts');
    const btnStart        = document.getElementById('btnStartImageGen');
    const btnDownloadAll  = document.getElementById('btnDownloadAllImages');
    const progressWrap    = document.getElementById('imgGenProgress');
    const progressBar     = document.getElementById('imgGenProgressBar');
    const progressLabel   = document.getElementById('imgGenProgressLabel');
    const progressCount   = document.getElementById('imgGenProgressCount');
    const grid            = document.getElementById('imgGenGrid');
    const errorBox        = document.getElementById('imgGenError');

    if (!btnStart) return;

    // Track state
    let pollingInterval = null;
    let generatedImages = []; // { scene, imagePath }[]

    // ── Generate random Video ID ──────────────────────────────
    function generateVideoId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return 'vid-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    if (btnGenVideoId) {
        btnGenVideoId.addEventListener('click', () => {
            inputVideoId.value = generateVideoId();
        });
    }

    // Auto-generate on load if empty
    if (inputVideoId && !inputVideoId.value) {
        inputVideoId.value = generateVideoId();
    }

    // ── Import prompts from Tab 2 ─────────────────────────────
    if (btnImportPrompts) {
        btnImportPrompts.addEventListener('click', () => {
            const scenesOutput = document.getElementById('aiScenesOutput');
            if (!scenesOutput || !scenesOutput.value.trim()) {
                alert('Tab Trợ Lý AI chưa có nội dung. Hãy tạo phân cảnh trước.');
                return;
            }
            txtPrompts.value = scenesOutput.value.trim();
            // Visually flash the textarea
            txtPrompts.style.borderColor = '#34d399';
            setTimeout(() => { txtPrompts.style.borderColor = ''; }, 1200);
        });
    }

    // ── Parse prompt lines into scenes array ──────────────────
    /**
     * Parse the textarea content into [{ scene: number, label: string, prompt: string }]
     *
     * Supports formats (in priority order):
     *   "THUMBNAIL: prompt text"         → scene 0, label "THUMBNAIL"
     *   "Scene N: prompt text"           → scene N
     *   "N. prompt text" / "N: prompt"   → scene N
     *   plain lines                      → assigned sequential index
     *
     * Multi-line prompts from the WhiskLab extractor are already single-line
     * (newlines replaced with spaces) so this handles them correctly.
     */
    function parsePrompts(rawText) {
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        const scenes = [];
        let sceneIndex = 1;

        for (const line of lines) {
            // ① THUMBNAIL label (scene 0)
            const thumbMatch = line.match(/^(thumbnail):\s*(.+)/i);
            if (thumbMatch) {
                scenes.push({ scene: 0, label: 'THUMBNAIL', prompt: thumbMatch[2].trim() });
                // Don't increment sceneIndex for thumbnail
                continue;
            }

            // ② "Scene N:" or just "N." or "N:"
            const sceneMatch = line.match(/^(?:scene\s*)?(\d+)[.:]\s*(.+)/i);
            if (sceneMatch) {
                const num = parseInt(sceneMatch[1], 10);
                scenes.push({ scene: num, label: `Scene ${num}`, prompt: sceneMatch[2].trim() });
                sceneIndex = num + 1;
                continue;
            }

            // ③ Plain line — assign sequential number
            scenes.push({ scene: sceneIndex, label: `Scene ${sceneIndex}`, prompt: line });
            sceneIndex++;
        }
        return scenes;
    }

    // ── Build skeleton grid cards ─────────────────────────────
    function buildSkeletonGrid(scenes) {
        grid.innerHTML = '';
        generatedImages = [];
        scenes.forEach(({ scene, label }) => {
            const displayLabel = label || (scene === 0 ? 'THUMBNAIL' : `Scene ${scene}`);
            const card = document.createElement('div');
            card.className = 'img-gen-card skeleton';
            card.id = `img-card-scene-${scene}`;
            card.innerHTML = `
                <div class="card-spinner"></div>
                <span class="card-spinner-label">${displayLabel}</span>
                <span class="img-gen-scene-badge">${displayLabel}</span>
            `;
            grid.appendChild(card);
        });
    }

    // ── Update a card when its image is ready ─────────────────
    function revealCard(sceneNum, imagePath) {
        const card = document.getElementById(`img-card-scene-${sceneNum}`);
        if (!card) return;

        card.classList.remove('skeleton');
        card.classList.add('loaded');
        card.innerHTML = `
            <img src="${imagePath}" alt="Scene ${sceneNum}" loading="lazy" />
            <span class="img-gen-scene-badge">Scene ${sceneNum}</span>
            <button class="btn-download-single" title="Tải ảnh này" data-src="${imagePath}" data-scene="${sceneNum}">⬇</button>
        `;

        // Single download handler
        card.querySelector('.btn-download-single').addEventListener('click', (e) => {
            e.stopPropagation();
            const src  = e.currentTarget.dataset.src;
            const num  = e.currentTarget.dataset.scene;
            downloadSingleImage(src, `scene${String(num).padStart(2, '0')}.png`);
        });
    }

    // ── Show error on a card ──────────────────────────────────
    function showCardError(sceneNum) {
        const card = document.getElementById(`img-card-scene-${sceneNum}`);
        if (!card) return;
        card.classList.remove('skeleton');
        card.classList.add('card-error');
        card.innerHTML = `
            <span class="img-gen-scene-badge">Scene ${sceneNum}</span>
            <div class="card-error-icon">⚠️</div>
            <div class="card-error-text">Tạo ảnh thất bại</div>
        `;
    }

    // ── Single image download ─────────────────────────────────
    async function downloadSingleImage(src, filename) {
        try {
            const res = await fetch(src);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Tải ảnh thất bại: ' + e.message);
        }
    }

    // ── Download All as ZIP ───────────────────────────────────
    async function downloadAllAsZip(videoId, images) {
        if (typeof JSZip === 'undefined') {
            alert('JSZip chưa tải xong. Vui lòng thử lại sau vài giây.');
            return;
        }

        btnDownloadAll.disabled = true;
        btnDownloadAll.textContent = '⏳ Đang nén...';

        try {
            const zip = new JSZip();
            const folder = zip.folder(videoId);

            await Promise.all(images.map(async ({ scene, imagePath }) => {
                if (!imagePath) return;
                const res = await fetch(imagePath);
                const blob = await res.blob();
                const filename = `scene${String(scene).padStart(2, '0')}.png`;
                folder.file(filename, blob);
            }));

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${videoId}-images.zip`);
        } catch (e) {
            alert('Nén ZIP thất bại: ' + e.message);
        } finally {
            btnDownloadAll.disabled = false;
            btnDownloadAll.textContent = '⬇ Tải Tất Cả (ZIP)';
        }
    }

    // ── Polling loop ──────────────────────────────────────────
    function startPolling(sessionId, total) {
        const rendered = new Set(); // scene numbers already revealed

        pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/image-session/${sessionId}`);
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();

                // Update progress UI
                progressBar.style.width = data.progress + '%';
                progressCount.textContent = `${data.completed} / ${data.total}`;

                if (data.status === 'running') {
                    progressLabel.textContent = `Đang tạo ảnh... (${data.progress}%)`;
                }

                // Reveal newly completed images
                (data.images || []).forEach(img => {
                    if (rendered.has(img.scene)) return;
                    rendered.add(img.scene);

                    if (img.imagePath) {
                        revealCard(img.scene, img.imagePath);
                        generatedImages.push(img);
                    } else {
                        showCardError(img.scene);
                    }
                });

                // Done states
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollingInterval);
                    pollingInterval = null;

                    if (data.status === 'completed') {
                        progressLabel.textContent = `✅ Hoàn tất! Đã tạo ${data.completed}/${data.total} ảnh.`;
                        progressBar.style.width = '100%';
                        if (generatedImages.length > 0) {
                            btnDownloadAll.style.display = 'inline-flex';
                        }
                    } else {
                        progressLabel.textContent = `❌ Lỗi: ${data.error || 'Không rõ nguyên nhân'}`;
                        showError(data.error || 'Image generation failed.');
                    }

                    btnStart.disabled = false;
                    btnStart.textContent = '🔄 Tạo Lại';
                }

            } catch (e) {
                console.error('[Image Gen Polling] Error:', e.message);
            }
        }, 1500);
    }

    // ── Show error box ────────────────────────────────────────
    function showError(msg) {
        errorBox.style.display = 'block';
        errorBox.textContent = '❌ ' + msg;
    }

    // ── Start button handler ──────────────────────────────────
    btnStart.addEventListener('click', async () => {
        const videoId = inputVideoId.value.trim();
        const rawText = txtPrompts.value.trim();

        // Reset error
        errorBox.style.display = 'none';
        errorBox.textContent = '';

        if (!videoId) {
            alert('Vui lòng nhập hoặc tạo Video ID trước.');
            return;
        }
        if (!rawText) {
            alert('Vui lòng nhập danh sách prompts. Hoặc click "Lấy từ Tab AI" để import.');
            return;
        }

        const scenes = parsePrompts(rawText);
        if (scenes.length === 0) {
            alert('Không thể phân tích danh sách prompts. Hãy kiểm tra lại định dạng.');
            return;
        }

        // Stop any existing polling
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }

        // Build skeleton grid
        buildSkeletonGrid(scenes);
        generatedImages = [];
        btnDownloadAll.style.display = 'none';

        // Show progress
        progressWrap.style.display = 'block';
        progressBar.style.width = '0%';
        progressLabel.textContent = 'Đang gửi yêu cầu...';
        progressCount.textContent = `0 / ${scenes.length}`;

        btnStart.disabled = true;
        btnStart.textContent = '⏳ Đang xử lý...';

        try {
            const res = await fetch('/api/generate-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, scenes })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const { sessionId, total } = await res.json();
            progressLabel.textContent = `Đã bắt đầu – ${total} scenes đang được xử lý...`;
            startPolling(sessionId, total);

        } catch (e) {
            console.error('[Image Gen] Start error:', e);
            showError(e.message);
            progressWrap.style.display = 'none';
            btnStart.disabled = false;
            btnStart.textContent = '🎨 Bắt Đầu Tạo Ảnh';
        }
    });

    // ── Download All handler ──────────────────────────────────
    if (btnDownloadAll) {
        btnDownloadAll.addEventListener('click', () => {
            const videoId = inputVideoId.value.trim() || 'video';
            downloadAllAsZip(videoId, generatedImages);
        });
    }
}

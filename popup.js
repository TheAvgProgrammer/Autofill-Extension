const SUPABASE_WORK_PROOF_URL = 'https://autofill-backend.vercel.app/api/v1/upload';
const SUPABASE_ANON_KEY = 'SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc3FtdXZnbm9seW1ydWdwcmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTIyMjcsImV4cCI6MjA3MDQ4ODIyN30.6eS8BFIJmTqZ_2v8oLsE9tvEUvBEBJ4zIeAVVLbcwF8'

document.addEventListener('DOMContentLoaded', function() {
    const profileTab = document.getElementById('profileTab');
    const autofillTab = document.getElementById('autofillTab');
    const profileSection = document.getElementById('profileSection');
    const autofillSection = document.getElementById('autofillSection');
    const tabIndicator = document.querySelector('.tab-indicator');
    const profileSelect = document.getElementById('profileSelect');
    const deleteProfileBtn = document.getElementById('deleteProfileBtn');
    const resumeInput = document.getElementById('resume');

    // Form elements
    const profileForm = document.getElementById('profileForm');
    const autofillBtn = document.getElementById('autofillBtn');
    const statusDiv = document.getElementById('status');
    const screenshotBtn = document.getElementById('screenshotBtn');
    const screenshotPreview = document.getElementById('screenshotPreview');
    const screenshotImage = document.getElementById('screenshotImage');
    const sendProofBtn = document.getElementById('sendProofBtn');

    let currentProfileId = '1';
    let activeTab = 'profile';
    let lastScreenshotDataUrl = null;

    function updateSendProofButton(isEnabled) {
        if (sendProofBtn) {
            sendProofBtn.disabled = !isEnabled;
        }
    }


    // Tabs
    profileTab.addEventListener('click', () => switchTab('profile'));
    autofillTab.addEventListener('click', () => switchTab('autofill'));

    // Keyboard navigation for tabs
    [profileTab, autofillTab].forEach(tab => {
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextTab = tab === profileTab ? autofillTab : profileTab;
                nextTab.focus();
                nextTab.click();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevTab = tab === autofillTab ? profileTab : autofillTab;
                prevTab.focus();
                prevTab.click();
            }
        });
    });

    function switchTab(tab) {
        [profileSection, autofillSection].forEach(s => s.classList.remove('active'));
        [profileTab, autofillTab].forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        
        if (tab === 'profile') {
            profileSection.classList.add('active'); 
            profileTab.classList.add('active');
            profileTab.setAttribute('aria-selected', 'true');
        }
        if (tab === 'autofill') { 
            autofillSection.classList.add('active'); 
            autofillTab.classList.add('active');
            autofillTab.setAttribute('aria-selected', 'true');
        }

        activeTab = tab;
        moveTabIndicator();
        try { chrome.storage.local.set({ activeTab: tab }); } catch (e) {}
    }

    function moveTabIndicator() {
        if (!tabIndicator) return;
        const activeBtn = activeTab === 'profile' ? profileTab : autofillTab;
        if (!activeBtn) return;
        const rect = activeBtn.getBoundingClientRect();
        const parentRect = activeBtn.parentElement.getBoundingClientRect();
        const x = rect.left - parentRect.left;
        tabIndicator.style.transform = `translateX(${Math.max(0, x)}px)`;
        tabIndicator.style.width = `${rect.width}px`;
    }

    // Profile selector
    profileSelect.addEventListener('change', function() {
        currentProfileId = this.value;
        loadProfile(currentProfileId);
    });

    // Delete profile
    deleteProfileBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this profile?')) {
            deleteProfile(currentProfileId);
        }
    });

    // Load and save profile + restore last active tab
    try {
        chrome.storage.local.get(['activeTab'], ({ activeTab: savedTab }) => {
            if (savedTab === 'autofill') { switchTab('autofill'); } else { switchTab('profile'); }
            requestAnimationFrame(moveTabIndicator);
        });
    } catch (e) {
        switchTab('profile');
        requestAnimationFrame(moveTabIndicator);
    }
    loadProfile(currentProfileId);
    profileForm.addEventListener('submit', handleProfileSave);

    function loadProfile(profileId) {
        chrome.storage.local.get([`profile_${profileId}`, `resumeFile_${profileId}`], (result) => {
            const profile = result[`profile_${profileId}`];
            const resumeFile = result[`resumeFile_${profileId}`];
            
            // Clear form first
            profileForm.reset();
            
            if (profile) {
                console.log('Loaded profile:', profile);
                // Populate form fields with saved data
                Object.keys(profile).forEach(key => {
                    const element = document.getElementById(key);
                    if (element && element.type !== 'file') {
                        if (element.type === 'radio') {
                            // For radio buttons, find the correct one by value
                            const radioButton = document.querySelector(`input[name="${key}"][value="${profile[key]}"]`);
                            if (radioButton) {
                                radioButton.checked = true;
                            }
                        } else {
                            element.value = profile[key] || '';
                        }
                    } else if (!element && key !== 'resume') {
                        // Handle radio buttons by name
                        const radioButton = document.querySelector(`input[name="${key}"][value="${profile[key]}"]`);
                        if (radioButton) {
                            radioButton.checked = true;
                        }
                    }
                });
            }
            
            // Show resume file name if exists
            updateResumeDisplay(resumeFile);
            
            // Update profile selector label
            updateProfileLabel(profileId, profile);
        });
    }

    function updateProfileLabel(profileId, profile) {
        const option = profileSelect.querySelector(`option[value="${profileId}"]`);
        if (profile && (profile.linkedinUrl || profile.usWorkEligible || profile.sponsorshipRequired)) {
            option.textContent = `Profile ${profileId} (configured)`;
        } else {
            option.textContent = `Profile ${profileId}`;
        }
    }

    function updateResumeDisplay(resumeFile) {
        const resumeInput = document.getElementById('resume');
        const existingDisplay = document.getElementById('currentResume');
        
        // Remove existing display if any
        if (existingDisplay) {
            existingDisplay.remove();
        }
        
        if (resumeFile && resumeFile.name) {
            const resumeDisplay = document.createElement('div');
            resumeDisplay.id = 'currentResume';
            resumeDisplay.className = 'current-resume';
            resumeDisplay.innerHTML = `
                <span class="current-resume-text">Current: ${resumeFile.name}</span>
                <button type="button" class="btn-remove-resume" onclick="removeCurrentResume()">×</button>
            `;
            resumeInput.parentNode.appendChild(resumeDisplay);
            const removeBtn = resumeDisplay.querySelector('.btn-remove-resume');
            if (removeBtn) {
                removeBtn.textContent = '×';
                removeBtn.setAttribute('aria-label', 'Remove current resume');
                removeBtn.setAttribute('title', 'Remove');
            }
        }
    }

    // Make removeCurrentResume globally available
    window.removeCurrentResume = function() {
        const currentResumeDiv = document.getElementById('currentResume');
        if (currentResumeDiv) {
            currentResumeDiv.remove();
        }
        // Clear the resume file from storage for current profile
        chrome.storage.local.remove([`resumeFile_${currentProfileId}`], () => {
            showStatus('Resume file removed', 'info');
        });
    };

    async function handleProfileSave(e) {
        e.preventDefault();

        const formData = new FormData(profileForm);
        const profile = {};

        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                continue;
            }

            if (typeof value === 'string') {
                profile[key] = value.trim();
            } else {
                profile[key] = value;
            }
        }

        const requiredFields = ['usWorkEligible', 'sponsorshipRequired'];
        const missingFields = requiredFields.filter(field => !profile[field]);

        // Clear previous error states
        document.querySelectorAll('.form-group.error').forEach(group => {
            group.classList.remove('error');
            const errorMsg = group.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });

        if (missingFields.length > 0) {
            missingFields.forEach(field => {
                const element = document.getElementById(field);
                if (element) {
                    const formGroup = element.closest('.form-group');
                    if (formGroup) {
                        formGroup.classList.add('error');
                        const errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        errorMsg.textContent = 'This field is required';
                        formGroup.appendChild(errorMsg);
                    }
                }
            });
            
            // Scroll to first error
            const firstError = document.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            showStatus('Please fill in all required fields', 'error');
            return;
        }



        // Add success states to all fields
        document.querySelectorAll('.form-group').forEach(group => {
            const input = group.querySelector('input, select, textarea');
            if (input && input.value) {
                group.classList.add('success');
                setTimeout(() => group.classList.remove('success'), 2000);
            }
        });

        const file = resumeInput.files[0];
        const successMessage = file ? 'Profile and resume saved!' : 'Profile saved successfully!';

        const saveToStorage = (resumeFileData) => {
            const storageData = {};
            storageData[`profile_${currentProfileId}`] = profile;
            if (resumeFileData) {
                storageData[`resumeFile_${currentProfileId}`] = resumeFileData;
            }
            
            chrome.storage.local.set(storageData, () => {
                showStatus(successMessage, 'success');
                updateProfileLabel(currentProfileId, profile);

                // Show success animation
                showSuccessOverlay();

                setTimeout(() => {
                    switchTab('autofill');
                }, 1800);
            });
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                saveToStorage({
                    name: file.name,
                    type: file.type,
                    data: reader.result
                });
            };
            reader.onerror = () => {
                showStatus('Failed to read the resume file. Please try again.', 'error');
            };
            reader.readAsDataURL(file);
        } else {
            chrome.storage.local.get([`resumeFile_${currentProfileId}`], (result) => {
                saveToStorage(result[`resumeFile_${currentProfileId}`] || null);
            });
        }
    }

    function deleteProfile(profileId) {
        chrome.storage.local.remove([`profile_${profileId}`, `resumeFile_${profileId}`], () => {
            showStatus('Profile deleted successfully!', 'success');
            loadProfile(profileId); // Reload to clear form
        });
    }

    autofillBtn.addEventListener('click', handleAutofill);
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', handleScreenshotCapture);
    }
    if (sendProofBtn) {
        sendProofBtn.addEventListener('click', handleSendProof);
        updateSendProofButton(false);
    }

    function handleScreenshotCapture() {
        if (!screenshotBtn) {
            return;
        }

        screenshotBtn.disabled = true;
        showStatus('Capturing screenshot...', 'info');
        updateSendProofButton(false);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                screenshotBtn.disabled = false;
                showStatus(`Failed to access the active tab: ${chrome.runtime.lastError.message}`, 'error');
                updateSendProofButton(Boolean(lastScreenshotDataUrl));
                return;
            }

            const activeTab = tabs && tabs.length ? tabs[0] : null;
            if (!activeTab) {
                screenshotBtn.disabled = false;
                showStatus('No active tab found to capture.', 'error');
                updateSendProofButton(Boolean(lastScreenshotDataUrl));
                return;
            }

            chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' }, (dataUrl) => {
                screenshotBtn.disabled = false;
                if (chrome.runtime.lastError) {
                    showStatus(`Failed to capture screenshot: ${chrome.runtime.lastError.message}`, 'error');
                    updateSendProofButton(Boolean(lastScreenshotDataUrl));
                    return;
                }

                if (!dataUrl) {
                    showStatus('Failed to capture screenshot. Please try again.', 'error');
                    updateSendProofButton(Boolean(lastScreenshotDataUrl));
                    return;
                }

                if (screenshotImage) {
                    screenshotImage.src = dataUrl;
                }
                if (screenshotPreview) {
                    screenshotPreview.classList.remove('hidden');
                }

                lastScreenshotDataUrl = dataUrl;
                updateSendProofButton(true);
                showStatus('Screenshot captured. Ready to send proof.', 'success');
            });
        });
    }
    function handleSendProof() {
        if (!lastScreenshotDataUrl) {
            showStatus('Please capture a screenshot before sending proof.', 'error');
            return;
        }

        sendScreenshotToSupabase(lastScreenshotDataUrl);
    }


    function sendScreenshotToSupabase(dataUrl) {
        if (!dataUrl) {
            showStatus('No screenshot available to send. Please capture one first.', 'error');
            updateSendProofButton(Boolean(lastScreenshotDataUrl));
            return;
        }

        updateSendProofButton(false);

        chrome.storage.local.get([`profile_${currentProfileId}`], (result) => {
            const profile = result[`profile_${currentProfileId}`];

            if (!profile) {
                showStatus('Screenshot ready, but no saved profile found to identify the client.', 'warning');
                updateSendProofButton(Boolean(lastScreenshotDataUrl));
                return;
            }

            // Use profile ID as client name since we no longer store first/last name
            const clientName = `Profile ${currentProfileId}`;

            if (!clientName) {
                showStatus('Screenshot ready, but unable to identify client from profile.', 'error');
                updateSendProofButton(Boolean(lastScreenshotDataUrl));
                return;
            }

            if (!SUPABASE_WORK_PROOF_URL) {
                console.warn('Supabase work proof endpoint is not configured.');
                showStatus('Screenshot captured. Add your Supabase endpoint to upload proof.', 'warning');
                updateSendProofButton(Boolean(lastScreenshotDataUrl));
                return;
            }

            showStatus('Uploading screenshot to Supabase...', 'info');

            fetch(SUPABASE_WORK_PROOF_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_name: clientName,
                    screenshot: dataUrl
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    showStatus('Screenshot uploaded to Supabase successfully!', 'success');
                })
                .catch(error => {
                    console.error('Failed to upload screenshot to Supabase:', error);
                    showStatus(`Screenshot captured, but upload failed: ${error.message}`, 'error');
                })
                .finally(() => {
                    updateSendProofButton(Boolean(lastScreenshotDataUrl));
                });
        });
    }

    function handleAutofill() {
        // Check if current profile exists
        chrome.storage.local.get([`profile_${currentProfileId}`, `resumeFile_${currentProfileId}`], (result) => {
            const profile = result[`profile_${currentProfileId}`];
            const resumeFile = result[`resumeFile_${currentProfileId}`];
            
            if (!profile) {
                showStatus('Please save a profile first!', 'error');
                switchTab('profile');
                return;
            }
            
            autofillBtn.disabled = true;
            autofillBtn.classList.add('loading');
            
            // Show progress
            showProgressBar();
            showStatus('Analyzing page and filling forms...', 'info');
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'autofill',
                        profile: profile,
                        resumeFile: resumeFile,
                    }, (response) => {
                        autofillBtn.disabled = false;
                        autofillBtn.classList.remove('loading');
                        hideProgressBar();
                        
                        if (chrome.runtime.lastError) {
                            showStatus('Error: Could not access page. Try refreshing the page.', 'error');
                            return;
                        }
                        
                        if (response && response.success) {
                            showStatus(`Successfully filled ${response.fieldsFound} out of ${response.totalFields} fields!`, 'success');
                            showSuccessOverlay();
                        } else {
                            showStatus('Autofill failed: ' + (response?.error || 'Unknown error'), 'error');
                        }
                    });
                }
            });
        });
    }

    function showStatus(msg, type='info') {
        statusDiv.textContent = msg;
        statusDiv.className = 'status-message ' + type;
        statusDiv.classList.add('show');
        
        // Auto-hide success and info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                statusDiv.classList.remove('show');
            }, 3500);
        }
        
        // Keep error messages visible longer
        if (type === 'error') {
            setTimeout(() => {
                statusDiv.classList.remove('show');
            }, 5000);
        }
    }

    // Initialize profile labels on load
    for (let i = 1; i <= 5; i++) {
        chrome.storage.local.get([`profile_${i}`], (result) => {
            const profile = result[`profile_${i}`];
            updateProfileLabel(i.toString(), profile);
        });
    }

    // Button ripple interactions
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = ((e.clientX || 0) - rect.left) / rect.width * 100;
            const y = ((e.clientY || 0) - rect.top) / rect.height * 100;
            btn.style.setProperty('--rx', x + '%');
            btn.style.setProperty('--ry', y + '%');
            btn.classList.add('rippling');
            setTimeout(() => btn.classList.remove('rippling'), 600);
        });
    });

    // Add input validation feedback
    document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(input => {
        input.addEventListener('blur', (e) => {
            const formGroup = e.target.closest('.form-group');
            if (!formGroup) return;
            
            formGroup.classList.remove('error', 'success');
            const errorMsg = formGroup.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
            
            if (e.target.hasAttribute('required') && !e.target.value.trim()) {
                formGroup.classList.add('error');
                const msg = document.createElement('div');
                msg.className = 'error-message';
                msg.textContent = 'This field is required';
                formGroup.appendChild(msg);
            } else if (e.target.value.trim()) {
                formGroup.classList.add('success');
            }
        });
        
        // Clear error on input
        input.addEventListener('input', (e) => {
            const formGroup = e.target.closest('.form-group');
            if (formGroup && formGroup.classList.contains('error')) {
                formGroup.classList.remove('error');
                const errorMsg = formGroup.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            }
        });
    });

    // Helper functions
    function showProgressBar() {
        let progressContainer = document.getElementById('autofillProgress');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'autofillProgress';
            progressContainer.className = 'progress-bar';
            progressContainer.innerHTML = '<div class="progress-fill" style="width: 0%"></div>';
            statusDiv.parentNode.insertBefore(progressContainer, statusDiv.nextSibling);
        }
        
        const fill = progressContainer.querySelector('.progress-fill');
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 90) {
                clearInterval(interval);
            } else {
                width += Math.random() * 15;
                if (width > 90) width = 90;
                fill.style.width = width + '%';
            }
        }, 200);
        
        progressContainer.dataset.interval = interval;
    }

    function hideProgressBar() {
        const progressContainer = document.getElementById('autofillProgress');
        if (progressContainer) {
            const interval = progressContainer.dataset.interval;
            if (interval) clearInterval(parseInt(interval));
            
            const fill = progressContainer.querySelector('.progress-fill');
            fill.style.width = '100%';
            
            setTimeout(() => {
                progressContainer.style.opacity = '0';
                setTimeout(() => progressContainer.remove(), 300);
            }, 500);
        }
    }

    function showSuccessOverlay() {
        let overlay = document.getElementById('successOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'successOverlay';
            overlay.className = 'success-overlay';
            overlay.innerHTML = '<div class="success-icon">✓</div>';
            document.body.appendChild(overlay);
        }
        
        setTimeout(() => overlay.classList.add('show'), 10);
        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 500);
        }, 1500);
    }

    // Add tooltips to buttons
    function addTooltip(element, text) {
        element.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = text;
            document.body.appendChild(tooltip);
            
            const rect = element.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
            
            setTimeout(() => tooltip.classList.add('show'), 10);
            
            element.addEventListener('mouseleave', () => {
                tooltip.classList.remove('show');
                setTimeout(() => tooltip.remove(), 300);
            }, { once: true });
        });
    }

    // Add tooltips to various elements
    if (autofillBtn) addTooltip(autofillBtn, 'Fill forms with your saved profile');
    if (screenshotBtn) addTooltip(screenshotBtn, 'Capture current page screenshot');
    if (sendProofBtn) addTooltip(sendProofBtn, 'Send screenshot as proof of application');
    if (deleteProfileBtn) addTooltip(deleteProfileBtn, 'Delete this profile permanently');
});


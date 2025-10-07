const SUPABASE_WORK_PROOF_URL = 'http://localhost:3000/api/v1/upload';
const SUPABASE_ANON_KEY = 'SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc3FtdXZnbm9seW1ydWdwcmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTIyMjcsImV4cCI6MjA3MDQ4ODIyN30.6eS8BFIJmTqZ_2v8oLsE9tvEUvBEBJ4zIeAVVLbcwF8'

document.addEventListener('DOMContentLoaded', function() {
    const profileTab = document.getElementById('profileTab');
    const autofillTab = document.getElementById('autofillTab');
    const profileSection = document.getElementById('profileSection');
    const autofillSection = document.getElementById('autofillSection');
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
    let lastScreenshotDataUrl = null;

    function updateSendProofButton(isEnabled) {
        if (sendProofBtn) {
            sendProofBtn.disabled = !isEnabled;
        }
    }


    // Tabs
    profileTab.addEventListener('click', () => switchTab('profile'));
    autofillTab.addEventListener('click', () => switchTab('autofill'));

    function switchTab(tab) {
        [profileSection, autofillSection].forEach(s => s.classList.remove('active'));
        [profileTab, autofillTab].forEach(b => b.classList.remove('active'));
        
        if (tab === 'profile') {
            profileSection.classList.add('active'); 
            profileTab.classList.add('active');
        }
        if (tab === 'autofill') {
            autofillSection.classList.add('active'); 
            autofillTab.classList.add('active');
        }
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

    // Load and save profile
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
                        element.value = profile[key] || '';
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
        if (profile && profile.firstName && profile.lastName) {
            option.textContent = `Profile ${profileId}: ${profile.firstName} ${profile.lastName}`;
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

        const requiredFields = ['firstName', 'lastName', 'email', 'countryCode', 'phone', 'country', 'state', 'city', 'pincode', 'usWorkEligible', 'sponsorshipRequired'];
        const missingFields = requiredFields.filter(field => !profile[field]);

        if (missingFields.length > 0) {
            showStatus('Please fill in all required fields: ' + missingFields.join(', '), 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profile.email)) {
            showStatus('Please enter a valid email address', 'error');
            return;
        }

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

                setTimeout(() => {
                    switchTab('autofill');
                }, 1500);
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

            const firstName = (profile.firstName || '').trim();
            const lastName = (profile.lastName || '').trim();
            const clientName = [firstName, lastName].filter(Boolean).join(' ');

            if (!clientName) {
                showStatus('Screenshot ready, but the profile is missing a first or last name.', 'error');
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
            showStatus('Filling forms with regex matching...', 'info');
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'autofill',
                        profile: profile,
                        resumeFile: resumeFile,
                    }, (response) => {
                        autofillBtn.disabled = false;
                        autofillBtn.classList.remove('loading');
                        
                        if (chrome.runtime.lastError) {
                            showStatus('Error: Could not access page. Try refreshing the page.', 'error');
                            return;
                        }
                        
                        if (response && response.success) {
                            showStatus(`Successfully filled ${response.fieldsFound} out of ${response.totalFields} fields!`, 'success');
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
    }

    // Initialize profile labels on load
    for (let i = 1; i <= 5; i++) {
        chrome.storage.local.get([`profile_${i}`], (result) => {
            const profile = result[`profile_${i}`];
            updateProfileLabel(i.toString(), profile);
        });
    }
});


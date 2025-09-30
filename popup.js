document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const profileTab = document.getElementById('profileTab');
    const autofillTab = document.getElementById('autofillTab');
    const profileSection = document.getElementById('profileSection');
    const autofillSection = document.getElementById('autofillSection');
    const resumeInput = document.getElementById('resume');

    // Form elements
    const profileForm = document.getElementById('profileForm');
    const autofillBtn = document.getElementById('autofillBtn');
    const statusDiv = document.getElementById('status');

    // Load saved profile data on startup
    loadProfile();

    // Tab switching
    profileTab.addEventListener('click', () => switchTab('profile'));
    autofillTab.addEventListener('click', () => switchTab('autofill'));

    // Profile form submission
    profileForm.addEventListener('submit', handleProfileSave);

    // Autofill button
    autofillBtn.addEventListener('click', handleAutofill);

    function switchTab(tab) {
        if (tab === 'profile') {
            profileTab.classList.add('active');
            autofillTab.classList.remove('active');
            profileSection.classList.add('active');
            autofillSection.classList.remove('active');
        } else {
            autofillTab.classList.add('active');
            profileTab.classList.remove('active');
            autofillSection.classList.add('active');
            profileSection.classList.remove('active');
        }
    }

    function loadProfile() {
        chrome.storage.local.get(['userProfile', 'resumeFile'], (result) => {
            if (result.userProfile) {
                const profile = result.userProfile;
                console.log('Loaded profile:', profile);
                // Populate form fields with saved data
                Object.keys(profile).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) {
                        element.value = profile[key] || '';
                    }
                });
            }
        });
    }

    function handleProfileSave(e) {
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

        const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
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
            chrome.storage.local.set({ userProfile: profile, resumeFile: resumeFileData }, () => {
                showStatus(successMessage, 'success');

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
            chrome.storage.local.get(['resumeFile'], (result) => {
                saveToStorage(result.resumeFile || null);
            });
        }
    }

    function handleAutofill() {
        // Check if profile exists
        chrome.storage.local.get(['userProfile', 'resumeFile'], (result) => {
            if (!result.userProfile) {
                showStatus('Please save your profile first!', 'error');
                switchTab('profile');
                return;
            }

            // Disable button and show loading state
            autofillBtn.disabled = true;
            autofillBtn.classList.add('loading');
            showStatus('Analyzing page with AI...', 'info');

            // Get current active tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    // Send message to content script
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'autofill',
                        profile: result.userProfile,
                        resumeFile: result.resumeFile,
                    }, (response) => {
                        // Re-enable button
                        autofillBtn.disabled = false;
                        autofillBtn.classList.remove('loading');

                        if (chrome.runtime.lastError) {
                            showStatus('Error: Could not access page. Try refreshing the page.', 'error');
                            return;
                        }

                        if (response && response.success) {
                            const method = response.method === 'ai-powered' ? 'AI-powered' : 
                                         response.method === 'regex-fallback' ? 'Regex-based (AI fallback)' : 'Standard';
                            const message = response.fieldsFound > 0 
                                ? `${method} autofill: Successfully filled ${response.fieldsFound} field(s)!`
                                : 'No matching form fields found on this page.';
                            showStatus(message, response.fieldsFound > 0 ? 'success' : 'info');
                            
                            // Show additional info for fallback cases
                            if (response.method === 'regex-fallback' && response.aiError) {
                                console.warn('AI autofill failed:', response.aiError);
                            }
                        } else {
                            showStatus('Autofill completed. Check the page for filled fields.', 'info');
                        }
                    });
                }
            });
        });
    }

    function showStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        
        // Clear status after 5 seconds
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status-message';
        }, 5000);
    }

    // Clear status when switching tabs
    function clearStatus() {
        statusDiv.textContent = '';
        statusDiv.className = 'status-message';
    }

    // Add clear status to tab switches
    const originalSwitchTab = switchTab;
    switchTab = function(tab) {
        clearStatus();
        originalSwitchTab(tab);
    };
});
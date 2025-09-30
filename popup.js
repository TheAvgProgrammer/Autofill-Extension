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

    let currentProfileId = '1';

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

        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'country', 'state', 'city', 'pincode'];
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
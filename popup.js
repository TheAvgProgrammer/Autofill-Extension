// Supabase auth config - fill in keys later
const SUPABASE_URL = "";
const SUPABASE_KEY = "";
let supabase;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = window.createClient(SUPABASE_URL, SUPABASE_KEY);
}

document.addEventListener('DOMContentLoaded', function() {
    const loginTab = document.getElementById('loginTab');
    const profileTab = document.getElementById('profileTab');
    const autofillTab = document.getElementById('autofillTab');
    const loginSection = document.getElementById('loginSection');
    const profileSection = document.getElementById('profileSection');
    const autofillSection = document.getElementById('autofillSection');
    const resumeInput = document.getElementById('resume');

    // Form elements
    const profileForm = document.getElementById('profileForm');
    const loginForm = document.getElementById('loginForm');
    const autofillBtn = document.getElementById('autofillBtn');
    const statusDiv = document.getElementById('status');
    const loginStatus = document.getElementById('loginStatus');
    const resumeInput = document.getElementById('resume');

    // Tabs
    loginTab.addEventListener('click', () => switchTab('login'));
    profileTab.addEventListener('click', () => switchTab('profile'));
    autofillTab.addEventListener('click', () => switchTab('autofill'));

    function switchTab(tab) {
        [loginSection, profileSection, autofillSection].forEach(s => s.classList.remove('active'));
        [loginTab, profileTab, autofillTab].forEach(b => b.classList.remove('active'));
        if (tab === 'login') {
            loginSection.classList.add('active'); loginTab.classList.add('active');
        }
        if (tab === 'profile') {
            profileSection.classList.add('active'); profileTab.classList.add('active');
        }
        if (tab === 'autofill') {
            autofillSection.classList.add('active'); autofillTab.classList.add('active');
        }
    }

    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            loginStatus.textContent = 'Logging in...';
            if (!supabase) {
                loginStatus.textContent = "Supabase keys not configured.";
                return;
            }
            const email = loginForm.loginEmail.value;
            const password = loginForm.loginPassword.value;
            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    loginStatus.textContent = 'Login failed: ' + error.message;
                } else {
                    loginStatus.textContent = 'Login successful!';
                    setTimeout(() => switchTab('profile'), 1200);
                }
            } catch (err) {
                loginStatus.textContent = 'Login error: ' + err.message;
            }
        });
    }

    // Load and save profile
    loadProfile();
    profileForm.addEventListener('submit', handleProfileSave);

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

    autofillBtn.addEventListener('click', handleAutofill);

    function handleAutofill() {
        // Check if profile exists
        chrome.storage.local.get(['userProfile', 'resumeFile'], (result) => {
            if (!result.userProfile) {
                showStatus('Please save your profile first!', 'error');
                switchTab('profile');
                return;
            }
            autofillBtn.disabled = true;
            autofillBtn.classList.add('loading');
            showStatus('Analyzing page with AI...', 'info');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    // Send resume file along with profile
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'autofill',
                        profile: result.userProfile,
                        resumeFile: result.resumeFile,
                    }, (response) => {
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

    function showStatus(msg, type='info') {
        statusDiv.textContent = msg;
        statusDiv.className = 'status-message ' + type;
    }
});

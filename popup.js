// Supabase auth config - fill in keys later
const SUPABASE_URL = "";
const SUPABASE_KEY = "";
let supabase;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

document.addEventListener('DOMContentLoaded', function() {
    const loginTab = document.getElementById('loginTab');
    const profileTab = document.getElementById('profileTab');
    const autofillTab = document.getElementById('autofillTab');
    const loginSection = document.getElementById('loginSection');
    const profileSection = document.getElementById('profileSection');
    const autofillSection = document.getElementById('autofillSection');
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
            const p = result.userProfile;
            if (p) {
                profileForm.firstName.value = p.firstName || "";
                profileForm.lastName.value = p.lastName || "";
                profileForm.email.value = p.email || "";
                profileForm.portfolio.value = p.portfolio || "";
            }
            // No need to prefill file input for security
        });
    }

    async function handleProfileSave(e) {
        e.preventDefault();
        const userProfile = {
            firstName: profileForm.firstName.value,
            lastName: profileForm.lastName.value,
            email: profileForm.email.value,
            portfolio: profileForm.portfolio.value
        };
        // Handle resume upload
        const file = resumeInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                const base64String = evt.target.result;
                chrome.storage.local.set({userProfile, resumeFile: {name: file.name, type: file.type, data: base64String}}, () => {
                    showStatus('Profile & resume saved!', 'success');
                    setTimeout(() => switchTab('autofill'), 1500);
                });
            };
            reader.readAsDataURL(file);
        } else {
            chrome.storage.local.set({userProfile, resumeFile: null}, () => {
                showStatus('Profile saved!', 'success');
                setTimeout(() => switchTab('autofill'), 1500);
            });
        }
    }

    autofillBtn.addEventListener('click', handleAutofill);

    function handleAutofill() {
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
                        resumeFile: result.resumeFile
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

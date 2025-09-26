(function() {
    // ... existing code and AIService integration ...

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'autofill') {
            const { profile, resumeFile } = request;
            performAIAutofill(profile, resumeFile)
                .then(result => sendResponse(result))
                .catch(error => {
                    // Fallback to regex-based autofill
                    const fallbackResult = performAutofill(profile, resumeFile);
                    fallbackResult.method = 'regex-fallback';
                    fallbackResult.aiError = error.message;
                    sendResponse(fallbackResult);
                });
            return true; // async
        }
        return true;
    });

    // AI autofill (extends existing)
    async function performAIAutofill(profile, resumeFile) {
        try {
            // Get AI service instance
            const aiService = new AIService();
            
            // Get page HTML for AI analysis
            const pageHTML = document.documentElement.outerHTML;
            
            // Generate field mappings using AI
            const fieldMappings = await aiService.generateAutofillCode(pageHTML, profile);
            
            let filledCount = 0;
            
            // Fill regular form fields
            for (const mapping of fieldMappings) {
                if (!mapping.selector || !mapping.value) continue;
                const el = document.querySelector(mapping.selector);
                if (el) {
                    if (el.type === 'file' && resumeFile && resumeFile.data) {
                        // Handle file inputs with resume upload
                        try {
                            const dt = new DataTransfer();
                            const arr = atob(resumeFile.data.split(',')[1]);
                            const mime = resumeFile.type;
                            const u8arr = new Uint8Array(arr.length);
                            for (let i = 0; i < arr.length; ++i) u8arr[i] = arr.charCodeAt(i);
                            const fileObj = new File([u8arr], resumeFile.name, { type: mime });
                            dt.items.add(fileObj);
                            el.files = dt.files;
                            filledCount++;
                        } catch(ex) {
                            el.setAttribute("data-autofill-failed", "resume");
                        }
                    } else {
                        fillFieldByElement(el, mapping.value);
                        filledCount++;
                    }
                }
            }
            
            // Also handle any additional file inputs for resume upload
            if (resumeFile && resumeFile.data) {
                document.querySelectorAll("input[type='file']").forEach(el => {
                    // Skip if already filled by AI mapping
                    if (el.files && el.files.length > 0) return;
                    
                    try {
                        const dt = new DataTransfer();
                        const arr = atob(resumeFile.data.split(',')[1]);
                        const mime = resumeFile.type;
                        const u8arr = new Uint8Array(arr.length);
                        for (let i = 0; i < arr.length; ++i) u8arr[i] = arr.charCodeAt(i);
                        const fileObj = new File([u8arr], resumeFile.name, { type: mime });
                        dt.items.add(fileObj);
                        el.files = dt.files;
                        filledCount++;
                    } catch(ex) {
                        el.setAttribute("data-autofill-failed", "resume");
                    }
                });
            }
            
            return {
                success: true,
                method: 'ai-powered',
                fieldsFound: filledCount,
                totalFields: fieldMappings.length
            };
        } catch (error) {
            throw error; // Let the caller handle fallback
        }
    }

    // Helper function to fill form fields
    function fillFieldByElement(element, value) {
        if (!element || !value) return false;
        
        try {
            if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = (value.toLowerCase() === 'true' || value === '1');
            } else if (element.tagName === 'SELECT') {
                // Try to find matching option
                const options = Array.from(element.options);
                const matchingOption = options.find(opt => 
                    opt.text.toLowerCase().includes(value.toLowerCase()) ||
                    opt.value.toLowerCase() === value.toLowerCase()
                );
                if (matchingOption) {
                    element.value = matchingOption.value;
                }
            } else {
                element.value = value;
                // Trigger events to notify the page of changes
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return true;
        } catch (ex) {
            console.warn('Failed to fill field:', ex);
            return false;
        }
    }

    // Regex fallback autofill
    function performAutofill(profile, resumeFile) {
        let fieldsFound = 0;
        
        // Fill resume upload fields first
        if (resumeFile && resumeFile.data) {
            document.querySelectorAll("input[type='file']").forEach(el => {
                try {
                    const dt = new DataTransfer();
                    const arr = atob(resumeFile.data.split(',')[1]);
                    const mime = resumeFile.type;
                    const u8arr = new Uint8Array(arr.length);
                    for (let i = 0; i < arr.length; ++i) u8arr[i] = arr.charCodeAt(i);
                    const fileObj = new File([u8arr], resumeFile.name, { type: mime });
                    dt.items.add(fileObj);
                    el.files = dt.files;
                    fieldsFound++;
                } catch(ex) {
                    el.setAttribute("data-autofill-failed", "resume");
                }
            });
        }
        
        // Fill text fields with profile data
        const profileKeys = {
            firstName: ['first', 'fname', 'given'],
            lastName: ['last', 'lname', 'surname', 'family'],
            email: ['email', 'mail'],
            phone: ['phone', 'tel', 'mobile'],
            address: ['address', 'street'],
            city: ['city'],
            state: ['state', 'province', 'region'],
            zipCode: ['zip', 'postal', 'postcode'],
            country: ['country'],
            education: ['education', 'school', 'university'],
            experience: ['experience', 'work', 'employment'],
            skills: ['skill', 'competenc', 'abilit'],
            linkedin: ['linkedin'],
            portfolio: ['portfolio', 'website', 'site']
        };
        
        Object.keys(profileKeys).forEach(key => {
            const value = profile[key];
            if (!value) return;
            
            const keywords = profileKeys[key];
            keywords.forEach(keyword => {
                // Try various selector patterns
                const selectors = [
                    `input[name*="${keyword}" i]`,
                    `input[id*="${keyword}" i]`,
                    `input[placeholder*="${keyword}" i]`,
                    `textarea[name*="${keyword}" i]`,
                    `textarea[id*="${keyword}" i]`,
                    `select[name*="${keyword}" i]`,
                    `select[id*="${keyword}" i]`
                ];
                
                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        if (!el.value || el.value.trim() === '') {
                            if (fillFieldByElement(el, value)) {
                                fieldsFound++;
                            }
                        }
                    });
                });
            });
        });
        
        return {
            success: true,
            fieldsFound,
            totalFields: fieldsFound
        };
    }
    // ...rest of content.js unchanged...
})();

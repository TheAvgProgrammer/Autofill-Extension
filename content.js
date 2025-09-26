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
        // ... existing AI logic ...
        // After getting fieldMappings from AI:
        // Add resume logic
        // Assume AI can return a selector for file input fields (like input[type='file'])
        // If so, fill the file field using resumeFile data (base64)
        // Otherwise, fallback to regex matching for file fields

        // ...existing code to get fieldMappings...
        // Find file fields
        let filledCount = 0;
        for (const mapping of fieldMappings) {
            if (!mapping.selector || !mapping.value) continue;
            const el = document.querySelector(mapping.selector);
            if (el) {
                if (el.type === 'file' && resumeFile && resumeFile.data) {
                    // Attempt to set file input (not always possible via JS due to browser restrictions)
                    // Try using DataTransfer workaround for test forms
                    try {
                        const dt = new DataTransfer();
                        const arr = atob(resumeFile.data.split(',')[1]);
                        const mime = resumeFile.type;
                        // Convert base64 to Uint8Array
                        const u8arr = new Uint8Array(arr.length);
                        for (let i = 0; i < arr.length; ++i) u8arr[i] = arr.charCodeAt(i);
                        const fileObj = new File([u8arr], resumeFile.name, { type: mime });
                        dt.items.add(fileObj);
                        el.files = dt.files;
                        filledCount++;
                    } catch(ex) {
                        // If browser blocks this, show a message
                        el.setAttribute("data-autofill-failed", "resume");
                    }
                } else {
                    fillFieldByElement(el, mapping.value);
                    filledCount++;
                }
            }
        }
        return {
            success: true,
            method: 'ai-powered',
            fieldsFound: filledCount,
            totalFields: fieldMappings.length
        };
    }

    // Regex fallback autofill
    function performAutofill(profile, resumeFile) {
        // ...existing logic...
        // Find all file inputs and attempt to fill with resumeFile if present
        let fieldsFound = 0;
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
        // ...existing field filling logic for profile keys...
        // Return results
        return {
            success: true,
            fieldsFound,
            totalFields: fieldsFound
        };
    }
    // ...rest of content.js unchanged...
})();

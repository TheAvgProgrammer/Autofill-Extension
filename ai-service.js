// AI Service for Google Gemini API integration
class AIService {
    constructor() {
        this.apiKey = 'AIzaSyBkmQ17R3Ycsko6BufGuHe-m02mfWsai-8';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }

    /**
     * Generates JavaScript code to fill form fields using Google Gemini AI
     * @param {string} pageHTML - The HTML content of the page
     * @param {Object} userProfile - User profile data
     * @returns {Promise<string>} JavaScript code to execute for filling forms
     */
    async generateAutofillCode(pageHTML, userProfile) {
        try {
            const prompt = this.createPrompt(pageHTML, userProfile);
            
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 32,
                        topP: 1,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response format from Gemini API');
            }

            const generatedText = data.candidates[0].content.parts[0].text;
            
            // Extract JavaScript code from the response
            const jsCode = this.extractJavaScript(generatedText);
            
            return jsCode;
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            throw error;
        }
    }

    /**
     * Creates a detailed prompt for the AI to analyze the page and generate autofill code
     * @param {string} pageHTML - The HTML content of the page
     * @param {Object} userProfile - User profile data
     * @returns {string} Formatted prompt for the AI
     */
    createPrompt(pageHTML, userProfile) {
        // Sanitize and truncate HTML if too long
        const sanitizedHTML = this.sanitizeHTML(pageHTML);
        
        return `You are an expert web automation assistant. Your task is to analyze the provided HTML and generate JavaScript code that will intelligently fill job application form fields with the user's profile data.

USER PROFILE DATA:
${JSON.stringify(userProfile, null, 2)}

PAGE HTML:
${sanitizedHTML}

INSTRUCTIONS:
1. Analyze the HTML to identify all form input fields (input, textarea, select elements)
2. Match each field to the most appropriate user profile data based on:
   - Field names, IDs, and attributes
   - Label text content
   - Placeholder text
   - Context and surrounding elements
   - Field types (email, tel, url, text, etc.)

3. Generate JavaScript code that:
   - Uses document.querySelector() or similar to find each field
   - Fills the field with the appropriate profile data
   - Triggers necessary events (input, change, blur, focus) to ensure the change is registered
   - Handles different field types (input, textarea, select) appropriately
   - Skips fields that already contain non-placeholder values
   - Returns a count of successfully filled fields

4. Be intelligent about field matching:
   - "first name", "fname", "given_name" → userProfile.firstName
   - "last name", "lname", "surname", "family_name" → userProfile.lastName
   - "email", "e-mail", "email_address" → userProfile.email
   - "phone", "tel", "mobile", "phone_number" → userProfile.phone
   - And similar intelligent matching for all profile fields

5. Handle edge cases:
   - Multiple fields that could match the same profile data
   - Non-standard field naming conventions
   - Fields with unusual layouts or structures

6. Return ONLY executable JavaScript code wrapped in a function, nothing else.

EXAMPLE OUTPUT FORMAT:
\`\`\`javascript
(function() {
    let filledCount = 0;
    
    // Example field filling logic
    const firstNameField = document.querySelector('input[name="first_name"], input[id*="first"], input[placeholder*="first name" i]');
    if (firstNameField && (!firstNameField.value || firstNameField.value === firstNameField.placeholder)) {
        firstNameField.value = "${userProfile.firstName || ''}";
        ['input', 'change', 'blur'].forEach(eventType => {
            firstNameField.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        filledCount++;
    }
    
    // Add more field filling logic...
    
    return filledCount;
})();
\`\`\`

Generate the JavaScript code now:`;
    }

    /**
     * Sanitizes and truncates HTML to fit within API limits
     * @param {string} html - Raw HTML content
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(html) {
        // Remove script tags and their content for security
        let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Remove style tags and their content to reduce noise
        sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        
        // Remove comments
        sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
        
        // Truncate if too long (Gemini has token limits)
        const maxLength = 8000; // Conservative limit to stay under token limits
        if (sanitized.length > maxLength) {
            // Try to truncate at a reasonable point (end of a tag)
            const truncated = sanitized.substring(0, maxLength);
            const lastTagEnd = truncated.lastIndexOf('>');
            if (lastTagEnd > maxLength * 0.8) {
                sanitized = truncated.substring(0, lastTagEnd + 1);
            } else {
                sanitized = truncated + '...';
            }
        }
        
        return sanitized;
    }

    /**
     * Extracts JavaScript code from the AI response
     * @param {string} response - AI response text
     * @returns {string} Extracted JavaScript code
     */
    extractJavaScript(response) {
        // Look for JavaScript code blocks
        const jsBlockMatch = response.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
        if (jsBlockMatch) {
            return jsBlockMatch[1].trim();
        }
        
        // If no code block found, look for function patterns
        const functionMatch = response.match(/\(function\(\)[^}]*\{[\s\S]*\}\)\(\);?/);
        if (functionMatch) {
            return functionMatch[0];
        }
        
        // Fallback: return the response as-is if it looks like JavaScript
        if (response.includes('document.querySelector') || response.includes('function')) {
            return response.trim();
        }
        
        throw new Error('Could not extract valid JavaScript code from AI response');
    }
}

// Export for use in content script
window.AIService = AIService;
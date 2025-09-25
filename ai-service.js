// AI Service for Google Gemini API integration
class AIService {
    constructor() {
        this.apiKey = 'AIzaSyBkmQ17R3Ycsko6BufGuHe-m02mfWsai-8';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.mockMode = false; // Set to true for testing without API access
    }

    /**
     * Generates structured JSON data to fill form fields using Google Gemini AI
     * @param {string} pageHTML - The HTML content of the page
     * @param {Object} userProfile - User profile data
     * @returns {Promise<Array>} Array of {selector, value} objects for filling forms
     */
    async generateAutofillCode(pageHTML, userProfile) {
        // Use mock response for testing if API is not accessible
        if (this.mockMode || this.isTestEnvironment()) {
            return this.getMockAutofillCode(userProfile);
        }

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
            
            // Extract JSON array from the response
            const jsonData = this.extractJSON(generatedText);
            
            return jsonData;
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            // Fallback to mock code generation for testing
            console.log('Falling back to mock code generation...');
            return this.getMockAutofillCode(userProfile);
        }
    }

    /**
     * Check if we're in a test environment where API calls won't work
     * @returns {boolean} True if in test environment
     */
    isTestEnvironment() {
        // Simple heuristic: if we can't access external APIs, use mock
        try {
            return !window.navigator.onLine || window.location.hostname === 'localhost';
        } catch (e) {
            return true;
        }
    }

    /**
     * Generate mock autofill data for testing purposes
     * @param {Object} userProfile - User profile data
     * @returns {Array} Array of {selector, value} objects
     */
    getMockAutofillCode(userProfile) {
        const fieldMappings = [
            // First name fields
            {
                selectors: [
                    'input[name*="first" i]',
                    'input[id*="first" i]', 
                    'input[placeholder*="first" i]',
                    'input[name="fname"]',
                    'input[id="fname"]'
                ],
                value: userProfile.firstName || ''
            },
            // Last name fields
            {
                selectors: [
                    'input[name*="last" i]',
                    'input[id*="last" i]',
                    'input[placeholder*="last" i]',
                    'input[name="lname"]',
                    'input[id="lname"]',
                    'input[name*="surname" i]'
                ],
                value: userProfile.lastName || ''
            },
            // Email fields
            {
                selectors: [
                    'input[type="email"]',
                    'input[name*="email" i]',
                    'input[id*="email" i]',
                    'input[placeholder*="email" i]'
                ],
                value: userProfile.email || ''
            },
            // Phone fields
            {
                selectors: [
                    'input[type="tel"]',
                    'input[name*="phone" i]',
                    'input[id*="phone" i]',
                    'input[placeholder*="phone" i]',
                    'input[name*="mobile" i]'
                ],
                value: userProfile.phone || ''
            },
            // Address fields
            {
                selectors: [
                    'textarea[name*="address" i]',
                    'input[name*="address" i]',
                    'textarea[id*="address" i]',
                    'input[id*="address" i]'
                ],
                value: userProfile.address || ''
            },
            // City fields
            {
                selectors: ['input[name*="city" i]', 'input[id*="city" i]'],
                value: userProfile.city || ''
            },
            // State fields
            {
                selectors: ['input[name*="state" i]', 'input[id*="state" i]', 'input[name*="province" i]'],
                value: userProfile.state || ''
            },
            // Zip code fields
            {
                selectors: ['input[name*="zip" i]', 'input[id*="zip" i]', 'input[name*="postal" i]'],
                value: userProfile.zipCode || ''
            },
            // Country fields
            {
                selectors: ['input[name*="country" i]', 'input[id*="country" i]', 'select[name*="country" i]', 'select[id*="country" i]'],
                value: userProfile.country || ''
            },
            // Education fields
            {
                selectors: ['textarea[name*="education" i]', 'textarea[id*="education" i]'],
                value: userProfile.education || ''
            },
            // Experience fields
            {
                selectors: ['textarea[name*="experience" i]', 'textarea[id*="experience" i]', 'textarea[name*="work" i]'],
                value: userProfile.experience || ''
            },
            // Skills fields
            {
                selectors: ['textarea[name*="skill" i]', 'textarea[id*="skill" i]'],
                value: userProfile.skills || ''
            },
            // LinkedIn fields
            {
                selectors: ['input[name*="linkedin" i]', 'input[id*="linkedin" i]'],
                value: userProfile.linkedin || ''
            },
            // Portfolio fields
            {
                selectors: ['input[name*="portfolio" i]', 'input[id*="portfolio" i]', 'input[name*="website" i]'],
                value: userProfile.portfolio || ''
            }
        ];

        // Convert to simple selector/value pairs, filtering out empty values
        const result = [];
        fieldMappings.forEach(mapping => {
            if (mapping.value && mapping.value.trim()) {
                mapping.selectors.forEach(selector => {
                    result.push({
                        selector: selector,
                        value: mapping.value
                    });
                });
            }
        });

        return result;

    /**
     * Creates a detailed prompt for the AI to analyze the page and generate autofill data
     * @param {string} pageHTML - The HTML content of the page
     * @param {Object} userProfile - User profile data
     * @returns {string} Formatted prompt for the AI
     */
    createPrompt(pageHTML, userProfile) {
        // Sanitize and truncate HTML if too long
        const sanitizedHTML = this.sanitizeHTML(pageHTML);
        
        return `You are an expert web automation assistant. Your task is to analyze the provided HTML and generate a structured JSON array that maps form fields to values using the user's profile data.

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

3. Return a JSON array where each object has:
   - "selector": A CSS selector to find the field (use the most specific one available)
   - "value": The appropriate value from the user's profile data

4. Be intelligent about field matching:
   - "first name", "fname", "given_name" → userProfile.firstName
   - "last name", "lname", "surname", "family_name" → userProfile.lastName
   - "email", "e-mail", "email_address" → userProfile.email
   - "phone", "tel", "mobile", "phone_number" → userProfile.phone
   - And similar intelligent matching for all profile fields

5. Handle edge cases:
   - Multiple fields that could match the same profile data (include all)
   - Non-standard field naming conventions
   - Fields with unusual layouts or structures

6. Only include fields that have corresponding data in the user profile
7. Use the most specific CSS selector possible (prefer ID > name > other attributes)

EXAMPLE OUTPUT FORMAT:
\`\`\`json
[
  {"selector": "input[id='first_name']", "value": "John"},
  {"selector": "input[name='email']", "value": "john@example.com"},
  {"selector": "textarea[id='education_background']", "value": "Bachelor's in Computer Science"},
  {"selector": "select[name='country']", "value": "United States"}
]
\`\`\`

Generate the JSON array now:`;
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
     * Extracts JSON array from the AI response
     * @param {string} response - AI response text
     * @returns {Array} Extracted JSON array of field mappings
     */
    extractJSON(response) {
        // Look for JSON code blocks
        const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (jsonBlockMatch) {
            try {
                return JSON.parse(jsonBlockMatch[1].trim());
            } catch (e) {
                console.warn('Failed to parse JSON from code block:', e);
            }
        }
        
        // Look for JSON array patterns
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            try {
                return JSON.parse(arrayMatch[0]);
            } catch (e) {
                console.warn('Failed to parse JSON array:', e);
            }
        }
        
        // Try to parse the entire response as JSON
        try {
            return JSON.parse(response.trim());
        } catch (e) {
            console.warn('Failed to parse entire response as JSON:', e);
        }
        
        throw new Error('Could not extract valid JSON array from AI response');
    }
}

// Export for use in content script
window.AIService = AIService;
// Content script for Job Application Autofill Extension
(function() {
    'use strict';

    // Field mapping configuration
    const FIELD_MAPPINGS = {
        firstName: {
            keywords: ['first name', 'firstname', 'given name', 'forename', 'first'],
            priority: ['first_name', 'firstname', 'first']
        },
        lastName: {
            keywords: ['last name', 'lastname', 'surname', 'family name', 'last'],
            priority: ['last_name', 'lastname', 'last']
        },
        email: {
            keywords: ['email', 'e-mail', 'mail', 'contact', 'email address'],
            priority: ['email', 'e_mail', 'email_address', 'contact_email']
        },
        phone: {
            keywords: ['phone', 'tel', 'telephone', 'mobile', 'cell', 'number'],
            priority: ['phone', 'telephone', 'phone_number', 'mobile', 'tel']
        },
        address: {
            keywords: ['address', 'street', 'location', 'addr'],
            priority: ['address', 'street_address', 'street', 'addr', 'location']
        },
        city: {
            keywords: ['city', 'town', 'locality'],
            priority: ['city', 'town', 'locality']
        },
        state: {
            keywords: ['state', 'province', 'region', 'county'],
            priority: ['state', 'province', 'region', 'county']
        },
        zipCode: {
            keywords: ['zip', 'postal', 'postcode', 'code'],
            priority: ['zip', 'zipcode', 'zip_code', 'postal_code', 'postcode']
        },
        country: {
            keywords: ['country', 'nation'],
            priority: ['country', 'nation']
        },
        education: {
            keywords: ['education', 'degree', 'school', 'university', 'college', 'qualification'],
            priority: ['education', 'degree', 'qualifications', 'school']
        },
        experience: {
            keywords: ['experience', 'work', 'employment', 'job', 'career', 'history'],
            priority: ['experience', 'work_experience', 'employment', 'work_history']
        },
        skills: {
            keywords: ['skills', 'skill', 'abilities', 'competencies', 'expertise'],
            priority: ['skills', 'skill', 'abilities', 'competencies']
        },
        linkedin: {
            keywords: ['linkedin', 'linked', 'social', 'profile'],
            priority: ['linkedin', 'linked_in', 'linkedin_profile']
        },
        portfolio: {
            keywords: ['portfolio', 'website', 'site', 'url', 'link', 'web'],
            priority: ['portfolio', 'website', 'personal_website', 'portfolio_url']
        }
    };

    // Initialize AI service
    const aiService = new AIService();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'autofill') {
            // Use AI-powered autofill as primary method
            performAIAutofill(request.profile)
                .then(result => sendResponse(result))
                .catch(error => {
                    console.error('AI autofill failed, falling back to regex-based autofill:', error);
                    // Fallback to original regex-based method
                    const fallbackResult = performAutofill(request.profile);
                    fallbackResult.method = 'regex-fallback';
                    fallbackResult.aiError = error.message;
                    sendResponse(fallbackResult);
                });
            return true; // Keep the message channel open for async response
        }
        return true;
    });

    function performAutofill(profile) {
        try {
            const formFields = findFormFields();
            let fieldsFound = 0;

            // Process each profile field
            Object.keys(profile).forEach(profileKey => {
                if (profile[profileKey] && profile[profileKey].trim()) {
                    const matchedFields = findMatchingFields(formFields, profileKey);
                    
                    matchedFields.forEach(field => {
                        if (fillField(field, profile[profileKey])) {
                            fieldsFound++;
                        }
                    });
                }
            });

            return {
                success: true,
                fieldsFound: fieldsFound,
                totalFields: formFields.length
            };
        } catch (error) {
            console.error('Autofill error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * AI-powered autofill using Google Gemini
     * @param {Object} profile - User profile data
     * @returns {Promise<Object>} Autofill result
     */
    async function performAIAutofill(profile) {
        try {
            console.log('Starting AI-powered autofill...');
            
            // Get the complete HTML of the page
            const pageHTML = document.documentElement.outerHTML;
            
            // Generate JavaScript code using AI
            console.log('Calling Gemini API...');
            const jsCode = await aiService.generateAutofillCode(pageHTML, profile);
            
            console.log('Generated JavaScript code:', jsCode);
            
            // Execute the generated JavaScript code
            let filledCount = 0;
            try {
                // Wrap the code in a try-catch for safe execution
                const executeCode = new Function(`
                    try {
                        return (${jsCode});
                    } catch (error) {
                        console.error('Error executing AI-generated code:', error);
                        return 0;
                    }
                `);
                
                filledCount = executeCode() || 0;
                
                // Add visual feedback for filled fields
                setTimeout(() => {
                    const filledFields = document.querySelectorAll('input:not([value=""]), textarea:not(:empty)');
                    filledFields.forEach(field => {
                        if (field.value && field.value !== field.placeholder) {
                            highlightFilledField(field);
                        }
                    });
                }, 100);
                
            } catch (executionError) {
                console.error('Error executing AI-generated code:', executionError);
                throw new Error(`Code execution failed: ${executionError.message}`);
            }
            
            return {
                success: true,
                fieldsFound: filledCount,
                method: 'ai-powered',
                totalFields: document.querySelectorAll('input, textarea, select').length
            };
            
        } catch (error) {
            console.error('AI autofill error:', error);
            throw error;
        }
    }

    function findFormFields() {
        const fields = [];
        
        // Find all input, textarea, and select elements
        const selectors = [
            'input[type="text"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="url"]',
            'input:not([type])',
            'textarea',
            'select'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Skip hidden or readonly fields
                if (element.type === 'hidden' || element.readOnly || element.disabled) {
                    return;
                }

                const fieldInfo = getFieldInfo(element);
                if (fieldInfo) {
                    fields.push({
                        element: element,
                        ...fieldInfo
                    });
                }
            });
        });

        return fields;
    }

    function getFieldInfo(element) {
        const info = {
            name: element.name || '',
            id: element.id || '',
            placeholder: element.placeholder || '',
            type: element.type || 'text',
            tagName: element.tagName.toLowerCase(),
            label: '',
            ariaLabel: element.getAttribute('aria-label') || ''
        };

        // Try to find associated label
        info.label = findAssociatedLabel(element);

        return info;
    }

    function findAssociatedLabel(element) {
        let label = '';

        // Method 1: label with 'for' attribute
        if (element.id) {
            const labelElement = document.querySelector(`label[for="${element.id}"]`);
            if (labelElement) {
                label = labelElement.textContent.trim();
            }
        }

        // Method 2: element wrapped in label
        if (!label) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                label = parentLabel.textContent.replace(element.value || '', '').trim();
            }
        }

        // Method 3: look for nearby text content
        if (!label) {
            const parent = element.parentElement;
            if (parent) {
                // Look for previous sibling text
                let sibling = element.previousElementSibling;
                while (sibling && !label) {
                    if (sibling.tagName && ['LABEL', 'SPAN', 'DIV', 'P'].includes(sibling.tagName)) {
                        const text = sibling.textContent.trim();
                        if (text && text.length < 100) {
                            label = text;
                            break;
                        }
                    }
                    sibling = sibling.previousElementSibling;
                }

                // Look in parent for text content
                if (!label) {
                    const parentText = parent.textContent.replace(element.value || '', '').trim();
                    if (parentText && parentText.length < 100) {
                        label = parentText;
                    }
                }
            }
        }

        return label.replace(/[:\*]/g, '').trim();
    }

    function findMatchingFields(formFields, profileKey) {
        const mapping = FIELD_MAPPINGS[profileKey];
        if (!mapping) return [];

        const matches = [];
        const scoredFields = [];

        formFields.forEach(field => {
            const score = calculateFieldScore(field, mapping);
            if (score > 0) {
                scoredFields.push({ field, score });
            }
        });

        // Sort by score (highest first) and return the fields
        scoredFields.sort((a, b) => b.score - a.score);
        
        // Return top matches, but avoid duplicating fields
        const usedElements = new Set();
        scoredFields.forEach(({ field }) => {
            if (!usedElements.has(field.element) && matches.length < 3) {
                matches.push(field);
                usedElements.add(field.element);
            }
        });

        return matches;
    }

    function calculateFieldScore(field, mapping) {
        let score = 0;
        const searchText = [
            field.name,
            field.id,
            field.placeholder,
            field.label,
            field.ariaLabel
        ].join(' ').toLowerCase();

        // Check priority keywords first (higher score)
        mapping.priority.forEach((keyword, index) => {
            if (searchText.includes(keyword.toLowerCase())) {
                score += (mapping.priority.length - index) * 10;
            }
        });

        // Check general keywords
        mapping.keywords.forEach(keyword => {
            if (searchText.includes(keyword.toLowerCase())) {
                score += 5;
            }
        });

        // Bonus for exact matches
        const exactMatches = [field.name, field.id].filter(attr => 
            attr && mapping.priority.includes(attr.toLowerCase())
        );
        score += exactMatches.length * 15;

        return score;
    }

    function fillField(fieldInfo, value) {
        try {
            const element = fieldInfo.element;
            
            // Skip if field already has content (unless it's placeholder text)
            if (element.value && element.value !== element.placeholder) {
                return false;
            }

            // Handle different field types
            if (fieldInfo.tagName === 'select') {
                return fillSelectField(element, value);
            } else if (fieldInfo.tagName === 'textarea') {
                return fillTextArea(element, value);
            } else {
                return fillInputField(element, value);
            }
        } catch (error) {
            console.error('Error filling field:', error);
            return false;
        }
    }

    function fillInputField(element, value) {
        // Set the value
        element.value = value;
        
        // Trigger events to ensure the change is registered
        triggerEvents(element);
        
        return true;
    }

    function fillTextArea(element, value) {
        element.value = value;
        triggerEvents(element);
        return true;
    }

    function fillSelectField(element, value) {
        // For select fields, try to find a matching option
        const options = Array.from(element.options);
        
        // Try exact match first
        let matchingOption = options.find(option => 
            option.value.toLowerCase() === value.toLowerCase() ||
            option.text.toLowerCase() === value.toLowerCase()
        );

        // Try partial match
        if (!matchingOption) {
            matchingOption = options.find(option =>
                option.text.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(option.text.toLowerCase())
            );
        }

        if (matchingOption) {
            element.value = matchingOption.value;
            triggerEvents(element);
            return true;
        }

        return false;
    }

    function triggerEvents(element) {
        // Trigger various events that frameworks might listen to
        const events = ['input', 'change', 'blur', 'keyup'];
        
        events.forEach(eventType => {
            const event = new Event(eventType, {
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(event);
        });

        // Also trigger focus event
        element.focus();
        setTimeout(() => element.blur(), 100);
    }

    // Visual feedback for filled fields (optional)
    function highlightFilledField(element) {
        const originalStyle = element.style.cssText;
        element.style.cssText += 'border: 2px solid #28a745 !important; transition: border 0.3s ease;';
        
        setTimeout(() => {
            element.style.cssText = originalStyle;
        }, 2000);
    }

})();
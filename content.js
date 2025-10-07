(function() {
    // Field mappings for regex-based autofill
    const FIELD_MAPPINGS = {
        firstName: {
            priority: ['firstname', 'first_name', 'fname', 'given_name', 'givenname', 'forename', 'first-name'],
            keywords: ['first', 'given', 'forename', 'name']
        },
        lastName: {
            priority: ['lastname', 'last_name', 'lname', 'surname', 'family_name', 'familyname', 'last-name'],
            keywords: ['last', 'surname', 'family', 'name']
        },
        fullName: {
            priority: ['fullname', 'full_name', 'name', 'full-name', 'completename', 'complete_name'],
            keywords: ['full', 'complete', 'name']
        },
        email: {
            priority: ['email', 'email_address', 'e-mail', 'emailaddress'],
            keywords: ['email', 'e-mail', 'mail']
        },
        phone: {
            priority: ['phone', 'phone_number', 'phonenumber', 'mobile', 'tel', 'telephone'],
            keywords: ['phone', 'mobile', 'tel', 'telephone', 'contact']
        },
        linkedinUrl: {
            priority: ['linkedin', 'linkedin_url', 'linkedinurl', 'linkedin_profile'],
            keywords: ['linkedin', 'profile', 'social']
        },
        country: {
            priority: ['country', 'country_name'],
            keywords: ['country', 'nation']
        },
        state: {
            priority: ['state', 'province', 'region', 'state_province'],
            keywords: ['state', 'province', 'region']
        },
        city: {
            priority: ['city', 'town', 'locality'],
            keywords: ['city', 'town', 'locality']
        },
        pincode: {
            priority: ['pincode', 'zipcode', 'zip', 'postal_code', 'postcode'],
            keywords: ['pin', 'zip', 'postal', 'code']
        },
        usWorkEligible: {
            priority: ['us_work_eligible', 'work_eligible', 'authorized_work', 'work_authorization', 'legal_work', 'work_authorized', 'us_authorized', 'legally_authorized', 'us-work-eligible'],
            keywords: ['work', 'eligible', 'authorized', 'authorization', 'legal', 'us', 'united', 'states', 'legally']
        },
        sponsorshipRequired: {
            priority: ['sponsorship_required', 'visa_sponsorship', 'sponsorship', 'require_sponsorship', 'need_sponsorship', 'visa_support', 'require-sponsorship', 'need-sponsorship'],
            keywords: ['sponsorship', 'sponsor', 'visa', 'require', 'need', 'future', 'employment']
        },
        // New field: "How did you hear about us?" / Referral source
        howDidYouHear: {
            priority: ['how_did_you_hear', 'howdidyouhear', 'referral_source', 'referral', 'source', 'hear_about', 'heard_about', 'how-did-you-hear'],
            keywords: ['how', 'hear', 'about', 'referral', 'source', 'found', 'learn']
        }
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'autofill') {
            // Use regex-based autofill
            const result = performAutofill(request.profile, request.resumeFile);
            sendResponse(result);
        }
        return true;
    });

    function performAutofill(profile, resumeFile) {
        console.log('Starting autofill with profile:', profile);
        try {
            const formFields = findFormFields();
            let fieldsFound = 0;

            fieldsFound += attachResumeToInputs(resumeFile);

            // Create fullName from firstName and lastName if needed
            const enrichedProfile = { ...profile };
            if (profile.firstName && profile.lastName && !profile.fullName) {
                enrichedProfile.fullName = `${profile.firstName} ${profile.lastName}`;
            }
            
            // Combine country code and phone number for phone fields
            // This allows storing country code and phone separately in the profile
            // but autofilling them as a single combined value (e.g., "+1 5551234567")
            if (profile.countryCode && profile.phone) {
                enrichedProfile.phone = `${profile.countryCode} ${profile.phone}`;
            }

            console.log(enrichedProfile)

            // Process each profile field
            Object.keys(enrichedProfile).forEach(profileKey => {
                if (enrichedProfile[profileKey] && enrichedProfile[profileKey].trim()) {
                    const matchedFields = findMatchingFields(formFields, profileKey);
                    // console.log("Matched fields: ", matchedFields, " for profile key: ", profileKey, " with value: ", enrichedProfile[profileKey]);
                    fillField(matchedFields[0], enrichedProfile[profileKey])
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



    function attachResumeToInputs(resumeFile) {
        if (!resumeFile || !resumeFile.data) {
            return 0;
        }

        let attachments = 0;
        document.querySelectorAll("input[type='file']").forEach(el => {
            try {
                const base64Data = resumeFile.data.split(',')[1];
                const binary = atob(base64Data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const fileObj = new File([bytes], resumeFile.name, { type: resumeFile.type });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(fileObj);
                el.files = dataTransfer.files;
                attachments += 1;
            } catch (ex) {
                console.warn('Resume attachment failed for input', ex);
                el.setAttribute('data-autofill-failed', 'resume');
            }
        });

        return attachments;
    }

    function findFormFields() {
        const fields = [];
        
        // Find all input, textarea, and select elements
        const selectors = [
            'input[type="text"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="url"]',
            'input[type="radio"]',
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

        if (score > 0) {
            // console.log('Field matched:', field, 'Score:', score);
        }

        return score;
    }

    function fillField(fieldInfo, value) {
        try {
            const element = fieldInfo.element;
            
            // Skip if field already has content (unless it's placeholder text)
            if (element.value && element.value !== element.placeholder && element.type !== 'radio') {
                return false;
            }

            // Handle different field types
            if (fieldInfo.tagName === 'select') {
                return fillSelectField(element, value);
            } else if (fieldInfo.tagName === 'textarea') {
                return fillTextArea(element, value);
            } else if (fieldInfo.type === 'radio') {
                return fillRadioField(element, value);
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
        // console.log("Filling input: ", element, " with value: ", value);
        // Trigger events to ensure the change is registered
        triggerEvents(element);
        
        return true;
    }

    function fillTextArea(element, value) {
        element.value = value;
        console.log("Filling textarea: ", element, " with value: ", value);
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

    function fillRadioField(element, value) {
        // For radio buttons, find all radio buttons with the same name
        const name = element.name;
        if (!name) {
            return false;
        }

        const radioButtons = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
        
        // Try to match value against radio button values or labels
        for (const radio of radioButtons) {
            const radioValue = radio.value.toLowerCase();
            const normalizedValue = value.toLowerCase().trim();
            
            // Check if the value matches
            if (radioValue === normalizedValue || 
                radioValue.includes(normalizedValue) ||
                normalizedValue.includes(radioValue)) {
                radio.checked = true;
                triggerEvents(radio);
                return true;
            }
            
            // Also check the label text
            const label = findAssociatedLabel(radio);
            if (label && label.toLowerCase().includes(normalizedValue)) {
                radio.checked = true;
                triggerEvents(radio);
                return true;
            }
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

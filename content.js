(function() {
    // Fields that should be skipped and deferred to Chrome's native autofill
    const SKIP_FIELDS = ['firstName', 'lastName', 'fullName', 'email', 'phone', 'countryCode', 'country', 'state', 'city', 'pincode'];
    
    // Map of field patterns to standard autocomplete attributes for Chrome's autofill
    const AUTOCOMPLETE_ATTRIBUTES = {
        firstName: 'given-name',
        lastName: 'family-name',
        email: 'email',
        phone: 'tel',
        countryCode: 'tel-country-code',
        country: 'country',
        state: 'address-level1',
        city: 'address-level2',
        pincode: 'postal-code',
        address: 'address-line1'
    };

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
        countryCode: {
            // Special: phone dialing code select detection
            specialType: 'dialCode',
            priority: [
                'country_code', 'phone_country_code', 'dial_code', 'dialcode', 'countrycode',
                'calling_code', 'callingcode', 'phone_code', 'isd_code', 'isocode',
                'country-dial-code', 'phone-country-code', 'country-dialing-code', 'dialing_code'
            ],
            keywords: ['country', 'code', 'dial', 'calling', 'prefix', 'isd', 'intl', 'international', '+']
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
            priority: ['city', 'town', 'locality', 'address'],
            keywords: ['city', 'town', 'locality', 'address']
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
            specialType: 'referral',
            priority: ['how_did_you_hear', 'howdidyouhear', 'referral_source', 'referral', 'source', 'hear_about', 'heard_about', 'how-did-you-hear'],
            // Be specific to avoid matching generic questions starting with "How"
            keywords: ['hear', 'referral', 'source', 'about', 'learn']
        },
        workedBefore: {
            priority: ['worked_before', 'workedbefore', 'previous_employment', 'prior_employment', 'worked_here', 'employed_before', 'previously_employed', 'worked-before', 'ever-worked'],
            keywords: ['worked', 'before', 'previous', 'prior', 'employed', 'company', 'organization', 'ever']
        },
        race: {
            priority: ['race', 'ethnicity', 'ethnic_origin', 'racial_identity', 'ethnic_background', 'ethnicity_race'],
            keywords: ['race', 'ethnicity', 'ethnic', 'racial', 'hispanic', 'latino']
        },
        gender: {
            priority: ['gender', 'sex', 'gender_identity'],
            keywords: ['gender', 'sex', 'male', 'female']
        },
        relocateWilling: {
            priority: ['relocate', 'relocation', 'willing_relocate', 'relocate_willing', 'onsite', 'on_site', 'on-site', 'located', 'willing_to_relocate'],
            keywords: ['relocate', 'relocation', 'willing', 'onsite', 'on-site', 'located', 'move', 'site']
        },
        pronouns: {
            priority: ['pronouns', 'preferred_pronouns', 'pronoun', 'gender_pronouns'],
            keywords: ['pronouns', 'pronoun', 'preferred', 'she', 'he', 'they']
        },
        veteranStatus: {
            priority: ['veteran_status', 'veteran', 'military_status', 'protected_veteran', 'veteranstatus'],
            keywords: ['veteran', 'military', 'protected', 'service', 'armed', 'forces']
        },
        salaryMin: {
            priority: ['salary_min', 'salary_minimum', 'min_salary', 'minimum_salary', 'expected_salary_min', 'compensation_min', 'salary_expectation_min', 'salary_range_min'],
            keywords: ['salary', 'minimum', 'min', 'compensation', 'expected', 'expectation', 'range', 'from']
        },
        salaryMax: {
            priority: ['salary_max', 'salary_maximum', 'max_salary', 'maximum_salary', 'expected_salary_max', 'compensation_max', 'salary_expectation_max', 'salary_range_max'],
            keywords: ['salary', 'maximum', 'max', 'compensation', 'expected', 'expectation', 'range', 'to']
        },
        institution: {
            priority: ['institution', 'university', 'college', 'school', 'educational_institution', 'education_institution', 'institution_name'],
            keywords: ['institution', 'university', 'college', 'school', 'education', 'educational']
        },
        degreeType: {
            priority: ['degree_type', 'degree', 'education_level', 'qualification', 'degree_level', 'education_degree'],
            keywords: ['degree', 'type', 'level', 'qualification', 'education', 'masters', 'bachelors', 'phd']
        },
        graduationDate: {
            priority: ['graduation_date', 'graduation', 'grad_date', 'completion_date', 'date_graduation', 'graduated'],
            keywords: ['graduation', 'grad', 'date', 'completion', 'graduated', 'finish', 'complete']
        },
        cgpa: {
            priority: ['cgpa', 'gpa', 'grade_point', 'grade_point_average', 'cumulative_gpa', 'overall_gpa'],
            keywords: ['cgpa', 'gpa', 'grade', 'point', 'average', 'cumulative']
        },
        percentage: {
            priority: ['percentage', 'percent', 'marks', 'score', 'academic_percentage', 'grade_percentage'],
            keywords: ['percentage', 'percent', 'marks', 'score', '%', 'grade']
        },
        noticePeriod: {
            priority: ['notice_period', 'noticeperiod', 'notice', 'availability', 'available', 'joining_date', 'join_date', 'start_date', 'when_available', 'notice-period', 'joining-date'],
            keywords: ['notice', 'period', 'availability', 'available', 'joining', 'join', 'start', 'when', 'weeks', 'immediately']
        }
    };

    /**
     * Set autocomplete attributes on contact/address fields to improve Chrome's autofill suggestions
     */
    function setAutocompleteAttributes() {
        const formFields = findFormFields();
        let attributesSet = 0;
        
        Object.keys(AUTOCOMPLETE_ATTRIBUTES).forEach(profileKey => {
            const autocompleteValue = AUTOCOMPLETE_ATTRIBUTES[profileKey];
            const matchedFields = findMatchingFields(formFields, profileKey);
            
            matchedFields.forEach(({ field }) => {
                if (field.element && !field.element.getAttribute('autocomplete')) {
                    field.element.setAttribute('autocomplete', autocompleteValue);
                    attributesSet++;
                }
            });
        });
        
        if (attributesSet > 0) {
            console.log(`[Autofill Extension] Set autocomplete attributes on ${attributesSet} contact/address fields for Chrome's native autofill`);
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'autofill') {
            // First, set autocomplete attributes to help Chrome's autofill
            setAutocompleteAttributes();
            
            // Log that personal/contact fields are deferred to browser
            console.log('[Autofill Extension] Personal contact and address fields (name, email, phone, address, city, state, postal code, country) are deferred to Chrome\'s Address Autofill. Focus on these fields to trigger browser suggestions.');
            
            // Use regex-based autofill for remaining fields
            const result = performAutofill(request.profile, request.resumeFile);
            sendResponse(result);
        }
        return true;
    });

    function performAutofill(profile, resumeFile) {
        try {
            const formFields = findFormFields();
            let fieldsFound = 0;

            fieldsFound += attachResumeToInputs(resumeFile);

            // Create fullName from firstName and lastName if needed
            const enrichedProfile = { ...profile };
            if (profile.firstName && profile.lastName && !profile.fullName) {
                enrichedProfile.fullName = `${profile.firstName} ${profile.lastName}`;
            }

            // Detect if there's a separate dial-code select present
            // const countryCodeMatches = findMatchingFields(formFields, 'countryCode');
            // const hasDialCodeSelect = countryCodeMatches.some(m => m.element && m.element.tagName && m.element.tagName.toLowerCase() === 'select');

            // // Combine country code with phone ONLY if there is no separate dial-code select
            // if (profile.countryCode && profile.phone) {
            //     if (!hasDialCodeSelect) {
            //         enrichedProfile.phone = `${profile.countryCode} ${profile.phone}`;
            //     } else {
            //         // Ensure phone remains local number if a dial-code select exists
            //         enrichedProfile.phone = `${profile.phone}`;
            //     }
            // }


            // Process each profile field (ensure phone first, then countryCode) to avoid dial code overwriting phone
            const profileKeys = Object.keys(enrichedProfile);
            const orderedKeys = [];
            if (profileKeys.includes('phone')) orderedKeys.push('phone');
            if (profileKeys.includes('countryCode')) orderedKeys.push('countryCode');
            profileKeys.forEach(k => { if (!orderedKeys.includes(k)) orderedKeys.push(k); });

            orderedKeys.forEach(profileKey => {
                // Skip contact/address fields - defer to Chrome's autofill
                if (SKIP_FIELDS.includes(profileKey)) {
                    return;
                }
                
                const rawVal = enrichedProfile[profileKey];
                const value = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
                if (value) {
                    const matchedFields = findMatchingFields(formFields, profileKey);
                    // console.log(`Profile key: ${profileKey}, Value: ${value}, Matched fields:`, matchedFields);
                    if (matchedFields && matchedFields.length > 0) {
                        // Try filling the top match first; if it succeeds, count it
                        const filled = fillField(matchedFields[0].field, String(value));
                        if (filled) {
                            fieldsFound += 1;
                        }
                    }
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
    if (!resumeFile || !resumeFile.data) return 0;

    let attachments = 0;
    document.querySelectorAll("input[type='file']").forEach(el => {

        // If secure assignment fails, prompt the user
        try {
            const base64Data = resumeFile.data.split(',')[1];
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const fileObj = new File([bytes], resumeFile.name, { type: resumeFile.type });
            const dt = new DataTransfer();
            dt.items.add(fileObj);
            el.files = dt.files;

            // Dispatch change to trigger listeners
            el.dispatchEvent(new Event('change', { bubbles: true }));

            if (el.files.length) attachments++;
            else {
                console.warn('File not attached — likely blocked or overridden.');
                el.setAttribute('data-autofill-failed', 'resume');
            }
        } catch (ex) {
            console.warn('Resume attachment failed for input', ex);
        }
    });

    console.log(`Resume attachments: ${attachments}`);
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
                matches.push({field, score: field.score});
                usedElements.add(field.element);
            }
        });
        return scoredFields;
    }

    function calculateFieldScore(field, mapping) {
        let score = 0;

        // Ensure early return for non-relevant fields based on special types
        if (mapping && mapping.specialType === 'dialCode' && field.tagName !== 'select') {
            return 0;
        }

        if (mapping && mapping.specialType === 'referral') {
            const sText = [field.name, field.id, field.placeholder].join(' ').toLowerCase();

            // Must include one of these to qualify
            const mustHave = /(hear|referral|source|about)/;
            if (!mustHave.test(sText)) {
                return 0;
            }

            // Exclude obvious experience/tenure questions
            if (/(years?|experience|exp|months?)/.test(sText)) {
                return 0;
            }
        }

        // Priority scoring
        const labelText = (field.label || '').toLowerCase();
        const ariaLabelText = (field.ariaLabel || '').toLowerCase();
        const nameIdPlaceholderText = [field.name, field.id, field.placeholder].join(' ').toLowerCase();

        // Score Placeholder: Highest Priority
        if (field.placeholder) {
            mapping.priority.forEach((keyword, index) => {
                if (field.placeholder.toLowerCase().includes(keyword.toLowerCase())) {
                    score += (mapping.priority.length - index) * 30; // Higher weight for placeholder match
                }
            });

            mapping.keywords.forEach(keyword => {
                if (field.placeholder.toLowerCase().includes(keyword.toLowerCase())) {
                    score += 20; // Moderate boost for placeholder keyword match
                }
            });
        }

        // Score Label: Second Priority
        if (labelText) {
            mapping.priority.forEach((keyword, index) => {
                if (labelText.includes(keyword.toLowerCase())) {
                    score += (mapping.priority.length - index) * 10; // Moderate weight for label match
                }
            });

            mapping.keywords.forEach(keyword => {
                if (labelText.includes(keyword.toLowerCase())) {
                    score += 15; // Moderate boost for label keyword match
                }
            });
        }

        // Score Aria-Label: Medium Priority
        // if (ariaLabelText) {
        //     mapping.priority.forEach((keyword, index) => {
        //         if (ariaLabelText.includes(keyword.toLowerCase())) {
        //             score += (mapping.priority.length - index) * 15; // Medium weight for aria-label match
        //         }
        //     });

        //     mapping.keywords.forEach(keyword => {
        //         if (ariaLabelText.includes(keyword.toLowerCase())) {
        //             score += 10; // Moderate boost for aria-label keyword match
        //         }
        //     });
        // }

        // Score Name/ID/Placeholder: Least Priority
        mapping.priority.forEach((keyword, index) => {
            if (nameIdPlaceholderText.includes(keyword.toLowerCase())) {
                score += (mapping.priority.length - index) * 10; // Lower weight for name/id/placeholder match
            }
        });

        mapping.keywords.forEach(keyword => {
            if (nameIdPlaceholderText.includes(keyword.toLowerCase())) {
                score += 5; // Small boost for name/id/placeholder keyword match
            }
        });

        // Exact Match Bonus for Name, ID, Placeholder, and Label
        const exactMatches = [field.name, field.id].filter(attr =>
            attr && mapping.priority.includes(attr.toLowerCase())
        );
        score += exactMatches.length * 20; // Bonus for exact matches in name/id

        // Extra bonus for exact matches in label (highest priority)
        if (labelText && mapping.priority.some(keyword => labelText === keyword.toLowerCase())) {
            score += 50; // Large bonus for exact match in label
        }

        // Heuristic for Dial Code / Referral Fields (Dial Code and Referral fields have special logic)
        try {
            if (mapping.specialType === 'dialCode' && field.tagName === 'select' && field.element && field.element.options) {
                const options = Array.from(field.element.options);
                let dialLikeCount = 0;
                for (const opt of options) {
                    const txt = (opt.text || '').toLowerCase();
                    const val = (opt.value || '').toLowerCase();
                    const hasPlusDigits = /\+\s*\d{1,4}/.test(txt) || /\(\s*\+\s*\d{1,4}\s*\)/.test(txt) || /^\+?\d{1,4}$/.test(val);
                    const hasCountryAndDigits = /[a-z]/.test(txt) && /\d{1,4}/.test(txt);
                    if (hasPlusDigits || hasCountryAndDigits) dialLikeCount++;
                }
                if (dialLikeCount >= 3) {
                    score += 60 + Math.min(40, dialLikeCount);
                }
            }

            if (mapping.specialType === 'referral' && field.tagName === 'select' && field.element && field.element.options) {
                const options = Array.from(field.element.options);
                let referralLike = 0, numericLike = 0;
                for (const opt of options) {
                    const txt = (opt.text || '').toLowerCase();
                    if (/^\s*\d+\s*$/.test(txt)) numericLike++;
                    if (/(linkedin|google|indeed|glassdoor|twitter|friend|referral|job\s*board|company\s*site|website|career\s*page|facebook|instagram|other)/.test(txt)) {
                        referralLike++;
                    }
                }
                if (numericLike >= Math.max(3, referralLike + 1)) return 0;
                if (referralLike >= 2) score += 40;
            }
        } catch (e) { /* ignore heuristic errors */ }

        console.log(`Field:`, field, `Score for ${mapping.specialType || 'standard'} field:`, score);
        return score;
    }


    function isLikelyDialCode(val) {
        if (!val) return false;
        const s = String(val).trim();
        // "+1", "1", "+91", "91" etc.
        return /^\+?\d{1,4}$/.test(s);
    }

    function fillField(fieldInfo, value) {
        try {
            if (!fieldInfo || !fieldInfo.element) {
                return false;
            }
            const element = fieldInfo.element;
            
            // Skip if field already has content (unless it's placeholder text)
            if (element.value && element.value !== element.placeholder && element.type !== 'radio') {
                // Allow overriding a stray dial-code in tel input with full phone value
                if (!(element.type === 'tel' && isLikelyDialCode(element.value) && String(value).length > String(element.value).length)) {
                    return false;
                }
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
        console.log(options)
        // Skip empty/placeholder options
        const validOptions = options.filter(opt => 
            opt.value && opt.value.trim() !== '' && 
            opt.text && opt.text.trim() !== '' &&
            !opt.text.toLowerCase().includes('select') &&
            !opt.text.toLowerCase().includes('choose')
        );
        
        if (validOptions.length === 0) {
            return false;
        }
        
        const normalizedValue = value.toLowerCase().trim();
        
        // Try exact match first (value or text)
        let matchingOption = validOptions.find(option => 
            option.value.toLowerCase() === normalizedValue ||
            option.text.toLowerCase() === normalizedValue
        );

        // Try partial match (contains)
        if (!matchingOption) {
            matchingOption = validOptions.find(option =>
                option.text.toLowerCase().includes(normalizedValue) ||
                option.value.toLowerCase().includes(normalizedValue)
            );
        }
        
        // Try reverse partial match (value contains option text)
        if (!matchingOption) {
            matchingOption = validOptions.find(option =>
                normalizedValue.includes(option.text.toLowerCase()) ||
                normalizedValue.includes(option.value.toLowerCase())
            );
        }

        // Dial-code normalization: match by digits (e.g., value "+1" to option text "United States (+1)" or value "1")
        if (!matchingOption) {
            const inputDigits = (value || '').replace(/\D/g, '');
            if (inputDigits) {
                matchingOption = validOptions.find(option => {
                    const textDigits = (option.text || '').replace(/\D/g, '');
                    const valueDigits = (option.value || '').replace(/\D/g, '');
                    return inputDigits && (textDigits === inputDigits || valueDigits === inputDigits);
                });
            }
        }
        
        // Special handling for common dropdowns with regex patterns
        if (!matchingOption) {
            // Veteran status matching
            if (/veteran/.test(normalizedValue)) {
                if (/identify|protected|one or more/.test(normalizedValue)) {
                    matchingOption = validOptions.find(opt => 
                        /identify.*protected|protected.*veteran|one.*more.*classification/i.test(opt.text)
                    );
                } else if (/not.*protected|not.*veteran/.test(normalizedValue)) {
                    matchingOption = validOptions.find(opt => 
                        /not.*protected.*veteran|am not/i.test(opt.text)
                    );
                } else if (/decline|self.identify/.test(normalizedValue)) {
                    matchingOption = validOptions.find(opt => 
                        /decline.*self.identify/i.test(opt.text)
                    );
                }
            }
            
            // Pronouns matching with regex
            if (/she|he|they/i.test(normalizedValue)) {
                // Match "She/Her/Hers" to options like "She/Her" or "she/her/hers"
                const pronounPattern = normalizedValue.replace(/\//g, '\\s*[/]?\\s*');
                const regex = new RegExp(pronounPattern, 'i');
                matchingOption = validOptions.find(opt => regex.test(opt.text) || regex.test(opt.value));
            }
            
            // Education degree matching
            if (/bachelor|master|phd|associate|doctorate/i.test(normalizedValue)) {
                matchingOption = validOptions.find(opt => {
                    const optText = opt.text.toLowerCase();
                    const optVal = opt.value.toLowerCase();
                    if (/bachelor/i.test(normalizedValue) && /bachelor/i.test(optText + optVal)) return true;
                    if (/master/i.test(normalizedValue) && /master/i.test(optText + optVal)) return true;
                    if (/phd|doctorate/i.test(normalizedValue) && /phd|doctorate|doctoral/i.test(optText + optVal)) return true;
                    if (/associate/i.test(normalizedValue) && /associate/i.test(optText + optVal)) return true;
                    return false;
                });
            }
            
            // Yes/No matching with variations
            if (/^yes$/i.test(normalizedValue)) {
                matchingOption = validOptions.find(opt => /^yes$/i.test(opt.value) || /^yes$/i.test(opt.text));
            } else if (/^no$/i.test(normalizedValue)) {
                matchingOption = validOptions.find(opt => /^no$/i.test(opt.value) || /^no$/i.test(opt.text));
            }
        }
        
        // Try fuzzy/similarity matching for best match
        if (!matchingOption && validOptions.length > 0) {
            let bestMatch = null;
            let bestScore = 0;
            
            for (const option of validOptions) {
                const optionText = option.text.toLowerCase();
                const optionValue = option.value.toLowerCase();
                
                // Calculate similarity score based on common words and character overlap
                let score = 0;
                
                // Word-level matching
                const valueWords = normalizedValue.split(/\s+/);
                const optionWords = optionText.split(/\s+/);
                
                for (const vWord of valueWords) {
                    for (const oWord of optionWords) {
                        if (vWord && oWord) {
                            if (vWord === oWord) {
                                score += 10; // Exact word match
                            } else if (vWord.includes(oWord) || oWord.includes(vWord)) {
                                score += 5; // Partial word match
                            }
                        }
                    }
                }
                
                // Character overlap
                const commonChars = [...normalizedValue].filter(c => optionText.includes(c)).length;
                score += commonChars / normalizedValue.length;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = option;
                }
            }
            
            // Only use fuzzy match if score is reasonably high
            if (bestScore >= 3) {
                matchingOption = bestMatch;
            }
        }

        if (matchingOption) {
            element.value = matchingOption.value;
            triggerEvents(element);
            return true;
        }

        // If no match found, leave the field empty
        console.log("No matching option found for:", value, "in select field");
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
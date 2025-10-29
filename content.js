(function() {
    // ===== WORKDAY SUPPORT CONFIGURATION =====
    
    // Debug flag for Workday operations
    const WORKDAY_DEBUG = false;
    
    // Workday mode detection
    let isWorkdayMode = false;
    
    // Workday hostname patterns
    const WORKDAY_HOSTS = [
        'myworkdayjobs.com',
        '.myworkdayjobs.com',
        '.workday.com'
    ];
    
    /**
     * Detect if current page is a Workday application
     */
    function detectWorkdayMode() {
        const hostname = window.location.hostname.toLowerCase();
        
        // Check hostname patterns
        const isWorkdayHost = WORKDAY_HOSTS.some(pattern => {
            if (pattern.startsWith('.')) {
                return hostname.includes(pattern) || hostname.endsWith(pattern.substring(1));
            }
            return hostname === pattern || hostname.endsWith('.' + pattern);
        });
        
        if (!isWorkdayHost) {
            return false;
        }
        
        // Verify Workday page structure
        const hasWorkdayAttributes = 
            document.querySelector('[data-automation-id]') !== null ||
            document.querySelector('[role="listbox"]') !== null ||
            document.querySelector('[role="option"]') !== null;
        
        return hasWorkdayAttributes;
    }
    
    // ===== WORKDAY UTILITY FUNCTIONS =====
    
    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector or data-automation-id
     * @param {Object} opts - Options: timeout, parent, visible
     * @returns {Promise<Element>}
     */
    async function waitFor(selector, opts = {}) {
        const { timeout = 5000, parent = document, visible = false } = opts;
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                const element = parent.querySelector(selector);
                if (element) {
                    if (!visible || (element.offsetWidth > 0 && element.offsetHeight > 0)) {
                        resolve(element);
                        return;
                    }
                }
                
                if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Timeout waiting for ${selector}`));
                    return;
                }
                
                setTimeout(check, 100);
            };
            check();
        });
    }
    
    /**
     * Click element and wait for listbox to appear
     * @param {Element} element - Element to click
     * @param {number} timeout - Maximum wait time
     * @returns {Promise<Element>} Listbox element
     */
    async function clickAndWaitListbox(element, timeout = 3000) {
        element.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            return await waitFor('[role="listbox"], [role="option"]', { timeout });
        } catch (e) {
            if (WORKDAY_DEBUG) console.warn('Listbox did not appear after click');
            return null;
        }
    }
    
    /**
     * Select option by label with normalization
     * @param {Element} listbox - Listbox or select element
     * @param {string} value - Value to match
     * @returns {boolean} Success
     */
    function selectOptionByLabel(listbox, value) {
        if (!listbox || !value) return false;
        
        const normalizedValue = value.toLowerCase().trim();
        const options = listbox.querySelectorAll('[role="option"], option');
        
        for (const option of options) {
            const text = (option.textContent || option.innerText || '').toLowerCase().trim();
            const optValue = (option.value || '').toLowerCase().trim();
            
            if (text === normalizedValue || 
                optValue === normalizedValue ||
                text.includes(normalizedValue) ||
                normalizedValue.includes(text)) {
                option.click?.();
                option.selected = true;
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Set input value with proper event dispatching
     * @param {Element} element - Input element
     * @param {string} value - Value to set
     */
    function setInputValue(element, value) {
        if (!element) return;
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 
            'value'
        )?.set;
        
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(element, value);
        } else {
            element.value = value;
        }
        
        // Dispatch events
        ['input', 'change', 'blur'].forEach(eventType => {
            element.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
    }
    
    /**
     * Wait for file upload to complete
     * @param {Element} fileInput - File input element
     * @param {number} timeout - Maximum wait time
     * @returns {Promise<boolean>}
     */
    async function waitForUploadComplete(fileInput, timeout = 5000) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const check = () => {
                // Look for completion indicators
                const hasFile = fileInput.files && fileInput.files.length > 0;
                const container = fileInput.closest('[data-automation-id]');
                const hasBadge = container?.querySelector('[data-automation-id*="badge"], .filename, [data-automation-id*="file"]');
                const hasProgress = container?.querySelector('[data-automation-id*="progress"]');
                const progressComplete = hasProgress ? 
                    hasProgress.getAttribute('aria-valuenow') === '100' : true;
                
                if (hasFile && (hasBadge || progressComplete)) {
                    resolve(true);
                    return;
                }
                
                if (Date.now() - startTime >= timeout) {
                    resolve(hasFile);
                    return;
                }
                
                setTimeout(check, 200);
            };
            check();
        });
    }
    
    // Fields that should be skipped and deferred to Chrome's native autofill
    const SKIP_FIELDS = ['firstName', 'lastName', 'fullName', 'email', 'phone', 'countryCode', 'country', 'state', 'city', 'pincode'];
    
    // ===== MATCH SCORING CONFIGURATION =====
    const MATCH_SCORING = {
        MIN_FIELD_SCORE: 15,      // Minimum score for a field to be filled
        MIN_CONTEXT_SCORE: 10,    // Minimum context score to be added to overall score
        WEIGHTS: {
            PRIORITY_EXACT: 50,   // Exact match in priority list
            PRIORITY_KEYWORD: 30, // Priority keyword found
            KEYWORD_MATCH: 15,    // General keyword match
            CONTEXT_BONUS: 20,    // Context score bonus (when >= MIN_CONTEXT_SCORE)
            EXACT_ATTRIBUTE: 25   // Exact match in name/id attribute
        }
    };
    
    // ===== YES/NO VARIANTS FOR BOOLEAN FIELDS =====
    const YES_VARIANTS = new Set([
        'yes', 'y', 'true', '1', 'authorized', 'eligible', 'approved', 'granted'
    ]);
    
    const NO_VARIANTS = new Set([
        'no', 'n', 'false', '0', 'not authorized', 'not eligible', 'denied', 'declined'
    ]);
    
    /**
     * Normalize string for comparison
     * @param {string} str - String to normalize
     * @returns {string} Normalized string
     */
    function normalize(str) {
        if (!str) return '';
        return String(str).toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    }
    
    /**
     * Check if value represents "yes"
     * @param {string} value - Value to check
     * @returns {boolean}
     */
    function isYes(value) {
        const normalized = normalize(value);
        return YES_VARIANTS.has(normalized) || normalized.includes('yes');
    }
    
    /**
     * Check if value represents "no"
     * @param {string} value - Value to check
     * @returns {boolean}
     */
    function isNo(value) {
        const normalized = normalize(value);
        return NO_VARIANTS.has(normalized) || normalized.includes('no');
    }
    
    /**
     * Match yes/no value from option text or value
     * @param {Element} option - Option element
     * @param {string} targetValue - Target value (yes/no)
     * @returns {boolean}
     */
    function matchYesNoFromOptionText(option, targetValue) {
        if (!option) return false;
        
        const optText = normalize(option.text || '');
        const optValue = normalize(option.value || '');
        const target = normalize(targetValue);
        
        const isTargetYes = isYes(target);
        const isTargetNo = isNo(target);
        
        if (isTargetYes) {
            return isYes(optText) || isYes(optValue);
        } else if (isTargetNo) {
            return isNo(optText) || isNo(optValue);
        }
        
        return false;
    }
    
    /**
     * Get element metadata for scoring
     * @param {Element} el - Element to analyze
     * @returns {Object} Element metadata
     */
    function getElementMeta(el) {
        if (!el) return {};
        
        const meta = {
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            dataAutomationId: el.getAttribute('data-automation-id') || '',
            label: '',
            context: ''
        };
        
        // Get label
        meta.label = findAssociatedLabel(el);
        
        // Get context if context-aware matching is available
        if (typeof window.contextAwareMatching !== 'undefined') {
            const contextData = window.contextAwareMatching.extractFieldContext(el);
            meta.context = [
                contextData.labelFor,
                contextData.labelWrapping,
                contextData.ariaLabelledByText,
                contextData.previousSiblingText,
                contextData.parentText
            ].filter(t => t).join(' ');
        }
        
        return meta;
    }
    
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
        },
        githubUrl: {
            priority: ['github', 'github_url', 'githuburl', 'github_profile', 'github_link'],
            keywords: ['github', 'git', 'repository', 'repo', 'code', 'portfolio']
        },
        portfolioUrl: {
            priority: ['portfolio', 'portfolio_url', 'portfoliourl', 'website', 'personal_site', 'personal_website'],
            keywords: ['portfolio', 'website', 'site', 'personal', 'web']
        },
        travelWilling: {
            priority: ['travel', 'travel_willing', 'willing_travel', 'business_travel', 'travel_required'],
            keywords: ['travel', 'willing', 'business', 'trip', 'percentage']
        },
        startDate: {
            priority: ['start_date', 'startdate', 'available_start', 'earliest_start', 'join_date', 'start-date'],
            keywords: ['start', 'date', 'available', 'earliest', 'begin', 'commence']
        },
        coverLetter: {
            priority: ['cover_letter', 'coverletter', 'cover', 'letter', 'additional_information', 'message'],
            keywords: ['cover', 'letter', 'message', 'additional', 'why', 'interest']
        },
        major: {
            priority: ['major', 'field_of_study', 'field', 'study', 'discipline', 'specialization'],
            keywords: ['major', 'field', 'study', 'discipline', 'specialization', 'subject']
        },
        employer: {
            priority: ['employer', 'company', 'organization', 'company_name', 'employer_name'],
            keywords: ['employer', 'company', 'organization', 'firm', 'business']
        },
        jobTitle: {
            priority: ['job_title', 'title', 'position', 'role', 'job_position'],
            keywords: ['title', 'position', 'role', 'job', 'designation']
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
    
    // ===== WORKDAY WIDGET HANDLERS =====
    
    /**
     * Handle Workday text input fields
     * @param {Element} element - Input element with data-automation-id="textInput"
     * @param {string} value - Value to set
     * @returns {boolean} Success
     */
    async function handleWorkdayTextInput(element, value) {
        if (!element) return false;
        
        setInputValue(element, value);
        
        // Give time for validation
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
    }
    
    /**
     * Handle Workday combo box / select widget
     * @param {Element} element - Element with data-automation-id containing "select", "combo", etc.
     * @param {string} value - Value to match
     * @returns {boolean} Success
     */
    async function handleWorkdayComboBox(element, value) {
        if (!element || !value) return false;
        
        try {
            // Click to open listbox
            const listbox = await clickAndWaitListbox(element, 2000);
            
            if (listbox) {
                // Try to select by label
                const selected = selectOptionByLabel(listbox, value);
                if (selected) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return true;
                }
            }
            
            // Fallback: try keyboard selection
            element.focus();
            setInputValue(element, value);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Try Enter key
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return true;
        } catch (e) {
            if (WORKDAY_DEBUG) console.warn('Workday combo box fill failed:', e);
            return false;
        }
    }
    
    /**
     * Handle Workday multi-select token input
     * @param {Element} element - Element with data-automation-id="tokenInput" or "multiSelectInput"
     * @param {string|Array} values - Value(s) to select
     * @returns {boolean} Success
     */
    async function handleWorkdayMultiSelect(element, values) {
        if (!element) return false;
        
        const valueArray = Array.isArray(values) ? values : [values];
        let successCount = 0;
        
        try {
            for (const value of valueArray) {
                // Type query
                element.focus();
                setInputValue(element, value);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Wait for dropdown
                const listbox = await waitFor('[role="option"], [data-automation-id="listItem"]', { 
                    timeout: 2000 
                }).catch(() => null);
                
                if (listbox) {
                    const selected = selectOptionByLabel(listbox, value);
                    if (selected) {
                        successCount++;
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        // Verify chip/token rendered
                        const container = element.closest('[data-automation-id]');
                        const hasToken = container?.querySelector('[data-automation-id*="token"], .chip');
                        if (WORKDAY_DEBUG && hasToken) {
                            console.log('Token rendered for:', value);
                        }
                    }
                }
            }
            
            return successCount > 0;
        } catch (e) {
            if (WORKDAY_DEBUG) console.warn('Workday multi-select fill failed:', e);
            return false;
        }
    }
    
    /**
     * Handle Workday date picker
     * @param {Element} element - Element with data-automation-id="datePicker"
     * @param {string} value - Date value (yyyy-MM-dd or other format)
     * @returns {boolean} Success
     */
    async function handleWorkdayDatePicker(element, value) {
        if (!element || !value) return false;
        
        try {
            // Try direct value set first (yyyy-MM-dd)
            const dateStr = formatDateForWorkday(value);
            setInputValue(element, dateStr);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if value stuck
            if (element.value && element.value.includes(dateStr.split('-')[0])) {
                return true;
            }
            
            // Fallback: open calendar and select
            // This is complex and varies by implementation, so we'll skip for now
            if (WORKDAY_DEBUG) {
                console.log('Direct date input worked or calendar needed');
            }
            
            return element.value.length > 0;
        } catch (e) {
            if (WORKDAY_DEBUG) console.warn('Workday date picker fill failed:', e);
            return false;
        }
    }
    
    /**
     * Format date for Workday (yyyy-MM-dd)
     */
    function formatDateForWorkday(value) {
        if (!value) return '';
        
        // If already in yyyy-MM-dd format
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        
        // Try to parse common formats
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        return value;
    }
    
    /**
     * Handle Workday radio/checkbox groups
     * @param {Element} element - Radio or checkbox with role="radio" or role="checkbox"
     * @param {string} value - Value to match
     * @returns {boolean} Success
     */
    async function handleWorkdayRadioCheckbox(element, value) {
        if (!element || !value) return false;
        
        try {
            const role = element.getAttribute('role');
            const name = element.getAttribute('name') || element.getAttribute('aria-label');
            
            // Find all options in the group
            let options = [];
            if (role === 'radio' || role === 'checkbox') {
                const container = element.closest('[data-automation-id], fieldset, [role="radiogroup"]');
                options = container ? 
                    Array.from(container.querySelectorAll(`[role="${role}"]`)) : 
                    [element];
            }
            
            const normalizedValue = value.toLowerCase().trim();
            
            for (const option of options) {
                const label = option.getAttribute('aria-label') || 
                             option.textContent || 
                             findAssociatedLabel(option);
                const optValue = option.getAttribute('value') || '';
                
                if (label.toLowerCase().includes(normalizedValue) ||
                    optValue.toLowerCase().includes(normalizedValue) ||
                    normalizedValue.includes(label.toLowerCase())) {
                    option.click();
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return true;
                }
            }
            
            return false;
        } catch (e) {
            if (WORKDAY_DEBUG) console.warn('Workday radio/checkbox fill failed:', e);
            return false;
        }
    }
    
    /**
     * Handle Workday file upload
     * @param {Element} element - File input with data-automation-id="fileUpload"
     * @param {Object} resumeFile - Resume file object
     * @returns {boolean} Success
     */
    async function handleWorkdayFileUpload(element, resumeFile) {
        if (!element || !resumeFile || !resumeFile.data) return false;
        
        try {
            const base64Data = resumeFile.data.split(',')[1];
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            
            const fileObj = new File([bytes], resumeFile.name, { type: resumeFile.type });
            const dt = new DataTransfer();
            dt.items.add(fileObj);
            element.files = dt.files;
            
            // Dispatch change event
            element.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Wait for upload completion
            const completed = await waitForUploadComplete(element, 5000);
            
            if (WORKDAY_DEBUG) {
                console.log('File upload completed:', completed);
            }
            
            return completed;
        } catch (e) {
            if (WORKDAY_DEBUG) console.warn('Workday file upload failed:', e);
            return false;
        }
    }
    
    /**
     * Detect and fill Workday-specific widgets
     * @param {Object} profile - User profile
     * @param {Object} resumeFile - Resume file
     * @returns {number} Fields filled
     */
    async function fillWorkdayFields(profile, resumeFile) {
        let filled = 0;
        
        if (!isWorkdayMode) return filled;
        
        // Text inputs
        const textInputs = document.querySelectorAll('[data-automation-id="textInput"]');
        for (const input of textInputs) {
            const label = findAssociatedLabel(input) || input.getAttribute('aria-label') || '';
            const matchedKey = findProfileKeyForLabel(label);
            
            if (matchedKey && profile[matchedKey] && !SKIP_FIELDS.includes(matchedKey)) {
                const success = await handleWorkdayTextInput(input, String(profile[matchedKey]));
                if (success) filled++;
            }
        }
        
        // Combo boxes / selects
        const selects = document.querySelectorAll(
            '[data-automation-id*="select"], [data-automation-id*="combo"], [data-automation-id="selectWidget"]'
        );
        for (const select of selects) {
            const label = findAssociatedLabel(select) || select.getAttribute('aria-label') || '';
            const matchedKey = findProfileKeyForLabel(label);
            
            if (matchedKey && profile[matchedKey] && !SKIP_FIELDS.includes(matchedKey)) {
                const success = await handleWorkdayComboBox(select, String(profile[matchedKey]));
                if (success) filled++;
            }
        }
        
        // Date pickers
        const datePickers = document.querySelectorAll('[data-automation-id="datePicker"]');
        for (const picker of datePickers) {
            const label = findAssociatedLabel(picker) || picker.getAttribute('aria-label') || '';
            const matchedKey = findProfileKeyForLabel(label);
            
            if (matchedKey && profile[matchedKey]) {
                const success = await handleWorkdayDatePicker(picker, String(profile[matchedKey]));
                if (success) filled++;
            }
        }
        
        // File uploads
        const fileUploads = document.querySelectorAll('[data-automation-id="fileUpload"], input[type="file"][data-automation-id]');
        for (const upload of fileUploads) {
            const label = (findAssociatedLabel(upload) || upload.getAttribute('aria-label') || '').toLowerCase();
            // Only fill resume/CV fields, not cover letter or other uploads
            if ((label.includes('resume') || label.includes('cv')) && resumeFile) {
                const success = await handleWorkdayFileUpload(upload, resumeFile);
                if (success) filled++;
            }
        }
        
        return filled;
    }
    
    /**
     * Find profile key that matches a label
     * @param {string} label - Field label
     * @returns {string|null} Profile key
     */
    function findProfileKeyForLabel(label) {
        if (!label) return null;
        
        const normalized = label.toLowerCase().trim();
        
        // Try to match against field mappings
        for (const [key, mapping] of Object.entries(FIELD_MAPPINGS)) {
            if (SKIP_FIELDS.includes(key)) continue;
            
            // Check priority keywords
            for (const priority of mapping.priority) {
                if (normalized.includes(priority)) {
                    return key;
                }
            }
            
            // Check general keywords
            let matchCount = 0;
            for (const keyword of mapping.keywords) {
                if (normalized.includes(keyword)) {
                    matchCount++;
                }
            }
            
            if (matchCount >= 2) {
                return key;
            }
        }
        
        return null;
    }
    
    // ===== WORKDAY MULTI-PAGE FLOW SUPPORT =====
    
    /**
     * Get session storage key for Workday flow
     * @returns {string} Storage key
     */
    function getWorkdaySessionKey() {
        const host = window.location.hostname;
        const path = window.location.pathname;
        // Try to extract job ID from path or URL
        const jobIdMatch = path.match(/\/job\/([^\/]+)/i) || path.match(/jobId=([^&]+)/i);
        const jobId = jobIdMatch ? jobIdMatch[1] : 'default';
        return `workday_session_${host}_${jobId}`;
    }
    
    /**
     * Save Workday progress to session storage
     * @param {Object} data - Progress data
     */
    async function saveWorkdayProgress(data) {
        if (!isWorkdayMode) return;
        
        try {
            const key = getWorkdaySessionKey();
            await chrome.storage.session.set({ [key]: data });
            if (WORKDAY_DEBUG) {
                console.log('Workday progress saved:', key, data);
            }
        } catch (e) {
            console.warn('Failed to save Workday progress:', e);
        }
    }
    
    /**
     * Load Workday progress from session storage
     * @returns {Promise<Object|null>} Progress data
     */
    async function loadWorkdayProgress() {
        if (!isWorkdayMode) return null;
        
        try {
            const key = getWorkdaySessionKey();
            const result = await chrome.storage.session.get(key);
            return result[key] || null;
        } catch (e) {
            console.warn('Failed to load Workday progress:', e);
            return null;
        }
    }
    
    /**
     * Auto-click continue/next button if found
     * @returns {Promise<boolean>} Success
     */
    async function autoClickContinue() {
        if (!isWorkdayMode) return false;
        
        // Look for continue/next buttons
        const buttonSelectors = [
            '[data-automation-id*="continue"]',
            '[data-automation-id*="goToNextStep"]',
            '[data-automation-id*="next"]',
            'button[aria-label*="Continue"]',
            'button[aria-label*="Next"]'
        ];
        
        for (const selector of buttonSelectors) {
            const button = document.querySelector(selector);
            if (button && button.offsetHeight > 0) {
                // Check if button is enabled
                if (!button.disabled && !button.getAttribute('aria-disabled')) {
                    if (WORKDAY_DEBUG) {
                        console.log('Auto-clicking continue button:', selector);
                    }
                    
                    // Save progress before navigation
                    await saveWorkdayProgress({
                        timestamp: Date.now(),
                        page: window.location.href
                    });
                    
                    button.click();
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Setup MutationObserver for Workday dynamic content
     */
    let workdayObserver = null;
    let observerThrottle = null;
    
    function setupWorkdayObserver(profile, resumeFile) {
        if (!isWorkdayMode || workdayObserver) return;
        
        workdayObserver = new MutationObserver((mutations) => {
            // Throttle to avoid excessive re-runs
            if (observerThrottle) return;
            
            observerThrottle = setTimeout(() => {
                observerThrottle = null;
            }, 2000);
            
            // Check if new fields appeared
            const hasNewFields = mutations.some(mutation => {
                return Array.from(mutation.addedNodes).some(node => {
                    if (node.nodeType === 1) { // Element node
                        return node.matches?.('[data-automation-id]') ||
                               node.querySelector?.('[data-automation-id]');
                    }
                    return false;
                });
            });
            
            if (hasNewFields) {
                if (WORKDAY_DEBUG) {
                    console.log('New Workday fields detected, re-running autofill');
                }
                
                // Re-run autofill for new fields
                setTimeout(() => {
                    fillWorkdayFields(profile, resumeFile).then(filled => {
                        if (WORKDAY_DEBUG && filled > 0) {
                            console.log('Filled', filled, 'new fields');
                        }
                    });
                }, 500);
            }
        });
        
        // Observe the body for changes
        workdayObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        if (WORKDAY_DEBUG) {
            console.log('Workday observer setup complete');
        }
    }
    
    /**
     * Cleanup Workday observer
     */
    function cleanupWorkdayObserver() {
        if (workdayObserver) {
            workdayObserver.disconnect();
            workdayObserver = null;
        }
        if (observerThrottle) {
            clearTimeout(observerThrottle);
            observerThrottle = null;
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'autofill') {
            // Detect Workday mode
            isWorkdayMode = detectWorkdayMode();
            
            if (isWorkdayMode) {
                console.log('[Autofill Extension] Workday mode detected - using optimized handlers');
            }
            
            // First, set autocomplete attributes to help Chrome's autofill
            setAutocompleteAttributes();
            
            // Log that personal/contact fields are deferred to browser
            console.log('[Autofill Extension] Personal contact and address fields (name, email, phone, address, city, state, postal code, country) are deferred to Chrome\'s Address Autofill. Focus on these fields to trigger browser suggestions.');
            
            // Use appropriate autofill method
            performAutofill(request.profile, request.resumeFile).then(result => {
                sendResponse(result);
            }).catch(error => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        }
        return true; // Keep channel open for async response
    });

    async function performAutofill(profile, resumeFile) {
        try {
            let fieldsFound = 0;
            
            // If Workday mode, try Workday-specific handlers first
            if (isWorkdayMode) {
                // Setup observer for dynamic content
                setupWorkdayObserver(profile, resumeFile);
                
                // Load any saved progress
                const progress = await loadWorkdayProgress();
                if (progress && WORKDAY_DEBUG) {
                    console.log('Loaded Workday progress:', progress);
                }
                
                fieldsFound += await fillWorkdayFields(profile, resumeFile);
            }
            
            // Standard autofill for remaining fields
            const formFields = findFormFields();

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
                    console.log(`Profile key: ${profileKey}, Value: ${value}, Matched candidates:`, matchedFields.length);
                    
                    // Pick the best candidate that meets threshold
                    const bestCandidate = pickBestCandidate(matchedFields, FIELD_MAPPINGS[profileKey]);
                    
                    if (bestCandidate) {
                        let filled = false;
                        
                        // Special handling for boolean fields (usWorkEligible, sponsorshipRequired)
                        if (profileKey === 'usWorkEligible' || profileKey === 'sponsorshipRequired') {
                            const field = bestCandidate.field;
                            
                            // Only fill if value is yes/no
                            if (!isYes(value) && !isNo(value)) {
                                console.log(`Skipping ${profileKey}: value "${value}" is not yes/no`);
                                return;
                            }
                            
                            if (field.tagName === 'select') {
                                filled = fillYesNoSelect(field.element, value);
                            } else if (field.type === 'radio') {
                                // Get all radios with same name
                                const radioButtons = document.querySelectorAll(
                                    `input[type="radio"][name="${field.element.name}"]`
                                );
                                filled = fillYesNoRadios(Array.from(radioButtons), value);
                            } else {
                                console.log(`Skipping ${profileKey}: unsupported field type for boolean matching`);
                            }
                        } else {
                            // Standard filling for non-boolean fields
                            filled = fillField(bestCandidate.field, String(value));
                        }
                        
                        if (filled) {
                            fieldsFound += 1;
                            console.log(`Successfully filled ${profileKey} with best candidate (score: ${bestCandidate.score})`);
                        }
                    } else {
                        console.log(`No qualifying candidate found for ${profileKey} (threshold: ${MATCH_SCORING.MIN_FIELD_SCORE})`);
                    }
                }
            });

            return {
                success: true,
                fieldsFound: fieldsFound,
                totalFields: formFields.length,
                workdayMode: isWorkdayMode
            };
        } catch (error) {
            console.error('Autofill error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Expose performAutofill for workday-dynamic.js
    window.performAutofill = performAutofill;



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

        const scoredFields = [];

        // Use context-aware matching if available
        const useContextMatching = typeof window.contextAwareMatching !== 'undefined';

        formFields.forEach(field => {
            let score = calculateFieldScore(field, mapping);
            
            // Enhance with context-aware scoring if available
            if (useContextMatching && field.element) {
                const context = window.contextAwareMatching.extractFieldContext(field.element);
                const contextScore = window.contextAwareMatching.calculateContextScore(context, mapping);
                
                // Only add context score if it meets minimum threshold
                if (contextScore >= MATCH_SCORING.MIN_CONTEXT_SCORE) {
                    // Combine traditional score with context score (context score has more weight)
                    score = score * 0.4 + contextScore * 0.6;
                } else {
                    // Use traditional score only if context score is too low
                    console.log(`Context score ${contextScore} below threshold ${MATCH_SCORING.MIN_CONTEXT_SCORE}, using traditional score only`);
                }
            }
            
            if (score > 0) {
                scoredFields.push({ field, score });
            }
        });

        // Sort by score (highest first)
        scoredFields.sort((a, b) => b.score - a.score);
        
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

        // Get normalized text from various sources
        const labelText = normalize(field.label || '');
        const ariaLabelText = normalize(field.ariaLabel || '');
        const nameText = normalize(field.name || '');
        const idText = normalize(field.id || '');
        const placeholderText = normalize(field.placeholder || '');
        const allAttributes = [nameText, idText, placeholderText].join(' ');

        // Score priority keywords more heavily
        mapping.priority.forEach((keyword, index) => {
            const normalizedKeyword = normalize(keyword);
            const priorityWeight = (mapping.priority.length - index) * MATCH_SCORING.WEIGHTS.PRIORITY_KEYWORD;
            
            // Check for exact matches in priority attributes (name, id)
            if (nameText === normalizedKeyword || idText === normalizedKeyword) {
                score += MATCH_SCORING.WEIGHTS.EXACT_ATTRIBUTE;
            }
            
            // Priority keyword in placeholder (high priority)
            if (placeholderText.includes(normalizedKeyword)) {
                score += priorityWeight * 1.2; // 20% bonus for placeholder
            }
            
            // Priority keyword in label (medium-high priority)
            if (labelText.includes(normalizedKeyword)) {
                score += priorityWeight;
            }
            
            // Priority keyword in attributes
            if (allAttributes.includes(normalizedKeyword)) {
                score += priorityWeight * 0.8;
            }
        });

        // Score general keywords
        mapping.keywords.forEach(keyword => {
            const normalizedKeyword = normalize(keyword);
            
            if (placeholderText.includes(normalizedKeyword)) {
                score += MATCH_SCORING.WEIGHTS.KEYWORD_MATCH * 1.2;
            }
            if (labelText.includes(normalizedKeyword)) {
                score += MATCH_SCORING.WEIGHTS.KEYWORD_MATCH;
            }
            if (allAttributes.includes(normalizedKeyword)) {
                score += MATCH_SCORING.WEIGHTS.KEYWORD_MATCH * 0.6;
            }
        });

        // Extra bonus for exact matches in label
        if (labelText && mapping.priority.some(kw => normalize(kw) === labelText)) {
            score += MATCH_SCORING.WEIGHTS.PRIORITY_EXACT;
        }

        // Heuristic for Dial Code / Referral Fields
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

    /**
     * Pick the best candidate element for a profile key
     * @param {Array} elements - Array of {field, score} objects
     * @param {Object} mapping - Field mapping configuration
     * @returns {Object|null} Best candidate {field, score} or null
     */
    function pickBestCandidate(elements, mapping) {
        if (!elements || elements.length === 0) {
            return null;
        }
        
        // Filter elements that meet minimum score threshold
        const qualified = elements.filter(item => item.score >= MATCH_SCORING.MIN_FIELD_SCORE);
        
        if (qualified.length === 0) {
            console.log('No candidates met minimum score threshold:', MATCH_SCORING.MIN_FIELD_SCORE);
            return null;
        }
        
        // Sort by score (highest first) and return the best
        qualified.sort((a, b) => b.score - a.score);
        
        console.log(`Best candidate selected with score ${qualified[0].score} (threshold: ${MATCH_SCORING.MIN_FIELD_SCORE})`);
        return qualified[0];
    }

    /**
     * Fill select field with yes/no value only
     * @param {Element} selectEl - Select element
     * @param {string} value - Profile value (yes/no)
     * @returns {boolean} Success
     */
    function fillYesNoSelect(selectEl, value) {
        if (!selectEl || !selectEl.options) return false;
        
        const options = Array.from(selectEl.options);
        
        // Skip empty/placeholder options
        const validOptions = options.filter(opt => 
            opt.value && opt.value.trim() !== '' && 
            opt.text && opt.text.trim() !== ''
        );
        
        // Find matching yes/no option
        const matchingOption = validOptions.find(opt => matchYesNoFromOptionText(opt, value));
        
        if (matchingOption) {
            selectEl.value = matchingOption.value;
            triggerEvents(selectEl);
            console.log(`Filled yes/no select with: ${matchingOption.text}`);
            return true;
        }
        
        console.log(`No yes/no match found in select for value: ${value}`);
        return false;
    }

    /**
     * Fill radio buttons with yes/no value only
     * @param {Array} radioEls - Array of radio elements with same name
     * @param {string} value - Profile value (yes/no)
     * @returns {boolean} Success
     */
    function fillYesNoRadios(radioEls, value) {
        if (!radioEls || radioEls.length === 0) return false;
        
        // Try to match by value or label
        for (const radio of radioEls) {
            const radioValue = radio.value;
            const label = findAssociatedLabel(radio);
            
            // Check if radio value or label matches yes/no
            if (matchYesNoFromOptionText({ text: label, value: radioValue }, value)) {
                radio.checked = true;
                triggerEvents(radio);
                console.log(`Filled yes/no radio with: ${label || radioValue}`);
                return true;
            }
        }
        
        console.log(`No yes/no match found in radios for value: ${value}`);
        return false;
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
/**
 * Workday Dynamic Add Sections Support
 * 
 * This script handles dynamic "Add" sections on Workday-style applications
 * where clicking an Add button injects new fields that need to be autofilled.
 * Specifically handles Work Experience and Education sections.
 */

(function() {
    'use strict';

    // Debug flag
    const DEBUG = false;

    // Workday hostname patterns
    const WORKDAY_HOSTS = [
        'myworkdayjobs.com',
        '.myworkdayjobs.com',
        '.workday.com',
        'workday.',
        'localhost' // Allow testing on localhost
    ];

    /**
     * Check if current page is a Workday application
     */
    function isWorkdayHost() {
        const hostname = window.location.hostname.toLowerCase();
        
        // Allow localhost for testing
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return true;
        }
        
        return WORKDAY_HOSTS.some(pattern => {
            if (pattern.startsWith('.')) {
                return hostname.includes(pattern) || hostname.endsWith(pattern.substring(1));
            }
            return hostname.includes(pattern);
        });
    }

    // Only activate on Workday hosts
    if (!isWorkdayHost()) {
        if (DEBUG) console.log('[Workday Dynamic] Not a Workday host, script inactive');
        return;
    }

    if (DEBUG) console.log('[Workday Dynamic] Workday host detected, activating dynamic section support');

    // Store profile data when autofill is triggered
    let cachedProfile = null;
    let cachedResumeFile = null;

    /**
     * Listen for autofill messages to cache profile data
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'autofill') {
            cachedProfile = request.profile;
            cachedResumeFile = request.resumeFile;
            if (DEBUG) console.log('[Workday Dynamic] Cached profile data for dynamic sections');
        }
    });

    /**
     * Find an Add button for Work Experience or Education
     * @param {Element} container - Container to search within
     * @returns {Element|null} The Add button element
     */
    function findAddButton(container = document) {
        const buttonSelectors = [
            // Common Workday Add button patterns
            'button[data-automation-id*="Add"]',
            'button[data-automation-id*="add"]',
            'button[aria-label*="Add"]',
            'button[aria-label*="add"]',
            'button[title*="Add"]',
            'button[title*="add"]',
            // Generic patterns
            'button:not([data-automation-id*="remove"]):not([data-automation-id*="delete"])'
        ];

        for (const selector of buttonSelectors) {
            const buttons = container.querySelectorAll(selector);
            for (const button of buttons) {
                const text = (button.textContent || button.innerText || '').toLowerCase().trim();
                const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
                const title = (button.getAttribute('title') || '').toLowerCase();
                const dataId = (button.getAttribute('data-automation-id') || '').toLowerCase();
                
                const combined = `${text} ${ariaLabel} ${title} ${dataId}`;
                
                // Check if it's an Add button (not Remove/Delete)
                if ((combined.includes('add') || text === '+') && 
                    !combined.includes('remove') && 
                    !combined.includes('delete')) {
                    return button;
                }
            }
        }
        return null;
    }

    /**
     * Determine if a section is for Work Experience or Education
     * @param {Element} section - The section container
     * @returns {'experience'|'education'|null}
     */
    function determineSectionType(section) {
        const text = (section.textContent || section.innerText || '').toLowerCase();
        const labels = Array.from(section.querySelectorAll('label, legend, h1, h2, h3, h4, h5, h6'))
            .map(el => (el.textContent || '').toLowerCase())
            .join(' ');
        
        const combined = `${text} ${labels}`;
        
        // Check for Work Experience indicators
        if (combined.match(/work\s*(experience|history)|employment|experience|job|position|company|employer/i)) {
            // Make sure it's not education-related
            if (!combined.match(/education|school|university|college|degree/i)) {
                return 'experience';
            }
        }
        
        // Check for Education indicators
        if (combined.match(/education|school|university|college|degree|academic/i)) {
            return 'education';
        }
        
        return null;
    }

    /**
     * Fill Work Experience fields in a newly added section
     * @param {Element} container - The container with the new fields
     * @param {Object} profile - User profile data
     * @returns {number} Number of fields filled
     */
    async function fillWorkExperience(container, profile) {
        if (!profile) return 0;
        
        let filled = 0;
        if (DEBUG) console.log('[Workday Dynamic] Filling Work Experience section', container);

        // Find fields within the container
        const fields = {
            company: findFieldInContainer(container, ['company', 'employer', 'organization']),
            jobTitle: findFieldInContainer(container, ['title', 'position', 'role', 'job']),
            current: findFieldInContainer(container, ['current', 'present', 'currently']),
            startDate: findFieldInContainer(container, ['start', 'from', 'begin']),
            endDate: findFieldInContainer(container, ['end', 'to', 'until'])
        };

        // Fill company/employer
        if (fields.company && profile.employer) {
            if (await fillField(fields.company, profile.employer)) filled++;
        }

        // Fill job title
        if (fields.jobTitle && profile.jobTitle) {
            if (await fillField(fields.jobTitle, profile.jobTitle)) filled++;
        }

        // Fill current employment checkbox (assume not current if we have end date)
        if (fields.current) {
            const isCurrent = !profile.employmentEndDate;
            if (await fillField(fields.current, isCurrent ? 'yes' : 'no')) filled++;
        }

        // Fill start date
        if (fields.startDate && profile.employmentStartDate) {
            if (await fillField(fields.startDate, profile.employmentStartDate)) filled++;
        }

        // Fill end date (only if not current)
        if (fields.endDate && profile.employmentEndDate) {
            if (await fillField(fields.endDate, profile.employmentEndDate)) filled++;
        }

        if (DEBUG) console.log(`[Workday Dynamic] Filled ${filled} Work Experience fields`);
        return filled;
    }

    /**
     * Fill Education fields in a newly added section
     * @param {Element} container - The container with the new fields
     * @param {Object} profile - User profile data
     * @returns {number} Number of fields filled
     */
    async function fillEducation(container, profile) {
        if (!profile) return 0;
        
        let filled = 0;
        if (DEBUG) console.log('[Workday Dynamic] Filling Education section', container);

        // Find fields within the container
        const fields = {
            institution: findFieldInContainer(container, ['institution', 'university', 'college', 'school']),
            degree: findFieldInContainer(container, ['degree', 'qualification', 'level']),
            major: findFieldInContainer(container, ['major', 'field', 'study', 'specialization']),
            graduationDate: findFieldInContainer(container, ['graduation', 'grad', 'completion', 'end'])
        };

        // Fill institution
        if (fields.institution && profile.institution) {
            if (await fillField(fields.institution, profile.institution)) filled++;
        }

        // Fill degree
        if (fields.degree && profile.degreeType) {
            if (await fillField(fields.degree, profile.degreeType)) filled++;
        }

        // Fill major
        if (fields.major && profile.major) {
            if (await fillField(fields.major, profile.major)) filled++;
        }

        // Fill graduation date
        if (fields.graduationDate && profile.graduationDate) {
            if (await fillField(fields.graduationDate, profile.graduationDate)) filled++;
        }

        if (DEBUG) console.log(`[Workday Dynamic] Filled ${filled} Education fields`);
        return filled;
    }

    /**
     * Find a field within a container based on keywords
     * @param {Element} container - Container to search within
     * @param {Array<string>} keywords - Keywords to match
     * @returns {Element|null} The found field element
     */
    function findFieldInContainer(container, keywords) {
        const inputs = container.querySelectorAll('input, select, textarea');
        
        for (const input of inputs) {
            // Skip hidden fields
            if (input.type === 'hidden' || input.style.display === 'none') continue;
            
            const label = findLabel(input);
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
            const dataId = (input.getAttribute('data-automation-id') || '').toLowerCase();
            
            const combined = `${label} ${name} ${id} ${placeholder} ${ariaLabel} ${dataId}`;
            
            // Check if any keyword matches
            for (const keyword of keywords) {
                if (combined.includes(keyword.toLowerCase())) {
                    return input;
                }
            }
        }
        
        return null;
    }

    /**
     * Find the label text for an input
     * @param {Element} input - Input element
     * @returns {string} Label text
     */
    function findLabel(input) {
        // Try label[for]
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return (label.textContent || '').toLowerCase();
        }
        
        // Try parent label
        const parentLabel = input.closest('label');
        if (parentLabel) {
            return (parentLabel.textContent || '').toLowerCase();
        }
        
        // Try previous sibling
        let sibling = input.previousElementSibling;
        while (sibling) {
            if (sibling.tagName === 'LABEL' || sibling.tagName === 'SPAN' || sibling.tagName === 'DIV') {
                const text = (sibling.textContent || '').toLowerCase().trim();
                if (text && text.length < 100) return text;
            }
            sibling = sibling.previousElementSibling;
        }
        
        return '';
    }

    /**
     * Fill a field with proper event dispatching
     * @param {Element} field - The field to fill
     * @param {string|boolean} value - The value to set
     * @returns {Promise<boolean>} Success
     */
    async function fillField(field, value) {
        try {
            if (!field || !value) return false;
            
            // Skip if already filled (unless it's just placeholder)
            if (field.value && field.value !== field.placeholder) {
                return false;
            }

            const tagName = field.tagName.toLowerCase();
            const type = (field.type || '').toLowerCase();

            // Handle checkbox/radio for current employment
            if (type === 'checkbox' || type === 'radio') {
                const normalizedValue = String(value).toLowerCase();
                const shouldCheck = normalizedValue === 'yes' || normalizedValue === 'true' || normalizedValue === true;
                
                if (type === 'checkbox') {
                    field.checked = shouldCheck;
                } else if (type === 'radio') {
                    // For radio, find the matching option
                    const name = field.name;
                    if (name) {
                        const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
                        for (const radio of radios) {
                            const radioLabel = findLabel(radio).toLowerCase();
                            const radioValue = (radio.value || '').toLowerCase();
                            
                            if (shouldCheck && (radioLabel.includes('yes') || radioLabel.includes('current') || radioValue === 'yes')) {
                                radio.checked = true;
                                dispatchEvents(radio);
                                return true;
                            } else if (!shouldCheck && (radioLabel.includes('no') || radioValue === 'no')) {
                                radio.checked = true;
                                dispatchEvents(radio);
                                return true;
                            }
                        }
                    }
                }
                
                dispatchEvents(field);
                return true;
            }

            // Handle select dropdown
            if (tagName === 'select') {
                const options = Array.from(field.options);
                const normalizedValue = String(value).toLowerCase().trim();
                
                // Try exact match
                let match = options.find(opt => 
                    opt.value.toLowerCase() === normalizedValue ||
                    opt.text.toLowerCase() === normalizedValue
                );
                
                // Try partial match
                if (!match) {
                    match = options.find(opt =>
                        opt.text.toLowerCase().includes(normalizedValue) ||
                        normalizedValue.includes(opt.text.toLowerCase())
                    );
                }
                
                if (match) {
                    field.value = match.value;
                    dispatchEvents(field);
                    return true;
                }
                
                return false;
            }

            // Handle date input
            if (type === 'date' || field.getAttribute('data-automation-id') === 'datePicker') {
                const dateStr = formatDate(value);
                field.value = dateStr;
                dispatchEvents(field);
                return true;
            }

            // Handle text input
            field.value = String(value);
            dispatchEvents(field);
            
            // Wait a bit for validation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return true;
        } catch (error) {
            if (DEBUG) console.error('[Workday Dynamic] Error filling field:', error);
            return false;
        }
    }

    /**
     * Format date to yyyy-MM-dd
     * @param {string} value - Date value
     * @returns {string} Formatted date
     */
    function formatDate(value) {
        if (!value) return '';
        
        // If already in yyyy-MM-dd format
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        
        // Try to parse and format
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
     * Dispatch events for form field changes
     * @param {Element} element - The element to dispatch events on
     */
    function dispatchEvents(element) {
        const events = ['input', 'change', 'blur'];
        
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true, cancelable: true });
            element.dispatchEvent(event);
        });
    }

    /**
     * Handle Add button click
     * @param {Element} button - The Add button that was clicked
     */
    async function handleAddButtonClick(button) {
        if (DEBUG) console.log('[Workday Dynamic] Add button clicked', button);
        
        // Find the section this button belongs to
        let section = button.closest('[data-automation-id], section, fieldset, .section, [role="group"]');
        if (!section) {
            section = button.closest('div[class*="section"], div[class*="group"]');
        }
        
        if (!section) {
            if (DEBUG) console.log('[Workday Dynamic] Could not find section container');
            return;
        }
        
        const sectionType = determineSectionType(section);
        if (!sectionType) {
            if (DEBUG) console.log('[Workday Dynamic] Could not determine section type');
            return;
        }
        
        if (DEBUG) console.log(`[Workday Dynamic] Section type: ${sectionType}`);
        
        // Set up observer for the new fields
        setupNewFieldObserver(section, sectionType);
    }

    /**
     * Set up MutationObserver for newly added fields
     * @param {Element} container - Container to observe
     * @param {string} sectionType - Type of section ('experience' or 'education')
     */
    function setupNewFieldObserver(container, sectionType) {
        const observer = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    // Check if new form fields were added
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            const hasInputs = node.matches && (
                                node.matches('input, select, textarea') ||
                                node.querySelector('input, select, textarea')
                            );
                            
                            if (hasInputs) {
                                if (DEBUG) console.log('[Workday Dynamic] New fields detected after Add button click');
                                
                                // Wait a bit for all fields to be rendered
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                // Fill the new fields
                                const newContainer = node.matches && node.matches('input, select, textarea') ? 
                                    node.closest('[data-automation-id], fieldset, .form-group, div') : node;
                                
                                if (sectionType === 'experience') {
                                    await fillWorkExperience(newContainer, cachedProfile);
                                } else if (sectionType === 'education') {
                                    await fillEducation(newContainer, cachedProfile);
                                }
                                
                                // Disconnect observer after filling
                                observer.disconnect();
                                break;
                            }
                        }
                    }
                }
            }
        });
        
        // Start observing
        observer.observe(container, {
            childList: true,
            subtree: true
        });
        
        // Disconnect after 10 seconds if nothing happens
        setTimeout(() => {
            observer.disconnect();
            if (DEBUG) console.log('[Workday Dynamic] Observer timeout, disconnecting');
        }, 10000);
    }

    /**
     * Set up event delegation for Add button clicks
     */
    function setupAddButtonDelegation() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Check if clicked element is or contains an Add button
            let button = null;
            if (target.tagName === 'BUTTON') {
                button = target;
            } else if (target.closest('button')) {
                button = target.closest('button');
            }
            
            if (button) {
                const text = (button.textContent || button.innerText || '').toLowerCase().trim();
                const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
                const title = (button.getAttribute('title') || '').toLowerCase();
                const dataId = (button.getAttribute('data-automation-id') || '').toLowerCase();
                
                const combined = `${text} ${ariaLabel} ${title} ${dataId}`;
                
                // Check if it's an Add button
                if ((combined.includes('add') || text === '+') && 
                    !combined.includes('remove') && 
                    !combined.includes('delete')) {
                    
                    // Handle the Add button click
                    handleAddButtonClick(button);
                }
            }
        }, true); // Use capture phase to catch event early
        
        if (DEBUG) console.log('[Workday Dynamic] Add button delegation set up');
    }

    /**
     * Initialize dynamic section support
     */
    function initialize() {
        // Set up event delegation for Add buttons
        setupAddButtonDelegation();
        
        // Also set up a MutationObserver for dynamically loaded content
        const pageObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            // Check if this might be a new section with Add button
                            const addButton = node.matches && node.matches('button') ? 
                                (findAddButton(node) || (node.tagName === 'BUTTON' ? node : null)) :
                                findAddButton(node);
                            
                            if (addButton) {
                                // New section with Add button detected
                                if (DEBUG) console.log('[Workday Dynamic] New section with Add button detected');
                            }
                        }
                    }
                }
            }
        });
        
        // Observe the entire document for dynamic content
        pageObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        if (DEBUG) console.log('[Workday Dynamic] Initialization complete');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();

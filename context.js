/**
 * Context-Aware Field Matching Module
 * 
 * This module provides enhanced field detection by analyzing surrounding HTML context
 * such as labels, nearby text, and semantic structure. This is particularly useful
 * for ATS platforms like Workday and Greenhouse where labels often live outside
 * the input element.
 */

(function() {
    'use strict';

    // Debug flag
    const CONTEXT_DEBUG = false;

    /**
     * Extract all available context from an input element
     * @param {Element} element - The input element to extract context from
     * @returns {Object} Context information
     */
    function extractFieldContext(element) {
        const context = {
            // Direct attributes
            id: element.id || '',
            name: element.name || '',
            placeholder: element.placeholder || '',
            type: element.type || 'text',
            ariaLabel: element.getAttribute('aria-label') || '',
            ariaDescribedBy: element.getAttribute('aria-describedby') || '',
            ariaLabelledBy: element.getAttribute('aria-labelledby') || '',
            dataAutomationId: element.getAttribute('data-automation-id') || '',
            
            // Context from labels
            labelFor: '',
            labelWrapping: '',
            ariaLabelledByText: '',
            ariaDescribedByText: '',
            
            // Surrounding context
            previousSiblingText: '',
            nextSiblingText: '',
            parentText: '',
            closestFieldsetLegend: '',
            
            // Additional semantic context
            nearbyHeadings: [],
            tableHeaderContext: '',
            
            // Element reference
            element: element
        };

        // Extract label associated via 'for' attribute
        if (element.id) {
            const labelElement = document.querySelector(`label[for="${element.id}"]`);
            if (labelElement) {
                context.labelFor = cleanText(labelElement.textContent);
            }
        }

        // Extract label wrapping the element
        const parentLabel = element.closest('label');
        if (parentLabel) {
            // Get label text excluding the input's value
            const labelText = parentLabel.textContent.replace(element.value || '', '');
            context.labelWrapping = cleanText(labelText);
        }

        // Extract aria-labelledby text
        if (context.ariaLabelledBy) {
            const labelIds = context.ariaLabelledBy.split(/\s+/);
            const labelTexts = labelIds.map(id => {
                const el = document.getElementById(id);
                return el ? el.textContent : '';
            }).filter(t => t);
            context.ariaLabelledByText = cleanText(labelTexts.join(' '));
        }

        // Extract aria-describedby text
        if (context.ariaDescribedBy) {
            const descIds = context.ariaDescribedBy.split(/\s+/);
            const descTexts = descIds.map(id => {
                const el = document.getElementById(id);
                return el ? el.textContent : '';
            }).filter(t => t);
            context.ariaDescribedByText = cleanText(descTexts.join(' '));
        }

        // Extract previous sibling text
        let prevSibling = element.previousElementSibling;
        let attempts = 0;
        while (prevSibling && attempts < 3) {
            if (prevSibling.tagName && 
                ['LABEL', 'SPAN', 'DIV', 'P', 'LEGEND', 'DT', 'TH'].includes(prevSibling.tagName)) {
                const text = prevSibling.textContent.trim();
                if (text && text.length < 200) {
                    context.previousSiblingText = cleanText(text);
                    break;
                }
            }
            prevSibling = prevSibling.previousElementSibling;
            attempts++;
        }

        // Extract next sibling text (less common but sometimes used)
        let nextSibling = element.nextElementSibling;
        attempts = 0;
        while (nextSibling && attempts < 2) {
            if (nextSibling.tagName && 
                ['LABEL', 'SPAN', 'DIV', 'P'].includes(nextSibling.tagName)) {
                const text = nextSibling.textContent.trim();
                if (text && text.length < 150) {
                    context.nextSiblingText = cleanText(text);
                    break;
                }
            }
            nextSibling = nextSibling.nextElementSibling;
            attempts++;
        }

        // Extract parent text (for simple containers)
        const parent = element.parentElement;
        if (parent) {
            // Get parent's direct text content (excluding children)
            let parentDirectText = '';
            for (const node of parent.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    parentDirectText += node.textContent;
                }
            }
            parentDirectText = cleanText(parentDirectText);
            if (parentDirectText && parentDirectText.length < 150) {
                context.parentText = parentDirectText;
            }
        }

        // Extract fieldset legend
        const fieldset = element.closest('fieldset');
        if (fieldset) {
            const legend = fieldset.querySelector('legend');
            if (legend) {
                context.closestFieldsetLegend = cleanText(legend.textContent);
            }
        }

        // Extract nearby headings (h1-h6)
        const container = element.closest('section, article, form, div[class*="container"], div[role="group"]') || document.body;
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const heading of headings) {
            const rect = heading.getBoundingClientRect();
            const elemRect = element.getBoundingClientRect();
            
            // Only include headings that are "above" the element (within reasonable distance)
            if (rect.bottom <= elemRect.top && elemRect.top - rect.bottom < 500) {
                context.nearbyHeadings.push(cleanText(heading.textContent));
            }
        }

        // Extract table header context (for inputs in table cells)
        const tableCell = element.closest('td, th');
        if (tableCell) {
            const cellIndex = Array.from(tableCell.parentElement.children).indexOf(tableCell);
            const table = tableCell.closest('table');
            if (table) {
                const headerRow = table.querySelector('thead tr, tr:first-child');
                if (headerRow) {
                    const headerCell = headerRow.children[cellIndex];
                    if (headerCell) {
                        context.tableHeaderContext = cleanText(headerCell.textContent);
                    }
                }
            }
        }

        if (CONTEXT_DEBUG) {
            console.log('[Context] Extracted context for element:', element, context);
        }

        return context;
    }

    /**
     * Clean and normalize text
     * @param {string} text - Raw text
     * @returns {string} Cleaned text
     */
    function cleanText(text) {
        if (!text) return '';
        return text
            .replace(/[\*\:]+$/g, '') // Remove trailing asterisks and colons
            .replace(/\s+/g, ' ')      // Normalize whitespace
            .trim();
    }

    /**
     * Calculate context-based score for field matching
     * @param {Object} context - Field context from extractFieldContext
     * @param {Object} mapping - Field mapping with priority and keywords
     * @returns {number} Context score
     */
    function calculateContextScore(context, mapping) {
        if (!context || !mapping) return 0;

        let score = 0;
        const { priority, keywords } = mapping;

        // Gather all context text sources
        const contextSources = {
            // Highest priority: explicit labels
            labelFor: { text: context.labelFor, weight: 50 },
            labelWrapping: { text: context.labelWrapping, weight: 45 },
            ariaLabel: { text: context.ariaLabel, weight: 45 },
            ariaLabelledByText: { text: context.ariaLabelledByText, weight: 45 },
            
            // High priority: placeholder and automation IDs
            placeholder: { text: context.placeholder, weight: 40 },
            dataAutomationId: { text: context.dataAutomationId, weight: 35 },
            
            // Medium priority: nearby context
            previousSiblingText: { text: context.previousSiblingText, weight: 30 },
            closestFieldsetLegend: { text: context.closestFieldsetLegend, weight: 25 },
            ariaDescribedByText: { text: context.ariaDescribedByText, weight: 20 },
            tableHeaderContext: { text: context.tableHeaderContext, weight: 30 },
            
            // Lower priority: broader context
            parentText: { text: context.parentText, weight: 15 },
            nextSiblingText: { text: context.nextSiblingText, weight: 10 },
            
            // Lowest priority: element attributes
            name: { text: context.name, weight: 25 },
            id: { text: context.id, weight: 25 }
        };

        // Score based on priority keywords (exact matches)
        for (const [sourceName, source] of Object.entries(contextSources)) {
            if (!source.text) continue;
            
            const normalizedText = source.text.toLowerCase();
            
            // Check priority keywords
            for (let i = 0; i < priority.length; i++) {
                const keyword = priority[i].toLowerCase();
                
                // Exact match in the source
                if (normalizedText === keyword) {
                    score += source.weight * 2; // Double weight for exact match
                    if (CONTEXT_DEBUG) {
                        console.log(`[Context] Exact priority match: "${keyword}" in ${sourceName} (score +${source.weight * 2})`);
                    }
                }
                // Contains match with position bonus
                else if (normalizedText.includes(keyword)) {
                    const position = normalizedText.indexOf(keyword);
                    const positionBonus = position === 0 ? 1.5 : 1.0; // Bonus if at start
                    const keywordScore = source.weight * (1 - i / priority.length) * positionBonus;
                    score += keywordScore;
                    if (CONTEXT_DEBUG) {
                        console.log(`[Context] Priority keyword: "${keyword}" in ${sourceName} (score +${keywordScore.toFixed(1)})`);
                    }
                }
            }
            
            // Check general keywords
            for (const keyword of keywords) {
                const keywordLower = keyword.toLowerCase();
                if (normalizedText.includes(keywordLower)) {
                    const keywordScore = source.weight * 0.3;
                    score += keywordScore;
                    if (CONTEXT_DEBUG) {
                        console.log(`[Context] General keyword: "${keyword}" in ${sourceName} (score +${keywordScore.toFixed(1)})`);
                    }
                }
            }
        }

        // Boost score if nearby headings contain relevant context
        for (const heading of context.nearbyHeadings) {
            const headingLower = heading.toLowerCase();
            for (const keyword of keywords) {
                if (headingLower.includes(keyword.toLowerCase())) {
                    score += 5;
                    if (CONTEXT_DEBUG) {
                        console.log(`[Context] Heading match: "${keyword}" in "${heading}" (score +5)`);
                    }
                    break;
                }
            }
        }

        return score;
    }

    /**
     * Find all form fields with their context
     * @returns {Array} Array of field objects with context
     */
    function findFormFieldsWithContext() {
        const fields = [];
        
        const selectors = [
            'input[type="text"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="url"]',
            'input[type="number"]',
            'input[type="date"]',
            'input[type="radio"]',
            'input[type="checkbox"]',
            'input:not([type])',
            'textarea',
            'select'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Skip hidden, readonly, or disabled fields
                if (element.type === 'hidden' || element.readOnly || element.disabled) {
                    return;
                }

                const context = extractFieldContext(element);
                fields.push(context);
            });
        });

        if (CONTEXT_DEBUG) {
            console.log(`[Context] Found ${fields.length} form fields with context`);
        }

        return fields;
    }

    /**
     * Match fields to profile keys using context-aware scoring
     * @param {Array} fields - Fields with context
     * @param {Object} fieldMappings - Field mappings from content.js
     * @returns {Object} Map of profile keys to matched fields
     */
    function matchFieldsWithContext(fields, fieldMappings) {
        const matches = {};

        for (const [profileKey, mapping] of Object.entries(fieldMappings)) {
            const fieldScores = [];

            for (const field of fields) {
                const score = calculateContextScore(field, mapping);
                if (score > 0) {
                    fieldScores.push({ field, score });
                }
            }

            // Sort by score (highest first)
            fieldScores.sort((a, b) => b.score - a.score);

            // Store top matches (up to 3)
            matches[profileKey] = fieldScores.slice(0, 3);

            if (CONTEXT_DEBUG && fieldScores.length > 0) {
                console.log(`[Context] Top match for ${profileKey}:`, fieldScores[0]);
            }
        }

        return matches;
    }

    // Export functions to window for use by content.js
    window.contextAwareMatching = {
        extractFieldContext,
        calculateContextScore,
        findFormFieldsWithContext,
        matchFieldsWithContext,
        cleanText
    };

    if (CONTEXT_DEBUG) {
        console.log('[Context] Context-aware matching module loaded');
    }

})();

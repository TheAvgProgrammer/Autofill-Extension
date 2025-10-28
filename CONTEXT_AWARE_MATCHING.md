# Context-Aware Field Matching

## Overview

The context-aware field matching module (`context.js`) enhances the autofill extension's ability to accurately identify and fill form fields by analyzing surrounding HTML context. This is particularly beneficial for ATS (Applicant Tracking System) platforms like Workday and Greenhouse, where labels and field descriptions often exist outside the input elements themselves.

## Problem Statement

Traditional autofill solutions rely primarily on input element attributes (name, id, placeholder) to identify fields. However, modern ATS platforms often use:
- Labels as previous/next siblings rather than wrapping the input
- ARIA attributes for accessibility
- Complex nested structures with context spread across multiple elements
- Table-based forms where column headers provide context
- Fieldsets with legends for grouping related fields

These patterns make it difficult for simple attribute-based matching to accurately identify fields.

## Solution

The context-aware matching module extracts and analyzes multiple sources of context:

### Context Sources (Prioritized)

1. **Explicit Labels** (Highest Priority)
   - `<label for="...">` associations
   - Wrapping `<label>` elements
   - `aria-label` attributes
   - `aria-labelledby` references

2. **Automation IDs**
   - `data-automation-id` attributes (common in Workday)

3. **Placeholder Text**
   - `placeholder` attributes

4. **Nearby Context** (Medium Priority)
   - Previous sibling text (common in Workday)
   - Next sibling text
   - Parent element text
   - Fieldset legends
   - Table column headers

5. **Element Attributes** (Lower Priority)
   - `name` attributes
   - `id` attributes

6. **Semantic Context** (Additional)
   - Nearby headings (h1-h6)
   - ARIA described-by text

## Key Features

### 1. Context Extraction (`extractFieldContext`)

Extracts all available context from an input element:

```javascript
const context = window.contextAwareMatching.extractFieldContext(element);
// Returns:
{
    id: '',
    name: '',
    placeholder: '',
    type: 'text',
    ariaLabel: '',
    labelFor: '',
    labelWrapping: '',
    previousSiblingText: '',
    nextSiblingText: '',
    parentText: '',
    closestFieldsetLegend: '',
    tableHeaderContext: '',
    nearbyHeadings: [],
    element: HTMLElement
}
```

### 2. Context-Based Scoring (`calculateContextScore`)

Calculates a weighted score based on how well a field's context matches the target profile field:

```javascript
const score = window.contextAwareMatching.calculateContextScore(context, mapping);
```

**Scoring Weights:**
- Label (for): 50 points
- Label (wrapping): 45 points
- ARIA label: 45 points
- Placeholder: 40 points
- Data-automation-id: 35 points
- Previous sibling: 30 points
- Table header: 30 points
- Name attribute: 25 points
- Fieldset legend: 25 points
- Parent text: 15 points

**Score Multipliers:**
- Exact match: 2x weight
- Keyword at start: 1.5x weight
- Priority keywords: Scaled by priority (1.0 - position/length)
- General keywords: 0.3x weight

### 3. Integration with Existing Logic

The context-aware scoring is combined with the existing attribute-based scoring:

```javascript
finalScore = (traditionalScore * 0.4) + (contextScore * 0.6)
```

This gives more weight to context-based matching while still considering traditional attributes.

## Usage

### In Content Scripts

The module is automatically loaded before `content.js` via the manifest:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["context.js", "content.js"]
    }
  ]
}
```

### API

The module exposes functions via `window.contextAwareMatching`:

```javascript
// Extract context from an element
const context = window.contextAwareMatching.extractFieldContext(element);

// Calculate context score
const score = window.contextAwareMatching.calculateContextScore(context, mapping);

// Find all fields with context
const fields = window.contextAwareMatching.findFormFieldsWithContext();

// Match fields to profile keys
const matches = window.contextAwareMatching.matchFieldsWithContext(fields, fieldMappings);
```

## Testing

### Test Files

1. **test-context-aware.html** - Comprehensive test page with 8 different scenarios:
   - Standard label association (for attribute)
   - Workday-style previous sibling labels
   - ARIA labels and aria-labelledby
   - Greenhouse-style table-based forms
   - Fieldset with legend context
   - Complex nested structures
   - Placeholder-based context
   - Multiple choice/radio buttons

2. **test-context-logic.js** - Automated test suite that validates:
   - Module loading
   - Context extraction from various sources
   - Scoring algorithm
   - Field discovery

### Running Tests

1. Load the extension in Chrome (Developer mode)
2. Open `test-context-aware.html` in a new tab
3. Open DevTools Console
4. Tests run automatically and display results
5. Set up a profile and click "Autofill Forms" to test end-to-end

### Expected Outcomes

- **Test 1-6**: Context extraction works for all tested patterns
- **Test 7**: Context scoring produces positive scores for matching fields
- **Test 8**: All form fields are discovered with context
- **End-to-End**: Fields are filled accurately based on context, not just attributes

## Examples

### Example 1: Workday-Style Label

**HTML:**
```html
<div class="workday-field">
  <div style="font-weight: bold;">LinkedIn Profile URL</div>
  <input type="url" data-automation-id="textInput" name="social">
</div>
```

**Traditional Matching:** Would struggle to match based on `name="social"` alone

**Context-Aware Matching:** 
- Extracts "LinkedIn Profile URL" from previous sibling
- Scores highly for `linkedinUrl` profile field
- Correctly identifies and fills the field

### Example 2: Table-Based Form

**HTML:**
```html
<table>
  <thead>
    <tr><th>Institution Name</th></tr>
  </thead>
  <tbody>
    <tr><td><input name="edu1"></td></tr>
  </tbody>
</table>
```

**Traditional Matching:** Would not understand `name="edu1"`

**Context-Aware Matching:**
- Extracts "Institution Name" from table header
- Matches to `institution` profile field
- Fills correctly

## Benefits

1. **Higher Accuracy**: Matches fields based on human-readable labels rather than cryptic attributes
2. **ATS Compatibility**: Works with Workday, Greenhouse, and other modern ATS platforms
3. **Accessibility**: Leverages ARIA attributes used for screen readers
4. **Flexibility**: Handles various HTML structures and patterns
5. **Maintainability**: Scoring weights can be tuned without changing core logic

## Performance Considerations

- Context extraction is performed once per field during form discovery
- Scoring is fast (simple text matching and arithmetic)
- No external dependencies or API calls
- Minimal memory footprint

## Future Enhancements

Potential improvements:
1. Machine learning-based scoring
2. User feedback to improve matching
3. Domain-specific scoring weights (per-site customization)
4. Visual debugging mode to show extracted context
5. Internationalization support for non-English labels

## Debugging

Enable debug mode by setting `CONTEXT_DEBUG = true` in `context.js`:

```javascript
const CONTEXT_DEBUG = true;
```

This will log:
- Extracted context for each field
- Score calculations with breakdown
- Field discovery results
- Matching decisions

## Compatibility

- Works with all modern browsers supporting ES6+
- Compatible with existing content.js logic
- Gracefully degrades if context module fails to load
- No breaking changes to existing functionality

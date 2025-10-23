# Workday Support Documentation

This document describes the Workday-specific features and implementation details in the Job Application Autofill extension.

## Overview

The extension provides first-class support for Workday-hosted job applications (myworkdayjobs.com, *.workday.com) with specialized handlers for Workday's custom widgets, multi-page flows, and **dynamic "Add" sections** for Work Experience and Education.

## Features

### 1. Automatic Workday Detection

The extension automatically detects Workday application pages based on:
- **Hostname patterns**: `myworkdayjobs.com`, `*.myworkdayjobs.com`, `*.workday.com`
- **Page structure**: Presence of `[data-automation-id]` attributes and ARIA roles (`role="listbox"`, `role="option"`)

When Workday mode is detected, the extension:
- Logs detection to console
- Activates Workday-specific widget handlers
- Sets up dynamic content monitoring
- **NEW**: Activates dynamic "Add" button detection for repeatable sections

### 1.5. Dynamic "Add" Sections Support (NEW)

The extension now supports Workday's dynamic "Add" sections where users can add multiple entries for Work Experience and Education by clicking Add buttons. This feature is implemented in `workday-dynamic.js`.

#### How It Works

**Add Button Detection:**
- Monitors clicks on buttons with text/labels containing "Add" (case-insensitive)
- Uses event delegation to capture all Add button clicks
- Filters out "Remove" and "Delete" buttons
- Detects buttons via:
  - `data-automation-id` attributes
  - `aria-label` attributes
  - `title` attributes
  - Button text content

**Section Type Detection:**
- Automatically determines if a section is for Work Experience or Education
- Checks for keywords in labels and surrounding text:
  - Work Experience: "work", "experience", "employment", "job", "position", "company"
  - Education: "education", "school", "university", "college", "degree", "academic"

**MutationObserver:**
- Monitors DOM for newly injected form fields after Add button click
- Waits 500ms for all fields to render completely
- Automatically fills fields with profile data
- Disconnects after successful fill or 10-second timeout

**Work Experience Fields Filled:**
- Company/Employer name
- Job Title/Position
- Currently working here (checkbox) - auto-detected based on end date presence
- Start Date (formatted as yyyy-MM-dd)
- End Date (only if not currently employed)

**Education Fields Filled:**
- Educational Institution
- Degree Level (matched against select options)
- Field of Study / Major
- Graduation Date (formatted as yyyy-MM-dd)

#### Profile Data Required

To use dynamic sections, add these fields to your profile:
- `employmentStartDate` - Format: yyyy-MM-dd or Date object
- `employmentEndDate` - Leave blank if currently employed
- `employer` - Company name (already exists)
- `jobTitle` - Job title (already exists)
- `institution` - University/college name (already exists)
- `degreeType` - Degree level (already exists)
- `major` - Field of study (already exists)
- `graduationDate` - Graduation date (already exists)

#### Testing

Use `test-workday-dynamic-standalone.html` to test the feature:
1. Open the test file in a browser
2. Click "Add Work Experience" or "Add Education" buttons
3. New field groups will appear
4. Click "Simulate Autofill" to test automatic filling
5. Fields will be highlighted in green when filled
6. Check console for detailed logs

### 2. Workday Widget Handlers

#### Text Input Fields
- **Selector**: `[data-automation-id="textInput"]`
- **Handler**: Sets value with proper event dispatching (input, change, blur)
- **Supported fields**: LinkedIn URL, GitHub URL, institution, employer, job title, etc.

#### Combo Boxes / Select Widgets
- **Selectors**: `[data-automation-id*="select"]`, `[data-automation-id="selectWidget"]`, `[data-automation-id*="combo"]`
- **Handler**: 
  - Clicks to open listbox
  - Waits for options to appear
  - Matches by normalized label/value
  - Falls back to keyboard input if needed
- **Supported fields**: Degree level, work authorization, relocation willingness, etc.

#### Date Pickers
- **Selector**: `[data-automation-id="datePicker"]`
- **Handler**: 
  - Attempts direct value setting (yyyy-MM-dd format)
  - Formats dates from various input formats
- **Supported fields**: Start date, graduation date, etc.

#### Radio/Checkbox Groups
- **Roles**: `[role="radio"]`, `[role="checkbox"]`
- **Handler**: 
  - Finds all options in the group
  - Matches by aria-label or associated label text
  - Clicks the matching option
- **Supported fields**: Work authorization, sponsorship, previous employment, etc.

#### File Uploads
- **Selector**: `[data-automation-id="fileUpload"]`
- **Handler**: 
  - Creates File object from base64 data
  - Uses DataTransfer API to set files
  - Waits for upload completion indicators
  - Monitors progress bars and filename badges
- **Supported fields**: Resume/CV uploads

#### Multi-Select Token Inputs
- **Selectors**: `[data-automation-id="tokenInput"]`, `[data-automation-id="multiSelectInput"]`
- **Handler**: 
  - Types each value
  - Waits for dropdown to appear
  - Selects matching option
  - Verifies token/chip is rendered
- **Supported fields**: Skills, technologies, etc.

#### Text Areas
- **Selector**: `[data-automation-id="textArea"]`, `[data-automation-id="richTextArea"]`
- **Handler**: Sets plain text value (sanitized)
- **Supported fields**: Cover letter, additional information, etc.

### 3. Multi-Page Flow Support

#### Session Storage
- **Key format**: `workday_session_{hostname}_{jobId}`
- **Data stored**: Timestamp, current page URL
- **Purpose**: Persist progress across page transitions

#### Dynamic Content Detection
- **MutationObserver**: Monitors DOM for new Workday widgets
- **Throttling**: 2-second throttle to avoid excessive re-runs
- **Auto-fill**: Automatically fills newly appeared fields

#### Navigation Support
The extension can detect and interact with navigation buttons:
- Continue/Next buttons: `[data-automation-id*="continue"]`, `[data-automation-id*="goToNextStep"]`
- Submit buttons: `[data-automation-id*="submitButton"]`
- Progress indicators: Monitors page changes and updates

### 4. Field Coverage

The extension fills the following Workday-specific fields (excluding contact/address):

#### Work Authorization & Availability
- Authorized to work in the US (Yes/No)
- Sponsorship required now or future (Yes/No)
- Earliest start date
- Relocation willingness
- Travel willingness

#### Compensation
- Minimum salary expectation
- Maximum salary expectation

#### Links & Profiles
- LinkedIn profile URL
- GitHub profile URL
- Portfolio/personal website URL

#### Education
- Educational institution
- Degree level (Bachelor's, Master's, PhD, Associate)
- Field of study / Major
- Graduation date
- GPA / CGPA
- Percentage

#### Experience
- Employer name
- Job title
- Start date
- End date
- Description

#### Additional Fields
- How did you hear about us?
- Cover letter (optional)
- Previously worked at company
- Notice period / Availability
- Preferred pronouns
- Veteran status
- Race/ethnicity (if provided in profile)
- Gender (if provided in profile)

### 5. Contact Field Handling

**Important**: The extension does NOT fill contact/address fields. These are deferred to Chrome's built-in Address Autofill:

#### Skipped Fields
- First Name
- Last Name
- Full Name
- Email Address
- Phone Number
- Country Code
- Street Address
- City
- State/Province
- Postal Code / ZIP
- Country

#### Autocomplete Attributes
The extension sets appropriate `autocomplete` attributes on these fields:
- `given-name` for first name
- `family-name` for last name
- `email` for email
- `tel` for phone
- `address-line1` for street address
- `address-level2` for city
- `address-level1` for state
- `postal-code` for ZIP
- `country` for country

Users should click on these fields to trigger Chrome's native autofill suggestions.

## Technical Implementation

### Utility Functions

#### `waitFor(selector, opts)`
Waits for an element to appear in the DOM with timeout and visibility options.

#### `clickAndWaitListbox(element, timeout)`
Clicks an element and waits for a listbox to appear.

#### `selectOptionByLabel(listbox, value)`
Selects an option by matching normalized label text.

#### `setInputValue(element, value)`
Sets input value using native setter and dispatches events.

#### `waitForUploadComplete(fileInput, timeout)`
Waits for file upload completion by monitoring indicators.

#### `formatDateForWorkday(value)`
Formats dates to yyyy-MM-dd format for Workday date pickers.

### Main Functions

#### `detectWorkdayMode()`
Detects if current page is a Workday application based on hostname and page structure.

#### `fillWorkdayFields(profile, resumeFile)`
Main function that fills all Workday-specific widgets using appropriate handlers.

#### `findProfileKeyForLabel(label)`
Maps field labels to profile keys using keyword matching.

#### `setupWorkdayObserver(profile, resumeFile)`
Sets up MutationObserver for dynamic content detection.

#### `saveWorkdayProgress(data)` / `loadWorkdayProgress()`
Manages session storage for multi-page flow persistence.

## Testing

### Test File: test-workday.html

The test file simulates a realistic Workday multi-page application with:
- 4 pages (Basic Info, Work Auth & Availability, Education & Experience, Additional Info)
- Progress bar indicator
- Continue/Next buttons with `data-automation-id` attributes
- All major Workday widget types
- Realistic field labels and structures

### Manual Testing Steps

1. **Load Extension**
   - Open Chrome
   - Go to chrome://extensions/
   - Enable Developer mode
   - Load unpacked extension

2. **Setup Profile**
   - Click extension icon
   - Fill in all job-specific fields
   - Upload resume file
   - Save profile

3. **Test Workday Flow**
   - Open test-workday.html
   - Click "Autofill Forms" in extension popup
   - Verify console shows "Workday mode detected"
   - Check that non-contact fields are filled on page 1
   - Click Continue to page 2
   - Verify work authorization and sponsorship are filled
   - Continue to pages 3 and 4
   - Verify all fields are filled correctly

4. **Test Contact Fields**
   - Focus on First Name field
   - Verify Chrome autofill suggestions appear
   - Select an address from Chrome's autofill
   - Verify all contact fields populate via Chrome

5. **Test File Upload**
   - Verify resume file is attached to file input
   - Check for filename display or upload indicator

### Console Logging

Enable Workday debug mode by setting `WORKDAY_DEBUG = true` in content.js for detailed logging:
- Workday mode detection
- Widget handler invocations
- File upload progress
- Session storage operations
- MutationObserver triggers

## Best Practices

### For Users
1. Set up Chrome addresses for contact information (Settings → Autofill → Addresses)
2. Fill in all job-specific fields in extension profile
3. Use the extension for job fields, Chrome autofill for contact fields
4. Let multi-page flows complete before navigating manually

### For Developers
1. Always check `isWorkdayMode` before using Workday handlers
2. Use proper event dispatching for all value changes
3. Add delays after interactions to allow UI updates
4. Handle errors gracefully with try-catch blocks
5. Test with throttling and slow network conditions

## Troubleshooting

### Fields Not Filling
- Check console for errors
- Verify Workday mode is detected
- Ensure fields have `data-automation-id` attributes
- Check that profile contains values for those fields

### Contact Fields Not Working
- Verify Chrome autofill is enabled (Settings → Autofill → Addresses)
- Ensure at least one address is saved in Chrome
- Check that autocomplete attributes are set (inspect element)

### File Upload Not Working
- Verify file format is supported (PDF/DOC/DOCX)
- Check file size is reasonable
- Ensure DataTransfer API is not blocked by page

### Multi-Page Flow Issues
- Check session storage is enabled
- Verify navigation buttons have correct `data-automation-id`
- Ensure MutationObserver is not disabled

## Future Enhancements

Potential improvements for future versions:
1. AI-powered field detection for custom questions
2. Support for more Workday widget types
3. Auto-navigation through multi-page flows
4. Progress persistence across browser sessions
5. Support for dependent fields and conditional logic
6. Integration with browser password managers
7. Support for Workday's iframe-based applications

## Security & Privacy

- All data stays local (Chrome storage)
- No external API calls for autofill
- Contact data managed by Chrome, not extension
- CSP-compliant implementation (no eval, no inline scripts)
- Session storage cleared after job application
- Resume file stored in profile, not transmitted

## Compliance

The implementation respects:
- Content Security Policy (CSP)
- CORS restrictions
- Chrome extension manifest v3
- Web Content Accessibility Guidelines (WCAG)
- Privacy best practices

## Support

For issues or questions:
1. Check console logs for errors
2. Verify test-workday.html works correctly
3. Review CHANGES.md for recent updates
4. Open an issue on GitHub with details

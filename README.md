# Job Application Autofill Extension

A Chrome extension that automatically fills job application forms with your saved profile data using intelligent pattern matching.

## Features

- **Multi-Profile Support**: Store and manage up to 5 different profiles
- **Context-Aware Field Matching**: Advanced field detection using surrounding HTML context (labels, nearby text, ARIA attributes) for improved accuracy on ATS platforms like Workday and Greenhouse
- **Workday Optimization**: First-class support for Workday-hosted job applications (myworkdayjobs.com, *.workday.com) with specialized widget handlers
- **Dynamic "Add" Sections**: Automatically fills dynamically added Work Experience and Education sections on Workday
- **Multi-Page Flow Support**: Automatically handles multi-page applications with progress tracking and dynamic content detection
- **Comprehensive Profile Fields**: LinkedIn URL, GitHub URL, Portfolio URL, US Work Authorization, Visa Sponsorship, Referral Source, Education, Experience, Salary Expectations, and Resume File
- **Contact Field Deferral**: Personal contact and address fields (name, email, phone, address, city, state, postal code, country) are deferred to Chrome's built-in Address Autofill for better privacy and security
- **Referral Source Tracking**: "How did you hear about us?" field with options: LinkedIn, Google, Twitter, Friend, Other
- **Intelligent Pattern Matching**: Uses regex-based field detection combined with context-aware scoring to identify form fields accurately
- **Radio Button Support**: Handles both dropdown and radio button inputs for yes/no questions
- **US Work Authorization**: Automatically fills work authorization questions (dropdowns and radio buttons)
- **Visa Sponsorship**: Automatically fills visa sponsorship questions (dropdowns and radio buttons)
- **Resume Upload**: Automatically uploads your resume file to file input fields (including Workday file uploads)
- **Simple Interface**: Clean two-tab design (Profile & Autofill)

## How to Use

1. **Setup Profile**: Go to the Profile tab and fill in your information for any of the 5 available profiles
2. **Select Profile**: Use the dropdown to switch between different profiles
3. **Upload Resume**: Add your resume file (PDF/DOC/DOCX) to each profile
4. **Autofill Forms**: Navigate to any job application page and click "Autofill Forms"

## Profile Fields

Each profile supports the following fields:
- **First Name** * (Required)
- **Last Name** * (Required)  
- **Email Address** * (Required)
- **Country Code** * (Required - e.g., +1, +44, +91)
- **Phone Number** * (Required - without country code)
- **LinkedIn URL** (Optional)
- **Country** * (Required)
- **State/Province** * (Required)
- **City** * (Required)
- **Pincode/Zipcode** * (Required)
- **US Work Eligible** * (Required - Yes/No)
- **Sponsorship Required** * (Required - Yes/No)
- **How Did You Hear About Us?** (Optional - LinkedIn, Google, Twitter, Friend, Other)
- **Resume File** (Optional - PDF/DOC/DOCX)

### Automatically Filled Fields

The extension also automatically fills:
- **Full Name** - Automatically combines firstName + lastName
- **Phone Number** - Automatically combines countryCode + phone (e.g., "+1 5551234567")
- **Country Code Select** - If a separate dial-code dropdown exists, it is selected using normalized matching (supports "+1", "1", and texts like "United States (+1)"). Phone input is filled with the local number only.
- **First Name Variations** - firstname, first_name, fname, given_name, givenname, forename, first-name
- **Last Name Variations** - lastname, last_name, lname, surname, family_name, familyname, last-name
- **Full Name Variations** - fullname, full_name, name, full-name, completename, complete_name
- **Phone Variations** - phone, phone_number, phonenumber, mobile, tel, telephone
- **Referral Source Variations** - how_did_you_hear, referral_source, referral, source, hear_about
- **Work Authorization** - Handles both dropdown selects and radio buttons
- **Visa Sponsorship** - Handles both dropdown selects and radio buttons

## Testing

The extension includes comprehensive test files to verify autofill functionality:

### Test Files

1. **test.html** - Standard test form with common job application fields
2. **test-csp.html** - CSP-compliant test form to ensure no Content Security Policy violations
3. **test-comprehensive.html** - Comprehensive test covering all field variations:
   - First name variations (firstname, first_name, fname, givenname, forename)
   - Last name variations (lastname, last_name, lname, surname, familyname)
   - Full name fields (fullname, full_name, name, complete_name)
   - Phone number fields (phone, phone_number, mobile, tel, telephone)
   - Referral source fields (how_did_you_hear, referral_source, source)
   - US Work Authorization (dropdown and radio buttons)
   - Visa Sponsorship (dropdown and radio buttons)
   - Standard contact fields
4. **test-workday.html** - Workday-specific test form with realistic structure:
   - Multi-page flow with progress tracking (4 pages)
   - Data-automation-id attributes on all fields
   - Workday-style widgets (textInput, selectWidget, datePicker, fileUpload)
   - Work authorization and sponsorship questions
   - Education and experience fields
   - Salary expectations and additional questions

### How to Test

1. Load the extension in Chrome (Developer mode)
2. Open any of the test files in a new tab
3. Set up a profile in the extension with all required fields:
   - LinkedIn URL, GitHub URL (optional)
   - US Work Eligible, Sponsorship Required
   - Education details (institution, degree, major, GPA, graduation date)
   - Experience details (employer, job title)
   - Salary expectations (min/max)
   - Resume file (PDF/DOC/DOCX)
   - Other optional fields
4. Click "Autofill Forms" button in the extension popup
5. Verify that all fields are filled correctly including:
   - Work authorization set to "Yes" or "No" based on profile
   - Visa sponsorship set to "Yes" or "No" based on profile
   - Radio buttons correctly selected for yes/no questions
   - LinkedIn, GitHub, and portfolio URLs filled
   - Education and experience details populated
   - Salary expectations filled
   - Resume file uploaded

### Testing Workday Support

To test Workday-specific functionality:

1. Open **test-workday.html** in a new tab
2. Set up your profile with all fields
3. Click "Autofill Forms" in the extension popup
4. Verify:
   - Extension detects Workday mode (check console log)
   - Contact fields remain empty (for Chrome autofill)
   - All non-contact fields are filled across all 4 pages
   - File upload works for resume
   - Navigation between pages works smoothly
   - Progress is maintained across pages
5. Focus on contact fields (name, email, phone) and verify Chrome's autofill suggestions appear

**Note**: Contact/address fields are intentionally left empty by the extension. To fill them, click on each field and use Chrome's built-in autofill suggestions (make sure you have addresses saved in Chrome Settings → Autofill → Addresses).

### Testing Dynamic "Add" Sections (NEW)

To test the new dynamic Add sections feature for Work Experience and Education:

1. Open **test-workday-dynamic-standalone.html** in a browser
2. Set up your profile with employment and education dates:
   - `employmentStartDate` - e.g., "2020-01-15"
   - `employmentEndDate` - Leave blank if currently employed
   - `employer` - Company name
   - `jobTitle` - Job title
   - `institution` - University name
   - `degreeType` - Degree level
   - `major` - Field of study
   - `graduationDate` - Graduation date
3. Click "Add Work Experience" button - a new entry form appears
4. The extension automatically detects and fills the new fields:
   - Company Name
   - Job Title
   - Currently Working Here checkbox (checked if no end date)
   - Start Date
   - End Date (if applicable)
5. Click "Add Education" button - a new entry form appears
6. The extension automatically fills:
   - Educational Institution
   - Degree Level
   - Field of Study / Major
   - Graduation Date
7. You can add multiple entries by clicking Add buttons again
8. Use "Simulate Autofill" to manually trigger autofill on all entries
9. Check console for detailed logs (in DEBUG mode)

**Real Workday Testing**: On actual Workday sites (*.myworkdayjobs.com), the extension will automatically:
- Detect Add buttons for Work Experience and Education sections
- Monitor for newly injected form fields
- Fill fields immediately after they appear
- Support multiple entries per section

## How It Works

The extension uses intelligent pattern matching combined with context-aware analysis to identify form fields based on:
- Field names and IDs
- Label text content (both explicit and implicit)
- Placeholder text
- ARIA labels and descriptions
- Surrounding HTML context (previous/next siblings, parent elements)
- Table headers and fieldset legends
- Field types (email, tel, url, text, select, radio, etc.)

### Field Matching Algorithm

1. **Context Extraction**: The `context.js` module extracts all available context from input elements:
   - Explicit labels (for, wrapping, aria-label, aria-labelledby)
   - Data automation IDs (common in Workday)
   - Nearby text (previous/next siblings, parent text)
   - Semantic structure (table headers, fieldset legends, nearby headings)

2. **Context-Aware Scoring**: Each field is scored based on:
   - **High Priority** (40-50 points): Explicit labels, placeholders, automation IDs
   - **Medium Priority** (25-35 points): Nearby text, table headers, element attributes
   - **Lower Priority** (10-20 points): Parent text, distant context
   - Exact matches receive 2x weight, keywords at start receive 1.5x weight

3. **Hybrid Scoring**: Combines traditional attribute-based scoring (40%) with context-aware scoring (60%) for optimal accuracy

4. **Priority Keywords**: Each profile field has priority keywords that score higher (e.g., "firstname", "first_name" for First Name)

5. **Multiple Matches**: The system can fill multiple fields of the same type to handle forms with redundant fields

For detailed information about context-aware matching, see [CONTEXT_AWARE_MATCHING.md](CONTEXT_AWARE_MATCHING.md).

### Key Features

- **Full Name Handling**: Automatically generates full name from firstName + lastName when a "Full Name" field is detected
- **International Phone Support**: Combines country code and phone number during autofill (e.g., "+1" + "5551234567" = "+1 5551234567"). When a dial-code dropdown is detected, the dropdown is set and the phone input remains local-only.
- **Referral Source Tracking**: Supports "How did you hear about us?" fields with options: LinkedIn, Google, Twitter, Friend, Other
- **Radio Button Support**: Detects and fills radio button inputs for yes/no questions by:
  - Matching radio button values (yes/no)
  - Matching associated label text
  - Supporting common variations (authorized/not authorized, yes/no, etc.)
- **Enhanced Name Detection**: Expanded regex patterns to catch more naming variations:
  - First Name: firstname, first_name, fname, given_name, givenname, forename, first-name
  - Last Name: lastname, last_name, lname, surname, family_name, familyname, last-name
  - Full Name: fullname, full_name, name, full-name, completename, complete_name
- **Enhanced Phone Detection**: Comprehensive pattern matching for phone fields:
  - Phone: phone, phone_number, phonenumber, mobile, tel, telephone
- **Referral Source Detection**: Pattern matching for referral/source fields:
  - Referral: how_did_you_hear, referral_source, referral, source, hear_about, heard_about
- **Work Authorization & Sponsorship**: Comprehensive pattern matching for US work authorization and visa sponsorship questions in both dropdown and radio button formats

## Privacy

- All data is stored locally in your browser
- No external services or APIs are used
- Your information never leaves your device

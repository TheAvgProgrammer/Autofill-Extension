# Job Application Autofill Extension

A Chrome extension that automatically fills job application forms with your saved profile data using intelligent pattern matching.

## Features

- **Multi-Profile Support**: Store and manage up to 5 different profiles
- **Workday Optimization**: First-class support for Workday-hosted job applications (myworkdayjobs.com, *.workday.com) with specialized widget handlers
- **Language Auto-Selection**: Automatically sets language preference to English on Workday applications (myworkdayjobs.com)
- **Multi-Page Flow Support**: Automatically handles multi-page applications with progress tracking and dynamic content detection
- **Comprehensive Profile Fields**: LinkedIn URL, GitHub URL, Portfolio URL, Language Preference, US Work Authorization, Visa Sponsorship, Referral Source, Education, Experience, Salary Expectations, and Resume File
- **Contact Field Deferral**: Personal contact and address fields (name, email, phone, address, city, state, postal code, country) are deferred to Chrome's built-in Address Autofill for better privacy and security
- **Referral Source Tracking**: "How did you hear about us?" field with options: LinkedIn, Google, Twitter, Friend, Other
- **Intelligent Pattern Matching**: Uses regex-based field detection to identify form fields accurately
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
- **LinkedIn URL** (Optional)
- **GitHub URL** (Optional)
- **Portfolio / Website URL** (Optional)
- **Preferred Language** (Optional - Defaults to English, especially important for myworkdayjobs.com)
- **US Work Eligible** * (Required - Yes/No)
- **Sponsorship Required** * (Required - Yes/No)
- **How Did You Hear About Us?** (Optional - LinkedIn, Google, Twitter, Friend, Other)
- **Willing to Relocate** (Optional - Yes/No)
- **Willing to Travel** (Optional - Yes/No/Occasionally)
- **Earliest Start Date** (Optional)
- **Notice Period** (Optional)
- **Preferred Pronouns** (Optional)
- **Worked Before** (Optional - Yes/No)
- **Veteran Status** (Optional)
- **Salary Expectations** (Optional - Min/Max)
- **Education Details** (Optional - Institution, Degree Type, Major, Graduation Date, CGPA, Percentage)
- **Recent Employer** (Optional)
- **Recent Job Title** (Optional)
- **Cover Letter** (Optional)
- **Race** (Optional)
- **Gender** (Optional)
- **Resume File** (Optional - PDF/DOC/DOCX)

**Note**: Personal contact and address fields (name, email, phone, address, city, state, postal code, country) are handled by Chrome's built-in Address Autofill for better privacy and security.

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

## How It Works

The extension uses intelligent pattern matching to identify form fields based on:
- Field names and IDs
- Label text content
- Placeholder text
- ARIA labels
- Field types (email, tel, url, text, select, radio, etc.)

### Field Matching Algorithm

1. **Priority Keywords**: Each profile field has priority keywords that score higher (e.g., "firstname", "first_name" for First Name)
2. **General Keywords**: Additional keywords that score lower but help catch edge cases
3. **Scoring System**: Fields are scored based on matches, with exact matches receiving bonus points
4. **Multiple Matches**: The system can fill multiple fields of the same type to handle forms with redundant fields

### New Features

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

# Job Application Autofill Extension

A Chrome extension that automatically fills job application forms with your saved profile data using intelligent pattern matching.

## Features

- **Multi-Profile Support**: Store and manage up to 5 different profiles
- **Comprehensive Profile Fields**: First Name, Last Name, Full Name, LinkedIn URL, Email Address, Phone Number, Country, State, City, Pincode, US Work Authorization, Visa Sponsorship, and Resume File
- **Intelligent Pattern Matching**: Uses regex-based field detection to identify form fields accurately
- **Full Name Support**: Automatically combines first and last name for "Full Name" fields
- **Radio Button Support**: Handles both dropdown and radio button inputs for yes/no questions
- **US Work Authorization**: Automatically fills work authorization questions (dropdowns and radio buttons)
- **Visa Sponsorship**: Automatically fills visa sponsorship questions (dropdowns and radio buttons)
- **Resume Upload**: Automatically uploads your resume file to file input fields
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
- **Phone Number** * (Required)
- **LinkedIn URL** (Optional)
- **Country** * (Required)
- **State/Province** * (Required)
- **City** * (Required)
- **Pincode/Zipcode** * (Required)
- **US Work Eligible** * (Required - Yes/No)
- **Sponsorship Required** * (Required - Yes/No)
- **Resume File** (Optional - PDF/DOC/DOCX)

### Automatically Filled Fields

The extension also automatically fills:
- **Full Name** - Automatically combines firstName + lastName
- **First Name Variations** - firstname, first_name, fname, given_name, givenname, forename, first-name
- **Last Name Variations** - lastname, last_name, lname, surname, family_name, familyname, last-name
- **Full Name Variations** - fullname, full_name, name, full-name, completename, complete_name
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
   - US Work Authorization (dropdown and radio buttons)
   - Visa Sponsorship (dropdown and radio buttons)
   - Standard contact fields

### How to Test

1. Load the extension in Chrome (Developer mode)
2. Open any of the test files in a new tab
3. Set up a profile in the extension with all required fields
4. Click "Autofill Forms" button in the extension popup
5. Verify that all fields are filled correctly including:
   - First and last names in their respective fields
   - Full name fields automatically populated with "FirstName LastName"
   - Work authorization set to "Yes" or "No" based on profile
   - Visa sponsorship set to "Yes" or "No" based on profile
   - Radio buttons correctly selected for yes/no questions

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
- **Radio Button Support**: Detects and fills radio button inputs for yes/no questions by:
  - Matching radio button values (yes/no)
  - Matching associated label text
  - Supporting common variations (authorized/not authorized, yes/no, etc.)
- **Enhanced Name Detection**: Expanded regex patterns to catch more naming variations:
  - First Name: firstname, first_name, fname, given_name, givenname, forename, first-name
  - Last Name: lastname, last_name, lname, surname, family_name, familyname, last-name
  - Full Name: fullname, full_name, name, full-name, completename, complete_name
- **Work Authorization & Sponsorship**: Comprehensive pattern matching for US work authorization and visa sponsorship questions in both dropdown and radio button formats

## Privacy

- All data is stored locally in your browser
- No external services or APIs are used
- Your information never leaves your device
# Job Application Autofill Extension

A Chrome extension that automatically fills job application forms with your saved profile data using intelligent pattern matching.

## Features

- **Multi-Profile Support**: Store and manage up to 5 different profiles
- **Comprehensive Profile Fields**: First Name, Last Name, LinkedIn URL, Email Address, Phone Number, Country, State, City, Pincode, and Resume File
- **Intelligent Pattern Matching**: Uses regex-based field detection to identify form fields accurately
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
- **Resume File** (Optional - PDF/DOC/DOCX)

## Testing

Use the included `test.html` file to test the autofill functionality:
1. Load the extension in Chrome (Developer mode)
2. Open `test.html` in a new tab
3. Set up a profile in the extension
4. Click "Autofill Forms" to test the functionality

## How It Works

The extension uses intelligent pattern matching to identify form fields based on:
- Field names and IDs
- Label text content
- Placeholder text
- ARIA labels
- Field types (email, tel, url, text, etc.)

## Privacy

- All data is stored locally in your browser
- No external services or APIs are used
- Your information never leaves your device
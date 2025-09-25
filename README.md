# Job Application Autofill Extension

A Chrome extension that automatically fills job application forms with your saved profile data. Save time and ensure consistency across job applications by storing your information once and autofilling forms on any website.

![Extension Demo](https://github.com/user-attachments/assets/7c7e1ce9-66c4-4597-ad74-57c2747dccc3)

## Features

- 🚀 **Easy Profile Management**: Save and edit your job application profile with all common fields
- ⚡ **Smart Autofill**: Intelligently matches form fields to your profile data using advanced algorithms
- 🎯 **Universal Compatibility**: Works on any website with job application forms
- 🔒 **Local Storage**: Your data stays private and secure on your device
- 🎨 **Clean Interface**: Modern, professional design with tabbed interface
- 📱 **Responsive**: Optimized for the Chrome extension popup format

## Supported Profile Fields

The extension can autofill the following types of information:

- **Personal Information**: Full name, email, phone number
- **Address Details**: Street address, city, state/province, ZIP code, country
- **Professional Background**: Education, work experience, skills
- **Online Presence**: LinkedIn profile, portfolio/website URLs
- **Contact Information**: Alternative email and phone fields

## Installation

### From Chrome Web Store (Recommended)
*Coming soon - extension will be published to the Chrome Web Store*

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your Chrome toolbar

## How to Use

### 1. Set Up Your Profile

![Profile Tab](https://github.com/user-attachments/assets/7c7e1ce9-66c4-4597-ad74-57c2747dccc3)

1. Click the extension icon in your Chrome toolbar
2. Fill out your profile information in the "Profile" tab
3. Click "Save Profile" to store your data locally

### 2. Autofill Forms

![Autofill Tab](https://github.com/user-attachments/assets/f3a6a3cd-1496-4a63-9c9f-6c49ed9ca2b6)

1. Navigate to any webpage with a job application form
2. Click the extension icon and switch to the "Autofill" tab
3. Click the "⚡ Autofill Forms" button
4. The extension will scan the page and fill matching fields

### 3. Test the Extension

A test form is included (`test.html`) that you can use to verify the extension works correctly:

![Test Form](https://github.com/user-attachments/assets/9a361835-b0ac-4cfe-ba45-b49ed10b6592)

## How It Works

The extension uses sophisticated field matching algorithms to identify form fields:

1. **DOM Scanning**: Scans the webpage for input fields, textareas, and select elements
2. **Intelligent Matching**: Uses multiple strategies to match fields:
   - Field names and IDs (exact and partial matches)
   - Label text analysis (associated labels, wrapped labels, adjacent text)
   - Placeholder text matching
   - ARIA label attributes
   - Priority-based scoring system
3. **Smart Filling**: Fills fields while respecting existing content and triggering proper events

### Field Matching Examples

The extension recognizes various naming conventions:

- **Name fields**: `name`, `full_name`, `fullName`, `applicant_name`, `candidate_name`
- **Email fields**: `email`, `email_address`, `contact_email`, `e_mail`
- **Phone fields**: `phone`, `telephone`, `phone_number`, `mobile`, `tel`
- **Address fields**: `address`, `street_address`, `street`, `location`

## File Structure

```
/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.css             # Styling for the popup
├── popup.js              # Popup functionality and profile management
├── content.js            # Content script for form scanning and filling
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── test.html             # Test form for validation
├── demo-popup.html       # Standalone demo of the popup
└── README.md             # This file
```

## Privacy & Security

- **Local Storage Only**: All profile data is stored locally using Chrome's storage API
- **No External Servers**: No data is sent to external servers or third parties
- **Minimal Permissions**: Only requests necessary permissions (storage, activeTab)
- **Open Source**: Full source code is available for review

## Development

### Prerequisites
- Google Chrome
- Basic knowledge of HTML, CSS, and JavaScript

### Testing
1. Load the extension in developer mode
2. Open `test.html` in Chrome
3. Use the extension to fill the test form
4. Verify all fields are filled correctly

### Customization
You can modify the field matching logic in `content.js` by updating the `FIELD_MAPPINGS` object to add new field types or improve matching accuracy.

## Troubleshooting

### Extension Not Working
- Ensure you're on a webpage with form fields
- Check that the extension has the necessary permissions
- Try refreshing the page and using the extension again

### Fields Not Being Filled
- Verify your profile data is saved (check the Profile tab)
- Some websites use custom form implementations that may not be compatible
- The extension works best with standard HTML form elements

### Can't Save Profile
- Ensure all required fields (marked with *) are filled
- Check that your email address is in a valid format

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.
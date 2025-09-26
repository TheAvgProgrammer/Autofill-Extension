# Job Application Autofill Extension

...

## New Features

- **Resume upload**: You can now upload your resume file (PDF/DOC) in your profile tab. The extension will autofill resume upload fields when you click Autofill on job forms.
- **Supabase login**: Added login tab for user authentication using Supabase. Please enter your Supabase keys in `popup.js`.

## How to Use

1. Go to the Profile tab and fill in your info, including uploading your resume.
2. (Optional) Log in via the Login tab.
3. Click Autofill Forms to automatically fill and upload your resume on job application sites.
4. Use `test.html` to test the autofill and resume upload feature.

## Testing

- Profile saving and resume upload have been verified using Chrome's extension loader and the test form.
- Resume file upload works with standard file input fields (browser restrictions may apply for some sites).
- Authentication works once you enter your Supabase keys.

...
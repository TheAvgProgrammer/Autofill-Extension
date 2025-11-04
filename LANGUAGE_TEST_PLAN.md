# Language Feature Test Plan

This document describes how to test the new language feature for myworkdayjobs.com.

## Overview
The extension now automatically sets the language preference to English on Workday application pages (myworkdayjobs.com). This ensures that the application interface is in English by default, which is critical for consistent autofill behavior.

## Feature Implementation

### 1. Profile Field
- Added "Preferred Language" dropdown to the profile form
- Default value: English
- Available options: English, Spanish, French, German, Chinese, Japanese, Portuguese, Other

### 2. Auto-Detection and Filling
The extension detects and fills language selectors in two ways:

#### A. Pre-Fill Language Selector (Workday Mode)
When autofill is triggered on a Workday page:
1. The `setWorkdayLanguage()` function runs FIRST before any other fields
2. It searches for language selectors using multiple patterns:
   - `[data-automation-id*="language"]`
   - `[data-automation-id*="locale"]`
   - `select[name*="language"]`
   - `select[id*="language"]`
   - `select[aria-label*="language"]`
   - Workday combo boxes with language in aria-label
3. Sets the selector to "English" or the user's preferred language from profile
4. Works for both standard HTML selects and Workday custom widgets

#### B. Field Mapping Based Detection
Language fields in the application form are also filled through:
1. Field mapping: `language` profile key matches to field labels containing:
   - Priority keywords: 'language', 'preferred_language', 'lang', 'language_preference', etc.
   - General keywords: 'language', 'lang', 'preferred', 'select', 'choose', 'communication'
2. Works with both text inputs and combo boxes

## Test Files

### test-language.html
A dedicated test file with multiple language selector scenarios:
1. Standard HTML select with `data-automation-id="languageSelect"`
2. Locale select with different value formats
3. Aria-label based language selector
4. Simulated Workday combo box
5. Other application fields for context

## Manual Testing Steps

### Prerequisites
1. Load the extension in Chrome (Developer mode)
2. Go to chrome://extensions/
3. Click "Load unpacked" and select the extension directory

### Test 1: Profile Form Default Language
1. Open the extension popup
2. Navigate to Profile tab
3. Check that "Preferred Language" field shows "English" by default
4. Save the profile
5. **Expected**: Language field saves with "English" value

### Test 2: Language Field in Profile Storage
1. Open the extension popup
2. Change language to "Spanish"
3. Save the profile
4. Close and reopen the popup
5. **Expected**: Language field shows "Spanish" (saved value persists)

### Test 3: Test File - Standard Language Selectors
1. Open `test-language.html` in a browser tab
2. Open the extension popup (ensure a profile is saved)
3. Click "Autofill Forms"
4. **Expected**: 
   - All language selectors are set to "English"
   - Success message appears under each selector
   - Other fields (LinkedIn, Work Authorization) are also filled

### Test 4: Workday Domain Detection
**Note**: This test requires access to an actual myworkdayjobs.com page or simulating one

1. Create a test page that:
   - Has hostname containing "myworkdayjobs.com" OR
   - Has elements with `data-automation-id` attributes
2. Add a language selector to the page
3. Run autofill
4. Check console for: `[Autofill Extension] Workday mode detected`
5. **Expected**: Language selector is set to English BEFORE other fields

### Test 5: Language Selector Priority
**Purpose**: Verify language is set before other fields

1. Open test-language.html
2. Open browser console (F12)
3. Add console logging to track field filling order
4. Run autofill
5. **Expected**: Language fields are filled or attempted first in Workday mode

### Test 6: Multiple Language Selectors
**Purpose**: Verify all language selectors on a page are handled

1. Create a test page with 2-3 language selectors
2. Run autofill
3. **Expected**: All language selectors are set to English

### Test 7: Non-English Language Selection
1. Open extension popup
2. Set language to "French" in profile
3. Save profile
4. Open test page with language selector
5. Run autofill
6. **Expected**: Language selector attempts to set to "French" (if available)
   - Falls back gracefully if "French" option doesn't exist

### Test 8: Edge Cases

#### Case A: No Language Selector on Page
1. Open a test page without language selectors
2. Run autofill
3. **Expected**: No errors, other fields fill normally

#### Case B: Language Selector Already Set
1. Manually set language selector to "Spanish"
2. Run autofill
3. **Expected**: Language selector is overridden to "English"

#### Case C: Disabled Language Selector
1. Create test page with disabled language selector
2. Run autofill
3. **Expected**: Extension attempts to fill but handles gracefully if disabled

#### Case D: Hidden Language Selector
1. Create test page with hidden (display: none) language selector
2. Run autofill
3. **Expected**: Extension may skip hidden selectors, no errors

## Expected Console Output

### Successful Language Setting
```
[Autofill Extension] Workday mode detected - using optimized handlers
Set language selector to English: <select data-automation-id="languageSelect">
```

### With Debug Mode (WORKDAY_DEBUG = true)
```
[Autofill Extension] Workday mode detected
Set language selector to English: <element>
or
Set Workday language combo to English: <element>
```

### No Language Selector Found
No specific console message (silent failure is acceptable)

## Troubleshooting

### Language Not Setting
1. Check if Workday mode is detected (console message)
2. Verify language selector has one of the expected attributes
3. Check if "English" option exists in the selector
4. Try different selector patterns

### Profile Not Saving Language
1. Verify popup.html has the language field
2. Check Chrome storage: `chrome.storage.local.get(console.log)`
3. Ensure no JavaScript errors in popup

### Extension Not Loading
1. Check manifest.json is valid
2. Verify all files referenced in manifest exist
3. Check for JavaScript syntax errors

## Code Locations

### Language Field Definition
- **File**: `popup.html`
- **Lines**: ~55-66 (after portfolioUrl field)

### Language Field Mapping
- **File**: `content.js`
- **Lines**: ~356-359 (in FIELD_MAPPINGS)

### Language Auto-Fill Function
- **File**: `content.js`
- **Function**: `setWorkdayLanguage()`
- **Lines**: ~890-955

### Language Default Setting
- **File**: `content.js`
- **Lines**: ~1019-1021 (in performAutofill)

## Success Criteria

✅ Language field appears in profile form with "English" as default
✅ Language field value is saved and loaded correctly
✅ Language selectors on test-language.html are all set to English
✅ Workday mode detection works (console message)
✅ Language is set BEFORE other fields in Workday mode
✅ No JavaScript errors in console
✅ Other autofill functionality still works normally
✅ Non-Workday pages are not affected

## Known Limitations

1. **Workday Detection**: Only triggers on domains matching WORKDAY_HOSTS patterns
2. **Option Matching**: Language must be labeled as "English", "english", "en", "en-us", or "en_us" to be detected
3. **Custom Widgets**: Some highly customized language selectors may not be detected
4. **Timing**: Language setting happens during autofill; doesn't persist across page refreshes

## Future Enhancements

1. Support for more language matching patterns
2. Remember language setting across page navigations
3. Option to disable auto-language setting
4. Support for language preferences other than English as global default

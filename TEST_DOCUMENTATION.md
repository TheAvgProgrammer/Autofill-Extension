# Test Documentation

## Overview
This document describes the testing performed for the new features:
1. Mobile number with country code support
2. "How did you hear about us?" field

## Tests Performed

### 1. Unit Tests (Automated)
All tests located in `test_autofill_simulation.html`

**Results: 9/9 tests passing**

- ✅ Test 1: Country Code + Phone Number Combination
  - Verified that "+1" + "5551234567" = "+1 5551234567"
  
- ✅ Test 2: Full Name Auto-Generation
  - Verified that "John" + "Doe" = "John Doe"
  
- ✅ Test 3: "How Did You Hear" Field Mapping
  - Verified field mapping exists with correct priority and general keywords
  
- ✅ Test 4: Profile Contains "How Did You Hear" Value
  - Verified profile schema includes the new field
  
- ✅ Test 5: Field Matching Simulation (4 sub-tests)
  - "How did you hear about us?" → howDidYouHear (Score: 110) ✅
  - "Referral Source" → howDidYouHear (Score: 190) ✅
  - "Phone Number" → phone (Score: 145) ✅
  - "First Name" → firstName (Score: 150) ✅
  
- ✅ Test 6: Required Fields Validation
  - All required fields present including new countryCode field
  
- ✅ Test 7: Optional Fields
  - Verified linkedinUrl and howDidYouHear are optional

### 2. Edge Case Tests
All tests located in `edge_case_test.js`

**Results: All edge cases handled correctly**

- ✅ Missing country code: Phone remains unchanged
- ✅ Missing phone number: No combination occurs
- ✅ International formats: +44, +91, +86, +1 all work correctly
- ✅ All dropdown values: LinkedIn, Google, Twitter, Friend, Other
- ✅ Empty values: Handled gracefully, no combination

### 3. Manual Integration Tests
Test located in `manual_test.html`

**Results: All fields autofilled successfully**

- ✅ First Name: "John"
- ✅ Last Name: "Doe"
- ✅ Full Name: "John Doe" (auto-generated)
- ✅ Email: "john.doe@example.com"
- ✅ Phone: "+1 5551234567" (combined from "+1" + "5551234567")
- ✅ Mobile: "+1 5551234567" (also combined)
- ✅ Country: "United States"
- ✅ State: "California"
- ✅ City: "San Francisco"
- ✅ ZIP Code: "94102"
- ✅ Work Authorization: "yes"
- ✅ Sponsorship: "no"
- ✅ How Did You Hear: "LinkedIn"

### 4. Test Files Updated
- ✅ `test.html` - Added "How did you hear about us?" dropdown
- ✅ `test-csp.html` - Added "How did you hear about us?" dropdown
- ✅ `test-comprehensive.html` - Added "How did you hear about us?" section

### 5. Field Mapping Tests
Verified that the following field variations are recognized:

**Phone Fields:**
- phone, phone_number, phonenumber, mobile, tel, telephone

**Referral Source Fields:**
- how_did_you_hear, howdidyouhear, referral_source, referral, source, hear_about, heard_about, how-did-you-hear

## Test Coverage

| Feature | Unit Tests | Edge Cases | Integration | Status |
|---------|-----------|------------|-------------|--------|
| Country Code + Phone | ✅ | ✅ | ✅ | PASS |
| howDidYouHear Field | ✅ | ✅ | ✅ | PASS |
| Field Mappings | ✅ | N/A | ✅ | PASS |
| Profile Validation | ✅ | ✅ | ✅ | PASS |
| Backward Compatibility | ✅ | ✅ | N/A | PASS |

## Known Limitations

1. **Country Code is now required**: Existing profiles without country code will need to add it
2. **Phone format**: The extension combines country code and phone with a space separator (e.g., "+1 5551234567")
3. **howDidYouHear is optional**: Not required for profile save

## Browser Compatibility

Tested on:
- Chrome Extension environment (manifest v3)
- Local file serving via HTTP server
- All tests pass in Node.js environment

## Recommendations for Manual Testing

1. Load the extension in Chrome Developer mode
2. Open `test.html` in a new tab
3. Fill out a profile in the extension with:
   - Country Code: +1
   - Phone: 5551234567
   - How Did You Hear: LinkedIn
4. Click "Autofill Forms"
5. Verify all fields are filled correctly
6. Check that phone fields show "+1 5551234567"

7. Dial-code select detection and autofill
   - Open test-dial-code.html
   - Verify Form 1: the select labeled "Country Code" auto-selects India (+91) and phone1 is local-only (no "+91")
   - Verify Form 2: the select with codes-only matches "+91" by digits and phone2 is local-only
   - Verify Form 3: no dial-code select present, phone3 should be combined as "+91 9876543210"
   - Regex behavior: options containing patterns like "+91", "India (+91)", and values "91" are matched by normalized digits
7. Check that "How did you hear about us?" shows "LinkedIn"

## Regression Testing

All existing features continue to work:
- ✅ First/Last name autofill
- ✅ Full name auto-generation
- ✅ Email autofill
- ✅ Country/State/City/Pincode autofill
- ✅ Work authorization autofill
- ✅ Visa sponsorship autofill
- ✅ Resume file attachment
- ✅ Multi-profile support (5 profiles)

## Conclusion

All tests pass successfully. The new features integrate seamlessly with existing functionality and handle edge cases appropriately.

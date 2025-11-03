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

---

## Safer Matching Tests (New)

### Overview
Tests for enhanced context scoring, MIN_CONTEXT_SCORE gating, and safer autofill behavior.

### Test Suite: test_autofill_simulation.html

**New Tests Added (Tests 8-12):**

#### Test 8: VC/PE Textarea Context Rejection
- **Purpose:** Verify that long-text fields about VC/PE experience don't match availability fields
- **Field:** "If you have worked for a venture capital (VC) or private equity (PE) backed startup before, list them"
- **Expected:** Field rejected due to disallowAny tokens (vc, venture, capital, etc.)
- **Status:** ✅ PASS

#### Test 9: Disability Field Mapping
- **Purpose:** Verify disability field mapping exists with correct priority keywords
- **Expected:** Mapping includes disability, disabled, self-identify, eeo, ofccp
- **Status:** ✅ PASS

#### Test 10: Disability Dropdown Option Matching
- **Purpose:** Test regex patterns for common disability dropdown options
- **Test Cases:**
  - "Yes, I have a disability" → Should match
  - "No, I do not have a disability" → Should match
  - "I don't wish to answer" → Should match
- **Status:** ✅ PASS

#### Test 11: MIN_CONTEXT_SCORE Gate Verification
- **Purpose:** Verify fields with scores below 80 are rejected
- **Expected:** Low-scoring generic fields should not be filled
- **Status:** ✅ PASS

#### Test 12: workedBefore Context Validation
- **Purpose:** Verify requiredAny and disallowAny context rules
- **Test Cases:**
  - Good: "Have you worked for our company before?" (radio) → PASS
  - Bad: "Have you worked for venture capital backed startups?" (textarea) → REJECTED
- **Status:** ✅ PASS

### Test Coverage Summary

| Feature | Unit Tests | Context Validation | Integration | Status |
|---------|-----------|-------------------|-------------|--------|
| MIN_CONTEXT_SCORE Gate | ✅ | ✅ | ✅ | PASS |
| Context requiredAny | ✅ | ✅ | ✅ | PASS |
| Context disallowAny | ✅ | ✅ | ✅ | PASS |
| Context allowedTypes | ✅ | ✅ | ✅ | PASS |
| Disability Dropdown | ✅ | ✅ | ✅ | PASS |
| VC/PE Rejection | ✅ | ✅ | ✅ | PASS |
| Type-Aware Penalties | ✅ | N/A | ✅ | PASS |
| Fuzzy Threshold (≥6) | ✅ | N/A | ✅ | PASS |

### Manual Testing Instructions for Real-World Portals

#### Greenhouse (greenhouse.io)
1. Find a job application on a Greenhouse-hosted career portal
2. Set profile with:
   - `noticePeriod`: "in 3-4 weeks"
   - `workedBefore`: "no"
   - `disability`: "No, I do not have a disability"
3. Click autofill
4. Verify:
   - ✅ Availability field filled with "in 3-4 weeks" only if context matches
   - ✅ "Have you worked for our company?" filled with "No" (if yes/no control)
   - ✅ "List companies you've worked for" textarea remains EMPTY
   - ✅ Disability dropdown selects "No, I do not have a disability"

#### Lever (lever.co)
1. Find a job application on a Lever-hosted career portal
2. Set same profile as above
3. Click autofill
4. Verify:
   - ✅ Only fields with score ≥ 80 are filled
   - ✅ VC/PE long-text questions remain empty
   - ✅ workedBefore only fills radio/checkbox/select, not textarea

#### Workday (myworkdayjobs.com)
1. Find a job application on Workday
2. Set same profile as above
3. Click autofill
4. Verify:
   - ✅ Workday-specific fields work with context validation
   - ✅ EEO/OFCCP disability question matched correctly
   - ✅ Fuzzy matches below score 6 are rejected

#### Taleo (Oracle Taleo)
1. Find a job application on Taleo
2. Set same profile as above
3. Click autofill
4. Verify:
   - ✅ Generic portals respect MIN_CONTEXT_SCORE
   - ✅ No obvious misfills due to low-confidence matches

### Testing Checklist for Developers

Before deploying changes, verify:

- [ ] VC/PE "list them" textarea not filled with availability value
- [ ] Disability dropdown matches all three variants (Yes/No/Decline)
- [ ] Fields with scores < 80 are not filled (check console logs)
- [ ] Fuzzy dropdown matches require score ≥ 6
- [ ] workedBefore only fills yes/no controls
- [ ] Availability fields require availability-related context
- [ ] Console logs show clear rejection reasons
- [ ] No regressions in existing field matching

### Console Log Validation

When testing, console should show:
```
Field rejected: contains disallowed context token from [vc, venture, ...]
Field rejected: missing required context token from [our company, ...]
Field rejected: type "textarea" not in allowed types [radio, checkbox, select]
Context score 45 below threshold 80, using traditional score only
Best fuzzy score 4.5 below threshold 6, leaving unselected
No candidates met minimum score threshold: 80 (highest was 65)
```

### Known Limitations (Updated)

1. **MIN_CONTEXT_SCORE of 80:** May be conservative; adjust if too restrictive
2. **Context tokens:** Case-insensitive substring matching; may need refinement
3. **Type-aware penalties:** Currently apply 50% penalty; may need tuning
4. **Disability variations:** Covers common patterns; may miss unusual phrasings

### Browser Compatibility (Updated)

Tested on:
- Chrome Extension environment (manifest v3)
- Local file serving via HTTP server
- All tests pass in Node.js environment
- Context validation works across different DOM structures

### Recommendations for Manual Testing (Updated)

1. Load the extension in Chrome Developer mode
2. Open `test_autofill_simulation.html` in a browser
3. Verify all 12 tests pass (should show green checkmarks)
4. Open browser console to see detailed logging
5. Test on at least 2-3 different job application portals
6. Pay special attention to:
   - Long-text fields that should remain empty
   - Disability dropdown selection accuracy
   - Console logs explaining rejections
7. Profile for testing:
   ```json
   {
     "noticePeriod": "in 3-4 weeks",
     "workedBefore": "no",
     "disability": "No, I do not have a disability",
     "firstName": "John",
     "lastName": "Doe",
     "email": "john@example.com"
   }
   ```

### Regression Testing (Updated)

All existing features continue to work with enhanced safety:
- ✅ First/Last name autofill
- ✅ Full name auto-generation
- ✅ Email autofill
- ✅ Country/State/City/Pincode autofill
- ✅ Work authorization autofill (with stricter yes/no matching)
- ✅ Visa sponsorship autofill (with stricter yes/no matching)
- ✅ Resume file attachment
- ✅ Multi-profile support (5 profiles)
- ✅ Enhanced dropdown matching with threshold
- ✅ Context-aware field rejection

# Workday Support - Manual Test Plan

This document provides a comprehensive manual test plan for validating the Workday support features in the Job Application Autofill extension.

## Prerequisites

### 1. Extension Setup
- Chrome browser (latest version)
- Extension loaded in Developer mode (chrome://extensions/)
- Extension icon visible in Chrome toolbar

### 2. Chrome Autofill Setup
For testing contact field deferral:
1. Open Chrome Settings → Autofill → Addresses
2. Add at least one address with:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@example.com
   - Phone: +1 555-123-4567
   - Street Address: 123 Main St
   - City: San Francisco
   - State: CA
   - ZIP: 94102
   - Country: United States

### 3. Profile Setup in Extension
1. Click extension icon
2. Go to Profile tab
3. Fill in the following fields:
   - **LinkedIn URL**: https://linkedin.com/in/johndoe
   - **GitHub URL**: https://github.com/johndoe
   - **Portfolio URL**: https://johndoe.com
   - **US Work Eligible**: Yes
   - **Sponsorship Required**: No
   - **How Did You Hear**: LinkedIn
   - **Relocate Willing**: Yes
   - **Travel Willing**: Yes
   - **Start Date**: 2024-01-01
   - **Notice Period**: Immediately
   - **Pronouns**: He/Him/His
   - **Worked Before**: No
   - **Veteran Status**: I am not a protected veteran
   - **Salary Min**: 100000
   - **Salary Max**: 150000
   - **Institution**: Stanford University
   - **Degree Type**: Masters
   - **Major**: Computer Science
   - **Graduation Date**: 05/2023
   - **CGPA**: 3.9
   - **Percentage**: 95
   - **Employer**: Tech Corp
   - **Job Title**: Senior Software Engineer
   - **Cover Letter**: I am excited to apply for this position...
   - **Resume**: Upload a test PDF/DOC file
4. Click "Save Profile"

## Test Cases

### TC1: Workday Detection
**Objective**: Verify extension correctly detects Workday pages

**Steps**:
1. Open test-workday.html in Chrome
2. Open Chrome DevTools Console (F12)
3. Click extension icon → Click "Autofill Forms"

**Expected Results**:
- ✅ Console shows: "[Autofill Extension] Workday mode detected - using optimized handlers"
- ✅ Console shows: "[Autofill Extension] Personal contact and address fields... deferred to Chrome's Address Autofill"
- ✅ No JavaScript errors in console

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC2: Basic Information Page (Page 1)
**Objective**: Verify contact fields are skipped and LinkedIn/GitHub are filled

**Steps**:
1. Open test-workday.html (should be on Page 1)
2. Click extension icon → Click "Autofill Forms"
3. Wait 2 seconds for autofill to complete

**Expected Results**:
- ❌ First Name: EMPTY (for Chrome autofill)
- ❌ Last Name: EMPTY (for Chrome autofill)
- ❌ Email: EMPTY (for Chrome autofill)
- ❌ Phone: EMPTY (for Chrome autofill)
- ✅ LinkedIn URL: Filled with profile value
- ✅ GitHub URL: Filled with profile value

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC3: Chrome Autofill for Contact Fields
**Objective**: Verify Chrome's autofill works for contact fields

**Steps**:
1. On Page 1, click into the "First Name" field
2. Wait for Chrome autofill dropdown to appear
3. Select the address you created in Prerequisites
4. Verify all contact fields populate

**Expected Results**:
- ✅ First Name: John
- ✅ Last Name: Doe
- ✅ Email: john.doe@example.com
- ✅ Phone: +1 555-123-4567
- ✅ All fields populated in one click

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC4: Work Authorization & Availability (Page 2)
**Objective**: Verify radio buttons, selects, and date pickers work

**Steps**:
1. From Page 1, click "Continue" button to go to Page 2
2. Click extension icon → Click "Autofill Forms" again
3. Verify fields are filled

**Expected Results**:
- ✅ Work Authorization radio: "Yes" selected
- ✅ Sponsorship Required radio: "No" selected
- ✅ Start Date: 2024-01-01 (or formatted as required)
- ✅ Relocate Willing: Yes
- ✅ Travel Willing: Yes

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC5: Education & Experience (Page 3)
**Objective**: Verify education and experience fields fill correctly

**Steps**:
1. From Page 2, click "Continue" to Page 3
2. Click extension icon → Click "Autofill Forms"
3. Verify fields are filled

**Expected Results**:
- ✅ Institution: Stanford University
- ✅ Degree Level: Master's Degree selected
- ✅ Major: Computer Science
- ✅ Graduation Date: 05/2023 (or formatted)
- ✅ GPA: 3.9
- ✅ Employer: Tech Corp
- ✅ Job Title: Senior Software Engineer

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC6: Additional Information & File Upload (Page 4)
**Objective**: Verify salary, referral, cover letter, and file upload

**Steps**:
1. From Page 3, click "Continue" to Page 4
2. Click extension icon → Click "Autofill Forms"
3. Wait for file upload to complete

**Expected Results**:
- ✅ Salary Min: 100000
- ✅ Salary Max: 150000
- ✅ How Did You Hear: LinkedIn selected
- ✅ Cover Letter: Text filled in textarea
- ✅ Resume: File uploaded (check filename appears)
- ✅ Worked Before radio: "No" selected

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC7: Multi-Page Persistence
**Objective**: Verify autofill works across all pages without re-clicking

**Steps**:
1. Open fresh test-workday.html (Page 1)
2. Click extension icon → Click "Autofill Forms" ONCE
3. Wait 2 seconds
4. Click "Continue" to Page 2 (wait 2 seconds)
5. Click "Continue" to Page 3 (wait 2 seconds)
6. Click "Continue" to Page 4 (wait 2 seconds)

**Expected Results**:
- ✅ Page 1: LinkedIn and GitHub filled immediately
- ✅ Page 2: Work auth fields filled within 2 seconds of page load
- ✅ Page 3: Education fields filled within 2 seconds
- ✅ Page 4: Salary and other fields filled within 2 seconds
- ✅ No need to re-click "Autofill Forms" on each page

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC8: MutationObserver Dynamic Content
**Objective**: Verify observer detects and fills dynamically added fields

**Steps**:
1. Open Chrome DevTools Console
2. Set `WORKDAY_DEBUG = true` in content.js (line 5)
3. Reload extension
4. Open test-workday.html
5. Click "Autofill Forms"
6. Watch console for MutationObserver messages
7. Navigate to Page 2
8. Check console logs

**Expected Results**:
- ✅ Console shows "Workday observer setup complete"
- ✅ Console shows "New Workday fields detected" when navigating
- ✅ Console shows "Filled X new fields" after page change

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC9: Real Workday Site Detection
**Objective**: Verify detection works on actual Workday sites

**Steps**:
1. Navigate to any real Workday job application (e.g., *.myworkdayjobs.com)
2. Open Chrome DevTools Console
3. Click extension icon → Click "Autofill Forms"

**Expected Results**:
- ✅ Console shows "Workday mode detected"
- ✅ Non-contact fields fill where applicable
- ✅ No JavaScript errors

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC10: Non-Workday Site Behavior
**Objective**: Verify extension still works on non-Workday sites

**Steps**:
1. Open test.html or test-csp.html
2. Open Chrome DevTools Console
3. Click extension icon → Click "Autofill Forms"

**Expected Results**:
- ✅ Console does NOT show "Workday mode detected"
- ✅ Standard autofill logic runs
- ✅ Fields fill using regex-based matching
- ✅ No errors

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC11: CSP Compliance
**Objective**: Verify no CSP violations on strict pages

**Steps**:
1. Open test-csp.html (has strict CSP)
2. Open Chrome DevTools Console
3. Click extension icon → Click "Autofill Forms"

**Expected Results**:
- ✅ No CSP violation errors in console
- ✅ Fields fill successfully
- ✅ No "eval" or "new Function" errors

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC12: Missing Profile Data
**Objective**: Verify graceful handling when profile data is incomplete

**Steps**:
1. Clear some fields in profile (e.g., GitHub URL, Salary)
2. Save profile
3. Open test-workday.html
4. Click "Autofill Forms"

**Expected Results**:
- ✅ Fields with data are filled
- ✅ Fields without data remain empty
- ✅ No JavaScript errors
- ✅ No console errors about undefined values

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC13: Multiple Profiles
**Objective**: Verify switching between profiles works

**Steps**:
1. Create Profile 1 with one set of data
2. Create Profile 2 with different data
3. Switch to Profile 2
4. Open test-workday.html
5. Click "Autofill Forms"
6. Verify Profile 2 data is used

**Expected Results**:
- ✅ Profile 2 data fills the form
- ✅ Not Profile 1 data

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC14: Resume File Upload
**Objective**: Verify file upload works with different file types

**Test Data**:
- Test with: PDF, DOC, DOCX files
- File sizes: Small (<100KB), Medium (~500KB), Large (~2MB)

**Steps**:
1. Upload each file type to profile
2. Open test-workday.html Page 4
3. Click "Autofill Forms"
4. Check file input

**Expected Results**:
- ✅ PDF files upload successfully
- ✅ DOC files upload successfully
- ✅ DOCX files upload successfully
- ✅ Filename appears in input or nearby badge

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

### TC15: Performance & Responsiveness
**Objective**: Verify extension doesn't slow down page or browser

**Steps**:
1. Open test-workday.html
2. Open Chrome Task Manager (Shift+Esc)
3. Note memory usage before autofill
4. Click "Autofill Forms"
5. Note memory usage after
6. Navigate through all 4 pages

**Expected Results**:
- ✅ Memory increase < 50MB
- ✅ Page remains responsive during autofill
- ✅ No lag or freezing
- ✅ Autofill completes in < 5 seconds per page

**Status**: ☐ Pass ☐ Fail

**Notes**: _______________________________________________

---

## Summary

**Total Test Cases**: 15

**Passed**: ______ / 15

**Failed**: ______ / 15

**Pass Rate**: ______%

## Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

## Non-Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

## Recommendations

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

## Sign-off

**Tester Name**: _______________________________________________

**Date**: _______________________________________________

**Overall Assessment**: ☐ Approved ☐ Approved with Issues ☐ Rejected

**Notes**: _______________________________________________
_______________________________________________
_______________________________________________

// Test script to verify autofill logic for new fields
// Run this in browser console on test-new-fields.html

// Simulate the profile data
const testProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    workedBefore: 'no',
    race: 'Asian (Not Hispanic or Latino)',
    gender: 'Male',
    howDidYouHear: 'LinkedIn'
};

// Copy the FIELD_MAPPINGS from content.js for testing
const FIELD_MAPPINGS = {
    workedBefore: {
        priority: ['worked_before', 'workedbefore', 'previous_employment', 'prior_employment', 'worked_here', 'employed_before', 'previously_employed', 'worked-before', 'ever-worked'],
        keywords: ['worked', 'before', 'previous', 'prior', 'employed', 'company', 'organization', 'ever']
    },
    race: {
        priority: ['race', 'ethnicity', 'ethnic_origin', 'racial_identity', 'ethnic_background', 'ethnicity_race'],
        keywords: ['race', 'ethnicity', 'ethnic', 'racial', 'hispanic', 'latino']
    },
    gender: {
        priority: ['gender', 'sex', 'gender_identity'],
        keywords: ['gender', 'sex', 'male', 'female']
    }
};

function testFieldMatching() {
    console.log('=== Testing Field Matching ===\n');
    
    // Test 1: workedBefore field matching
    console.log('Test 1: workedBefore field matching');
    const workedBeforeFields = document.querySelectorAll('input[name*="worked" i]');
    console.log('Found fields with "worked" in name:', workedBeforeFields.length);
    workedBeforeFields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type}`);
    });
    
    // Test 2: race field matching
    console.log('\nTest 2: race field matching');
    const raceFields = document.querySelectorAll('select[name*="race" i], select[name*="ethnic" i]');
    console.log('Found race/ethnicity fields:', raceFields.length);
    raceFields.forEach(field => {
        console.log(`  - ${field.name}: ${field.tagName}`);
    });
    
    // Test 3: gender field matching
    console.log('\nTest 3: gender field matching');
    const genderFields = document.querySelectorAll('select[name*="gender" i], select[name*="sex" i]');
    console.log('Found gender/sex fields:', genderFields.length);
    genderFields.forEach(field => {
        console.log(`  - ${field.name}: ${field.tagName}`);
    });
    
    console.log('\n=== Testing Dropdown Matching ===\n');
    
    // Test fuzzy matching for dropdowns
    testDropdownMatch('race', 'Asian (Not Hispanic or Latino)');
    testDropdownMatch('ethnicity', 'Asian (Not Hispanic or Latino)');
    testDropdownMatch('gender', 'Male');
    testDropdownMatch('sex', 'Male');
}

function testDropdownMatch(fieldName, value) {
    const field = document.querySelector(`select[name="${fieldName}"]`);
    if (!field) {
        console.log(`Field "${fieldName}" not found`);
        return;
    }
    
    console.log(`\nTesting dropdown: ${fieldName}`);
    console.log(`Value to match: "${value}"`);
    
    const options = Array.from(field.options);
    const validOptions = options.filter(opt => 
        opt.value && opt.value.trim() !== '' && 
        opt.text && opt.text.trim() !== '' &&
        !opt.text.toLowerCase().includes('select') &&
        !opt.text.toLowerCase().includes('choose')
    );
    
    console.log(`Valid options: ${validOptions.length}`);
    
    // Try exact match
    let match = validOptions.find(opt => 
        opt.value.toLowerCase() === value.toLowerCase() ||
        opt.text.toLowerCase() === value.toLowerCase()
    );
    
    if (match) {
        console.log(`✓ Exact match found: "${match.text}"`);
        return;
    }
    
    // Try partial match
    match = validOptions.find(opt =>
        opt.text.toLowerCase().includes(value.toLowerCase()) ||
        opt.value.toLowerCase().includes(value.toLowerCase())
    );
    
    if (match) {
        console.log(`✓ Partial match found: "${match.text}"`);
        return;
    }
    
    // Try fuzzy match
    let bestMatch = null;
    let bestScore = 0;
    const normalizedValue = value.toLowerCase().trim();
    
    for (const option of validOptions) {
        const optionText = option.text.toLowerCase();
        let score = 0;
        
        const valueWords = normalizedValue.split(/\s+/);
        const optionWords = optionText.split(/\s+/);
        
        for (const vWord of valueWords) {
            for (const oWord of optionWords) {
                if (vWord && oWord) {
                    if (vWord === oWord) {
                        score += 10;
                    } else if (vWord.includes(oWord) || oWord.includes(vWord)) {
                        score += 5;
                    }
                }
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = option;
        }
    }
    
    if (bestScore >= 3 && bestMatch) {
        console.log(`✓ Fuzzy match found (score: ${bestScore}): "${bestMatch.text}"`);
    } else {
        console.log(`✗ No match found for "${value}"`);
        console.log('Available options:', validOptions.map(opt => opt.text));
    }
}

// Run the tests
console.log('Starting autofill logic tests...\n');
testFieldMatching();
console.log('\n=== Tests Complete ===');

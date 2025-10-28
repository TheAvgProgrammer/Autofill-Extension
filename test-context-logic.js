// Test script for context-aware field matching
// Run in browser console after loading test-context-aware.html with the extension

console.log('=== Context-Aware Matching Test Suite ===\n');

// Test 1: Verify context module is loaded
function testModuleLoaded() {
    console.log('Test 1: Verify context module is loaded');
    if (typeof window.contextAwareMatching !== 'undefined') {
        console.log('✓ Context-aware matching module is loaded');
        return true;
    } else {
        console.error('✗ Context-aware matching module is NOT loaded');
        return false;
    }
}

// Test 2: Extract context from a standard labeled input
function testStandardLabelExtraction() {
    console.log('\nTest 2: Extract context from standard labeled input');
    const input = document.querySelector('#firstName1');
    if (!input) {
        console.error('✗ Test input not found');
        return false;
    }
    
    const context = window.contextAwareMatching.extractFieldContext(input);
    console.log('Context extracted:', context);
    
    if (context.labelFor && context.labelFor.toLowerCase().includes('first name')) {
        console.log('✓ Label extracted correctly via "for" attribute');
        return true;
    } else {
        console.error('✗ Label not extracted correctly');
        return false;
    }
}

// Test 3: Extract context from Workday-style previous sibling
function testWorkdaySiblingExtraction() {
    console.log('\nTest 3: Extract context from Workday-style previous sibling');
    const input = document.querySelector('input[name="social_linkedin"]');
    if (!input) {
        console.error('✗ Test input not found');
        return false;
    }
    
    const context = window.contextAwareMatching.extractFieldContext(input);
    console.log('Context extracted:', context);
    
    if (context.previousSiblingText && context.previousSiblingText.toLowerCase().includes('linkedin')) {
        console.log('✓ Previous sibling text extracted correctly');
        return true;
    } else {
        console.error('✗ Previous sibling text not extracted correctly');
        return false;
    }
}

// Test 4: Extract context from aria-labelledby
function testAriaLabelledByExtraction() {
    console.log('\nTest 4: Extract context from aria-labelledby');
    const select = document.querySelector('select[name="visa_sponsor"]');
    if (!select) {
        console.error('✗ Test select not found');
        return false;
    }
    
    const context = window.contextAwareMatching.extractFieldContext(select);
    console.log('Context extracted:', context);
    
    if (context.ariaLabelledByText && context.ariaLabelledByText.toLowerCase().includes('sponsorship')) {
        console.log('✓ Aria-labelledby text extracted correctly');
        return true;
    } else {
        console.error('✗ Aria-labelledby text not extracted correctly');
        return false;
    }
}

// Test 5: Extract table header context
function testTableHeaderExtraction() {
    console.log('\nTest 5: Extract context from table header');
    const input = document.querySelector('input[name="edu_inst_1"]');
    if (!input) {
        console.error('✗ Test input not found');
        return false;
    }
    
    const context = window.contextAwareMatching.extractFieldContext(input);
    console.log('Context extracted:', context);
    
    if (context.tableHeaderContext && context.tableHeaderContext.toLowerCase().includes('institution')) {
        console.log('✓ Table header context extracted correctly');
        return true;
    } else {
        console.error('✗ Table header context not extracted correctly');
        return false;
    }
}

// Test 6: Extract fieldset legend context
function testFieldsetLegendExtraction() {
    console.log('\nTest 6: Extract context from fieldset legend');
    const input = document.querySelector('input[name="exp_company"]');
    if (!input) {
        console.error('✗ Test input not found');
        return false;
    }
    
    const context = window.contextAwareMatching.extractFieldContext(input);
    console.log('Context extracted:', context);
    
    if (context.closestFieldsetLegend && context.closestFieldsetLegend.toLowerCase().includes('experience')) {
        console.log('✓ Fieldset legend extracted correctly');
        return true;
    } else {
        console.error('✗ Fieldset legend not extracted correctly');
        return false;
    }
}

// Test 7: Context scoring for LinkedIn field
function testContextScoring() {
    console.log('\nTest 7: Test context scoring for LinkedIn field');
    const input = document.querySelector('input[name="social_linkedin"]');
    if (!input) {
        console.error('✗ Test input not found');
        return false;
    }
    
    const context = window.contextAwareMatching.extractFieldContext(input);
    
    // Sample mapping for LinkedIn
    const linkedinMapping = {
        priority: ['linkedin', 'linkedin_url', 'linkedinurl', 'linkedin_profile'],
        keywords: ['linkedin', 'profile', 'social']
    };
    
    const score = window.contextAwareMatching.calculateContextScore(context, linkedinMapping);
    console.log('Context score:', score);
    
    if (score > 0) {
        console.log('✓ Context scoring working correctly (score: ' + score + ')');
        return true;
    } else {
        console.error('✗ Context scoring not working correctly');
        return false;
    }
}

// Test 8: Find all fields with context
function testFindAllFields() {
    console.log('\nTest 8: Find all form fields with context');
    const fields = window.contextAwareMatching.findFormFieldsWithContext();
    console.log('Total fields found:', fields.length);
    console.log('Sample fields:', fields.slice(0, 3));
    
    if (fields.length > 0) {
        console.log('✓ Found form fields with context');
        return true;
    } else {
        console.error('✗ No fields found');
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('Running Context-Aware Matching Tests');
    console.log('='.repeat(60) + '\n');
    
    const results = [];
    
    results.push(testModuleLoaded());
    results.push(testStandardLabelExtraction());
    results.push(testWorkdaySiblingExtraction());
    results.push(testAriaLabelledByExtraction());
    results.push(testTableHeaderExtraction());
    results.push(testFieldsetLegendExtraction());
    results.push(testContextScoring());
    results.push(testFindAllFields());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`Test Results: ${passed}/${total} tests passed`);
    console.log('='.repeat(60));
    
    return passed === total;
}

// Auto-run tests after a delay to ensure page is loaded
setTimeout(() => {
    runAllTests();
}, 1000);

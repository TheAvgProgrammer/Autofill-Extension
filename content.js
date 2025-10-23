FIELD_MAPPINGS: {
    // ... existing mappings
    legalFirstName: {
        priority: ['legal_first_name', 'legalfirstname', 'legal_name', 'first_name_legal', 'legal-first-name', 'legal-name'],
        keywords: ['legal', 'first', 'name', 'ensure', 'input', 'indicated', 'above']
    },
    preferredName: {
        priority: ['preferred_name', 'preferredname', 'nickname', 'preferred_first_name', 'preferred-name', 'other_name'],
        keywords: ['preferred', 'name', 'other', 'indicated', 'nickname', 'goes', 'by']
    },
    salaryRangeComfort: {
        priority: ['salary_range_comfort', 'pay_range_comfort', 'compensation_comfortable', 'comfortable_moving_forward', 'salary-range-comfort'],
        keywords: ['pay', 'range', 'salary', 'comfortable', 'moving', 'forward', 'opportunity', 'transparency', 'alignment', 'compensation', 'package']
    },
    usWorkEligible: {
        priority: ['us_work_eligible', 'work_eligible', 'authorized_work', 'work_authorization', 'legal_work', 'work_authorized', 'us_authorized', 'legally_authorized', 'us-work-eligible', 'authorized_to_work', 'work_in_united_states', 'us_work_authorization'],
        keywords: ['work', 'eligible', 'authorized', 'authorization', 'legal', 'us', 'united', 'states', 'legally', 'employer', 'any', 'united states']
    },
    sponsorshipRequired: {
        priority: ['sponsorship_required', 'visa_sponsorship', 'sponsorship', 'require_sponsorship', 'need_sponsorship', 'visa_support', 'require-sponsorship', 'need-sponsorship', 'future_sponsorship', 'will_require', 'visa_required', 'require_visa'],
        keywords: ['sponsorship', 'sponsor', 'visa', 'require', 'need', 'future', 'employment', 'will', 'now', 'in the future']
    },
    howDidYouHear: {
        specialType: 'referral',
        priority: ['how_did_you_hear', 'howdidyouhear', 'referral_source', 'referral', 'source', 'hear_about', 'heard_about', 'how-did-you-hear', 'how_hear', 'initially_hear'],
        keywords: ['hear', 'referral', 'source', 'about', 'learn', 'initially', 'find', 'discover']
    },
    // ... other mappings
}

// In performAutofill function around line 938
// Handle Greenhouse-specific fields that read from firstName/lastName
if (profile.firstName) {
    enrichedProfile.legalFirstName = profile.firstName;
    enrichedProfile.preferredName = profile.firstName; // Can be customized by user if needed
}

// Always fill salary range comfort with "yes"
enrichedProfile.salaryRangeComfort = "yes";
// Helper function for consistent center name normalization
export const normalizeCentreName = (name) => {
    if (!name) return 'unspecified';
    
    let normalized = name.toLowerCase();

    // --- Add specific mapping rules here ---
    if (normalized.includes('nism') && normalized.includes('mumbai')) {
        normalized = 'mumbai'; 
    } else if (normalized === 'new delhi') {
        normalized = 'delhi';
    } else if (normalized === 'bangalore') { // Add this rule
        normalized = 'bengaluru';
    }
    // Add more rules if needed, e.g., for variations of Kolkata, IAA etc.
    // else if (normalized.includes('iaa') && normalized.includes('delhi')) {
    //     normalized = 'delhi';
    // }
    // --- End of specific rules ---

    // Standard normalization: Trim whitespace, replace multiple spaces with single space
    return normalized.trim().replace(/\s+/g, ' ');
};

// Helper function to get standardized display name for a center
export const getStandardizedCenterName = (name) => {
    if (!name) return 'Unspecified';
    // First normalize to get consistent casing
    const normalized = normalizeCentreName(name);
    // Then capitalize first letter of each word for display
    return normalized.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

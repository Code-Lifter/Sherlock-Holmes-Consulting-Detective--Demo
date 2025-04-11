// Game state management - EXPANDED
const gameState = {
    visitedLocations: new Set(), // Tracks visited location addresses (e.g., "28 WC")
    letters: new Set(), // Tracks collected letters ('A', 'B', 'C')
    leadsCount: 0, // Tracks the number of leads followed
    flags: {}, // For tracking specific events/items (e.g., foundFruit: true, confirmedFootmanUniformMissing: true)
    currentLocation: null, // Keep track of the current location address being viewed
    lockedLocations: new Set() // Locations that cannot be revisited
};

// Store locations data globally
let gameLocations = {};
let caseData = {}; // To store caseIntro data
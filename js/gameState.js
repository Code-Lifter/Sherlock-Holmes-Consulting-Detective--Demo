// Game state management
const gameState = {
    visitedLocations: new Set(), 
    letters: new Set(), 
    leadsCount: 0, 
    flags: {}, 
    currentLocation: null, 
    lockedLocations: new Set() 
};

// Store locations data globally
let gameLocations = {};
let caseData = {}; 

// --- SAVE / LOAD SYSTEM ---

function saveToLocalStorage() {
    // Convert Sets to Arrays for JSON serialization
    const stateToSave = {
        visitedLocations: Array.from(gameState.visitedLocations),
        letters: Array.from(gameState.letters),
        leadsCount: gameState.leadsCount,
        flags: gameState.flags,
        currentLocation: gameState.currentLocation,
        lockedLocations: Array.from(gameState.lockedLocations)
    };
    localStorage.setItem('shcd_save', JSON.stringify(stateToSave));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('shcd_save');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Convert Arrays back to Sets
            gameState.visitedLocations = new Set(parsed.visitedLocations || []);
            gameState.letters = new Set(parsed.letters || []);
            gameState.leadsCount = parsed.leadsCount || 0;
            gameState.flags = parsed.flags || {};
            gameState.currentLocation = parsed.currentLocation || null;
            gameState.lockedLocations = new Set(parsed.lockedLocations || []);
            return true;
        } catch (e) {
            console.error("Corrupted save data found.", e);
            return false;
        }
    }
    return false;
}

function resetGame() {
    if(confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
        localStorage.removeItem('shcd_save');
        gameState.visitedLocations = new Set();
        gameState.letters = new Set();
        gameState.leadsCount = 0;
        gameState.flags = {};
        gameState.currentLocation = null;
        gameState.lockedLocations = new Set();
        
        updateLettersDisplay();
        updateLeadsCountDisplay();
        populateDropdown();
        showIntroduction();
        showNotification("Case progress wiped clean.", "success");
    }
}

function exportSave() {
    saveToLocalStorage(); // Ensure latest state is captured
    const saved = localStorage.getItem('shcd_save');
    if (!saved) return showNotification("No save data to export.", "error");

    const blob = new Blob([saved], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SHCD_Save_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Save file downloaded.", "info");
}

function importSave(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.visitedLocations && parsed.flags) {
                localStorage.setItem('shcd_save', e.target.result);
                loadFromLocalStorage();
                updateLettersDisplay();
                updateLeadsCountDisplay();
                populateDropdown();
                
                if (gameState.currentLocation) {
                     visitLocation(gameState.currentLocation);
                } else {
                     showIntroduction();
                }
                showNotification("Case file loaded successfully!", "success");
            } else {
                showNotification("Invalid save file structure.", "error");
            }
        } catch(err) {
            showNotification("Error parsing save file. It might be corrupted.", "error");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input so the same file can be loaded again if needed
}
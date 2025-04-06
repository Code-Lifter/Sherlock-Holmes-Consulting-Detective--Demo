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

// --- Initialization ---
async function initializeGame() {
    await loadGameData(); // Load all necessary JSON
    showIntroduction(); // Show the game introduction
    updateLettersDisplay(); // Update the letters display
    updateLeadsCountDisplay(); // Initialize leads count display
}

async function loadGameData() {
    try {
        const [locationsResponse, caseIntroResponse] = await Promise.all([
            fetch("locations.json"),
            fetch("caseIntro.json") // Load intro data here as well
        ]);

        if (!locationsResponse.ok) throw new Error(`HTTP error! status: ${locationsResponse.status}`);
        if (!caseIntroResponse.ok) throw new Error(`HTTP error! status: ${caseIntroResponse.status}`);

        gameLocations = await locationsResponse.json();
        caseData = await caseIntroResponse.json(); // Store case data

        populateDropdown(); // Populate the dropdown menu with locations
        // Update title after loading case data
        if (caseData['case title']) {
            document.getElementById('case-title').textContent = caseData['case title'];
        }

    } catch (error) {
        console.error("Failed to load game data:", error);
        document.getElementById("current-text").innerHTML = "<p>Error loading game data. Please check console.</p>";
    }
}


// --- UI Updates ---

// --- MODIFIED populateDropdown function ---
function populateDropdown() {
    const dropdown = document.getElementById("locations-dropdown");
    dropdown.innerHTML = '<option value="">Select a location...</option>'; // Reset dropdown

    const locationsByDistrict = {};

    // 1. Group locations by district
    Object.keys(gameLocations).forEach(address => {
        const parts = address.split(' ');
        if (parts.length >= 2) {
            const district = parts[parts.length - 1].toUpperCase(); // Get district code (WC, SW, etc.)
            const number = parseInt(parts[0]); // Get the number part for sorting

            if (!locationsByDistrict[district]) {
                locationsByDistrict[district] = [];
            }
            // Store as objects for easier sorting
            locationsByDistrict[district].push({ address: address, number: number });
        } else {
             console.warn(`Could not parse district for address: ${address}`);
             // Optionally handle addresses without districts (e.g., add to an 'Other' group)
        }
    });

    // 2. Define the order districts should appear in the dropdown
    //    Adjust this array as needed for your desired order
    const districtOrder = ['WC', 'SW', 'NW', 'N', 'EC', 'E', 'SE', 'S']; // Example order

    // 3. Create optgroups and options in the desired order
    districtOrder.forEach(district => {
        if (locationsByDistrict[district]) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = district; // Set the group label (e.g., "WC")

            // Sort locations within the district numerically
            const sortedLocations = locationsByDistrict[district].sort((a, b) => a.number - b.number);

            // Create options for this group
            sortedLocations.forEach(locationInfo => {
                const option = document.createElement("option");
                option.value = locationInfo.address;
                option.textContent = locationInfo.address; // Display the full address

                // Add styling for visited/locked locations
                if (gameState.visitedLocations.has(locationInfo.address)) {
                    option.classList.add("visited-location");
                }
                if (gameState.lockedLocations.has(locationInfo.address)) {
                    option.disabled = true;
                    option.classList.add("locked-location");
                }
                optgroup.appendChild(option); // Add the option to the group
            });

            dropdown.appendChild(optgroup); // Add the group to the dropdown
        }
    });

     // Optionally, add any locations that couldn't be grouped (if handled)
     // Example: if you created an 'Other' group for addresses without districts
     /*
     if (locationsByDistrict['Other'] && locationsByDistrict['Other'].length > 0) {
         const optgroup = document.createElement('optgroup');
         optgroup.label = 'Other';
         // Sort and add options for 'Other' group...
         dropdown.appendChild(optgroup);
     }
     */
}
// --- END MODIFIED populateDropdown function ---


function updateLettersDisplay() {
    ["A", "B", "C"].forEach((letter) => {
        const letterElement = document.getElementById(`letter-${letter}`);
        if (!letterElement) return; // Guard against missing elements
        if (gameState.letters.has(letter)) {
            letterElement.classList.add("found");
        } else {
            letterElement.classList.remove("found");
        }
    });
}

function updateLeadsCountDisplay() {
    const leadsCountElement = document.getElementById("leads-count");
    if (leadsCountElement) {
        leadsCountElement.textContent = gameState.leadsCount;
    }
}

// --- Core Logic ---

function handleLocationSelect(address) {
    if (!address) return;
    visitLocation(address);
    // Reset dropdown selection after visiting
    const dropdown = document.getElementById("locations-dropdown");
    if (dropdown) dropdown.value = "";
}

// VISIT LOCATION FUNCTION (Ensure previous fix is included)
async function visitLocation(address) {
    if (gameState.lockedLocations.has(address)) {
        showNotification(`You cannot return to ${address}.`, 'error');
        return;
    }

    const locationData = gameLocations[address];
    if (!locationData) {
        console.error(`Location data not found for: ${address}`);
        return;
    }

    console.log(`Visiting: ${address}`, locationData); // Log location data on visit

    gameState.currentLocation = address; // Track current location

    // Increment leads count only on the first visit
    if (!gameState.visitedLocations.has(address)) {
        gameState.leadsCount++;
        updateLeadsCountDisplay();
        gameState.visitedLocations.add(address);
        // Update the specific option's class in the dropdown AFTER it's populated
        const dropdownOption = document.querySelector(`#locations-dropdown option[value="${address}"]`);
        if (dropdownOption) {
            dropdownOption.classList.add("visited-location");
        }
    }

    // --- Display Logic ---
    const currentTextDiv = document.getElementById("current-text");
    const optionsDiv = document.getElementById("options");
    if (!currentTextDiv || !optionsDiv) {
        console.error("Required display elements not found.");
        return;
    }
    optionsDiv.innerHTML = ''; // Clear previous options/buttons

    // --- START: Letter Granting Logic (Top Level - Before Conditions) ---
    if (locationData.circlesLetter && !gameState.letters.has(locationData.circlesLetter)) {
        gameState.letters.add(locationData.circlesLetter);
        showNotification(`Found Letter ${locationData.circlesLetter}!`, 'success');
        updateLettersDisplay();
    }
    // --- END: Letter Granting Logic ---


    // Determine initial text based on structure
    let initialTextHTML = `<h1 style="text-align: center;">${address}</h1>`;
    if (locationData.text) { // Use 'text' first if available (common in old structure)
         initialTextHTML += `<p>${locationData.text.replace(/\n/g, "<br>")}</p>`;
    } else if (locationData.baseText) { // Fallback to 'baseText'
         initialTextHTML += `<p>${locationData.baseText.replace(/\n/g, "<br>")}</p>`;
    }

    currentTextDiv.innerHTML = initialTextHTML; // Update display with base/initial text

    // --- START: Process Top-Level updatesGameState (For old structure like 4 SW, 52 SW, 86 SW) ---
    if (locationData.updatesGameState) {
        console.log(`Applying top-level updatesGameState for ${address}:`, locationData.updatesGameState);
        Object.assign(gameState.flags, locationData.updatesGameState); // Use Object.assign to merge
        console.log("Updated gameState.flags after top-level update:", gameState.flags);
        // Trigger relevant UI updates if needed (e.g., if a letter was granted via this method)
        if (locationData.updatesGameState.circlesLetter && !gameState.letters.has(locationData.updatesGameState.circlesLetter)) {
             gameState.letters.add(locationData.updatesGameState.circlesLetter);
             showNotification(`Found Letter ${locationData.updatesGameState.circlesLetter}! (from top-level update)`, 'success');
             updateLettersDisplay();
        }
    }
    // --- END: Process Top-Level updatesGameState ---

    // --- Process Conditions (New Structure) ---
    if (locationData.conditions) {
        // Process the new structure
        await processConditionsAndActions(locationData.conditions, currentTextDiv, optionsDiv);
    }
    // --- Process ConditionalText (Old Structure - DEPRECATED for flags, keep for text/actions) ---
    else if (locationData.conditionalText) {
        console.warn(`Location ${address} uses deprecated 'conditionalText'. Flags should be top-level or in 'conditions'.`);
        // Process the old structure for text/actions, but flags are ideally handled above
        await processOldConditionalText(locationData.conditionalText, currentTextDiv, optionsDiv);
    } else {
        // No further conditional content or actions for this location
    }
}


// processConditionsAndActions function (Keep as previously provided)
async function processConditionsAndActions(conditions, displayElement, optionsElement) {
    let allConditionsMet = true;
    let collectedActions = [];

    for (const condition of conditions) {
        let conditionMet = false;

        // --- Check the condition ---
        if (condition.check === "requiresLetter") {
            conditionMet = gameState.letters.has(condition.letter);
        }
        // *** Add more 'else if (condition.check === "...")' for other types of checks (e.g., flags) ***
        else if (!condition.check) { // If no check specified, assume met
            conditionMet = true;
        } else {
            console.warn(`Unknown condition check type: ${condition.check}`);
            conditionMet = false; // Treat unknown checks as failing
        }

        // --- Handle condition result ---
        if (conditionMet) {
            if (condition.onSuccess) {
                // Append text
                if (condition.onSuccess.text) {
                    // Add separator if needed
                    if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
                         displayElement.innerHTML += '<hr>';
                    }
                    displayElement.innerHTML += `<p>${condition.onSuccess.text.replace(/\n/g, "<br>")}</p>`;
                }

                // Apply updates (e.g., circling letters, setting flags)
                if (condition.onSuccess.updates) {
                     console.log(`Applying nested updates for ${gameState.currentLocation}:`, condition.onSuccess.updates);
                    if (condition.onSuccess.updates.circlesLetter && !gameState.letters.has(condition.onSuccess.updates.circlesLetter)) {
                        gameState.letters.add(condition.onSuccess.updates.circlesLetter);
                        showNotification(`Found Letter ${condition.onSuccess.updates.circlesLetter}!`, 'success');
                        updateLettersDisplay();
                    }
                    // Make updates generic
                    Object.keys(condition.onSuccess.updates).forEach(key => {
                        gameState.flags[key] = condition.onSuccess.updates[key];
                    });
                     console.log("Updated gameState.flags after nested update:", gameState.flags);
                }

                // Process follow-up conditions recursively
                if (condition.onSuccess.followUpConditions && condition.onSuccess.followUpConditions.length > 0) {
                    const followUpSuccess = await processConditionsAndActions(condition.onSuccess.followUpConditions, displayElement, optionsElement);
                    if (!followUpSuccess) {
                        allConditionsMet = false;
                        break; // Stop processing further conditions at this level if a follow-up failed
                    }
                }

                // Collect actions if follow-ups succeeded (or there were none)
                if (allConditionsMet && condition.onSuccess.actions) {
                    collectedActions = collectedActions.concat(condition.onSuccess.actions);
                }
            }
        } else {
            // Condition failed
            if (condition.promptIfFalse) {
                 // Add separator if needed
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
                    displayElement.innerHTML += '<hr>';
                 }
                displayElement.innerHTML += `<p><em>${condition.promptIfFalse}</em></p>`;
            }
            allConditionsMet = false;
            break; // Stop processing remaining conditions at this level
        }
    } // End of loop through conditions

    // --- Render collected actions ---
    if (allConditionsMet && collectedActions.length > 0) {
        optionsElement.innerHTML = ''; // Clear previous buttons before adding new ones for this successful branch
        // Add separator before actions if needed
        if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
             displayElement.innerHTML += '<hr>';
        }
        collectedActions.forEach(action => {
            renderAction(action, optionsElement);
        });
    }

    return allConditionsMet; // Return success/failure status for recursive calls
}


// processOldConditionalText function (Keep as previously provided)
// Note: Flag setting logic here is less critical now due to the top-level check in visitLocation
async function processOldConditionalText(conditionalTextArray, displayElement, optionsElement) {
    if (!conditionalTextArray || !Array.isArray(conditionalTextArray)) {
        console.error("Invalid conditionalTextArray passed to processOldConditionalText");
        return;
    }

    let collectedActions = [];
    let addedSeparator = false; // Track if HR added within this function call

    conditionalTextArray.forEach(condition => {
        let conditionMet = false;
        // Check if the condition requires a letter and if the player has it
        if (!condition.requiresLetter || gameState.letters.has(condition.requiresLetter)) {
            conditionMet = true;
        }

        if (conditionMet) {
            // Add text if condition met
            if (condition.text) {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
                    displayElement.innerHTML += '<hr>';
                    addedSeparator = true;
                 }
                displayElement.innerHTML += `<p>${condition.text.replace(/\n/g, "<br>")}</p>`;
            }
            // Add prompt if condition met (often used for failure messages in old structure)
            if (condition.prompt) {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>') && !addedSeparator) {
                    displayElement.innerHTML += '<hr>';
                    addedSeparator = true;
                 }
                displayElement.innerHTML += `<p><em>${condition.prompt}</em></p>`;
            }
            // Handle flags ONLY if not handled by the top-level check (should be rare now)
            if (condition.updatesGameState) {
                console.warn(`Applying flags from deprecated 'conditionalText' for ${gameState.currentLocation}. Recommend moving to top-level or 'conditions'.`, condition.updatesGameState);
                Object.assign(gameState.flags, condition.updatesGameState);
                console.log("Updated gameState.flags (old - conditionalText):", gameState.flags);
            }
            // Handle letters if not handled by top-level (should be rare now)
            if (condition.circlesLetter && !gameState.letters.has(condition.circlesLetter)) {
                 console.warn(`Applying letter from deprecated 'conditionalText' for ${gameState.currentLocation}. Recommend moving to top-level or 'conditions'.`);
                gameState.letters.add(condition.circlesLetter);
                showNotification(`Found Letter ${condition.circlesLetter}!`, 'success');
                updateLettersDisplay();
            }
            // Handle location lock
            if (condition.locationLock && !gameState.lockedLocations.has(gameState.currentLocation)) {
                gameState.lockedLocations.add(gameState.currentLocation);
                showNotification(`${gameState.currentLocation} is now locked.`, 'info');
                const dropdownOption = document.querySelector(`#locations-dropdown option[value="${gameState.currentLocation}"]`);
                if (dropdownOption) {
                    dropdownOption.disabled = true;
                    dropdownOption.classList.add("locked-location");
                }
            }
            // Collect actions
            if (condition.actions) {
                collectedActions = collectedActions.concat(condition.actions);
            }
        } else {
             // Show prompt if condition failed (common use case in old structure)
             if (condition.prompt) {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>') && !addedSeparator) {
                    displayElement.innerHTML += '<hr>';
                    addedSeparator = true;
                 }
                displayElement.innerHTML += `<p><em>${condition.prompt}</em></p>`;
             }
        }
    }); // End loop

    // Render actions collected from the old structure
    if (collectedActions.length > 0) {
        optionsElement.innerHTML = ''; // Clear previous options
         if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>') && !addedSeparator) {
            displayElement.innerHTML += '<hr>'; // Add separator before actions if needed
         }
        collectedActions.forEach(action => {
            renderAction(action, optionsElement); // Use renderAction helper
        });
    }
}

// renderAction function (Keep as previously provided)
function renderAction(action, optionsElement) {
    if (!action || !action.id || !action.text) return;

    // Handle actions with choices (like the burn choice)
    if (action.choices && action.choices.length > 0) {
        // Add separator before choices prompt if needed
         if (optionsElement.innerHTML !== '' && !optionsElement.innerHTML.endsWith('<hr>')) {
             optionsElement.innerHTML += '<hr>';
         }
        optionsElement.innerHTML += `<p>${action.text}</p>`; // Display the prompt text
        action.choices.forEach(choice => {
            const choiceButton = document.createElement('button');
            choiceButton.textContent = choice.text;
            // Pass choice ID and the main action's consequences
            choiceButton.onclick = () => handleAction(choice.id, action.consequences || {});

            // Disable if choice already made (using a specific flag for 68wc burn example)
            if (gameState.currentLocation === '68 WC' && action.id === 'choose_burn_item_68wc' && gameState.flags.burnedOneUniformChoice_68wc) {
                choiceButton.disabled = true;
                choiceButton.style.opacity = '0.5'; // Visually indicate disabled
            }
            optionsElement.appendChild(choiceButton);
        });
    } else {
        // Handle normal action buttons
        const button = document.createElement('button');
        button.textContent = action.text;
        button.onclick = () => handleAction(action.id, action.consequences || {});

        // Example disabling logic for 68 WC break-in (if location gets locked by it)
        if (action.id === 'attempt_break_in_68wc' && gameState.lockedLocations.has('68 WC')) {
            button.disabled = true;
             button.style.opacity = '0.5';
        }

        optionsElement.appendChild(button);
    }
}

// handleAction function (Keep as previously provided)
async function handleAction(actionId, consequences = {}) { // Default consequences to empty obj
    console.log(`Action triggered: ${actionId} at location ${gameState.currentLocation}`);
    console.log(`Consequences:`, consequences);

    let needsReRender = false; // Flag if UI needs update after action (e.g., disable buttons)

    // --- Process Consequences ---
    if (consequences.locksLocation) {
        if (!gameState.lockedLocations.has(gameState.currentLocation)) {
            gameState.lockedLocations.add(gameState.currentLocation);
            showNotification(`${gameState.currentLocation} is now locked.`, 'info');
            // Update dropdown immediately
            const dropdownOption = document.querySelector(`#locations-dropdown option[value="${gameState.currentLocation}"]`);
            if (dropdownOption) {
                dropdownOption.disabled = true;
                dropdownOption.classList.add("locked-location");
            }
            // Locking might require re-rendering buttons if the break-in button should disable
            needsReRender = true;
        }
    }

    if (consequences.recordsChoice) {
        // Specific logic for the burn choice at 68 WC
        if (gameState.currentLocation === '68 WC' && actionId.startsWith("burn_")) {
            // Only record if not already chosen
             if (!gameState.flags.burnedOneUniformChoice_68wc) {
                 gameState.flags[consequences.recordsChoice] = actionId; // Store e.g., "burn_footman_uniform"
                 gameState.flags.burnedOneUniformChoice_68wc = true; // Specific flag for 68wc burn choice
                 console.log(`Recorded choice ${actionId} for ${consequences.recordsChoice}`);
                 const uniformType = actionId.split('_')[1] || 'item'; // Get 'footman', 'warden', or 'cook'
                 showNotification(`You chose to burn the ${uniformType} uniform.`, 'info');
                 needsReRender = true; // Need to disable other burn choice buttons
             } else {
                  showNotification(`You already made a choice here.`, 'error');
             }
        }
        // Add logic for other types of choices if necessary
    }

    // Handle triggering sequences AFTER processing other consequences for THIS action
    if (consequences.triggersSequence) {
        await displaySequence(consequences.triggersSequence);
        // Sequence display handles rendering, so return unless re-render needed for *this* action's effects
         if (needsReRender) {
             // Re-render/disable buttons AFTER sequence is displayed (if needed for locking etc.)
             const optionsDiv = document.getElementById("options");
              if (optionsDiv) {
                  disableActionButtons(optionsDiv, actionId, consequences);
              }
         }
        return;
    }

    if (consequences.endsInteraction) {
        // Clear options, maybe show a final message if not triggering a sequence
        document.getElementById("options").innerHTML = '';
    }


    // --- Re-render/Disable Location Buttons if needed ---
    if (needsReRender) {
        const optionsDiv = document.getElementById("options");
        if (optionsDiv) {
             disableActionButtons(optionsDiv, actionId, consequences);
        }
    }
}

// disableActionButtons helper function (Keep as previously provided)
function disableActionButtons(optionsDiv, actionId, consequences) {
     optionsDiv.querySelectorAll('button').forEach(button => {
         // Disable 68 WC burn choices after one is picked
         if (gameState.currentLocation === '68 WC' && button.onclick.toString().includes('burn_') && gameState.flags.burnedOneUniformChoice_68wc) {
             button.disabled = true;
             button.style.opacity = '0.5';
         }
         // Disable 68 WC break-in button if location is now locked by this action
         if (actionId === 'attempt_break_in_68wc' && button.onclick.toString().includes('attempt_break_in_68wc') && consequences.locksLocation) {
             button.disabled = true;
             button.style.opacity = '0.5';
         }
         // Add more specific disabling logic as needed
     });
}

// displaySequence function (Keep as previously provided)
async function displaySequence(sequenceId) {
    console.log(`Displaying sequence: ${sequenceId}`);
    const locationData = gameLocations[gameState.currentLocation];
    if (!locationData || !locationData.sequences || !locationData.sequences[sequenceId]) {
        console.error(`Sequence ${sequenceId} not found for location ${gameState.currentLocation}`);
        return;
    }

    const sequence = locationData.sequences[sequenceId];
    const displayElement = document.getElementById("current-text");
    const optionsElement = document.getElementById("options");
    if (!displayElement || !optionsElement) return;

    // Append sequence text
    if (sequence.text) {
        // Add HR only if there's previous text and it doesn't already end with one
        if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
            displayElement.innerHTML += '<hr>';
        }
        displayElement.innerHTML += `<p>${sequence.text.replace(/\n/g, "<br>")}</p>`;
    }

    // Apply sequence updates
    if (sequence.updates) {
        console.log(`Applying sequence updates for ${sequenceId}:`, sequence.updates);
        Object.keys(sequence.updates).forEach(key => {
            gameState.flags[key] = sequence.updates[key];
        });
        console.log("Updated gameState.flags from sequence:", gameState.flags);
    }

    // Display sequence actions (if any)
    optionsElement.innerHTML = ''; // Clear previous actions before adding sequence actions
    if (sequence.actions && sequence.actions.length > 0) {
        // Add separator if needed
        if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
            displayElement.innerHTML += '<hr>';
        }
        sequence.actions.forEach(action => {
            renderAction(action, optionsElement); // Reuse the renderAction helper
        });
    } else {
         optionsElement.innerHTML = '<button onclick="showIntroduction()">Leave Location</button>'; // Example: Add leave button after sequence ends with no actions
    }
}


// --- Utility Functions --- (Keep showNotification, createNotificationArea)
function showNotification(message, type = 'info') { // types: info, success, error
    const notificationArea = document.getElementById('notifications') || createNotificationArea();
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationArea.appendChild(notification);

    // Remove the notification after a few seconds
    setTimeout(() => {
        // Simple fade out
        notification.style.transition = 'opacity 0.5s ease';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500); // Remove after fade
    }, 3500); // Keep notification slightly longer
}

function createNotificationArea() {
    const area = document.createElement('div');
    area.id = 'notifications';
    document.body.appendChild(area);
    return area;
}

// --- Display Functions --- (Keep showIntroduction, showCredits)
async function showIntroduction() {
    // Use caseData loaded during initializeGame()
    if (!caseData || !caseData.intro) {
        console.error("Introduction data not loaded.");
        document.getElementById("current-text").innerHTML = "<p>Error loading introduction.</p>";
        return;
    }

    const formattedIntro = caseData.intro ? caseData.intro.replace(/\n/g, "<br>") : "";
    const formattedDate = caseData.date ? caseData.date.replace(/\n/g, "<br>") : "";

    const introText = `
        ${formattedDate ? `<div class="date">${formattedDate}</div>` : ''}
        <p>${formattedIntro}</p>
    `;

    const currentTextDiv = document.getElementById("current-text");
    const optionsDiv = document.getElementById("options");
    if (currentTextDiv) currentTextDiv.innerHTML = introText;
    if (optionsDiv) optionsDiv.innerHTML = ''; // Clear options when showing intro
    gameState.currentLocation = null; // Not at a specific location
}

async function showCredits() {
    try {
        // This assumes credit.json is in the SAME folder as index.html
        const response = await fetch('credit.json');
        if (!response.ok) {
            // Throws an error if the file wasn't found (404) or other HTTP issue
            throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
        }
        // This throws an error if the file content isn't valid JSON
        const credits = await response.json();

        // Format the credits into HTML
        let creditsHTML = `<h1 style="text-align: center;">Credits</h1>`;
        creditsHTML += `<hr style="margin-bottom: 20px;">`; // Add separator

        // --- Game Credits ---
        creditsHTML += `<h2>Game Credits</h2>`;
        if (credits.case_writer) {
             creditsHTML += `<p><strong>Case Written By:</strong> ${credits.case_writer}</p>`;
        }
        if (credits.authors && credits.authors.length > 0) {
            creditsHTML += `<p><strong>Authors:</strong> ${credits.authors.join(', ')}</p>`;
        }
         if (credits.illustrators && credits.illustrators.length > 0) {
            creditsHTML += `<p><strong>Illustrators:</strong> ${credits.illustrators.join(', ')}</p>`;
        }
        if (credits.publisher) {
            creditsHTML += `<p><strong>Published By:</strong> ${credits.publisher}</p>`;
        }
        if (credits.distributor) {
            creditsHTML += `<p><strong>Distributed By:</strong> ${credits.distributor}</p>`;
        }
         if (credits.copyright) {
            creditsHTML += `<p style="margin-top: 10px; font-style: italic;">${credits.copyright}</p>`;
        }
         creditsHTML += `<p style="margin-top: 10px;"><a href="http://www.spacecowboys.fr" target="_blank">www.spacecowboys.fr</a></p>`;

        // --- Website Credits (NEW SECTION) ---
        if (credits.website_creator) {
             creditsHTML += `<hr style="margin-top: 30px; margin-bottom: 20px;">`; // Add separator
             creditsHTML += `<h2>Web Adaptation Credits</h2>`;
             if (credits.website_creator.name) {
                  creditsHTML += `<p><strong>Created By:</strong> ${credits.website_creator.name}</p>`;
             }
             if (credits.website_creator.discord) {
                  creditsHTML += `<p><strong>Discord:</strong> ${credits.website_creator.discord}</p>`;
             }
        }


        // Display the credits in the main text area
        const currentTextDiv = document.getElementById("current-text");
        const optionsDiv = document.getElementById("options");
        if (currentTextDiv) {
            currentTextDiv.innerHTML = creditsHTML;
        }
        if (optionsDiv) {
            optionsDiv.innerHTML = ''; // Clear the options/actions area
        }
         gameState.currentLocation = null; // Indicate we're not in a game location

    } catch (error) {
        // This logs the specific error to the console - PLEASE CHECK IT!
        console.error("Failed to load or display credits:", error);
        // Display the generic error message to the user
        const currentTextDiv = document.getElementById("current-text");
         if (currentTextDiv) {
             currentTextDiv.innerHTML = "<p>Sorry, couldn't load the credits at this time.</p>";
         }
    }
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', initializeGame); // Start the game when DOM is ready

// --- Functions to open images in new tabs --- (Keep openMap, openNewspaper, etc.)
const mapImagePath = 'media/images/map.png';
const newspaperImagePath = 'media/images/newspaper.jpeg';
const directoryPath = 'media/images/directory.jpeg';
const informantsPath = 'media/images/infomants.jpeg';

function openMap() {
    if (mapImagePath && mapImagePath !== 'images/map.jpg') {
        window.open(mapImagePath, '_blank');
    } else {
        console.error("Map image path is not set or is still the placeholder.");
        alert("Map image path needs to be configured in script.js");
    }
}

function openNewspaper() {
    if (newspaperImagePath && newspaperImagePath !== 'images/newspaper.jpg') {
        window.open(newspaperImagePath, '_blank');
    } else {
        console.error("Newspaper image path is not set or is still the placeholder.");
        alert("Newspaper image path needs to be configured in script.js");
    }
}

function openDirectory() {
    if (directoryPath) {
        window.open(directoryPath, '_blank');
    } else {
        console.error("Directory file path is not set.");
        alert("Directory file path needs to be configured in script.js");
    }
}

function openInformants() {
    if (informantsPath) {
        window.open(informantsPath, '_blank');
    } else {
        console.error("Informants file path is not set.");
        alert("Informants file path needs to be configured in script.js");
    }
}

// --- Function to Show Questions ---
async function showQuestions() {
    try {
        const response = await fetch('questions.json'); // Fetch the questions data
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
        }
        const questionsData = await response.json(); // Parse the JSON data

        // Format the questions into HTML
        let questionsHTML = `<h1 style="text-align: center;">Case Questions</h1>`;
        questionsHTML += `<hr style="margin-bottom: 20px;">`;

        if (questionsData.questions && questionsData.questions.length > 0) {
            questionsData.questions.forEach(q => {
                 // Using the structure from your questions.json
                questionsHTML += `<div class="question" style="margin-bottom: 15px;">
                                      <p><strong>Question ${q.number}:</strong> ${q.question}</p>
                                  </div>`;
                // Note: This only displays the questions themselves.
                // It does not include logic for answering them, as that was part of the
                // score.js functionality that was previously removed/changed.
            });
        } else {
            questionsHTML += `<p>No questions found in the file.</p>`;
        }

        // Display the questions in the main text area
        const currentTextDiv = document.getElementById("current-text");
        const optionsDiv = document.getElementById("options");
        if (currentTextDiv) {
            currentTextDiv.innerHTML = questionsHTML;
        }
        if (optionsDiv) {
            optionsDiv.innerHTML = ''; // Clear the options/actions area
        }
         gameState.currentLocation = null; // Indicate we're not in a game location

    } catch (error) {
        console.error("Failed to load or display questions:", error);
        // Display an error message to the user
        const currentTextDiv = document.getElementById("current-text");
         if (currentTextDiv) {
             currentTextDiv.innerHTML = "<p>Sorry, couldn't load the questions at this time.</p>";
         }
    }
}
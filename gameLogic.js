// --- Core Logic ---

function handleLocationSelect(address) {
    // --- Ensure toolbox closes on mobile ---
    if (typeof closeToolbox === 'function') { // Check if function exists
      closeToolbox();
    } else {
      console.warn('closeToolbox function not found when selecting location.');
    }
    // --- End modification ---

    if (!address) return;
    visitLocation(address);
    // Reset dropdown selection after visiting
    const dropdown = document.getElementById("locations-dropdown");
    if (dropdown) dropdown.value = "";
}

// VISIT LOCATION FUNCTION (Ensure previous fix is included)
async function visitLocation(address) {
    // --- ADD THIS AT THE START ---
    const introAudio = document.getElementById('intro-audio');
    if (introAudio && !introAudio.paused) { // Check if it's playing
        introAudio.pause(); // Pause the audio
    }
    // --- END ADD ---

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
        // Use setTimeout to ensure dropdown is populated if load is async
        setTimeout(() => {
             const dropdownOption = document.querySelector(`#locations-dropdown option[value="${address}"]`);
             if (dropdownOption) {
                dropdownOption.classList.add("visited-location");
             }
        }, 0);
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
         else if (condition.check === "flagSet") { // Example: Check a flag
             conditionMet = !!gameState.flags[condition.flagName]; // Check if flag is truthy
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
                 // Use setTimeout to ensure dropdown is populated if load is async
                setTimeout(() => {
                    const dropdownOption = document.querySelector(`#locations-dropdown option[value="${gameState.currentLocation}"]`);
                    if (dropdownOption) {
                        dropdownOption.disabled = true;
                        dropdownOption.classList.add("locked-location");
                    }
                 }, 0);
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
             // Use setTimeout to ensure dropdown is populated if load is async
             setTimeout(() => {
                 const dropdownOption = document.querySelector(`#locations-dropdown option[value="${gameState.currentLocation}"]`);
                 if (dropdownOption) {
                    dropdownOption.disabled = true;
                    dropdownOption.classList.add("locked-location");
                 }
             }, 0);
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
                  // Don't proceed further if choice already made
                  return;
             }
        }
        // Add logic for other types of choices if necessary
    }

    // Handle triggering sequences AFTER processing other consequences for THIS action
    if (consequences.triggersSequence) {
        const sequenceNeedsRender = await displaySequence(consequences.triggersSequence);
        // Re-render/disable buttons if either the action or the triggered sequence requires it
        if (sequenceNeedsRender || needsReRender) {
            const optionsDiv = document.getElementById("options");
            if (optionsDiv) {
                disableActionButtons(optionsDiv, actionId, consequences);
            }
        }
        return; // Sequence handled, stop further processing here
    }

    if (consequences.endsInteraction) {
        // Clear options, maybe show a final message if not triggering a sequence
        const optionsDiv = document.getElementById("options");
        if(optionsDiv) {
            optionsDiv.innerHTML = '';
            // Consider adding a default "Leave" button or similar if interaction just ends
            // optionsDiv.innerHTML = '<button onclick="showIntroduction()">Return</button>';
        }
    }


    // --- Re-render/Disable Location Buttons if needed ---
    // This part is crucial for updating button states AFTER an action is processed
    // but BEFORE leaving the function, especially if a sequence wasn't triggered.
    if (needsReRender) {
        const optionsDiv = document.getElementById("options");
        if (optionsDiv) {
             disableActionButtons(optionsDiv, actionId, consequences);
        }
    }
}


// displaySequence function (Keep as previously provided)
async function displaySequence(sequenceId) {
    let needsReRender = false; // Flag if UI needs update after this sequence
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
        // Sanitize text before adding to innerHTML if needed, or use textContent if no HTML is intended
        displayElement.innerHTML += `<p>${sequence.text.replace(/\n/g, "<br>")}</p>`;
    }

    // Apply sequence updates
    if (sequence.updates) {
        console.log(`Applying sequence updates for ${sequenceId}:`, sequence.updates);
        Object.keys(sequence.updates).forEach(key => {
            gameState.flags[key] = sequence.updates[key];
        });
        console.log("Updated gameState.flags from sequence:", gameState.flags);
        // Any updates may change available actions, so re-render after displaying
        needsReRender = true;
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
    } else if (optionsElement) {
         // Provide a way to leave if the sequence ends with no actions
         optionsElement.innerHTML = '<button onclick="showIntroduction()">Leave Location</button>';
    }

    // If sequence updates potentially require button disabling (e.g., the burn choice flag)
    // We need to re-render the buttons to reflect the new state
     if (optionsElement && typeof disableActionButtons === 'function' && sequence.id === 'leave_after_burning_68wc') {
         // Pass a dummy actionId or refine disableActionButtons if needed
         disableActionButtons(optionsElement, 'sequence_update', {});
     }

    return needsReRender;
}
// --- Core Logic ---

function handleLocationSelect(address) {
    // --- Ensure toolbox closes on mobile ---
    if (typeof closeToolbox === 'function') { 
      closeToolbox();
    } else {
      console.warn('closeToolbox function not found when selecting location.');
    }

    if (!address) return;
    visitLocation(address);
    // Reset dropdown selection after visiting
    const dropdown = document.getElementById("locations-dropdown");
    if (dropdown) dropdown.value = "";
}

// VISIT LOCATION FUNCTION
async function visitLocation(address) {
    const introAudio = document.getElementById('intro-audio');
    if (introAudio && !introAudio.paused) { 
        introAudio.pause(); 
    }

    if (gameState.lockedLocations.has(address)) {
        showNotification(`You cannot return to ${address}.`, 'error');
        return;
    }

    const locationData = gameLocations[address];
    if (!locationData) {
        console.error(`Location data not found for: ${address}`);
        return;
    }

    console.log(`Visiting: ${address}`, locationData); 

    gameState.currentLocation = address; 

    // Increment leads count only on the first visit
    if (!gameState.visitedLocations.has(address)) {
        gameState.leadsCount++;
        updateLeadsCountDisplay();
        gameState.visitedLocations.add(address);
        
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
    optionsDiv.innerHTML = ''; 

    // --- START: Letter Granting Logic ---
    if (locationData.circlesLetter && !gameState.letters.has(locationData.circlesLetter)) {
        gameState.letters.add(locationData.circlesLetter);
        showNotification(`Found Letter ${locationData.circlesLetter}!`, 'success');
        updateLettersDisplay();
    }

    // Determine initial text based on structure
    let initialTextHTML = `<h1 style="text-align: center;">${address}</h1>`;
    if (locationData.text) { 
         initialTextHTML += `<p>${locationData.text.replace(/\n/g, "<br>")}</p>`;
    } else if (locationData.baseText) { 
         initialTextHTML += `<p>${locationData.baseText.replace(/\n/g, "<br>")}</p>`;
    }

    currentTextDiv.innerHTML = initialTextHTML; 

    // --- START: Process Top-Level updatesGameState ---
    if (locationData.updatesGameState) {
        console.log(`Applying top-level updatesGameState for ${address}:`, locationData.updatesGameState);
        Object.assign(gameState.flags, locationData.updatesGameState); 
        console.log("Updated gameState.flags after top-level update:", gameState.flags);
        
        if (locationData.updatesGameState.circlesLetter && !gameState.letters.has(locationData.updatesGameState.circlesLetter)) {
             gameState.letters.add(locationData.updatesGameState.circlesLetter);
             showNotification(`Found Letter ${locationData.updatesGameState.circlesLetter}! (from top-level update)`, 'success');
             updateLettersDisplay();
        }
    }

    // --- Process Conditions ---
    if (locationData.conditions) {
        await processConditionsAndActions(locationData.conditions, currentTextDiv, optionsDiv);
    }
    else if (locationData.conditionalText) {
        console.warn(`Location ${address} uses deprecated 'conditionalText'. Flags should be top-level or in 'conditions'.`);
        await processOldConditionalText(locationData.conditionalText, currentTextDiv, optionsDiv);
    }

    // Auto-save the state after loading a location
    saveToLocalStorage();
}

// processConditionsAndActions function 
async function processConditionsAndActions(conditions, displayElement, optionsElement) {
    let allConditionsMet = true;
    let collectedActions = [];

    for (const condition of conditions) {
        let conditionMet = false;

        // --- Check the condition ---
        if (condition.check === "requiresLetter") {
            conditionMet = gameState.letters.has(condition.letter);
        }
         else if (condition.check === "flagSet") { 
             conditionMet = !!gameState.flags[condition.flagName]; 
         }
        else if (!condition.check) { 
            conditionMet = true;
        } else {
            console.warn(`Unknown condition check type: ${condition.check}`);
            conditionMet = false; 
        }

        // --- Handle condition result ---
        if (conditionMet) {
            if (condition.onSuccess) {
                // Append text
                if (condition.onSuccess.text) {
                    if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
                         displayElement.innerHTML += '<hr>';
                    }
                    displayElement.innerHTML += `<p>${condition.onSuccess.text.replace(/\n/g, "<br>")}</p>`;
                }

                // Apply updates 
                if (condition.onSuccess.updates) {
                     console.log(`Applying nested updates for ${gameState.currentLocation}:`, condition.onSuccess.updates);
                    if (condition.onSuccess.updates.circlesLetter && !gameState.letters.has(condition.onSuccess.updates.circlesLetter)) {
                        gameState.letters.add(condition.onSuccess.updates.circlesLetter);
                        showNotification(`Found Letter ${condition.onSuccess.updates.circlesLetter}!`, 'success');
                        updateLettersDisplay();
                    }
                    
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
                        break; 
                    }
                }

                // Collect actions
                if (allConditionsMet && condition.onSuccess.actions) {
                    collectedActions = collectedActions.concat(condition.onSuccess.actions);
                }
            }
        } else {
            // Condition failed
            if (condition.promptIfFalse) {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
                    displayElement.innerHTML += '<hr>';
                 }
                displayElement.innerHTML += `<p><em>${condition.promptIfFalse}</em></p>`;
            }
            allConditionsMet = false;
            break; 
        }
    } 

    // --- Render collected actions ---
    if (allConditionsMet && collectedActions.length > 0) {
        optionsElement.innerHTML = ''; 
        if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
             displayElement.innerHTML += '<hr>';
        }
        collectedActions.forEach(action => {
            renderAction(action, optionsElement);
        });
    }

    return allConditionsMet; 
}


// processOldConditionalText function 
async function processOldConditionalText(conditionalTextArray, displayElement, optionsElement) {
    if (!conditionalTextArray || !Array.isArray(conditionalTextArray)) {
        console.error("Invalid conditionalTextArray passed to processOldConditionalText");
        return;
    }

    let collectedActions = [];
    let addedSeparator = false; 

    conditionalTextArray.forEach(condition => {
        let conditionMet = false;
        
        if (!condition.requiresLetter || gameState.letters.has(condition.requiresLetter)) {
            conditionMet = true;
        }

        if (conditionMet) {
            if (condition.text) {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
                    displayElement.innerHTML += '<hr>';
                    addedSeparator = true;
                 }
                displayElement.innerHTML += `<p>${condition.text.replace(/\n/g, "<br>")}</p>`;
            }
            if (condition.prompt) {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>') && !addedSeparator) {
                    displayElement.innerHTML += '<hr>';
                    addedSeparator = true;
                 }
                displayElement.innerHTML += `<p><em>${condition.prompt}</em></p>`;
            }
            if (condition.updatesGameState) {
                console.warn(`Applying flags from deprecated 'conditionalText' for ${gameState.currentLocation}. Recommend moving to top-level or 'conditions'.`, condition.updatesGameState);
                Object.assign(gameState.flags, condition.updatesGameState);
            }
            if (condition.circlesLetter && !gameState.letters.has(condition.circlesLetter)) {
                 console.warn(`Applying letter from deprecated 'conditionalText' for ${gameState.currentLocation}. Recommend moving to top-level or 'conditions'.`);
                gameState.letters.add(condition.circlesLetter);
                showNotification(`Found Letter ${condition.circlesLetter}!`, 'success');
                updateLettersDisplay();
            }
            if (condition.locationLock && !gameState.lockedLocations.has(gameState.currentLocation)) {
                gameState.lockedLocations.add(gameState.currentLocation);
                showNotification(`${gameState.currentLocation} is now locked.`, 'info');
                
                setTimeout(() => {
                    const dropdownOption = document.querySelector(`#locations-dropdown option[value="${gameState.currentLocation}"]`);
                    if (dropdownOption) {
                        dropdownOption.disabled = true;
                        dropdownOption.classList.add("locked-location");
                    }
                 }, 0);
            }
            if (condition.actions) {
                collectedActions = collectedActions.concat(condition.actions);
            }
        } else {
             if (condition.prompt) {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>') && !addedSeparator) {
                    displayElement.innerHTML += '<hr>';
                    addedSeparator = true;
                 }
                displayElement.innerHTML += `<p><em>${condition.prompt}</em></p>`;
             }
        }
    }); 

    if (collectedActions.length > 0) {
        optionsElement.innerHTML = ''; 
         if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>') && !addedSeparator) {
            displayElement.innerHTML += '<hr>'; 
         }
        collectedActions.forEach(action => {
            renderAction(action, optionsElement); 
        });
    }
}


// handleAction function 
async function handleAction(actionId, consequences = {}) { 
    console.log(`Action triggered: ${actionId} at location ${gameState.currentLocation}`);
    console.log(`Consequences:`, consequences);

    let needsReRender = false; 

    // --- Process Consequences ---
    if (consequences.locksLocation) {
        if (!gameState.lockedLocations.has(gameState.currentLocation)) {
            gameState.lockedLocations.add(gameState.currentLocation);
            showNotification(`${gameState.currentLocation} is now locked.`, 'info');
             setTimeout(() => {
                 const dropdownOption = document.querySelector(`#locations-dropdown option[value="${gameState.currentLocation}"]`);
                 if (dropdownOption) {
                    dropdownOption.disabled = true;
                    dropdownOption.classList.add("locked-location");
                 }
             }, 0);
            needsReRender = true;
        }
    }

    if (consequences.recordsChoice) {
        if (gameState.currentLocation === '68 WC' && actionId.startsWith("burn_")) {
             if (!gameState.flags.burnedOneUniformChoice_68wc) {
                 gameState.flags[consequences.recordsChoice] = actionId; 
                 gameState.flags.burnedOneUniformChoice_68wc = true; 
                 console.log(`Recorded choice ${actionId} for ${consequences.recordsChoice}`);
                 const uniformType = actionId.split('_')[1] || 'item'; 
                 showNotification(`You chose to burn the ${uniformType} uniform.`, 'info');
                 needsReRender = true; 
             } else {
                  showNotification(`You already made a choice here.`, 'error');
                  return;
             }
        }
    }

    if (consequences.triggersSequence) {
        await displaySequence(consequences.triggersSequence);
         if (needsReRender) {
             const optionsDiv = document.getElementById("options");
              if (optionsDiv) {
                  disableActionButtons(optionsDiv, actionId, consequences);
              }
         }
        // Auto-save when an action triggers a sequence 
        saveToLocalStorage();
        return; 
    }

    if (consequences.endsInteraction) {
        const optionsDiv = document.getElementById("options");
        if(optionsDiv) {
            optionsDiv.innerHTML = '';
        }
    }

    if (needsReRender) {
        const optionsDiv = document.getElementById("options");
        if (optionsDiv) {
             disableActionButtons(optionsDiv, actionId, consequences);
        }
    }

    // Auto-save when a standard action resolves
    saveToLocalStorage();
}


// displaySequence function
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

    if (sequence.text) {
        if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
            displayElement.innerHTML += '<hr>';
        }
        displayElement.innerHTML += `<p>${sequence.text.replace(/\n/g, "<br>")}</p>`;
    }

    if (sequence.updates) {
        console.log(`Applying sequence updates for ${sequenceId}:`, sequence.updates);
        Object.keys(sequence.updates).forEach(key => {
            gameState.flags[key] = sequence.updates[key];
        });
        console.log("Updated gameState.flags from sequence:", gameState.flags);
        if(Object.keys(sequence.updates).some(key => key.startsWith('burnedOneUniformChoice'))) {
             needsReRender = true; 
        }
    }

    optionsElement.innerHTML = ''; 
    if (sequence.actions && sequence.actions.length > 0) {
        if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('</p>') && !displayElement.innerHTML.endsWith('<hr>')) {
            displayElement.innerHTML += '<hr>';
        }
        sequence.actions.forEach(action => {
            renderAction(action, optionsElement); 
        });
    } else if (optionsElement) {
         optionsElement.innerHTML = '<button onclick="showIntroduction()">Leave Location</button>';
    }

     if (optionsElement && typeof disableActionButtons === 'function' && sequence.id === 'leave_after_burning_68wc') {
         disableActionButtons(optionsElement, 'sequence_update', {});
     }

     // Auto-save the state after sequence flag updates
     saveToLocalStorage();
}
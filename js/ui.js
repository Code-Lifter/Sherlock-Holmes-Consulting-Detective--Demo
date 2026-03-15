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
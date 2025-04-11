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


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', initializeGame); // Start the game when DOM is ready
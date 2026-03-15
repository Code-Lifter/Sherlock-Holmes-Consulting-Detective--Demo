/**
 * Calculates the final score based on gameState flags and leads count,
 * showing a detailed breakdown of points earned and missed,
 * then displays the solution, Holmes' summary, and the player's results.
 */
async function solveCase() {
    // --- Ensure toolbox closes on mobile ---
    if (typeof closeToolbox === 'function') { 
      closeToolbox();
    } else {
      console.warn('closeToolbox function not found when solving case.');
    }

    try {
        if (!caseData || !caseData.outro || !caseData.case_summary) {
            console.error("Case introduction or summary data not loaded.");
            try {
                if (typeof caseData === 'undefined' || !caseData.outro) {
                     console.log("Attempting to fetch caseIntro.json within solveCase...");
                     const caseIntroResponse = await fetch("./json/caseIntro.json");
                     if (!caseIntroResponse.ok) throw new Error(`HTTP error! status: ${caseIntroResponse.status}`);
                     let loadedCaseData = await caseIntroResponse.json();
                     if (typeof caseData !== 'undefined') {
                        Object.assign(caseData, loadedCaseData);
                     } else {
                        caseData = loadedCaseData;
                     }
                     console.log("Case data loaded/updated within solveCase.");
                }
            } catch (loadError) {
                console.error("Failed to load caseIntro.json within solveCase:", loadError);
                const currentTextDiv = document.getElementById("current-text");
                if (currentTextDiv) currentTextDiv.innerHTML = "<p>Error loading case conclusion data. Please try again.</p>";
                return; 
            }
        }

        // --- Define Point Values ---
        const POINTS_LOCATION_COLONIAL = 15;
        const POINTS_LOCATION_HAYMARKET = 15;
        const POINTS_MOTIVE = 30;
        const POINTS_ITEM = 20;
        const POINTS_BURN_WIG = 20;
        const POINTS_BURN_UNIFORM = 20;
        const LEAD_PENALTY_PER = 5;
        const HOLMES_LEADS = 5; 

        // --- Calculate Score ---
        let score = 0; 
        let scoreExplanation = []; 

        scoreExplanation.push("<h4>Scoring Actions:</h4>");

        // 1. Points for key locations visited
        if (gameState.flags.visitedColonialInstitute) {
            score += POINTS_LOCATION_COLONIAL;
            scoreExplanation.push(`<li>✅ Visited Colonial Institute (86 SW): +${POINTS_LOCATION_COLONIAL} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Visit Colonial Institute (86 SW) (+${POINTS_LOCATION_COLONIAL} points possible)</li>`);
        }

        if (gameState.flags.confirmedMotiveLocation) { 
            score += POINTS_LOCATION_HAYMARKET;
            scoreExplanation.push(`<li>✅ Visited Haymarket Theatre (4 SW): +${POINTS_LOCATION_HAYMARKET} points</li>`);
            score += POINTS_MOTIVE;
            scoreExplanation.push(`<li>✅ Understood Motive (Revenge, via 4 SW visit): +${POINTS_MOTIVE} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Visit Haymarket Theatre (4 SW) (+${POINTS_LOCATION_HAYMARKET} points possible)</li>`);
            scoreExplanation.push(`<li>❌ Missed: Understand Motive (via 4 SW visit) (+${POINTS_MOTIVE} points possible)</li>`);
        }

        // 2. Points for items acquired 
        if (gameState.flags.foundFruit) {
            score += POINTS_ITEM;
            scoreExplanation.push(`<li>✅ Acquired Rotten Fruit (28 WC): +${POINTS_ITEM} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Acquire Rotten Fruit (28 WC) (+${POINTS_ITEM} points possible)</li>`);
        }
        
        if (gameState.flags.foundKnife) {
            score += POINTS_ITEM;
            scoreExplanation.push(`<li>✅ Acquired Knife (28 WC): +${POINTS_ITEM} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Acquire Knife (28 WC) (+${POINTS_ITEM} points possible)</li>`);
        }

        // 3. Points for burning items 
        if (gameState.flags.destroyedWigMoustache) { 
            score += POINTS_BURN_WIG;
            scoreExplanation.push(`<li>✅ Burned Wig and Moustache (68 WC): +${POINTS_BURN_WIG} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Burn Wig and Moustache (68 WC) (+${POINTS_BURN_WIG} points possible)</li>`);
        }

        const correctUniformBurned = gameState.flags.item_burned_68wc === 'burn_footman_uniform';
        const clueFound = gameState.flags.confirmedFootmanUniformMissing; 

        if (correctUniformBurned && clueFound) {
            score += POINTS_BURN_UNIFORM;
            scoreExplanation.push(`<li>✅ Burned correct item (Footman's Uniform) & Found Clue: +${POINTS_BURN_UNIFORM} points</li>`);
        } else if (correctUniformBurned && !clueFound) {
             scoreExplanation.push(`<li>❌ Burned Footman's Uniform but Missed Clue (+${POINTS_BURN_UNIFORM} points possible if clue found)</li>`);
        } else if (gameState.flags.item_burned_68wc) { 
             const burnedItemName = (gameState.flags.item_burned_68wc.split('_')[1] || "unknown").replace(/_/g, ' '); 
             scoreExplanation.push(`<li>❌ Burned incorrect item (${burnedItemName}): +0 points (Correct: Footman's Uniform, +${POINTS_BURN_UNIFORM} points possible with clue)</li>`);
        } else { 
            scoreExplanation.push(`<li>❌ Missed: Burn correct Uniform (Footman's) (+${POINTS_BURN_UNIFORM} points possible with clue)</li>`);
        }

        scoreExplanation.push("<h4>Lead Deduction:</h4>");
        // 4. Lead Deduction
        const extraLeads = Math.max(0, gameState.leadsCount - HOLMES_LEADS);
        const leadPenalty = extraLeads * LEAD_PENALTY_PER;
        score -= leadPenalty; 

        if (extraLeads > 0) {
            scoreExplanation.push(`<li>➖ Leads Penalty: ${extraLeads} extra leads (>${HOLMES_LEADS}) × ${LEAD_PENALTY_PER} points = -${leadPenalty} points</li>`);
        } else {
            scoreExplanation.push(`<li>✅ Leads Used: ${gameState.leadsCount} (within ${HOLMES_LEADS} limit): No penalty</li>`);
        }

        // --- Display Setup ---
        const formattedOutro = caseData.outro ? caseData.outro.replace(/\n/g, "<br>") : "Outro text not found.";
        const leadsText = caseData.case_summary?.leads?.map(lead => `<li>${lead.name}</li>`).join('') || "";
        const caseDescription = caseData.case_summary?.case_description || "Holmes' case description not found.";

        // --- Holmes' Summary ---
        const holmesSummaryHTML = `
            <h3>Holmes' Solution</h3>
            <p>${caseDescription}</p>
            <ul>${leadsText}</ul>
            <p>He scored 100 points.</p>`;

        // --- Final Result Display ---
        const resultText = `
            <div class="results">
                <h3>Solution Narrative</h3>
                <div class="outro-text">${formattedOutro}</div>
                <hr>
                 ${holmesSummaryHTML}
                <hr>
                <h3>Your Results</h3>
                <p>Total Leads Followed: ${gameState.leadsCount}</p>
                <div class="score-breakdown">
                    <ul>${scoreExplanation.join('') || "<li>No scoring actions recorded.</li>"}</ul>
                </div>
                <hr style="border-top: 2px solid var(--primary); margin: 20px 0;">
                <p style="font-size: 1.2em;"><strong>Total Score: <span id="final-score">${score}</span> points</strong></p>
                <p style="font-size: 1.1em;"><strong>Rating:</strong> <span id="rating">${getRating(score)}</span></p>
                 <hr style="border-top: 2px solid var(--primary); margin: 20px 0;">
            </div>`;

        const currentTextDiv = document.getElementById("current-text");
        const optionsDiv = document.getElementById("options");

        if(currentTextDiv) currentTextDiv.innerHTML = resultText;
        if(optionsDiv) optionsDiv.innerHTML = ''; 

        // Auto-save completion state so a refresh doesn't kick them out of the endgame screen
        saveToLocalStorage();

    } catch (error) {
        console.error("Error solving the case:", error);
        const currentTextDiv = document.getElementById("current-text");
        if (currentTextDiv) currentTextDiv.innerHTML = "<p>Error displaying the case conclusion. Please check the console.</p>";
    }
}

/**
 * Determines the player rating based on the final score.
 * @param {number} score - The player's final score.
 * @returns {string} The rating text.
 */
function getRating(score) {
    if (score >= 105) return "You surpassed the master!";
    if (score >= 75) return "Excellent!";
    if (score >= 35) return "Good!";
    if (score >= 5) return "Okay.";
    return "At least you tried.";
}
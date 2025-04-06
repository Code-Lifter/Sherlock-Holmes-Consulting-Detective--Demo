/**
 * Calculates the final score based on gameState flags and leads count,
 * showing a detailed breakdown of points earned and missed,
 * then displays the solution, Holmes' summary, and the player's results.
 */
async function solveCase() {
    try {
        // Ensure caseData is loaded (assuming it's global or accessible)
        if (!caseData || !caseData.outro || !caseData.case_summary) {
            console.error("Case introduction or summary data not loaded.");
            // Attempt to load it if not present - adjust path if needed
            try {
                const caseIntroResponse = await fetch("caseIntro.json");
                if (!caseIntroResponse.ok) throw new Error(`HTTP error! status: ${caseIntroResponse.status}`);
                caseData = await caseIntroResponse.json();
                console.log("Case data loaded within solveCase.");
            } catch (loadError) {
                console.error("Failed to load caseIntro.json within solveCase:", loadError);
                document.getElementById("current-text").innerHTML = "<p>Error loading case conclusion data. Please try again.</p>";
                return; // Stop execution if essential data is missing
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
        const HOLMES_LEADS = 5; // Base leads before penalties apply

        // --- Calculate Score ---
        let score = 0; // Start fresh for calculation
        let scoreExplanation = []; // To explain point breakdown

        scoreExplanation.push("<h4>Scoring Actions:</h4>");

        // 1. Points for key locations visited
        // Colonial Institute
        if (gameState.flags.visitedColonialInstitute) {
            score += POINTS_LOCATION_COLONIAL;
            scoreExplanation.push(`<li>✅ Visited Colonial Institute (86 SW): +${POINTS_LOCATION_COLONIAL} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Visit Colonial Institute (86 SW) (+${POINTS_LOCATION_COLONIAL} points possible)</li>`);
        }

        // Haymarket Theatre (includes Motive points check)
        if (gameState.flags.confirmedMotiveLocation) { // Flag from visiting 4 SW
            score += POINTS_LOCATION_HAYMARKET;
            scoreExplanation.push(`<li>✅ Visited Haymarket Theatre (4 SW): +${POINTS_LOCATION_HAYMARKET} points</li>`);
            // Add motive points as this location confirms it
            score += POINTS_MOTIVE;
            scoreExplanation.push(`<li>✅ Understood Motive (Revenge, via 4 SW visit): +${POINTS_MOTIVE} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Visit Haymarket Theatre (4 SW) (+${POINTS_LOCATION_HAYMARKET} points possible)</li>`);
            scoreExplanation.push(`<li>❌ Missed: Understand Motive (via 4 SW visit) (+${POINTS_MOTIVE} points possible)</li>`);
        }

        // 2. Points for items acquired (check flags set by visiting 28 WC with letter B)
        // Rotten Fruit
        if (gameState.flags.foundFruit) {
            score += POINTS_ITEM;
            scoreExplanation.push(`<li>✅ Acquired Rotten Fruit (28 WC): +${POINTS_ITEM} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Acquire Rotten Fruit (28 WC) (+${POINTS_ITEM} points possible)</li>`);
        }
        // Knife
        if (gameState.flags.foundKnife) {
            score += POINTS_ITEM;
            scoreExplanation.push(`<li>✅ Acquired Knife (28 WC): +${POINTS_ITEM} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Acquire Knife (28 WC) (+${POINTS_ITEM} points possible)</li>`);
        }

        // 3. Points for burning items (check flags set by actions at 68 WC)
        // Wig/Moustache (Direct flag check)
        if (gameState.flags.destroyedWigMoustache) { // Check flag from sequence
            score += POINTS_BURN_WIG;
            scoreExplanation.push(`<li>✅ Burned Wig and Moustache (68 WC): +${POINTS_BURN_WIG} points</li>`);
        } else {
            scoreExplanation.push(`<li>❌ Missed: Burn Wig and Moustache (68 WC) (+${POINTS_BURN_WIG} points possible)</li>`);
        }

        // Uniform (Requires correct choice AND clue found)
        const correctUniformBurned = gameState.flags.item_burned_68wc === 'burn_footman_uniform';
        const clueFound = gameState.flags.confirmedFootmanUniformMissing; // Assumes this flag is set correctly elsewhere (e.g., 52 SW or Newspaper)

        if (correctUniformBurned && clueFound) {
            score += POINTS_BURN_UNIFORM;
            scoreExplanation.push(`<li>✅ Burned correct item (Footman's Uniform) & Found Clue: +${POINTS_BURN_UNIFORM} points</li>`);
        } else if (correctUniformBurned && !clueFound) {
             // Player burned the right item but didn't find the clue confirming it was the one to burn
             scoreExplanation.push(`<li>❌ Burned Footman's Uniform but Missed Clue (+${POINTS_BURN_UNIFORM} points possible if clue found)</li>`);
        } else if (gameState.flags.item_burned_68wc) { // Player burned a uniform, but it was the wrong one
             const burnedItemName = gameState.flags.item_burned_68wc.split('_')[1]; // e.g., "warden" or "cook"
             scoreExplanation.push(`<li>❌ Burned incorrect item (${burnedItemName} uniform): +0 points (Correct: Footman's Uniform, +${POINTS_BURN_UNIFORM} points possible with clue)</li>`);
        } else { // Player didn't make a choice or burn any specific uniform item
            scoreExplanation.push(`<li>❌ Missed: Burn correct Uniform (Footman's) (+${POINTS_BURN_UNIFORM} points possible with clue)</li>`);
        }

        scoreExplanation.push("<h4>Lead Deduction:</h4>");
        // 4. Lead Deduction
        const extraLeads = Math.max(0, gameState.leadsCount - HOLMES_LEADS);
        const leadPenalty = extraLeads * LEAD_PENALTY_PER;
        score -= leadPenalty; // Apply penalty

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

        document.getElementById("current-text").innerHTML = resultText;
        document.getElementById("options").innerHTML = ''; // Clear options/actions area

    } catch (error) {
        console.error("Error solving the case:", error);
        document.getElementById("current-text").innerHTML = "<p>Error displaying the case conclusion. Please check the console.</p>";
    }
}

/**
 * Determines the player rating based on the final score.
 * @param {number} score - The player's final score.
 * @returns {string} The rating text.
 */
function getRating(score) {
    // Rating logic from PDF
    if (score >= 105) return "You surpassed the master!";
    if (score >= 75) return "Excellent!";
    if (score >= 35) return "Good!";
    if (score >= 5) return "Okay.";
    // Score 0 to 4 or less
    return "At least you tried.";
}
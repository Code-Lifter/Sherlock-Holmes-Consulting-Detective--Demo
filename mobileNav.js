console.log("mobileNav.js successfully loaded and parsed!");

// --- Helper function to close the toolbox ---
function closeToolbox() {
  const toolBox = document.getElementById('tool-box');
  const hamburgerButton = document.getElementById('hamburger-button');
  // Only act if toolbox and button exist and the toolbox is currently open
  if (toolBox && hamburgerButton && toolBox.classList.contains('is-open')) {
    toolBox.classList.remove('is-open');
    hamburgerButton.setAttribute('aria-expanded', 'false');
    console.log("Toolbox closed automatically."); // Optional: for debugging
  }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerButton = document.getElementById('hamburger-button');
    const toolBox = document.getElementById('tool-box');

    if (hamburgerButton && toolBox) {
        // Hamburger button click toggles the state
        hamburgerButton.addEventListener('click', (event) => {
            // Prevent this click from immediately triggering the document listener below
            event.stopPropagation();
            const isOpen = toolBox.classList.toggle('is-open');
            hamburgerButton.setAttribute('aria-expanded', isOpen);
        });

        // Close menu if clicking outside of it (uses the helper function)
        document.addEventListener('click', (event) => {
            // Check if the click is outside the toolbox AND outside the hamburger button
            if (!toolBox.contains(event.target) && !hamburgerButton.contains(event.target)) {
                 closeToolbox(); // Use the helper function
            }
        });

    } else {
        console.error("Hamburger button or tool box element not found after DOM loaded!");
    }
});

// Note: We don't need the old document.addEventListener block here anymore.
// The closeToolbox function is now available globally for other scripts to call.
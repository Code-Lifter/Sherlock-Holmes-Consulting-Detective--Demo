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
        alert("Configure the map image path in tools.js.");
    }
}

function openNewspaper() {
    if (newspaperImagePath && newspaperImagePath !== 'images/newspaper.jpg') {
        window.open(newspaperImagePath, '_blank');
    } else {
        console.error("Newspaper image path is not set or is still the placeholder.");
        alert("Configure the newspaper image path in tools.js.");
    }
}

function openDirectory() {
    if (directoryPath) {
        window.open(directoryPath, '_blank');
    } else {
        console.error("Directory file path is not set.");
        alert("Configure the directory file path in tools.js.");
    }
}

function openInformants() {
    if (informantsPath) {
        window.open(informantsPath, '_blank');
    } else {
        console.error("Informants file path is not set.");
        alert("Configure the informants file path in tools.js.");
    }
}
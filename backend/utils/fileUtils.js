const fs = require('fs');

/**
 * Creates a directory if it doesn't exist
 * @param {string} dirPath - The path to the directory to create
 */
function createFolderIfNotExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

module.exports = {
    createFolderIfNotExists
};
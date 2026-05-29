const fs = require('node:fs');

function destination (req, file, cb) {
    const path = `./uploads/${req.user.username}`;
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
        console.log(`Created uploads folder for user ${req.user.username}.`)
    }
    cb(null, path)
}

function filename(req, file, cb) {
    cb(null, file.originalname)
}

async function getRoot(req, res) {
    try {
        const rootDir = `./uploads/${req.user.username}`;
        const contents = await fs.readdirSync(rootDir);
        console.log(contents);
    } catch (err) {
        console.error('Error reading directory:', err);
    }

}

module.exports = {
    destination,
    filename,
    getRoot
}

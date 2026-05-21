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

module.exports = {
    destination,
    filename
}

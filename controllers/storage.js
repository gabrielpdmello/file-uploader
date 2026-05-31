const fs = require('node:fs');
const storage = require('../queries/storage');

function destination (req, file, cb) {
    const path = `./uploads/${req.user.username}`;
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
        console.log(`Created uploads folder for user ${req.user.username}.`)
    }
    cb(null, path)
}

async function filename(req, file, cb) {
    const fileName = file.originalname;
    cb(null, fileName)
}

async function getRoot(req, res) {
    const root = await storage.getRootFolder(req.user.id)
    const folders = await storage.getChildrenFolders(root[0].id)
    const files = await storage.getFiles(root[0].id);
    res.render('root', {
        folders: folders,
        files: files,
        currentFolder: root[0]
    })
}

async function addFolder(req, res, next) {
    const name = req.body.name;
    const parent = req.body.folder;
    const owner = Number(req.body.owner);
    const folder = await storage.addFolder(name, parent, owner);
    res.redirect('/folder/root');
}

module.exports = {
    destination,
    filename,
    getRoot,
    addFolder
}

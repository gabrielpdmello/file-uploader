const fs = require('node:fs/promises');
const storagedb = require('../queries/storage');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: async function destination(req, file, cb) {
        const path = `./uploads/${req.user.username}`;
        await fs.mkdir(path, { recursive: true });
        cb(null, path)
    },
    filename: function filename(req, file, cb) {
        const fileName = randomUUID();
        cb(null, fileName)
    }
})

const upload = multer({ storage: storage })

async function getRoot(req, res) {
    const root = await storagedb.getRootFolder(req.user.id)
    const folders = await storagedb.getChildrenFolders(root[0].id)
    const files = await storagedb.getFiles(root[0].id);
    res.render('folder', {
        folders: folders,
        files: files,
        currentFolder: root[0],
        isRoot: true
    })
}

async function getFolder(req, res) {
    const folderId = req.params.folderId;
    const folder = await storagedb.getFolder(folderId);
    const folders = await storagedb.getChildrenFolders(folderId)
    const files = await storagedb.getFiles(folderId);
    res.render('folder', {
        folders: folders,
        files: files,
        currentFolder: folder[0],
        isRoot: false
    })
}


async function postAddFolder(req, res, next) {
    const name = req.body.name;
    const currentFolder = req.body.folder;
    const owner = Number(req.body.owner);
    const folder = await storagedb.addFolder(name, currentFolder, owner);
    const backURL = req.get('Referer') || '/'; 
    res.redirect(backURL);

}

const postUpload = [
    upload.single('file'),
    (req, res, next) => {
        const filename = req.file.filename;
        const originalname = req.file.originalname;
        const currentFolder = req.body.folder;
        storagedb.addFile(filename, originalname, currentFolder)
        const backURL = req.get('Referer') || '/'; 
    res.redirect(backURL);

    }
]

async function postDownloadFile(req, res) {
    const username = req.user.username;
    const fileId = req.params.fileId;
    const filePath = path.join(__dirname, `../uploads/${username}`, `${fileId}`);
    const file = await storagedb.getFile(fileId);
    const filename = file[0].name;
    res.download(filePath, filename)

}

async function postDeleteFile(req, res, next) {
    const username = req.user.username;
    const fileId = req.params.fileId;
    const filePath = path.join(__dirname, `../uploads/${username}`, `${fileId}`);
    try {
        const deletedFile = await storagedb.deleteFile(fileId);
        await fs.unlink(filePath)
        console.log(`User ${username} deleted file ${deletedFile.name}, id ${deletedFile.id}`)
    } catch (err) {
        next(err)
    }
    const backURL = req.get('Referer') || '/'; 
    res.redirect(backURL);
}

async function postDeleteFolder(req, res, next) {
    const username = req.user.username;
    const folderId = req.params.folderId;
    try {
        const deletedFiles = await storagedb.deleteFolder(folderId);
        deletedFiles.forEach(async file => {
            const filePath = path.join(__dirname, `../uploads/${username}`, `${file.id}`);
            await fs.unlink(filePath)
            console.log(`User ${username} deleted file ${file.name}, id ${file.id}`)
        })
        const backURL = req.get('Referer') || '/'; 
        res.redirect(backURL);
    } catch (err) {
        next(err)
    }

}

module.exports = {
    getRoot,
    getFolder,
    postAddFolder,
    postUpload,
    postDownloadFile,
    postDeleteFile,
    postDeleteFolder,

}

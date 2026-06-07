const fs = require('node:fs/promises');
const storagedb = require('../queries/storage');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');
const { filesize, partial } = require('filesize');
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

async function getFolder(req, res, next) {
    const folderId = req.params.folderId;
    try {
        let folder;
        if (folderId == "root") {
            folder = await storagedb.getRootFolder(req.user.id);
        } else if (folderId == "trash") {
            folder = await storagedb.getTrashFolder(req.user.id);
        } else {
            folder = await storagedb.getFolder(folderId);
        }
        const childrenFolders = await storagedb.getChildrenFolders(folder.id)
        const files = await storagedb.getFiles(folder.id);
        const isRoot = folder.name === "root";
        const isTrash = folder.name === "trash";
        res.render('folder', {
            folders: childrenFolders,
            files: files,
            currentFolder: folder,
            isRoot: isRoot,
            isTrash: isTrash,
            path: await storagedb.getPath(folder.id),
            filesize: filesize,
            editItemId: false,
            editType: false
        })
    } catch (err) {
        next(err)
    }
}


async function postAddFolder(req, res, next) {
    const name = req.body.name;
    const currentFolder = req.body.currentFolder;
    const owner = Number(req.body.owner);
    const folder = await storagedb.addFolder(name, currentFolder, owner);
    const backURL = req.get('Referer') || '/';
    res.redirect(backURL);

}

const postUpload = [
    upload.single('file'),
    async (req, res, next) => {
        const filename = req.file.filename;
        const filesize = req.file.size;
        const originalname = req.file.originalname;
        const currentFolder = req.body.folder;
        try {
            await storagedb.addFile(filename, originalname, currentFolder, filesize)
            await storagedb.increaseFolderSize(currentFolder, filesize)
            const backURL = req.get('Referer') || '/';
            res.redirect(backURL);
        } catch (err) {
            next(err)
        }
    }
]

async function postDownloadFile(req, res) {
    const username = req.user.username;
    const fileId = req.params.fileId;
    const filePath = path.join(__dirname, `../uploads/${username}`, `${fileId}`);
    const file = await storagedb.getFile(fileId);
    const filename = file.name;
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

async function postTrashFile(req, res, next) {
    const username = req.user.username;
    const fileId = req.params.fileId;
    const currentFolder = req.body.currentFolder;
    try {
        const file = await storagedb.getFile(fileId)
        const updateSize = await storagedb.decreaseFolderSize(file.folderId, file.size)
        const trashFolder = await storagedb.getTrashFolder(username.id)
        const trashFile = await storagedb.moveFile(fileId, trashFolder.id);
    } catch (err) {
        next(err)
    }
    const backURL = req.get('Referer') || '/';
    res.redirect(backURL);
}

async function postTrashFolder(req, res, next) {
    const username = req.user.username;
    const folderId = req.params.folderId;
    const currentFolder = req.body.currentFolder
    try {
        const trashFolder = await storagedb.getTrashFolder(username.id)
        const folder = await storagedb.getFolder(folderId)
        await storagedb.moveFolder(folder.id, trashFolder.id)
        const updateSize = await storagedb.decreaseFolderSize(currentFolder, folder.size)
        const backURL = req.get('Referer') || '/';
        res.redirect(backURL);
    } catch (err) {
        next(err)
    }

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

async function postRestoreFile(req, res, next) {
    const fileId = req.params.fileId;
    try {
        const file = await storagedb.getFile(fileId);
        await storagedb.restoreFile(file.id);
        await storagedb.increaseFolderSize(file.previousFolderId, file.size)
        const backURL = req.get('Referer') || '/';
        res.redirect(backURL);
    } catch (err) {
        next(err)
    }
}

async function postRestoreFolder(req, res, next) {
    const username = req.user.username;
    const folderId = req.params.folderId;
    
    try {
        const folder = await storagedb.getFolder(folderId)
        await storagedb.increaseFolderSize(folder.previousParentId, folder.size)
        await storagedb.restoreFolder(folderId)
        const backURL = req.get('Referer') || '/';
        res.redirect(backURL);
    } catch (err) {
        next(err)
    }

}

async function postEditMode(req, res, next) {
    const item = req.params.itemId;
    const editType = req.body.type;
    const currentFolderId = req.body.currentFolder;
    try {
        const folder = await storagedb.getFolder(currentFolderId);
        const childrenFolders = await storagedb.getChildrenFolders(currentFolderId)
        const files = await storagedb.getFiles(currentFolderId);
        res.render('folder', {
            folders: childrenFolders,
            files: files,
            currentFolder: folder,
            isRoot: false,
            isTrash: false,
            path: await storagedb.getPath(currentFolderId),
            filesize: filesize,
            editItemId: item,
            editType: editType
        })
    } catch(err) {
        next(err)
    }
}

async function postRenameFile(req, res, next) {
    const fileId = req.params.fileId;
    const name = req.body.name;
    const currentFolderId = req.body.currentFolder;
    try {
        await storagedb.renameFile(fileId, name)
        res.redirect(`/folder/${currentFolderId}`)
    } catch (err) {
        next(err)
    }
}

async function postRenameFolder(req, res, next) {
    const folderId = req.params.folderId;
    const name = req.body.name;
    const currentFolderId = req.body.currentFolder;
    try {
        await storagedb.renameFolder(folderId, name)
        res.redirect(`/folder/${currentFolderId}`)
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getFolder,
    postAddFolder,
    postUpload,
    postDownloadFile,
    postDeleteFile,
    postTrashFile,
    postDeleteFolder,
    postTrashFolder,
    postRestoreFolder,
    postRestoreFile,
    postRenameFile,
    postRenameFolder,
    postEditMode
}

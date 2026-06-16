const fs = require('node:fs/promises');
require('dotenv').config();
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
    const editItemId = req.query.editItemId;
    const editItemType = req.query.editItemType;
    let shareFolderId = req.query.shareFolderId;
    let editType = req.query.editType;
    const originalUrl = req.originalUrl;
    try {
        let folder;
        let rootFolder;
        let childrenFolders;

        if (originalUrl == '/folder/root') {
            folder = await storagedb.getRootFolder(req.user?.id);
            childrenFolders = await storagedb.getChildrenFolders(folder.id)
        } else if (originalUrl == '/trash/root') {
            folder = await storagedb.getTrashFolder(req.user?.id);
            childrenFolders = await storagedb.getChildrenFolders(folder.id)
        } else if (originalUrl == '/share/root') {
            folder = await storagedb.getShareFolder(req.user?.id);
            childrenFolders = await storagedb.getSharedFolders(folder.id)
        } else {
            folder = await storagedb.getFolder(folderId);
            childrenFolders = await storagedb.getChildrenFolders(folder.id)
        }

        if (originalUrl.includes('folder')) {
            rootFolder = 'folder';
        } else if (originalUrl.includes('trash')) {
            rootFolder = 'trash';
        } else if (originalUrl.includes('share')) {
            rootFolder = 'share';
        }

        if (req.user == null && folder?.shared != true) {
            res.redirect("/login");
        } else if (req.user == null && rootFolder != 'share') {
            res.redirect("/login");
        } else {
            const files = await storagedb.getFiles(folder.id);
            let editItem;

            if (editItemType == "folder") {
                editItem = await storagedb.getFolder(editItemId);
            } else if (editItemType == "file") {
                editItem = await storagedb.getFile(editItemId);
            }

            res.render('folder', {
                folders: childrenFolders,
                files: files,
                currentFolder: folder,
                daysDelete: process.env.DAYS_TO_DELETE,
                path: await storagedb.getPath(folder.id),
                filesize: filesize,
                editItem: editItem,
                editItemType: editItemType,
                editType: editType,
                rootFolder: rootFolder,
                shareFolderId: shareFolderId
            })
        }
    } catch (err) {
        next(err)
    }
}


async function postAddFolder(req, res, next) {
    const name = req.body.name;
    const currentFolderId = req.body.currentFolder;
    try {
        const currentFolder = await storagedb.getFolder(currentFolderId)
        const parentId = currentFolder.id;
        const ownerId = currentFolder.ownerId;
        const isShared = currentFolder.shared;
        const folder = await storagedb.addFolder(name, parentId, ownerId, isShared);

    } catch (err) {
        next(err)
    }
    const backURL = req.get('Referer') || '/';
    res.redirect(backURL);

}

const postUpload = [
    upload.array('files'),
    async (req, res, next) => {
        const currentFolder = req.body.currentFolder;
        const files = req.files;

        // forEach does not wait for asynchronous operations, so for...of must be used,
        // to avoid page reload before all files are uploaded
        for (const file of files) {
            const filename = file.filename;
            const filesize = file.size;
            const originalname = file.originalname;
            try {
                await storagedb.addFile(filename, originalname, currentFolder, filesize)
                await storagedb.increaseFolderSize(currentFolder, filesize)
            } catch (err) {
                next(err)
            }
        }
        const backURL = req.get('Referer') || '/';
        res.redirect(backURL);
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
        const deleteDate = new Date()
        deleteDate.setDate(deleteDate.getDate() + Number(process.env.DAYS_TO_DELETE) || 7)
        await storagedb.addJob("delete", fileId, "file", deleteDate)
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
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + Number(process.env.DAYS_TO_DELETE))    
        await storagedb.addJob("delete", folderId, "folder", deleteDate)
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
        await storagedb.removeJob(fileId);
    } catch (err) {
        next(err)
    }
    const backURL = req.get('Referer') || '/';
    res.redirect(backURL);
}

async function postRestoreFolder(req, res, next) {
    const folderId = req.params.folderId;
    
    try {
        const folder = await storagedb.getFolder(folderId)

        // check if parent folder is in trash
        const path = await storagedb.getPath(folderId);
        if (path[0].name = "trash") {
            const root = await storagedb.getRootFolder(folder.ownerId)
            await storagedb.moveFolder(folder.id, root.id)
            await storagedb.removeJob(folder.id);
        } else {
            await storagedb.increaseFolderSize(folder.previousParentId, folder.size)
            await storagedb.restoreFolder(folderId)
            await storagedb.removeJob(folder.id);
        }
        
    } catch (err) {
        next(err)
    }
    const backURL = req.get('Referer') || '/';
    res.redirect(backURL);

}

async function postRenameFile(req, res, next) {
    const fileId = req.params.fileId;
    const name = req.body.name;
    const currentFolderId = req.body.currentFolder;
    try {
        await storagedb.renameFile(fileId, name)
    } catch (err) {
        next(err)
    }
    const backURL = req.get('Referer') || '/';
    res.redirect(backURL);
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

async function postMoveFile(req, res, next) {
    const fileId = req.params.fileId;
    const currentFolderId = req.body.currentFolder;
    try {
        await storagedb.moveFile(fileId, currentFolderId)
        res.redirect(`/folder/${currentFolderId}`)
    } catch (err) {
        next(err)
    }
}

async function postMoveFolder(req, res, next) {
    const folderId = req.params.folderId;
    const currentFolderId = req.body.currentFolder;
    try {
        await storagedb.moveFolder(folderId, currentFolderId)
        res.redirect(`/folder/${currentFolderId}`)
    } catch (err) {
        next(err)
    }
}

async function shareFolder(req, res, next) {
    const days = req.body.days;
    const folderId = req.params.folderId;
    let currentFolder;
    try {
        const shareDate = new Date();
        shareDate.setDate(shareDate.getDate() + days)
        const folder = await storagedb.getFolder(folderId);
        currentFolder = folder.parentId;
        await storagedb.shareFolder(folderId, shareDate)
        await storagedb.addJob("unshare", folderId, "folder", shareDate)
    } catch (err) {
        next(err)
    }
    res.redirect(`/folder/${currentFolder}`);
}

async function postUnshareFolder(req, res, next) {
    const folderId = req.params.folderId;
    try {
        await storagedb.unshareFolder(folderId);
        await storagedb.removeJob(folderId);
    } catch(err) {
        next(err)
    }
    const backURL = req.get('Referer') || '/';
    res.redirect(backURL);
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
    postMoveFolder,
    postMoveFile,
    shareFolder,
    postUnshareFolder
}

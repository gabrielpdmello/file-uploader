const fs = require('node:fs/promises');
require('dotenv').config();
const db = require('../queries/storage');
const path = require('path');
const { body, validationResult } = require("express-validator");
const upload = require('../config/multer');

const validateFile = [
    body('name').trim()
        .isLength({ min: 1, max: 100 }).withMessage("File name must be between 1 and 100 characters.")
]

const validateFolder = [
    body('name').trim()
        .isLength({ min: 1, max: 100 }).withMessage("Folder name must be between 1 and 100 characters.")
]

function isAuthenticated(req, res, next) {
    if (req.session != undefined && req.user != undefined) {
        return next();
    } else {
        return res.status(401).redirect('/login');
    }
}

const postAddFolder = [
    isAuthenticated,
    validateFolder,
    async (req, res, next) => {
        const name = req.body.name;
        const currentFolderId = req.body.currentFolder;
        const user = req.user;
        const errors = validationResult(req);
        const backURL = req.get('Referer') || '/';
        if (!errors.isEmpty()) {
            const backURL = req.get('Referer') || '/';
            req.session.errors = errors.array();
            return res.status(400).redirect(backURL);
        }

        try {
            const currentFolder = await db.getFolder(currentFolderId);
            const trashFolder = await db.getTrashFolder(req.user.id);
            const shareFolder = await db.getShareFolder(req.user.id);
            const backURL = req.get('Referer') || '/';

            if (!currentFolder.accept_folder) {
                req.session.msg = "Cannot create folder here.";
                return res.status(403).redirect(backURL);
            } else if (user.id != currentFolder.ownerId) {
                req.session.msg = "Cannot create folder here.";
                return res.status(403).redirect(backURL);
            } else {
                const parentId = currentFolder.id;
                const ownerId = currentFolder.ownerId;
                const isShared = currentFolder.shared;
                const folder = await db.addFolder(name, parentId, ownerId, isShared);
            }
        } catch (err) {
            return next(err)
        }
        res.status(201).redirect(backURL);
    }
]

const postUpload = [
    isAuthenticated,
    upload.array('files'),
    async (req, res, next) => {
        const currentFolderId = req.body.currentFolder;
        const user = req.user;
        const files = req.files;
        const backURL = req.get('Referer') || '/';

        try {
            const currentFolder = await db.getFolder(currentFolderId);
            if (user.id != currentFolder.ownerId) {
                req.session.msg = "Cannot upload files here.";
                return res.status(403).redirect(backURL);
            }
            // forEach does not wait for asynchronous operations, so for...of must be used,
            // to avoid page reload before all files are uploaded
            for (const file of files) {
                const filename = file.filename;
                const filesize = file.size;
                const originalname = file.originalname;
                const filePath = `${user.username}/${filename}`;
                await db.addFile(filename, originalname, user.id, currentFolder.id, filesize, filePath);
                await db.increaseFolderSize(currentFolder.id, filesize);
            }

        } catch (err) {
            return next(err)
        }
        res.status(201).redirect(backURL);
    }
]

const postDownloadFile = [
    async (req, res, next) => {
        const user = req.user;
        const fileId = req.params.fileId;
        const backURL = req.get('Referer') || '/';
        let file;
        let filePath;

        try {
            file = await db.getFile(fileId);
            const folder = await db.getFolder(file.folderId);
            filePath = path.join(__dirname, `../uploads/${file.path}`);

            if (user.id != file.ownerId) {
                if (!folder.shared) {
                    req.session.msg = "Cannot download file.";
                    return res.status(403).redirect(backURL);
                }
            }
        } catch (err) {
            next(err)
        }

        res.status(200).download(filePath, file.name)
    }
]

const postDeleteFile = [
    isAuthenticated,
    async (req, res, next) => {
        const user = req.user;
        const fileId = req.params.fileId;
        const backURL = req.get('Referer') || '/';
        try {
            const file = db.getFile(fileId);
            if (user.id != file.ownerId) {
                req.session.msg = "Cannot delete file.";
                return res.status(403).redirect(backURL);
            }
            const deletedFile = await db.deleteFile(fileId);
            const filePath = path.join(__dirname, `../uploads/${file.path}`);
            await fs.unlink(filePath)
        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]


const postTrashFile = [
    isAuthenticated,
    async(req, res, next) => {
        const user = req.user;
        const fileId = req.params.fileId;
        const currentFolder = req.body.currentFolder;
        const backURL = req.get('Referer') || '/';

        try {
            const file = await db.getFile(fileId)
            if (user.id != file.ownerId) {
                req.session.msg = "Cannot move file to trash.";
                return res.status(403).redirect(backURL);
            }

            const updateSize = await db.decreaseFolderSize(file.folderId, file.size)
            const trashFolder = await db.getTrashFolder(user.id)
            const trashFile = await db.moveFile(fileId, trashFolder.id);
            const deleteDate = new Date()
            deleteDate.setDate(deleteDate.getDate() + Number(process.env.DAYS_TO_DELETE) || 7)
            await db.addJob("delete", fileId, "file", deleteDate)
        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]

const postTrashFolder = [
    isAuthenticated,
    async (req, res, next) => {
        const user = req.user;
        const folderId = req.params.folderId;
        const currentFolder = req.body.currentFolder
        const backURL = req.get('Referer') || '/';
        try {
            const folder = await db.getFolder(folderId)
            if (user.id != folder.ownerId) {
                req.session.msg = "Cannot move folder to trash.";
                return res.status(403).redirect(backURL);
            }
            const trashFolder = await db.getTrashFolder(user.id)
            const deleteDate = new Date();
            deleteDate.setDate(deleteDate.getDate() + Number(process.env.DAYS_TO_DELETE || 7))
            await db.moveFolder(folder.id, trashFolder.id)
            await db.decreaseFolderSize(currentFolder, folder.size)
            await db.addJob("delete", folderId, "folder", deleteDate)
        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]

const postDeleteFolder = [
    isAuthenticated,
    async (req, res, next) => {
        const user = req.user;
        const folderId = req.params.folderId;
        const backURL = req.get('Referer') || '/';
        try {
            const folder = await db.getFolder(folderId);
            if (user.id != folder.ownerId) {
                req.session.msg = "Cannot delete folder.";
                return res.status(403).redirect(backURL);
            }
            const deletedFiles = await db.deleteFolder(folderId);
            deletedFiles.forEach(async file => {
                const filePath = path.join(__dirname, `../uploads/${file.path}`);
                await fs.unlink(filePath)
            })

        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]

const postRestoreFile = [
    isAuthenticated,
    async (req, res, next) => {
        const fileId = req.params.fileId;
        const user = req.user;
        const backURL = req.get('Referer') || '/';

        try {
            const file = await db.getFile(fileId);
            if (user.id != file.ownerId) {
                req.session.msg = "Cannot restore file.";
                return res.status(403).redirect(backURL);
            }
            await db.restoreFile(file.id);
            await db.increaseFolderSize(file.previousFolderId, file.size)
            await db.removeJob(fileId);
        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]

const postRestoreFolder = [
    isAuthenticated,
    async (req, res, next) => {
        const folderId = req.params.folderId;
        const user = req.user;
        const backURL = req.get('Referer') || '/';

        try {
            const folder = await db.getFolder(folderId)

            if (user.id != folder.ownerId) {
                req.session.msg = "Cannot restore folder.";
                return res.status(403).redirect(backURL);
            }

            // check if parent folder is in trash
            const path = await db.getPath(folderId);
            if (path[0].name = "trash") {
                const root = await db.getRootFolder(folder.ownerId);
                await db.moveFolder(folder.id, root.id);
                await db.increaseFolderSize(folder.previousParentId, folder.size)
                await db.removeJob(folder.id);
            }

        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]

const postRenameFile = [
    isAuthenticated,
    async (req, res, next) => {
        const fileId = req.params.fileId;
        const name = req.body.name;
        const user = req.user;
        const backURL = req.get('Referer') || '/';
        
        try {
            const file = await db.getFile(fileId);

            if (user.id != file.ownerId) {
                req.session.msg = "Cannot rename file.";
                return res.status(403).redirect(backURL);
            }
            await db.renameFile(fileId, name);
        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]

const postRenameFolder = [
    isAuthenticated,
    async (req, res, next) => {
        const folderId = req.params.folderId;
        const name = req.body.name;
        const user = req.user;
        const backURL = req.get('Referer') || '/';

        try {
            const folder = await db.getFolder(folderId);
            if (user.id != folder.ownerId) {
                req.session.msg = "Cannot restore folder.";
                return res.status(403).redirect(backURL)
            }
            await db.renameFolder(folderId, name)
        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);

    }
]

const postMoveFile = [
    isAuthenticated,
    async (req, res, next) => {
        const fileId = req.params.fileId;
        const user = req.user;
        const currentFolderId = req.body.currentFolder;
        const backURL = req.get('Referer') || '/';
        try {
            const file = await db.getFile(fileId);

            if (user.id != file.ownerId) {
                req.session.msg = "Cannot move file.";
                return res.status(403).redirect(backURL)
            }
            await db.moveFile(fileId, currentFolderId)
        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]

const postMoveFolder = [
    isAuthenticated,
    async (req, res, next) => {
        const folderId = req.params.folderId;
        const currentFolderId = req.body.currentFolder;
        const backURL = req.get('Referer') || '/';
        const user = req.user;

        try {
            const childrenFolders = await db.getPath(currentFolderId);
            const folder = await db.getFolder(folderId);

            if (user.id != folder.ownerId) {
                req.session.msg = "Cannot move file.";
                return res.status(403).redirect(backURL)
            }

            for (folder of childrenFolders) {
                if (folder.id === folderId) {
                    req.session.msg = "Cannot move folder inside itself."
                    return res.status(400).redirect(backURL)
                }
            }
            await db.moveFolder(folderId, currentFolderId)
        } catch (err) {
            return next(err)
        }
        res.status(200).redirect(backURL);
    }
]

const postShareFolder = [
    isAuthenticated,
    async (req, res, next) => {
        const days = req.body.days;
        const folderId = req.params.folderId;
        const user = req.user;
        let currentFolder;
        try {
            const folder = await db.getFolder(folderId);
            const shareDate = new Date();
            shareDate.setDate(shareDate.getDate() + days)
            currentFolder = folder.parentId;

            if (user.id != folder.ownerId)
            
            await db.shareFolder(folderId, shareDate)
            await db.addJob("unshare", folderId, "folder", shareDate)
        } catch (err) {
            return next(err)
        }
        res.redirect(`/folder/${currentFolder}`);
    }

]

async function postShareFolder(req, res, next) {
    const days = req.body.days;
    const folderId = req.params.folderId;
    let currentFolder;
    try {
        const shareDate = new Date();
        shareDate.setDate(shareDate.getDate() + days)
        const folder = await db.getFolder(folderId);
        currentFolder = folder.parentId;
        await db.shareFolder(folderId, shareDate)
        await db.addJob("unshare", folderId, "folder", shareDate)
    } catch (err) {
        return next(err)
    }
    res.redirect(`/folder/${currentFolder}`);
}

async function postUnshareFolder(req, res, next) {
    const folderId = req.params.folderId;
    try {
        await db.unshareFolder(folderId);
        await db.removeJob(folderId);
    } catch (err) {
        return next(err)
    }
    const backURL = req.get('Referer') || '/';
    res.redirect(backURL);
}

module.exports = {
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
    postShareFolder,
    postUnshareFolder
}

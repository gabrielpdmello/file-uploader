const bcrypt = require('bcryptjs');
const user = require('../queries/user');
const passport = require("../config/passport")
const db = require('../queries/storage');
const { filesize, partial } = require('filesize');
const { body, validationResult } = require("express-validator");
const multer = require('multer');
require('dotenv').config();

const validateSignup = [
    body('name').trim()
        .isLength({ min: 5, max: 100 }).withMessage('Name must be between 5 and 100 characters.'),
    body('username').trim()
        .isLength({ min: 1, max: 30 }).withMessage('Username must be between 1 and 30 characters.')
        .custom(async value => {
            const username = await db.getUser(value);
            if (username?.username) {
                throw new Error("Username is already in use, choose another.")
            }
        }),
    body('password').trim()
        .isLength({ min: 7, max: 30 }).withMessage('Password must be between 7 and 30 characters.'),
    body('confirmPassword').custom((value, { req }) => {
        return value === req.body.password;
    }).withMessage('Passwords do not match.'),
];

async function locals(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errorMessage = req.flash('error');
    return next();
}

async function index(req, res) {
    res.status(200).render("index", { repoUrl: process.env.REPOURL });
}

async function getRoot(req, res) {
    res.status(301).redirect("/folder/root");
}

async function getTrash(req, res) {
    res.status(301).redirect("/trash/root");
}

async function getShare(req, res) {
    res.status(301).redirect("/share/root");
}

function getSignup(req, res) {
    res.status(200).render("signup");
}

async function fetchFolderData(req, res, next) {
    const originalUrl = req.originalUrl;
    const folderId = req.params.folderId;
    const user = req.user;
    let folderData;

    try {
        if (originalUrl.includes('/folder/root')) {
            folderData = await db.getRootFolder(user?.id);
            folderData.childrenFolders = await db.getChildrenFolders(folderData.id)
        } else if (originalUrl.includes('/trash/root')) {
            folderData = await db.getTrashFolder(user?.id);
            folderData.childrenFolders = await db.getChildrenFolders(folderData.id)
        } else if (originalUrl.includes('/share/root')) {
            folderData = await db.getShareFolder(user?.id);
            folderData.childrenFolders = await db.getSharedFolders(folderData.id)
        } else {
            folderData = await db.getFolder(folderId);
            folderData.childrenFolders = await db.getChildrenFolders(folderData.id)
        }

        if (folderData.root == null) {
            folderData.root = folderData.name;
        }

        if (req.session != undefined && req.user != undefined) {
            // user is logged in
            if (folderData == null) {
                req.session.msg = 'Folder does not exist.';
                return res.status(404).redirect('/folder/root');
            }
            if (folderData.ownerId != user.id) {
                if (folderData.root != 'share') {
                    console.log(folderData.root);
                    req.session.msg = 'Folder does not exist.';
                    return res.status(404).redirect('/folder/root');
                }
            }
        } else {
            // user is not logged in
            if (folderData.root != 'share') {
                return res.status(401).redirect("/login");
            }
        }

        folderData.files = await db.getFiles(folderData.id);

    } catch (err) {
        return next(err)
    }

    req.folderData = folderData;
    return next();
}

async function fetchEditItemData(req, res, next) {
    const editItem = {
        itemType: req.query?.editItemType,
        editType: req.query?.editType
    };

    try {
        if (editItem.itemType == "folder") {
            Object.assign(editItem, await db.getFolder(req.query?.editItemId))
        } else if (editItem.itemType == "file") {
            Object.assign(editItem, await db.getFile(req.query?.editItemId))
        }
    } catch (err) {
        return next(err)
    }
    req.editItem = editItem;
    return next();
}

const getFolder = [
    fetchFolderData,
    fetchEditItemData,
    async (req, res, next) => {
        let shareFolderId = req.query.shareFolderId; // folder to share

        try {
            const folderData = req.folderData;
            const editItem = req.editItem;
            const msg = req.session.msg;
            const errors = req.session.errors;
            const path = await db.getPath(folderData.id);
            req.session.msg = '';
            req.session.errors = '';

            res.status(200).render('folder', {
                currentFolder: folderData,
                daysDelete: process.env.DAYS_TO_DELETE,
                path: path,
                filesize: filesize,
                editItem: editItem,
                editItemType: editItem.type,
                editType: editItem.editType,
                shareFolderId: shareFolderId,
                message: msg,
                errors: errors
            })

        } catch (err) {
            return next(err)
        }
    }
]

const postSignup = [
    validateSignup,
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const userInput = {
                name: req.body.name,
                username: req.body.username,
                password: req.body.password
            }
            return res.status(400).render("signup", {
                errors: errors.array(),
                userInput: userInput
            });
        }
        try {
            const name = req.body.name;
            const username = req.body.username;
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            user.createUser(name, username, hashedPassword)
            res.status(201).redirect("/login");
        } catch (err) {
            return next(err);
        }
    }
]

function getLogin(req, res) {
    res.status(200).render("login");
}

async function logout(req, res, next) {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.status(204).redirect("/");
    })
}

function getUpload(req, res) {
    res.status(200).render('upload');
}

function getError(req, res) {
    res.status(404).render('error');
}

function errorHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        const backURL = req.get('Referer') || '/';
        req.session.msg = err.field;
        return res.status(400).redirect(backURL);
    } else if (err) {
        console.log(err);
        return res.status(500).redirect('/error');
    }
    return next()
}

module.exports = {
    locals,
    index,
    getRoot,
    getTrash,
    getShare,
    getSignup,
    getFolder,
    postSignup,
    getLogin,
    logout,
    getUpload,
    getError,
    errorHandler
}
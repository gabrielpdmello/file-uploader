const bcrypt = require('bcryptjs');
const user = require('../queries/user');
const passport = require("../config/passport")
const storagedb = require('../queries/storage');
const { filesize, partial } = require('filesize');
const { body, validationResult } = require("express-validator");

require('dotenv').config();

const validateSignup = [
    body('name').trim()
        .isLength({ min: 5, max: 100 }).withMessage('Name must be between 5 and 100 characters.'),
    body('username').trim()
        .isLength({ min: 1, max: 30 }).withMessage('Username must be between 1 and 30 characters.')
        .custom(async value => {
            const username = await storagedb.getUser(value);
            if (username?.username) {
                throw new Error("Username is already in use, choose another.")
            }
        }),
    body('password').trim()
        .isLength({ min: 7, max: 30 }).withMessage('Password must be between 7 and 30 characters.'),
    body('confirmPassword').custom((value, {req}) => {
        return value === req.body.password;
    }).withMessage('Passwords do not match.'),
];

async function locals(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errorMessage = req.flash('error');
    next();
}

async function index(req, res) {
    res.render("index", {repoUrl: process.env.REPOURL});
}

async function getRoot(req, res) {
    res.redirect("/folder/root");
}

async function getTrash(req, res) {
    res.redirect("/trash/root");
}

async function getShare(req, res) {
    res.redirect("/share/root");
}

function getSignup(req, res) {
    res.render("signup");
}

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

        if (originalUrl.includes('/folder/root')) {
            folder = await storagedb.getRootFolder(req.user?.id);
            childrenFolders = await storagedb.getChildrenFolders(folder.id)
        } else if (originalUrl.includes('/trash/root')) {
            folder = await storagedb.getTrashFolder(req.user?.id);
            childrenFolders = await storagedb.getChildrenFolders(folder.id)
        } else if (originalUrl.includes('/share/root')) {
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
            const msg = req.session.msg;
            req.session.msg = '';

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
                shareFolderId: shareFolderId,
                messages: msg
            })
        }
    } catch (err) {
        next(err)
    }
}

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
            res.redirect("/login");
        } catch (error) {
            next(error);
        }
    }
]

function getLogin(req, res) {
    res.render("login");
}

async function logout(req, res, next) {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    })
}

function getUpload(req, res) {
    res.render('upload');
}

function errorHandler(err, req, res, next) {
    res.status(500);
    console.log(err);
    res.render('error');

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
    errorHandler
}
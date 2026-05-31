const bcrypt = require('bcryptjs');
const user = require('../queries/user');
const storagedb = require('../queries/storage');
const passport = require("../config/passport")
const storageController = require("./storage");
const multer = require('multer');
const storage = multer.diskStorage({
    destination: storageController.destination,
    filename: storageController.filename
})

const upload = multer({ storage: storage })

async function locals(req, res, next) {
    res.locals.currentUser = req.user;
    next();
}

async function index(req, res) {
    res.render("index");
}

function getSignup(req, res) {
    res.render("signup");
}

async function postSignup(req, res, next) {
    try {
        const name = req.body.name;
        const username = req.body.username;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        user.createUser(name, username, hashedPassword)
        res.redirect("/");
    } catch (error) {
        next(error);
    }
}

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


const postUpload = [
    upload.single('file'),
    (req, res, next) => {
        const filename = req.file.originalname;
        const folder = req.body.folder;
        storagedb.addFile(filename, folder)
        res.redirect('/folder/root');
    }
]

function errorHandler(err, req, res, next) {
    res.status(500)
    res.render('error', { error: err });

}

module.exports = {
    locals,
    index,
    getSignup,
    postSignup,
    getLogin,
    // postLogin,
    logout,
    getUpload,
    postUpload,
    errorHandler
}
const bcrypt = require('bcryptjs');
const user = require('../queries/user');
const passport = require("../config/passport")
require('dotenv').config();


async function locals(req, res, next) {
    res.locals.currentUser = req.user;
    next();
}

async function index(req, res) {
    res.render("index", {repoUrl: process.env.REPOURL});
}

async function getRoot(req, res) {
    res.redirect("/folder/root");
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
        res.redirect("/login");
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

function errorHandler(err, req, res, next) {
    res.status(500)
    res.render('error', { error: err });

}

module.exports = {
    locals,
    index,
    getRoot,
    getSignup,
    postSignup,
    getLogin,
    logout,
    getUpload,
    errorHandler
}
const bcrypt = require('bcryptjs');
const user = require('../queries/user');

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

function errorHandler(err, req, res, next) {
    res.status(500)
    res.render('error', { error: err })

}

module.exports = {
    locals,
    index,
    getSignup,
    postSignup,
    getLogin,
    errorHandler
}
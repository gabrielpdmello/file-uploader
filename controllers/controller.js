async function locals(req, res, next) {
  res.locals.currentUser = req.user;
  next();
}

async function index(req, res) {
    res.render("index");
}

function errorHandler(err, req, res, next) {
    res.status(500)
    res.render('error', { error: err})

}

module.exports = {
    locals,
    index,
    errorHandler
}
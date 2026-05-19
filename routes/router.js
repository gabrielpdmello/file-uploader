const { Router } = require("express");
const controller = require("../controllers/controller");
const router = Router();
const passport = require("../config/passport")

router.use(passport.session());

router.use(controller.locals);

router.get('/', controller.index);

router.get('/signup', controller.getSignup);
router.post('/signup', controller.postSignup);

router.get('/login', controller.getLogin);
router.post("/login",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
    })
)

router.use(controller.errorHandler);

module.exports = router;
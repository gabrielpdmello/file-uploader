const { Router } = require("express");
const controller = require("../controllers/controller");
const storageController = require("../controllers/storage");
const router = Router();
const passport = require("../config/passport")
const multer  = require('multer');
const storage = multer.diskStorage({
  destination: storageController.destination,
  filename: storageController.filename
})

const upload = multer({ storage: storage })

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

router.get("/logout", controller.logout);

router.get('/upload', controller.getUpload);
router.post('/upload', upload.single('file'), controller.postUpload);

router.use(controller.errorHandler);

module.exports = router;
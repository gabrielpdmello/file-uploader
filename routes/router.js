const { Router } = require("express");
const controller = require("../controllers/controller");
const storage = require("../controllers/storage");
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
);

router.get("/logout", controller.logout);

router.get('/upload', controller.getUpload);
router.post('/upload', storage.postUpload);

router.get('/folder', storage.getRoot);

router.get('/folder/:folderId', storage.getFolder);

router.post('/delete-folder/:folderId', storage.postDeleteFolder);

router.post('/addfolder', storage.postAddFolder);

router.post('/download/:fileId', storage.postDownloadFile);

router.post('/delete-fIle/:fileId', storage.postDeleteFile)

router.use(controller.errorHandler);

module.exports = router;
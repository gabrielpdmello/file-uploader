const { Router } = require("express");
const controller = require("../controllers/controller");
const storage = require("../controllers/storage");
const router = Router();
const passport = require("../config/passport")
const flash = require('connect-flash');


router.use(passport.session());
router.use(flash());
router.use(controller.locals);

router.get('/', controller.index);

router.get('/folder', controller.getRoot);
router.get('/trash', controller.getTrash);
router.get('/share', controller.getShare);

router.get('/folder/:folderId', controller.getFolder);
router.get('/trash/:folderId', controller.getFolder);
router.get('/share/:folderId', controller.getFolder);

router.get('/signup', controller.getSignup);
router.post('/signup', controller.postSignup);

router.get('/login', controller.getLogin);
router.post("/login",
    passport.authenticate("local", {
        successRedirect: "/folder/root",
        failureRedirect: "/login",
        failureFlash: true
    })
);

router.get("/logout", controller.logout);

router.get('/upload', controller.getUpload);
router.post('/upload', storage.postUpload);

router.post('/delete-folder/:folderId', storage.postDeleteFolder);
router.post('/trash-folder/:folderId', storage.postTrashFolder);

router.post('/addfolder', storage.postAddFolder);

router.post('/download/:fileId', storage.postDownloadFile);

router.post('/delete-file/:fileId', storage.postDeleteFile);
router.post('/trash-file/:fileId', storage.postTrashFile);

router.post('/restore-folder/:folderId', storage.postRestoreFolder);
router.post('/restore-file/:fileId', storage.postRestoreFile);

router.post('/rename-file/:fileId', storage.postRenameFile);
router.post('/rename-folder/:folderId', storage.postRenameFolder);

router.post('/move-folder/:folderId', storage.postMoveFolder);
router.post('/move-file/:fileId', storage.postMoveFile);

router.post('/share-folder/:folderId', storage.postShareFolder);
router.post('/unshare-folder/:folderId', storage.postUnshareFolder);

router.get('/error', controller.getError);

router.use(controller.errorHandler);

module.exports = router;
const { Router } = require("express");
const fs = require('node:fs');
const controller = require("../controllers/controller");
const router = Router();
const passport = require("../config/passport")
const multer  = require('multer')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync('./uploads')){
        console.log('Creating uploads folder...')
        fs.mkdirSync('./uploads', { recursive: true });
    }
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
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

router.get('/upload', controller.getUpload);
router.post('/upload', upload.single('file'), controller.postUpload);

router.use(controller.errorHandler);

module.exports = router;
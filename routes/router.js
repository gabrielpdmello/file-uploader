const { Router } = require("express");
const controller = require("../controllers/controller");
const router = Router();

router.use(controller.locals);

router.get('/', controller.index);

router.use(controller.errorHandler);

module.exports = router;
const express = require("express");
const { authRequired } = require("../../middlewares/authRequired");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const {
  getMyNotifications,
  postMarkAllRead,
  postMarkOneRead,
} = require("./notifications.controller");

const router = express.Router();

router.use(authRequired);
router.use(require2FAForAdmin);

router.get("/me", getMyNotifications);
router.post("/me/read-all", postMarkAllRead);
router.post("/:id/read", postMarkOneRead);

module.exports = router;

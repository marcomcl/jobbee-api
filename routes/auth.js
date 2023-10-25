const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, forgotPassword, resetPassword } = require('../controllers/authController');
const { isAuthenticated } = require('../middlewares/auth');

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/logout').get(isAuthenticated, logoutUser);
router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').put(resetPassword);

module.exports = router;
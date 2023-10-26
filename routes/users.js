const express = require('express');
const router = express.Router();
const { getUserProfile, updatePassword, updateUser, deleteUser, getAppliedJobs, getPublishedJobs, getUsers, deleteCurrentUser } = require('../controllers/usersController');
const { isAuthenticated, authRoles } = require('../middlewares/auth');

router.use(isAuthenticated);

router.route('/me').get(getUserProfile);
router.route('/me/update').put(updateUser);
router.route('/me/delete').delete(deleteCurrentUser);
router.route('/password/update').put(updatePassword);
router.route('/jobs/applied').get(authRoles('user'), getAppliedJobs);
router.route('/jobs/published').get(authRoles('employer', 'admin'), getPublishedJobs);
router.route('/users').get(authRoles('admin'), getUsers);
router.route('/user/:id/delete').delete(authRoles('admin'), deleteUser);

module.exports = router;
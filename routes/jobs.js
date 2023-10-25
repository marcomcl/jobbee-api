const express = require('express');
const router = express.Router();

const { getJobs, newJob, getJobsInRadius, updateJob, deleteJob, getJob, jobStats } = require('../controllers/jobsController');
const { isAuthenticated, authRoles } = require('../middlewares/auth');

router.route('/jobs').get(getJobs);
router.route('/job/:id/:slug').get(getJob);
router.route('/jobs/:zipcode/:distance').get(getJobsInRadius);
router.route('/job/new').post(isAuthenticated, authRoles('employer', 'admin'), newJob);
router.route('/job/:id')
    .put(isAuthenticated, authRoles('employer', 'admin'), updateJob)
    .delete(isAuthenticated, authRoles('employer', 'admin'), deleteJob);

router.route('/stats/:topic').get(jobStats);


module.exports = router;
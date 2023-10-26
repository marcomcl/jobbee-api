const User = require('../models/users');
const Job = require('../models/jobs');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const sendToken = require('../utils/jwtToken');
const { JsonWebTokenError } = require('jsonwebtoken');
const fs = require('fs');
const APIFilters = require('../utils/apiFilters');

// Get current User => /api/v1/me
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id)
        .populate({
            path: 'publishedJobs',
            select: 'title postingDate'
        });

    res.status(200).json({
        success: true,
        data: user
    })
});

// Update current password => /api/v1/password/update
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    const isMatching = await user.comparePassword(req.body.currentPassword);

    if (!isMatching) {
        return next(new ErrorHandler('Current password is not correct!', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendToken(user, 200, res);
});

// Update current user => /api/v1/me/update
exports.updateUser = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email
    };

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: user
    });
});

// USER - Show all applied jobs => /api/v1/jobs/applied
exports.getAppliedJobs = catchAsyncErrors(async (req, res, next) => {
    const jobs = await Job.find({ 'candidates.id': req.user.id }).select('+candidates');

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});

// EMPLOYER - Show all published jobs => /api/v1/jobs/published
exports.getPublishedJobs = catchAsyncErrors(async (req, res, next) => {
    const jobs = await Job.find({ user: req.user.id });

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});

// ADMIN - Show all users => /api/v1/users
exports.getUsers = catchAsyncErrors(async (req, res, next) => {

    const apiFilters = new APIFilters(User.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const users = await apiFilters.query;

    res.status(200).json({
        success: true,
        results: users.length,
        data: users
    });
});

// ADMIN - Delete user => /api/v1/user/:id/delete
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {

    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorHandler('User not found!', 404));
    }

    deleteUserData(user.id, user.role);
    user.remove();

    res.status(200).json({
        success: true,
        message: 'The requested account has been successfully deleted!'
    });
});

// Delete current user => /api/v1/me/delete
exports.deleteCurrentUser = catchAsyncErrors(async (req, res, next) => {

    deleteUserData(req.user.id, req.user.role);

    const user = await User.findByIdAndDelete(req.user.id);

    res.cookie('token', 'none', {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Your account has been successfully deleted!'
    });
});

async function deleteUserData(user, role) {
    if (role === 'employer') {
        await Job.deleteMany({ user: user });
    }

    if (role === 'user') {
        const jobsApplied = await Job.find({ 'candidates.id': user }).select('+candidates');

        jobsApplied.forEach(job => {
            let obj = job.candidates.find(o => o.id === user);
            let filePath = `${__dirname}/public/uploads/${obj.resume}`.replace('\\controllers', '');

            fs.unlink(filePath, err => {
                if (err) {
                    return console.log(err);
                }
            });

            job.candidates.splice(job.candidates.indexOf(obj.id));
            job.save();
        });
    }
}
const Job = require('../models/jobs');
const geocoder = require('../utils/geocoder');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const APIFilters = require('../utils/apiFilters');
const path = require('path');
const fs = require('fs');

// Get all Jobs => /api/v1/jobs
exports.getJobs = async (req, res, next) => {

    const apiFilters = new APIFilters(Job.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .searchByQuery()
        .paginate();

    const jobs = await apiFilters.query;

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
}

// Get a Job by id and slug => /api/v1/job/:id/:slug
exports.getJob = catchAsyncErrors(async (req, res, next) => {
    const job = await Job.find({ $and: [{ _id: req.params.id }, { slug: req.params.slug }] }).populate({
        path: 'user',
        select: 'name'
    });

    if (!job || job.length === 0) {
        return next(new ErrorHandler('Job not found!', 404));
    }

    res.status(200).json({
        success: true,
        data: job
    })
});

// Create a new Job => /api/v1/job/new
exports.newJob = catchAsyncErrors(async (req, res, next) => {

    req.body.user = req.user.id;
    const job = await Job.create(req.body);

    res.status(200).json({
        success: true,
        message: 'Job created successfully!',
        data: job
    })
});

// Update a Job => /api/v1/job/:id
exports.updateJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id);

    if (!job) {
        return next(new ErrorHandler('Job not found!', 404));
    }

    if (job.user.toString() != req.user.id && req.user.role != 'admin') {
        return next(new ErrorHandler('User is not allowed to update this job!', 403));
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        message: 'Job updated successfully!',
        data: job
    });
});

// Delete a Job => /api/v1/job/:id
exports.deleteJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id).select('+candidates');

    if (!job) {
        return next(new ErrorHandler('Job not found!', 404));
    }

    if (job.user.toString() != req.user.id && req.user.role != 'admin') {
        return next(new ErrorHandler('User is not allowed to delete this job!', 403));
    }

    job.candidates.forEach(candidate => {
        let filePath = `${__dirname}/public/uploads/${candidate.resume}`.replace('\\controllers', '');

        fs.unlink(filePath, err => {
            if (err) {
                return console.log(err);
            }
        });
    })

    job = await Job.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Job deleted successfully!',
        data: job
    });
});

// Search Job within radius => /api/v1/jobs/:zipcode/:distance
exports.getJobsInRadius = catchAsyncErrors(async (req, res, next) => {
    const { zipcode, distance } = req.params;

    // Getting latitude and longitude for the desired zipcode
    const loc = await geocoder.geocode(zipcode);
    const latitude = loc[0].latitude;
    const longitude = loc[0].longitude;

    const radius = distance / 3963;

    const jobs = await Job.find({
        location: { $geoWithin: { $centerSphere: [[longitude, latitude], radius] } }
    });

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});

// Get stats about a topic => /api/v1/stats/:topic
exports.jobStats = catchAsyncErrors(async (req, res, next) => {
    const stats = await Job.aggregate([
        {
            $match: { $text: { $search: "\"" + req.params.topic + "\"" } }
        },
        {
            $group: {
                _id: { $toUpper: '$experience' },
                totalJobs: { $sum: 1 },
                avgPositions: { $avg: '$positions' },
                avgSalary: { $avg: '$salary' },
                minSalary: { $min: '$salary' },
                maxSalary: { $max: '$salary' }
            }
        }
    ]);

    if (stats.length === 0) {
        return next(new ErrorHandler(`No stat found for topic ${req.params.topic}`, 404));
    }

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Apply to a Job => /api/v1/job/:id/apply
exports.applyJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id).select('+candidates');

    if (!job) {
        return next(new ErrorHandler('Job not found!', 404));
    }

    if (job.lastDate < new Date(Date.now())) {
        return next(new ErrorHandler('You cannot apply to this job anymore.', 400));
    }

    job.candidates.forEach(candidate => {
        if (candidate.id === req.user.id) {
            return next(new ErrorHandler('You have already applied to this job!', 400));
        }
    });

    if (!req.files) {
        return next(new ErrorHandler('Please upload your resume!', 400));
    }

    const file = req.files.file;

    const supportedFiles = /.docx|.pdf/;
    if (!supportedFiles.test(path.extname(file.name))) {
        return next(new ErrorHandler('Please upload a .docx or .pdf file!', 400));
    }

    if (file.size > process.env.MAX_FILE_SIZE) {
        return next(new ErrorHandler('Please upload a smaller file!', 400));
    }

    file.name = `${req.user.name.replace(' ', '_')}_${job._id}${path.parse(file.name).ext}`;
    file.mv(`${process.env.UPLOAD_PATH}/${file.name}`, async err => {
        if (err) {
            console.log(err);
        }

        return next(new ErrorHandler('Failed to upload the Resume', 500));
    });

    await Job.findByIdAndUpdate(req.params.id, {
        $push: {
            candidates: {
                id: req.user.id,
                resume: file.name
            }
        }
    }, {
        new: true
    });

    res.status(200).json({
        success: true,
        message: 'Application completed successfully!',
        data: file.name
    })
});
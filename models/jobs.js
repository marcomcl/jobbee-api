const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');
const geocoder = require('../utils/geocoder');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please enter a Job Title!'],
        trim: true,
        maxlength: [100, 'The Job Title cannot exceed 100 characters!']
    },
    slug: String,
    description: {
        type: String,
        required: [true, 'Please enter a Job Description!'],
        maxlength: [1000, 'The Job Description cannot exceed 1000 characters!']
    },
    email: {
        type: String,
        validate: [validator.isEmail, 'Please provide a valid email address!']
    },
    address: {
        type: String,
        required: [true, 'Please enter an Address!']
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number],
            index: '2dsphere'
        },
        formattedAddress: String,
        city: String,
        state: String,
        zipcode: String,
        country: String
    },
    company: {
        type: String,
        required: [true, 'Please enter a Company Name!']
    },
    industry: {
        type: [String],
        required: [true, 'Please enter an Industry!'],
        enum: {
            values: [
                'Business',
                'Information Technology',
                'Banking',
                'Insurance',
                'Telco',
                'Other'
            ],
            message: 'Please provide a valid option for the Industry!'
        }
    },
    jobType: {
        type: String,
        required: [true, 'Please enter a Job Type!'],
        enum: {
            values: [
                'Permanent',
                'Fixed term',
                'Internship'
            ],
            message: 'Please provide a valid option for the Job Type!'
        }
    },
    minEducation: {
        type: String,
        required: [true, 'Please enter the Minimum Education!'],
        enum: {
            values: [
                'Bachelors',
                'Masters',
                'PhD'
            ],
            message: 'Please provide a valid option for the Education Required!'
        }
    },
    positions: {
        type: Number,
        default: 1
    },
    experience: {
        type: String,
        required: [true, 'Please enter the Candidate Experience!'],
        enum: {
            values: [
                'No Experience',
                '1 Year - 2 Years',
                '2 Years - 5 Years',
                '5 Years+'
            ],
            message: 'Please provide a valid option for the Experience!'
        }
    },
    salary: {
        type: Number,
        required: [true, 'Please enter an Expected Salary for this job!']
    },
    postingDate: {
        type: Date,
        default: Date.now()
    },
    expirationDate: {
        type: Date,
        default: new Date().setDate(new Date().getDate() + 7)
    },
    candidates: {
        type: [Object],
        select: false
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
});

// Creating Job slug before saving - Cannot use "this" in arrow functions
jobSchema.pre('save', function (next) {
    this.slug = slugify(this.title, { lower: true });
    next();
})

// Setting up location
jobSchema.pre('save', async function (next) {
    const loc = await geocoder.geocode(this.address);
    this.location = {
        type: 'Point',
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
        city: loc[0].city,
        state: loc[0].stateCode,
        country: loc[0].countryCode,
        zipcode: loc[0].zipcode
    };
})

module.exports = mongoose.model('Job', jobSchema);
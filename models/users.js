const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const catchAsyncErrors = require('../middlewares/catchAsyncErrors');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your Name!']
    },
    email: {
        type: String,
        required: [true, 'Please enter your Email Address!'],
        unique: true,
        validate: [validator.isEmail, 'Please enter a valid Email Address!']
    },
    role: {
        type: String,
        enum: {
            values: ['user', 'employer'],
            message: 'Please enter a valid Role!'
        },
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please enter a Password for your account!'],
        minLength: [8, 'Your Password must be at least 8 characters long'],
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

// Encrypting password before saving it
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    this.password = await bcrypt.hash(this.password, 10);
});

// Return JWT
userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRATION_TIME
    })
}

// Compare password with stored hash
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

// Generate Password Reset Token
userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    return resetToken;
}

// Show all Jobs created by the user
userSchema.virtual('publishedJobs', {
    ref: 'Job',
    localField: '_id',
    foreignField: 'user',
    justOne: false
})

module.exports = mongoose.model('User', userSchema);
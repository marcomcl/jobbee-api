const jwt = require('jsonwebtoken');
const User = require('../models/users');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');

// Check if the user is authenticated
exports.isAuthenticated = catchAsyncErrors(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(` `)[1];
    }

    if (!token) {
        return next(new ErrorHandler('Login before accessing this resource!', 401))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    next();
});

// Handling user roles
exports.authRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role ${req.user.role} is not allowed to access this resource!`, 403));
        }

        next();
    }
}
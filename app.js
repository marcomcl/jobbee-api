const express = require('express');
const app = express();

const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const databaseConnection = require('./config/database');
const errorMiddleware = require('./middlewares/errors');
const ErrorHandler = require('./utils/errorHandler');

// Getting the environment variables
dotenv.config({ path: './config/config.env' })

// Handling uncaught exceptions
process.on('uncaughtException', err => {
    console.log(`Error: ${err.message}`);
    console.log('Shutting down due to uncaught exception');

    process.exit(1);
});

// Connecting to the database
databaseConnection();

// Setup security headers
app.use(helmet());

// Setup body parser
app.use(express.json());

// Setup cookier parser
app.use(cookieParser());

// Setup file uploader
app.use(fileUpload());

// Setup mongo sanitizer
app.use(mongoSanitize());

// Setup XSS cleaner
app.use(xssClean());

// Prevent Parameter Pollution
app.use(hpp());

// Setup CORS
app.use(cors());

// Setup rate limiter
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100
})

app.use(limiter);

// Retrieving the port number from env
const PORT = process.env.PORT;

// Setting all routes
const jobs = require('./routes/jobs');
const auth = require('./routes/auth');
const users = require('./routes/users');

app.use('/api/v1', jobs);
app.use('/api/v1', auth);
app.use('/api/v1', users);

// Handling non existent routes
app.all('*', (req, res, next) => {
    next(new ErrorHandler(`${req.originalUrl} route not found!`, 404))
});

// Setup error middleware
app.use(errorMiddleware);

// Starting the server
const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${process.env.PORT} in ${process.env.NODE_ENV}`);
});

// Handling Unhandled Promise Rejections
process.on('unhandledRejection', err => {
    console.log(`Error: ${err.message}`)
    console.log(`Shutting down the server due to unhandled promise rejection`);

    server.close(() => {
        process.exit(1);
    });
});
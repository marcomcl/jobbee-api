// Create and send token + save to cookie
const sendToken = (user, statusCode, res) => {
    // Create JWT
    const token = user.getJwtToken();

    // Options for cookie
    const options = {
        expires: new Date(Date.now() + process.env.COOKIE_EXPIRATION_TIME * 24 * 3600 * 1000),
        httpOnly: true
    };

    // if (process.env.NODE_ENV === 'production ') {
    //     options.secure = true;
    // }

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token
        });
}

module.exports = sendToken;
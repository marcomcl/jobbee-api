const mongoose = require('mongoose');

const databaseConnection = () => {
    mongoose.connect(process.env.DB_LOCAL_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(con => {
        console.log(`MongoDB database with host: ${con.connection.host}`);
    });
};

module.exports = databaseConnection;
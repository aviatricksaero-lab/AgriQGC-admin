const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

console.log('Testing MongoDB connection...');
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('SUCCESS: Connected to MongoDB');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE: Could not connect to MongoDB');
        console.error(err);
        process.exit(1);
    });

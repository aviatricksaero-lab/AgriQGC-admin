const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(async () => {
        const users = await User.find().sort({ created_at: -1 }).limit(5);
        console.log('Latest 5 Users:');
        users.forEach(u => console.log(`- ${u.username} (${u.email}) created at ${u.created_at}`));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

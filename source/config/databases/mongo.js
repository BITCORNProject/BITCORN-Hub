/*

*/

"use strict";

const mongoose = require('mongoose');

const mongoDB = 'mongodb://localhost:27017/data-store';

exports.init = async () => {

    mongoose.set('useCreateIndex', true);
    mongoose.set('bufferCommands', false);

    const result = await mongoose.connect(mongoDB, { useNewUrlParser: true });
    
    exports.db = result.connection;
    
    exports.db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    
    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

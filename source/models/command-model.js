/*

*/

"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
     
const CommandModelSchema = new Schema({
    name: { 
        type: String, 
        lowercase: true, 
        trim: true, 
        unique: true,
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    prefix: {
        type: String,
        required: true,
        enum: [ '!', '$' ]
    }
});

module.exports = mongoose.model('CommandModel', CommandModelSchema);

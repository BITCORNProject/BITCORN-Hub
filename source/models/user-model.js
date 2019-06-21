/*

*/

"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
     
const UserModelSchema = new Schema({
    name: { 
        type: String, 
        lowercase: true, 
        trim: true, 
        unique: true,
        required: true 
    },
    display_name: { 
        type: String, 
        required: true 
    },
    tries: {
        type: Number,
        required: false
    },
    score: {
        type: Number,
        required: false
    }
});

module.exports = mongoose.model('UserModel', UserModelSchema);

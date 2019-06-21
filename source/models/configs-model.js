/*

*/

"use strict";

const { keys } = require('../../settings/access-levels');

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConfigsModelSchema = new Schema({
    key: {
        type: String,
        unique: true,
        index: true,
        default: function() {
            return this.prefix + this.name;
        }
    },
    name: {
        type: String,
        lowercase: true,
        trim: true,
        required: true
    },
    accessLevel: {
        type: String,
        required: true
    },
    cooldown: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    example: {
        type: String,
        required: true,
        default: function() {
            return this.prefix + this.name;
        }
    },
    prefix: {
        type: String,
        required: true,
        enum: ['!', '$']
    }
});

module.exports = mongoose.model('ConfigsModel', ConfigsModelSchema);

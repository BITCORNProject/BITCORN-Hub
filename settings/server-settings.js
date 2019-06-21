/*
    
*/

"use strict";

const JsonFile = require('../source/utils/json-file');

module.exports = new JsonFile('./settings/server-settings.json', {
    IRC_DELAY_MS: 150
});
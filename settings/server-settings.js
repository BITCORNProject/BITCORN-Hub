/*
    
*/

"use strict";

const JsonFile = require('../source/utils/json-file');

module.exports = new JsonFile('./settings/server-settings.json', {
    IRC_DELAY_MS: 150,
    MAX_RAIN_USER_CACHE: 25 * 1.4 // 35
});
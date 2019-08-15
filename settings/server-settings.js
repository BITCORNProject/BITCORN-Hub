/*
    
*/

"use strict";

const JsonFile = require('../source/utils/json-file');

module.exports = new JsonFile('./settings/server-settings.json', {
    IRC_DELAY_MS: 100,
    MAX_RAIN_USER_CACHE: 25 * 1.4, // 35
    MINUTE_AWARD_MULTIPLIER: 4.3333333333 // 4 mins 20 secs
});
/*
    
*/

"use strict";

const JsonFile = require('../source/utils/json-file');

module.exports = new JsonFile('./settings/server-settings.json', {
    IRC_DELAY_MS: 100,
    MAX_RAIN_USER_CACHE: 35,
    MAX_RAIN_USERS: 10,
    MIN_RAIN_AMOUNT: 25,
    MIN_TIPCORN_AMOUNT: 100,
    MINUTE_AWARD_MULTIPLIER: 4.3333333333
});
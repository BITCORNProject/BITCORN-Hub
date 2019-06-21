/*
    
*/

"use strict";

const JsonFile = require('../source/utils/json-file');

module.exports = new JsonFile('./settings/wallet-settings.json', {
    username: 'wallet_username',
    password: 'wallet_password',
    url: 'http://localhost:12511'
});
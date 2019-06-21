/*
    
*/

"use strict";

const JsonFile = require('../source/utils/json-file');

module.exports = new JsonFile('./settings/mysqlauth.json', {
    connectionLimit: 10,
    host: '192.168.1.2',
    user: 'adminuser',
    password: 'ghhh5545d3365233g55fddffgghjmnw',
    database: 'testbotdb'
});
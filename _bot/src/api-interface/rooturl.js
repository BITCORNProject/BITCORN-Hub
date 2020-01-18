/*

*/

"use strict";

const JsonFile = require('../utils/json-file');

module.exports = new JsonFile('./settings/rooturl.json', {
	base: 'https://database.notfound.api',
    transaction: 'api/tx',
	test: 'api/test',
	user: 'api/user',
	wallet: 'api/wallet/withdraw',
	errorlog: 'api/errorlog'
});

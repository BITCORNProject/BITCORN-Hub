
/*

*/

"use strict";
const fs = require('fs');
const assert = require('assert');
const fetch = require('node-fetch');

const walletSettings = require('../settings/wallet-settings');
const wallet = require('../source/config/wallet');
const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');
const kraken = require('../source/config/authorize/kraken');
const helix = require('../source/config/authorize/helix');
const databaseApi = require('../source/config/api-interface/database-api');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {

        var start = new Date().getTime();
        const result = await databaseApi.makeRequest('/token', {});
        console.log(`Ping Result: `, result);

        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(time0);
    } catch (error) {
        console.error(error);
    }
})();
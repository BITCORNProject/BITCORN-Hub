
/*

*/

"use strict";
const assert = require('assert');
const fetch = require('node-fetch');

const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');
const wallet = require('../source/config/wallet');

const { Timer } = require('../public/js/server/timer');
const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {
        const timer = new Timer();
        timer.start();

        const info = await wallet.makeRequest('listaccounts');
        console.log(info.json.result);
        if (info.json.result) {
            
        }

        timer.stop('Action Complete: ');

        assert(Ticker);
    } catch (error) {
        console.error(error);
    }
})();

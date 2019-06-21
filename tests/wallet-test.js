
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
        //getaccountaddress bitcornhub
        const { json } = await wallet.makeRequest('getbalance', [
            "bitcornhub"
        ]);
        
        console.log(json);
        if (json.result) {
        }

        timer.stop('Get Balance: ');
        /*const cttv = await wallet.makeRequest('getaccountaddress', [
            "callowcreation"
        ]);

        const { json } = await wallet.makeRequest('sendtoaddress', [
            cttv.json.result,
            5000,
            `bitcornhub tipped callowcreation`
        ]);

        console.log(json);
        if (json.result) {
        }*/


        assert(Ticker);
    } catch (error) {
        console.error(error);
    }
})();

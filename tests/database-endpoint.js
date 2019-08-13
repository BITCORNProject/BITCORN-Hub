
/*

*/

"use strict";
const fs = require('fs');
const assert = require('assert');
const fetch = require('node-fetch');
const crypto = require('crypto');

const walletSettings = require('../settings/wallet-settings');
const wallet = require('../source/config/wallet');
const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');
const kraken = require('../source/config/authorize/kraken');
const helix = require('../source/config/authorize/helix');

const databaseAPI = require('../source/config/api-interface/database-api');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {

        const amount = 1;
        //const {id: senderId, login: senderName} = await helix.getUserLogin('callowcreation');
        const {id: receiverId, login: receiverName} = await helix.getUserLogin('naivebot');

        const senderId = '123123123'
        const senderName = 'name123123123'
        const result = await databaseApi.criticalRequestTest(databaseApi.db_endpoints.data.tipcorn, senderId, {
            senderId, senderName, receiverId, receiverName, amount
        });

        console.log(result);

        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(request_result1);
    } catch (error) {
        console.error(error);
    }
})();

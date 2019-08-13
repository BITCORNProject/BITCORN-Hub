
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
const rooturl = require('../source/config/api-interface/rooturl');
const apiRequest = require('../source/config/api-interface/api-request');
const databaseApi = require('../source/config/api-interface/database-api');
const JsonFile = require('../source/utils/json-file');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {

        var start = new Date().getTime();
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
        

        assert(time0);
    } catch (error) {
        console.error(error);
    }
})();
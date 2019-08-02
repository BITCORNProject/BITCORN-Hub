
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

const databaseAPI = require('../source/config/api-interface/database-api');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {


        //const insertuser_result = await databaseAPI.insertuserRequest('5699696963', 'user0neqwerty0987');

        const amount = 100;//math.fixed8(1 / 1);

        const [{ id: twitchId, login: twitchUsername },
        { id: twitchId1, login: twitchUsername1 }] = await Promise.all([
            helix.getUserLogin('im_brett_k'),
            helix.getUserLogin('bitcornhub')
        ]);

        const { id: botId, login: botUsername } = await helix.getUserLogin('callowcreation');

        const recipients = [];

        const length = 5;
        for (let index = 0; index < length; index++) {
            if(index % 2) {
                recipients.push({
                    twitchId: twitchId,
                    twitchUsername: twitchUsername,
                    amount: amount
                });
            } else {
                recipients.push({
                    twitchId: twitchId1,
                    twitchUsername: twitchUsername1,
                    amount: amount
                });
            }
        }

        var start = new Date().getTime();
        const token = 'fklooocmmkliod8989783493999c899-hndmnjkckkm34-337888dxjsmnk4id89';
        const [request_result1] = await Promise.all([
            databaseAPI.bitcornRequest(twitchId, twitchUsername)
        ]);

        //request_result1.codeName = databaseAPI.PaymentCode().filter(x => x.code === request_result1.code)[0].name;

        if(request_result1.error) {
            console.error(request_result1.error);
            // No user in database?

        } else {
            console.log(request_result1);
            if(request_result1.twitchid) {

            }
        }

        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(request_result1);
    } catch (error) {
        console.error(error);
    }
})();

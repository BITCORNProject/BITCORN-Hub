
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
const tmi = require('../source/config/tmi');
const activityTracker = require('../source/activity-tracker');

const databaseAPI = require('../source/config/api-interface/database-api');

const { Ticker } = require('../public/js/server/ticker');


(async () => {
    try {

        const start = new Date().getTime();

        const chatternamesArr = activityTracker.getChatterActivity();
        console.log(chatternamesArr);

        const rain_user_count = 10;
        const rain_amount = 100;

        const items = chatternamesArr.slice(0, rain_user_count);
        const amount = math.fixed8(rain_amount / items.length);
        const recipients = items.map(x => ({ twitchId: x.id, twitchUsername: x.username, amount: amount }));
        
        console.log(recipients);

        const { id: twitchId, login: twitchUsername } = await helix.getUserLogin('callowcreation');
        const rain_result = await databaseAPI.rainRequest(recipients, twitchId, twitchUsername);
        
        console.log(rain_result);

        const end0 = new Date().getTime();
        const time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(time0);
    } catch (error) {
        console.error(error);
    }
})();


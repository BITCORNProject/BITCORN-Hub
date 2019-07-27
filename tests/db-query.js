
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

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {
// UPDATE users set sub='tier1' where username='user1' or username='user2' or username='user3' or
        var start = new Date().getTime();    

        const subs = await kraken.getChannelSubscribers();

        //ALTER TABLE tablename MODIFY columnname DECIMAL(12,8)

        const users = subs.result.subscriptions.map(x => `twitch_username=${mysql.escape(x.user.name)}`).join(' OR ');
        
        //console.log(subs);
        const from_result = await mysql.query(`SELECT * FROM users WHERE twitch_username='naivebot'`);

        console.log(from_result);

        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(time0);
    } catch (error) {
        console.error(error);
    }
})();

function chunk(array, size) {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size;
    }
    return chunked_arr;
}

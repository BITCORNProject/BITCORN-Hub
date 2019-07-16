
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
        /*const crypto = require('crypto');
        const buffer = crypto.randomBytes(16);
        const token = buffer.toString('hex');
        console.log(token);*/
        var start = new Date().getTime();
        
        //const from_result = await mysql.query(`UPDATE users SET twitterid = ''`);
        //const from_result = await mysql.query(`UPDATE users SET instagramid = ''`);
        //const from_result = await mysql.query(`ALTER table users add column (twitterid varchar(255))`);
        //const from_result = await mysql.query(`ALTER table users add column (instagramid varchar(255))`);
        
        //const from_result = await mysql.query(`SELECT * FROM users WHERE subtier <> '0000'`);
        //console.log(from_result);
/*
        const from_result = await mysql.query(`select * from txtracking where amount > 500000 and category <> 'send' order by amount`);

        const totals = [];
        let total = 0;
        for (let i = 0; i < from_result.length; i++) {
            const item = from_result[i];
            const amount = +item.amount;
            total += amount;
            totals.push(amount);
            console.log(item);
        }

        console.log('totals', totals);
        const avg = total / from_result.length;

        console.log(`total:${total} rows:${from_result.length} avg:${avg}`);
*/
        
        //const from_result = await mysql.query(`SELECT * FROM txtracking WHERE comment = 'Subscription Award' ORDER BY id DESC LIMIT 100`);
        //const update_from_result = await mysql.query(`UPDATE users SET balance = '140606.47562716' WHERE twitch_username = 'alphapool415'`);
        
        //const from_result = await mysql.query(`SELECT * FROM users WHERE balance = 'NAN'`);

        //const from_result = await mysql.query(`SELECT * FROM users`);
/*
        const file = 'notsomurican-activity.txt';

        fs.writeFileSync(file, '');
        for (let i = 0; i < from_result.length; i++) {
            const element = from_result[i];

            const msg = element.message.trim().split(' ').map(x => `${String.fromCharCode(x)}`).join('');
            console.log(msg);
            //id,twitch_username,message,td,channel
            fs.appendFileSync(file, `${element.td}: ${msg}\r`);
        }
        console.log(from_result);
*/
        /*for (let i = 0; i < from_result.length; i++) {
            const userrow = from_result[i];
            
            
            const { json } = await wallet.makeRequest('getbalance', [
                userrow.twitch_username
            ]);

            if(json.result) {
                const update_from_result = await mysql.query(`UPDATE users SET balance = '${json.result}' WHERE twitch_username = '${userrow.twitch_username}'`);
                console.log(update_from_result);
            }
        }*/


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

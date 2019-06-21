
/*

*/

"use strict";
const assert = require('assert');
const fetch = require('node-fetch');

const walletSettings = require('../settings/wallet-settings');
const wallet = require('../source/config/wallet');
const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');
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
        const from_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE 'flippinggp'`);
        //const from_result = await mysql.query(`SELECT * FROM users`);
/*
        for (let i = 0; i < from_result.length; i++) {
            const userrow = from_result[i];
            if(userrow.twitchid) continue;
            const twitchuser = await helix.getUserLogin(userrow.twitch_username);
            console.log(userrow.cornaddy, twitchuser);
            const update_twitchid_result = await mysql.query(`UPDATE users SET twitchid = '${twitchuser.id}' WHERE cornaddy LIKE '${userrow.cornaddy}'`);
        }
*/
        console.log(from_result);

        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(from_result);
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
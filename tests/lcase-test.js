
/*

*/

"use strict";
const assert = require('assert');
const fetch = require('node-fetch');

const wallet = require('../source/config/wallet');
const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {
        /*const crypto = require('crypto');
        const buffer = crypto.randomBytes(16);
        const token = buffer.toString('hex');
        console.log(token);*/
        var start = new Date().getTime();

        const result_update = mysql.query(`UPDATE users SET twitch_username = LOWER(twitch_username)`);
        
        const results = await Promise.all([result_update]);

        console.log(results);

        var end = new Date().getTime();
        var time = (end - start) / 1000;
        console.log('Execution time: ' + time);

        assert(results.length > 0);
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

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
        console.log((new Date()).toLocaleTimeString());
        Ticker.stop('sub-tier-awawd-ticker');

        assert(Ticker);
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
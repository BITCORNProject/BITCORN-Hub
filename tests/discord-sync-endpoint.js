
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
        var start = new Date().getTime();

        const url = `https://bitcorn-role-sync.azurewebsites.net/discord`;
        const discord_endpoint = await fetch(url, {
            method: 'GET'
        });

        console.log(discord_endpoint);
        console.log(`Sent Discord Sync ${await discord_endpoint.text()}`);

        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(discord_endpoint);
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
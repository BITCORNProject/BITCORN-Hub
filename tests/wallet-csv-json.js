
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

        var start = new Date().getTime();
        
        const filejson = require('../send_to_list.json');

        const file = 'wallet-rec-with-notsomurican.txt';
        
        fs.writeFileSync(file, '');
        for (let i = 0; i < filejson.length; i++) {
            const data = filejson[i];
            if(data.address === 'notsomurican') {
                fs.appendFileSync(file, `${data['Amount (CORN)']}\r`);
            }
        }

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

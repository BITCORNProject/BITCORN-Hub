
/*

*/

"use strict";
const assert = require('assert');
const fetch = require('node-fetch');

const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');
const wallet = require('../source/config/wallet');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {


        var start = new Date().getTime();
        const categories = {};

        const { json } = await wallet.makeRequest('listtransactions', 
        [
            "*",
            1000,
            1999
        ]);
        if (json.result) {

            //console.log(json.result);

            try {

                for (let i = 0; i < json.result.length; i++) {
                    const item = json.result[i];
                    const category = item['category'];
                    const account = item['account'];
                    const txid = item['txid'] ? item['txid'].replace("'", "").replace('"', '') : item['txid'];
                    const amount = +(item['amount']);
                    const comment = item['comment'] || 'tx';
                    const cornaddy = item['address'];
                    const timereceived = item['timereceived'];
                    const confirmations = item['confirmations'];

                    if(categories.hasOwnProperty(category) == false) categories[category] = 0;
                    categories[category]++;
                }

            } catch (e) {
                console.error(`TX-TRACKING-ERROR Error: ${e.message}`);
            }
        } else {
            console.log('No wallet found or command does not exists');
        }

        console.log(categories);

        var end = new Date().getTime();
        var time = (end - start) / 1000;
        console.log('transactionsCheck Execution time: ' + time);

         assert(Ticker);

    } catch (error) {
        console.error(error);
    }
})();

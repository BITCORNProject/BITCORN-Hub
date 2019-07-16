
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
        var start = new Date().getTime();
        const counter = {
            accounts: 0,
            registered: 0,
            updated: 0,
            balanced: {
                wallet: 0,
                database: 0
            },
            users: {}
        }
        const { json } = await wallet.makeRequest('listaccounts');

        /*const json = {
            result: {'clayman666': 0.0}
        };*/

        console.log(json);

        for (const account in json.result) {
            if (json.result.hasOwnProperty(account)) {
                const amount = json.result[account];

                counter.accounts++;
                counter.users[account] = {};

                console.log('-> account', account);
                const getaccountaddress = await wallet.makeRequest('getaccountaddress', [account]);
                console.log('--> getaccountaddress', getaccountaddress);
                
                counter.users[account].getaccountaddress = getaccountaddress;

                try {
                    const test_select_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${account}'`);
                    console.log('> test_select_result <', test_select_result);
                } catch (error) {
                    console.error(error);
                    continue;
                }

                const select_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${account}'`);
                console.log('--> select_result', select_result);

                counter.users[account].select_result = select_result;

                if(select_result.length === 0) {
                    const insert_to_result = await mysql.query(`INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar,subtier,twitchid,twitterid,instagramid) VALUES (NULL,'NA','${account}','${getaccountaddress.json.result}','${amount}','NA','1000','NA','','','','')`);
                    console.log('---> insert_to_result', insert_to_result);

                    counter.users[account].insert_to_result = insert_to_result;

                    await mysql.logit('Registered Address', `Inserted Registered by bitcornhub`);

                    counter.registered++;

                } else {
                    const update_to_result = await mysql.query(`UPDATE users SET cornaddy = '${getaccountaddress.json.result}' WHERE twitch_username LIKE '${account}'`);
                    console.log('---> update_to_result', update_to_result);

                    counter.users[account].update_to_result = update_to_result;

                    await mysql.logit('Updates Address', `Updated Registered by bitcornhub`);

                    counter.updated++;
                    
                    if(amount < select_result[0].balance) {
                        const setbalance = select_result[0].balance - amount;
                        const moveto = await wallet.makeRequest('move', ['bitcornhub', account, setbalance]);
                        console.log('----> moveto', moveto);
                        counter.users[account].moveto = moveto;

                        counter.balanced.wallet++;
                    } else if(amount > select_result[0].balance) {
                        const balance_update_result = await mysql.query(`UPDATE users SET balance = '${amount}' WHERE twitch_username LIKE '${account}'`);
                        console.log('----> balance_update_result', balance_update_result);

                        counter.users[account].balance_update_result = balance_update_result;

                        counter.balanced.database++;
                    } else {
                        console.log('-----> balanced');
                    }
                }
                
                const changes_select_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${account}'`);
                console.log('----> changes_select_result', changes_select_result);

                counter.users[account].changes_select_result = changes_select_result;
            }
        }

        console.log(counter);

        var end = new Date().getTime();
        var time = (end - start) / 1000;
        console.log('Execution time: ' + time);

        assert(counter.accounts > 0);
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
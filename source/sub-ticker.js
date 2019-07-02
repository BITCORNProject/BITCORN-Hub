/*

*/

"use strict";

const fetch = require('node-fetch');
const mysql = require('./config/databases/mysql');
const kraken = require('./config/authorize/kraken');
const math = require('../source/utils/math');
const auth = require('../settings/auth');
const wallet = require('./config/wallet');

const { Timer } = require('../public/js/server/timer');
const { Ticker } = require('../public/js/server/ticker');

const sub_tier_award_ticker_name = 'sub-tier-awawd-ticker';

const MINUTE_AWARD_MULTIPLIER = 4.333333333333333;

let viewers = [];

const sub_plans_bitcorn = {
    '1000': math.fixed8(0.25 * MINUTE_AWARD_MULTIPLIER),
    '2000': math.fixed8(0.50 * MINUTE_AWARD_MULTIPLIER),
    '3000': math.fixed8(1.00 * MINUTE_AWARD_MULTIPLIER)
};

const tiers = {
    '1000': '1',
    '2000': '2',
    '3000': '3'
};

async function tickBitCornSub(limit = 100) {

    const timer = new Timer();

    timer.start();
    const viewers_count = viewers.length;
    //console.log(`Sub tier ticker for ${viewers_count} viewers`);

    const walletSend = {
        batch: {},
        count: 0,
        total: 0
    };
    
    const update_reset_result = await mysql.query(`UPDATE users SET subtier = '0000'`);

    let currentIndex = 0;
    let maxIndex = 1;
    let total = 0;
    const updated_users_success = [];
    const updated_users_failed = [];
    while (currentIndex < maxIndex) {
        const offset = limit * currentIndex;
        const subChunk = await kraken.getLimitedSubscribers(limit, offset);
        if (subChunk.success === false) break;
        for (let i = 0; i < subChunk.result.subscriptions.length; i++) {
            const subscription = subChunk.result.subscriptions[i];

            const index = viewers.indexOf(subscription.user.name);
            if (index === -1) continue;
            viewers.splice(index, 1);
            const to_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${subscription.user.name}'`);
            if (to_result.length === 0) continue;
            const amount = +sub_plans_bitcorn[subscription.sub_plan];
            const tier = tiers[subscription.sub_plan];
            const to_final_balance = math.fixed8(+(to_result[0].balance)) + amount;
            const update_from_result = await mysql.query(`UPDATE users SET balance = '${to_final_balance}' WHERE cornaddy LIKE '${to_result[0].cornaddy}'`);
            const update_subtier_result = await mysql.query(`UPDATE users SET subtier = '${subscription.sub_plan}' WHERE cornaddy LIKE '${to_result[0].cornaddy}'`);
            const update_twitchid_result = await mysql.query(`UPDATE users SET twitchid = '${subscription.user._id}' WHERE cornaddy LIKE '${to_result[0].cornaddy}'`);

            if (update_from_result.affectedRows === 1) {
                updated_users_success.push({
                    username: subscription.user.name, 
                    amount: amount,
                    tier: tier
                });
                
                walletSend.batch[to_result[0].cornaddy] = math.fixed8(amount);
                walletSend.total += math.fixed8(amount);
                walletSend.count++;
            } else {
                updated_users_failed.push(`${subscription.user.name} ${subscription.sub_plan} ${to_final_balance}`);
            }

            //await new Promise(resolve => setTimeout(resolve, 100));
        }

        currentIndex++;
        total = subChunk.result._total;
        maxIndex = Math.ceil(subChunk.result._total / limit);
    }

    timer.stop(`Sub tier ticker complete ${walletSend.total} CORN for ${walletSend.count} time: `);

    const { json } = await wallet.makeRequest('sendmany', [
        "bitcornhub",
        walletSend.batch,
        0,
        `CTTV paid ${walletSend.total} CORN for ${walletSend.count} idling subscribers.`
    ]);

    if (json.result) {
        const txid = json.result;
        const txtracking_result = await mysql.query(`INSERT INTO txtracking (id,account,amount,txid,address,confirmations,category,timereceived,comment) VALUES (NULL,'CTTV','${math.fixed8(walletSend.total)}','${txid}','','0','receive','${mysql.timestamp()}','Subscription Award')`);
        if(txtracking_result.affectedRows === 0) {
            console.error(`CTTV payout award failed to record tracking awards for: ${walletSend.total} CORN for ${walletSend.count} idling subscribers ${txid}`);
        }
    }
    
    console.log(`${(new Date()).toLocaleTimeString()} Finished ${total} subtier maxIndex=${maxIndex} success=${updated_users_success.length} failed=${updated_users_failed.length} [start=${viewers_count} of end=${viewers.length} total=${viewers_count - viewers.length}]`);
}

async function init() {

    const timeValues = {
        SECOND: 1000,
        MINUTE: 1000 * 60,
    }

    Ticker.stop(sub_tier_award_ticker_name);
    Ticker.remove(sub_tier_award_ticker_name);

    const tierticker = new Ticker(sub_tier_award_ticker_name, timeValues.MINUTE * MINUTE_AWARD_MULTIPLIER, async function () { // 10 mins
        const url = `https://tmi.twitch.tv/group/user/${auth.data.CHANNEL_NAME}/chatters`;
        const chatters_result = await fetch(url);
        const chatters_json = await chatters_result.json();
        viewers = [];
        for (const key in chatters_json) {
            const chatters = chatters_json[key];
            for (const k in chatters) {
                if (k === 'broadcaster') continue;
                viewers = viewers.concat(chatters[k]);
            }
        }

        const limit = 100;
        await tickBitCornSub(limit);

    });
    tierticker.start();

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;

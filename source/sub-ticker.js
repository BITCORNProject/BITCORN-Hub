/*

*/

"use strict";

const fs = require('fs');

const fetch = require('node-fetch');
const mysql = require('./config/databases/mysql');
const kraken = require('./config/authorize/kraken');
const math = require('../source/utils/math');
const auth = require('../settings/auth');
const wallet = require('./config/wallet');
const txMonitor = require('./tx-monitor');

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
/*


        const subticker_response =
        {
            balance: 100,
            amount: 0,
            code: 1,
            twitchId: "403023969",
            twitchUsername: "bitcornhub",
            recipientResponses: [
                {
                    amount: 1,
                    code: 1,
                    twitchId: "403023969",
                    twitchUsername: "bitcornhub"
                }
            ]
        }

        const data = [
            {
                twitchId: senderId,
                twitchUsername: senderName,
                amount: math.fixed8(0.25),
                subtier: '1000'
            },
            {
                twitchId: receiverId,
                twitchUsername: receiverName,
                amount: math.fixed8(1.25),
                subtier: '2000'
            },
        ];

*/
async function tickBitCornSub(limit = 100) {

    const timers = {
        tval: 0,
        total: new Timer()
    };
    timers.total.start();

    const walletSend = {
        batch: {},
        subscribers: [],
        count: 0,
        total: 0
    };

    // ----------------------------
    timers.get_all_subs = new Timer();
    timers.get_all_subs.start();

    let currentIndex = 0;
    let maxIndex = 1;
    let total = 0;
    let subscriptions = [];
    while (currentIndex < maxIndex) {
        const offset = limit * currentIndex;
        const subChunk = await kraken.getLimitedSubscribers(limit, offset);
        if (subChunk.success === false) break;
        subscriptions = subscriptions.concat(subChunk.result.subscriptions);

        currentIndex++;
        total = subChunk.result._total;
        maxIndex = Math.ceil(subChunk.result._total / limit);
    }

    if (subscriptions.length === 0) {
        return;
    }

    timers.tval = timers.get_all_subs.stop();
    console.log(`Get all subscriptions from Twitch API ${total} count - Process Time: ${timers.tval}`);

    // ----------------------------

    timers.update_subtier = new Timer();
    timers.update_subtier.start();

    const update_reset_result = await mysql.query(`UPDATE users SET subtier = '0000' WHERE subtier <> '0000'`);
    timers.tval = timers.update_subtier.stop();
    console.log(`Reset db subtier ${update_reset_result.affectedRows} count - Process Time: ${timers.tval}`);

    // ----------------------------

    timers.set_sub_tiers = new Timer();
    timers.set_sub_tiers.start();
    const fileNoDbEntry = 'entry-errors\\subs-not-in-database.txt';
    const fileManyDbEntry = 'entry-errors\\subs-many-database-entries.txt';
    fs.writeFileSync(fileNoDbEntry, '');
    fs.writeFileSync(fileManyDbEntry, '');

    let select_subtier_results = [];

    const users = [
        {sub_plan: '1000', namestring: subscriptions.filter(x => x.sub_plan === '1000').map(x => `twitch_username=${mysql.escape(x.user.name)}`).join(' OR ')},
        {sub_plan: '2000', namestring: subscriptions.filter(x => x.sub_plan === '2000').map(x => `twitch_username=${mysql.escape(x.user.name)}`).join(' OR ')},
        {sub_plan: '3000', namestring: subscriptions.filter(x => x.sub_plan === '3000').map(x => `twitch_username=${mysql.escape(x.user.name)}`).join(' OR ')}
    ];
    
    for (let i = 0; i < users.length; i++) {
        const {sub_plan, namestring} = users[i];
        const update_result = await mysql.query(`UPDATE users SET subtier = '${sub_plan}' WHERE ${namestring}`);
        select_subtier_results = select_subtier_results.concat(update_result);
    }

    timers.tval = timers.set_sub_tiers.stop();
    console.log(`Updated sub tiers ${select_subtier_results.length} in the db - Process Time: ${timers.tval}`);

    // ----------------------------

    timers.discord_sync_send = new Timer();
    timers.discord_sync_send.start();

    const url = `https://bitcorn-role-sync.azurewebsites.net/discord`;
    const discord_endpoint = await fetch(url, {
        method: 'GET'
    });

    timers.tval = timers.discord_sync_send.stop();

    console.log(`Sent Discord Sync ${await discord_endpoint.text()} - Process Time: ${timers.tval}`);

    // ----------------------------

    timers.get_chat_subs = new Timer();
    timers.get_chat_subs.start();

    const from_result = await mysql.query(`SELECT * FROM users WHERE subtier <> '0000'`);
    //console.log("from_result subtier <> '0000'", from_result);
    for (let i = 0; i < viewers.length; i++) {

        const lookupsub = subscriptions.filter(x => x.user.name === viewers[i]);
        if (lookupsub.length === 0) continue;

        const subscription = lookupsub[0];
        const to_result = from_result.filter(x => x.twitch_username === subscription.user.name);
        if (to_result.length === 0) continue;

        const amount = +sub_plans_bitcorn[subscription.sub_plan];
        walletSend.batch[to_result[0].cornaddy] = math.fixed8(amount);
        walletSend.subscribers.push({ subscription, amount, cornaddy: to_result[0].cornaddy });
        walletSend.total += math.fixed8(amount);
        walletSend.count++;
    }

    timers.tval = timers.get_chat_subs.stop();
    console.log(`Wallet batch prepared ${walletSend.total} CORN for ${walletSend.count} subs - Process Time: ${timers.tval}`);

    // ----------------------------

    timers.send_batch_payout = new Timer();
    timers.send_batch_payout.start();

    const sendmany = await wallet.makeRequest('sendmany', [
        "bitcornhub",
        walletSend.batch,
        16,
        `CTTV paid ${walletSend.total} CORN for ${walletSend.count} idling subscribers.`
    ]);

    if (sendmany.json.error) {
        await mysql.logit('Wallet Error', JSON.stringify({ method: 'sendmany', command: `sub-ticker`, error: sendmany.json.error }));

        console.error(`something went wrong with sub-ticker, please report it`);
    } else {

        for (let i = 0; i < walletSend.subscribers.length; i++) {
            const { subscription, amount, cornaddy } = walletSend.subscribers[i];

            txMonitor.monitorInsert({
                account: subscription.user.name,
                amount: math.fixed8(amount),
                txid: sendmany.json.result,
                cornaddy: cornaddy,
                confirmations: '0',
                category: 'receive',
                timereceived: mysql.timestamp(),
                comment: `Subscription Award to ${subscription.user.name} for idle`
            });
        }

        const getaccountaddress = await wallet.makeRequest('getaccountaddress', ['bitcornhub']);

        if (getaccountaddress.json.error) {
            await mysql.logit('Wallet Error', JSON.stringify({ method: 'getaccountaddress', command: `sub-ticker`, error: getaccountaddress.json.error }));

            console.error(`something went wrong with sub-ticker, please report it`);
        }

        txMonitor.monitorInsert({
            account: 'bitcornhub',
            amount: math.fixed8(walletSend.total),
            txid: sendmany.json.result,
            cornaddy: getaccountaddress.json.result,
            confirmations: '0',
            category: 'send',
            timereceived: mysql.timestamp(),
            comment: `Subscription Award for ${walletSend.count} idle subscribers`
        });
    }

    timers.tval = timers.send_batch_payout.stop();

    console.log(`Finished subtier ticker - Process Time: ${timers.tval}`);

    // ----------------------------
    timers.tval = timers.total.stop();
    console.log(`${(new Date()).toLocaleTimeString()} Sub ticker completed - Process ${Object.keys(timers).length - 2} Time: ${timers.tval}`);
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

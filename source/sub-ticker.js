/*

*/

"use strict";

const fetch = require('node-fetch');
const tmi = require('../source/config/tmi');
const kraken = require('./config/authorize/kraken');
const helix = require('./config/authorize/helix');
const math = require('../source/utils/math');
const auth = require('../settings/auth');
const errorLogger = require('../source/utils/error-logger');
const databaseAPI = require('./config/api-interface/database-api');
const serverSettings = require('../settings/server-settings');

const { Timer } = require('../public/js/server/timer');
const { Ticker } = require('../public/js/server/ticker');

const sub_tier_award_ticker_name = 'sub-tier-awawd-ticker';

const MINUTE_AWARD_MULTIPLIER = serverSettings.getValues().MINUTE_AWARD_MULTIPLIER;

const sub_plans_bitcorn = {
    '1000': math.fixed8(0.25 * MINUTE_AWARD_MULTIPLIER),
    '2000': math.fixed8(0.50 * MINUTE_AWARD_MULTIPLIER),
    '3000': math.fixed8(1.00 * MINUTE_AWARD_MULTIPLIER)
};

let viewers = [];

async function asyncTickBitCornSub(limit = 100) {

    const timers = {
        tval: 0,
        total: new Timer()
    };
    timers.total.start();

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
    //console.log(`Get all subscriptions from Twitch API ${total} count - Process Time: ${timers.tval}`);

    // ----------------------------

    timers.get_chat_subs = new Timer();
    timers.get_chat_subs.start();

    const recipients = [];
    for (let i = 0; i < viewers.length; i++) {

        const lookupsub = subscriptions.filter(x => x.user.name === viewers[i]);
        if (lookupsub.length === 0) continue;

        const subscription = lookupsub[0];

        recipients.push({
            id: subscription.user._id,
            amount: math.fixed8((+sub_plans_bitcorn[subscription.sub_plan]))
        });
    }

    timers.tval = timers.get_chat_subs.stop();
    //console.log(`Prepared ${recipients.length} subs - Process Time: ${timers.tval}`);

    // ----------------------------

    timers.get_payout_response = new Timer();
    timers.get_payout_response.start();

    const { id: twitchId, login: twitchUsername } = await helix.getUserLogin(auth.data.BOT_USERNAME);
    const subticker_result = await databaseAPI.subtickerRequest(recipients, twitchId);

    //console.log(subticker_result);

    let serverConnected = !((!subticker_result.senderResponse && subticker_result.status) && subticker_result.status !== 200);
    let recipientLength = 0;

    if (serverConnected) {
        //console.log(subticker_result.senderResponse.code);

        switch (subticker_result.senderResponse.code) {
            case databaseAPI.paymentCode.Success:
                const balanceChange = Math.abs(subticker_result.senderResponse.balanceChange);
                //console.log(`Sub ticker payout ${balanceChange} to ${subticker_result.recipientResponses.length} subscribers`);
                break;
            default:

                const sendData = {
                    twitchId: twitchId,
                    twitchUsername: twitchUsername,
                    command: 'sub-ticker'
                };
                const error = await errorLogger.asyncLogError(
                    sendData,
                    subticker_result.senderResponse.code,
                    `Something went wrong with the subticker`,
                    {
                        viewers: viewers.length,
                        subscriptions: subscriptions.length,
                        recipients: recipients.length
                    });

                console.error(error);
        }
        recipientLength = subticker_result.recipientResponses.length;
    }

    timers.tval = timers.get_payout_response.stop();
    //console.log(`Response from payout ${recipientLength} subs - Process Time: ${timers.tval}`);

    // ----------------------------
    if (serverConnected) {
        timers.discord_sync_send = new Timer();
        timers.discord_sync_send.start();

        const url = `https://twitch-api-sync.azurewebsites.net/subsync`;
        const discord_endpoint = await fetch(url, {
            method: 'POST'
        });

        timers.tval = timers.discord_sync_send.stop();

        console.log(`Sent Discord Sync ${await discord_endpoint.text()} `);
        //console.log(`Finished subtier ticker - Process Time: ${timers.tval}`);
    } else {
        console.log(`Can not connect to API server for sub ticker`);
    }

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

    const tierticker = new Ticker(sub_tier_award_ticker_name, timeValues.MINUTE * MINUTE_AWARD_MULTIPLIER, async function () {
        const url = `https://tmi.twitch.tv/group/user/${tmi.mainChannel()}/chatters`;
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
        await asyncTickBitCornSub(limit);
    });
    tierticker.start();

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;

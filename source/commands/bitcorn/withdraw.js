/*

*/

'use strict';

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');
const txMonitor = require('../../tx-monitor');
const databaseAPI = require('../../config/api-interface/database-api');

const Pending = require('../../utils/pending');

const pending = new Pending('withdraw');

module.exports = Object.create({
    configs: {
        name: 'withdraw',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Withraw your funds off the bot :: Commands do not work in Direct Messages',
        example: '$withdraw <amount> <address>',
        prefix: '$',
        whisper: true,
        enabled: true
    },
    async execute(event) {

        if (pending.started(event)) return pending.reply(event, tmi);

        if(!event.configs.enabled) {
            const reply = `@${event.user.username}, ${event.configs.prefix}${event.configs.name} down for MEGASUPERUPGRADES - INJECTING STEROIDS INTO SOIL 4 cttvPump cttvCorn`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        try {
            const withdraw_amount = +(event.args[0] ? event.args[0].replace('<', '').replace('>', '') : 0);
            //IMPORTANT: Do not .toLowerCase() the address is case sensitive
            const to_cornaddy = (event.args[1] ? event.args[1].replace('@', '').replace('<', '').replace('>', '') : '');

            if (withdraw_amount <= 0) {
                const reply = `@${event.user.username}, can not withdraw a negative or zero amount - $withdraw <amount> <address>`;
                tmi.botWhisper(event.user.username, reply);
                return pending.complete(event, reply);
            }

            if(!to_cornaddy) {
                const reply = `Can not withdraw without a cornaddy - $withdraw <amount> <address>`;
                tmi.botWhisper(event.user.username, reply);
                return pending.complete(event, reply);
            }

            const twitchId = event.user['user-id'];
            const twitchUsername = event.user.username;

            const withdraw_result = await databaseAPI.withdrawRequest(twitchId, twitchUsername, withdraw_amount, to_cornaddy);

            switch (withdraw_result.code) {
                case databaseAPI.walletCode.QueryFailure: {
                    const reply = `You failed to withdraw: @${withdraw_result.content.twitchUsername} you need to register with the $bitcorn command to use withdraw`;
                    tmi.botSay(event.target, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.walletCode.InsufficientFunds: {
                    const reply = `You failed to withdraw: insufficient funds`;
                    tmi.botWhisper(withdraw_result.content.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.walletCode.Success: {
                    const reply = `You have successfully withdrawn BITCORN off of your Twitch Wallet Address: https://explorer.bitcornproject.com/tx/${withdraw_result.content.txid}`;
                    tmi.botWhisper(withdraw_result.content.twitchUsername, reply);
                    return pending.complete(event, reply);
                } default: {
                    const reply = `You failed to withdraw, please report this code: ${withdraw_result.code}`;
                    tmi.botWhisper(withdraw_result.content.twitchUsername, reply);
                    return pending.complete(event, reply);
                }
            }
        } catch (error) {
            const reply = `Something went wrong please report this: ${error}`;
            return pending.complete(event, reply);
        }
    }
});
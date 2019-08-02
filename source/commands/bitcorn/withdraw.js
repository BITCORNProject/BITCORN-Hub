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
        whisper: true
    },
    async execute(event) {
        /*
        
        code:1
        content:{
        
        twitchId:"75987197"
        twitchUsername: "username"
        txid:"277434b972de256877389e2c09b6a63b94230a5552a68ab0ef08200f96d7f638"
        userExists:true
            }
        
        
        */
        tmi.botSay(event.target, `@${event.user.username}, ${event.configs.prefix}${event.configs.name} system is currently under construction cttvDump System will return soon! cttvDump`);
        return { success: false, event };

        if (pending.started(event)) return pending.reply(event, tmi);

        const withdraw_amount = +(event.args[0] ? event.args[0].replace('<', '').replace('>', '') : 0);
        // Do not .toLowerCase() the address is case sensitive
        const to_cornaddy = (event.args[1] ? event.args[1].replace('@', '').replace('<', '').replace('>', '') : '');

        if (withdraw_amount <= 0) {
            const reply = `@${event.user.username}, can not withdraw a negative or zero amount`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }


        const withdraw_result = await databaseAPI.withdrawRequest(twitchId, twitchUsername, withdraw_amount, to_cornaddy);

        switch (withdraw_result.senderResponse.code) {
            case databaseAPI.paymentCode.QueryFailure:
                tmi.botSay(event.target, `@${withdraw_result.senderResponse.twitchUsername} You need to register with the $bitcorn command to request a token`);
                break;
            case databaseAPI.paymentCode.InsufficientFunds:
                tmi.botSay(event.target, `You failed to withdraw: InsufficientFunds ${withdraw_result.senderResponse.userBalance}`);
                break;
            case databaseAPI.paymentCode.Success:
                tmi.botWhisper(withdraw_result.senderResponse.twitchUsername, `You have successfully withdrawn ${withdraw_result.senderResponse.twitchUsername} BITCORN off of your Twitch Wallet Address: https://explorer.bitcornproject.com/tx/${withdraw_result.senderResponse.txid}`);
                break;
            default:
                tmi.botWhisper(event.user.username, `You failed to withdraw, please report this: code: ${withdraw_result.senderResponse.code}`);
                break;
        }
        return pending.complete(event);
    }
});
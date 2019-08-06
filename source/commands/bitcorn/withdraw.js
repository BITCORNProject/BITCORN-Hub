/*

*/

'use strict';

const fs = require('fs');
const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
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

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {
            
            cmdHelper.throwIfCondition(event, !cmdHelper.isNumber(event.args[0]), {
                method: cmdHelper.message.notnumber, 
                params: {configs: event.configs},
                reply: cmdHelper.reply.respond
            });

            const withdraw_amount = cmdHelper.clean.amount(event.args[0]);
            //IMPORTANT: Do not .toLowerCase() the address is case sensitive
            const to_cornaddy = cmdHelper.clean.at(event.args[1]);

            cmdHelper.throwIfCondition(event, withdraw_amount <= 0, {
                method: cmdHelper.message.nonegitive, 
                params: {configs: event.configs},
                reply: cmdHelper.reply.whisper
            });

            cmdHelper.throwIfCondition(event, withdraw_amount > databaseAPI.MAX_AMOUNT, {
                method: cmdHelper.message.maxamount, 
                params: {configs: event.configs},
                reply: cmdHelper.reply.whisper
            });

            cmdHelper.throwIfCondition(event, !to_cornaddy, {
                method: cmdHelper.message.cornaddyneeded, 
                params: {configs: event.configs},
                reply: cmdHelper.reply.whisper
            });

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const withdraw_result = await databaseAPI.withdrawRequest(twitchId, twitchUsername, withdraw_amount, to_cornaddy);
            
            cmdHelper.throwIfCondition(event, withdraw_result.status && withdraw_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: {configs: event.configs, status: withdraw_result.status},
                reply: cmdHelper.reply.whisper
            });

            switch (withdraw_result.code) {
                case databaseAPI.walletCode.QueryFailure: {
                    const reply = `You failed to withdraw: @${withdraw_result.content.twitchUsername} you need to register with the $bitcorn command to use withdraw`;
                    tmi.botWhisper(event.target, reply);
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
            if (error.hasMessage) return pending.complete(event, error.message);
    
            const reply = `Command error in ${event.configs.prefix}${event.configs.name}, please report this: ${error}`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }
    }
});
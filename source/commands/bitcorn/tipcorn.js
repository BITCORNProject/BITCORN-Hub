/*

*/

'use strict';

const fs = require('fs');
const tmi = require('../../config/tmi');
const helix = require('../../config/authorize/helix');
const databaseAPI = require('../../config/api-interface/database-api');
const math = require('../../utils/math');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending('tipcorn');

module.exports = Object.create({
    configs: {
        name: 'tipcorn',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Tips a user with bitcorn',
        example: '$tipcorn <amount> <username>',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.started(event)) return pending.reply(event, tmi);

        if(!event.configs.enabled) {
            const reply = `@${event.user.username}, ${cmdHelper.message.enabled(event.configs)}`;
            tmi.botRespond(event.type, event.target, reply);
            return pending.complete(event, reply);
        }

        const allowed_testers = fs.readFileSync('command_testers.txt', 'utf-8').split('\r\n').filter(x => x);
        if(allowed_testers.indexOf(event.user.username) === -1) {
            if(allowed_testers.length > 0) { 
                const reply = `@${event.user.username}, ${cmdHelper.message.enabled(event.configs)}`;
                tmi.botRespond(event.type, event.target, reply);
                return pending.complete(event, reply);
            }
        } 

        try {

            if(!cmdHelper.isNumber(event.args[0])) {
                const reply = `@${event.user.username} here is an example of the command - ${event.configs.example}`;
                tmi.botRespond(event.type, event.target, reply);
                return pending.complete(event, reply);
            }

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const receiverName = cmdHelper.clean.atLower(event.args[1]);
            const tipcorn_amount = cmdHelper.clean.amount(event.args[0]);

            if (tipcorn_amount <= 0) {
                // ask timkim for conformation on this response
                const reply = `@${event.user.username}, can not ${event.configs.name} zero negative amount - ${event.configs.example}`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            }

            if (receiverName === '') {
                // ask timkim for conformation on this response
                const reply = `@${event.user.username}, you must ${event.configs.name} someone - ${event.configs.example}`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            }

            const { id: receiverId } = await helix.getUserLogin(receiverName);
            if (!receiverId) {
                const reply = `cttvMOONMAN Here's a tip for you: @${event.user.username}, ${receiverName} who? cttvMOONMAN`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            }

            const tipcorn_result = await databaseAPI.tipcornRequest(twitchId, twitchUsername, receiverId, receiverName, tipcorn_amount);
            if (tipcorn_result.status && tipcorn_result.status !== 200) {
                const reply = `Can not connect to server ${event.configs.prefix}${event.configs.name} failed, please report this: status ${tipcorn_result.status}`;
                tmi.botWhisper(event.user.username, reply);
                return pending.complete(event, reply);
            }

            switch (tipcorn_result.senderResponse.code) {
                case databaseAPI.paymentCode.InternalServerError: {
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report it: code ${tipcorn_result.senderResponse.code}`;
                    tmi.botWhisper(tipcorn_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.InvalidPaymentAmount: {
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report it: code ${tipcorn_result.senderResponse.code}`;
                    tmi.botWhisper(tipcorn_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.DatabaseSaveFailure: {
                    // ask timkim for conformation on this response
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report it: code ${tipcorn_result.senderResponse.code}`;
                    tmi.botWhisper(tipcorn_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.NoRecipients: {
                    let reply = `@${tipcorn_result.senderResponse.twitchUsername}, is not a registered user: code ${tipcorn_result.senderResponse.code}`;
                    reply = `cttvMOONMAN Here's a tip for you: ${reply}. cttvMOONMAN`;
                    tmi.botSay(event.target, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.InsufficientFunds: {
                    // ask timkim for conformation on this response
                    const reply = `You do not have enough in your balance! (${tipcorn_result.senderResponse.userBalance} CORN)`;
                    tmi.botWhisper(tipcorn_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.QueryFailure: {
                    let reply = `@${tipcorn_result.senderResponse.twitchUsername}, you need to register and deposit / earn BITCORN in order to use tip!`;
                    reply = `cttvMOONMAN Here's a tip for you: ${reply}. cttvMOONMAN`; // LOL nice!
                    tmi.botSay(event.target, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.Success: {
                    const totalTippedAmount = Math.abs(tipcorn_result.senderResponse.balanceChange);

                    const recipientResponse = tipcorn_result.recipientResponses[0];
                    const msg = `You received ${recipientResponse.amount} BITCORN from ${tipcorn_result.senderResponse.twitchUsername}!`;
                    tmi.botWhisper(recipientResponse.twitchUsername, msg);

                    tmi.botSay(event.target, `cttvCorn ${tipcorn_result.senderResponse.twitchUsername} just slipped ${recipientResponse.twitchUsername} ${totalTippedAmount} BITCORN with a FIRM handshake. cttvCorn`);
                    tmi.botWhisper(tipcorn_result.senderResponse.twitchUsername, `You tipped ${recipientResponse.twitchUsername} ${totalTippedAmount} BITCORN! Your BITCORN balance remaining is: ${tipcorn_result.senderResponse.userBalance}`);
                    const reply = `User: ${tipcorn_result.senderResponse.twitchUsername} tipped ${totalTippedAmount} CORN to ${recipientResponse.twitchUsername} user`;
                    return pending.complete(event, reply);
                } default: {
                    // ask timkim for conformation on this response
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report this: code ${tipcorn_result.senderResponse.code}`;
                    tmi.botWhisper(tipcorn_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                }
            }
        } catch (error) {
            const reply = `Command error in ${event.configs.prefix}${event.configs.name}, please report this: ${error}`;
            return pending.complete(event, reply);
        }

    }
});
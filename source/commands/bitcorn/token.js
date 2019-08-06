/*

*/

"use strict";

const fs = require('fs');
const crypto = require('crypto');
const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending('token');

module.exports = Object.create({
    configs: {
        name: 'token',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Receive a Token to log in to our Bot\'s API',
        example: '$token',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.started(event)) return pending.reply(event, tmi);

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {

            const buffer = crypto.randomBytes(16);
            const token = buffer.toString('hex');

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const token_result = await databaseAPI.tokenRequest(token, twitchId, twitchUsername);

            cmdHelper.throwIfCondition(event, token_result.status && token_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: {configs: event.configs, status: token_result.status},
                reply: cmdHelper.reply.whisper
            });

            if (token_result.isSuccess === true) {
                const reply = `Your Token is '${token}' (no ' ' quotes) - Use this to login here: https://dashboard.bitcornproject.com/ - If you use $token again you will receive a new token your old token will be deleted.`;
                tmi.botWhisper(token_result.twitchUsername, reply);
                return pending.complete(event, reply);
            } else if (token_result.userExists === false) {
                const reply = `@${token_result.twitchUsername} You need to register with the $bitcorn command to request a token`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            } else {
                const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report this: code ${token_result.senderResponse.code}`;
                tmi.botWhisper(token_result.senderResponse.twitchUsername, reply);
                return pending.complete(event, reply);
            }
        } catch (error) {
            const reply = `Command error in ${event.configs.prefix}${event.configs.name}, please report this: ${error}`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }
    }
});
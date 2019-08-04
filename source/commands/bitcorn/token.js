/*

*/

"use strict";

const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const crypto = require('crypto');

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

        try {

            if (pending.started(event)) return pending.reply(event, tmi);

            if(!event.configs.enabled) {
                const reply = `@${event.user.username}, ${event.configs.prefix}${event.configs.name} down for MEGASUPERUPGRADES - INJECTING STEROIDS INTO SOIL 4 cttvPump cttvCorn`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            }

            const buffer = crypto.randomBytes(16);
            const token = buffer.toString('hex');

            const twitchId = event.user['user-id'];
            const twitchUsername = event.user.username;

            const token_result = await databaseAPI.tokenRequest(token, twitchId, twitchUsername);

            if (token_result.isSuccess === true) {
                const reply = `Your Token is '${token}' (no ' ' quotes) - Use this to login here: https://dashboard.bitcornproject.com/ - If you use $token again you will receive a new token your old token will be deleted.`;
                tmi.botWhisper(token_result.twitchUsername, reply);
                return pending.complete(event, reply);
            } else if (token_result.userExists === false) {
                const reply = `@${token_result.twitchUsername} You need to register with the $bitcorn command to request a token`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            } else {
                const reply = `Something went wrong with the rain command, please report this: code ${token_result.senderResponse.code}`;
                tmi.botWhisper(token_result.senderResponse.twitchUsername, reply);
                return pending.complete(event, reply);
            }
        } catch (error) {
            const reply = `Something went wrong please report this: ${error}`;
            return pending.complete(event, reply);
        }
    }
});
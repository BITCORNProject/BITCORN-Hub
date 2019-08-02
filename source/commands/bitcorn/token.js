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
        prefix: '$'
    },
    async execute(event) {
        /*

        isSuccess: false
        twitchId: "twitchId"
        twitchUsername: "twitchUsername"
        token: "jhld890890hjoiodhvsdhivi90"
        userExists: false

        */
        tmi.botSay(event.target, `@${event.user.username}, ${event.configs.prefix}${event.configs.name} system is currently under construction cttvDump System will return soon! cttvDump`);
        return { success: false, event };

        if (pending.started(event)) return pending.reply(event, tmi);

        const buffer = crypto.randomBytes(16);
        const token = buffer.toString('hex');

        const twitchId = event.user['user-id'];
        const twitchUsername = event.user.username;

        const token_result = await databaseAPI.tokenRequest(token, twitchId, twitchUsername);

        switch (token_result.senderResponse.code) {
            case databaseAPI.paymentCode.QueryFailure:
                tmi.botSay(event.target, `@${token_result.twitchUsername} You need to register with the $bitcorn command to request a token`);
                break;
            case databaseAPI.paymentCode.Success:
                tmi.botWhisper(token_result.twitchUsername, `Your Token is '${token}' (no ' ' quotes) - Use this to login here: https://dashboard.bitcorntimes.com/ - If you use $token again you will receive a new token your old token will be deleted.`);
                break;
            default:
                const reply = `Something went wrong with the rain command, please report this: code ${token_result.senderResponse.code}`;
                tmi.botWhisper(token_result.senderResponse.twitchUsername, reply);
                return pending.complete(event, reply);
        }

        return pending.complete(event);
    }
});
/*

*/

"use strict";

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');
const databaseAPI = require('../../config/api-interface/database-api');

const Pending = require('../../utils/pending');

const pending = new Pending('bitcorn');

module.exports = Object.create({
    configs: {
        name: 'bitcorn',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'View your BITCORN balance and get a BITCORN wallet address if you are not registered',
        example: '$bitcorn',
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

            const twitchId = event.user['user-id'];
            const twitchUsername = event.user.username;

            const bitcorn_result = await databaseAPI.bitcornRequest(twitchId, twitchUsername);

            switch (bitcorn_result.code) {
                case databaseAPI.paymentCode.Success: {
                    const reply = bitcorn_result.content.isnewuser ?
                        `Hey! You just registered a new BITCORN wallet address ${bitcorn_result.content.cornaddy} to your twitchID! Your current balance of $BITCORN is ${bitcorn_result.content.balance}` :
                        `Howdy BITCORN Farmer!  You have amassed ${bitcorn_result.content.balance} $BITCORN in your corn silo!  Your silo is currently located at this BITCORN Address: ${bitcorn_result.content.cornaddy}`
                    tmi.botWhisper(bitcorn_result.content.twitchUsername, reply);
                    return pending.complete(event, reply);
                } default: {
                    const reply = `Something went wrong with the rain command, please report this: code ${bitcorn_result.code}`;
                    tmi.botWhisper(bitcorn_result.content.twitchUsername, reply);
                    return pending.complete(event, reply);
                }
            }
        } catch (error) {
            const reply = `Something went wrong please report this: ${error}`;
            return pending.complete(event, reply);
        }
    }
});
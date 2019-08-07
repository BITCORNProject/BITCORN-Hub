/*

*/

"use strict";

const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
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

        if (pending.started(event)) return pending.reply(event, tmi);

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const bitcorn_result = await databaseAPI.bitcornRequest(twitchId, twitchUsername);
            
            cmdHelper.throwIfCondition(event, bitcorn_result.status && bitcorn_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: {configs: event.configs, status: bitcorn_result.status},
                reply: cmdHelper.reply.whisper
            });

            switch (bitcorn_result.code) {
                case databaseAPI.paymentCode.Success: {
                    const reply = bitcorn_result.content.isnewuser ?
                        `Hey! You just registered a new BITCORN wallet address ${bitcorn_result.content.cornaddy} to your twitchID! Your current balance of $BITCORN is ${bitcorn_result.content.balance}` :
                        `Howdy BITCORN Farmer!  You have amassed ${bitcorn_result.content.balance} $BITCORN in your corn silo!  Your silo is currently located at this BITCORN Address: ${bitcorn_result.content.cornaddy}`
                    tmi.botWhisper(bitcorn_result.content.twitchUsername, reply);
                    return pending.complete(event, reply);
                } default: {
                    cmdHelper.throwIfCondition(event, true, {
                        method: cmdHelper.message.somethingwrong,
                        params: {configs: event.configs, code: bitcorn_result.code},
                        reply: cmdHelper.reply.whisper
                    });
                }
            }
        } catch (error) {
            if (error.hasMessage) return pending.complete(event, error.message);

            return pending.complete(event, cmdHelper.commandError(event, {
                method: cmdHelper.message.commanderror,
                params: { configs: event.configs, error: error }
            }));
        }
    }
});
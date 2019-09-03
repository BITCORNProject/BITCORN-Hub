/*

*/

"use strict";

const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending();

module.exports = Object.create({
    configs: {
        name: 'bitcorn',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'View your BITCORN balance and get a BITCORN wallet address if you are not registered',
        example: '$bitcorn',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {

            const twitchId = cmdHelper.twitch.id(event.user);

            const bitcorn_result = await databaseAPI.bitcornRequest(twitchId);

            cmdHelper.throwIfConditionBanned(event, bitcorn_result.status && bitcorn_result.status === 423);

            cmdHelper.throwIfConditionReply(event, bitcorn_result.status && bitcorn_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: { configs: event.configs, status: bitcorn_result.status },
                reply: cmdHelper.reply.whisper
            });

            cmdHelper.throwIfConditionReply(event, bitcorn_result.error, {
                method: cmdHelper.message.bitcorn.isnewuser,
                params: {},
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfConditionReply(event, twitchId !== bitcorn_result.twitchid, {
                method: cmdHelper.message.idmismatch,
                params: { configs: event.configs, twitchId: twitchId, twitchid: bitcorn_result.twitchid },
                reply: cmdHelper.reply.whisper
            });

            const reply = cmdHelper.commandReply(event, {
                methods: {
                    message: cmdHelper.message.bitcorn.notnewuser,
                    reply: cmdHelper.reply.whisper
                },
                params: { balance: bitcorn_result.balance, cornaddy: bitcorn_result.cornaddy }
            });
            return pending.complete(event, reply);

        } catch (error) {

            if (cmdHelper.sendErrorMessage(error)) return pending.complete(event, error.message);

            if (error.hasMessage) return pending.complete(event, error.message);

            return pending.complete(event, cmdHelper.commandError(event, {
                method: cmdHelper.message.commanderror,
                params: { configs: event.configs, error: error }
            }));
        }
    }
});
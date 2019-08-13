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
            
            cmdHelper.throwIfConditionReply(event, bitcorn_result.status && bitcorn_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: {configs: event.configs, status: bitcorn_result.status},
                reply: cmdHelper.reply.whisper
            });

            switch (bitcorn_result.code) {
                case databaseAPI.paymentCode.Success: {
                    
                    const reply = cmdHelper.commandReplyByCondition(event, bitcorn_result.content.isnewuser, {
                        reply: cmdHelper.reply.whisper,
                        messages: [cmdHelper.message.bitcorn.notnewuser, cmdHelper.message.bitcorn.isnewuser],
                        params: [
                            { balance: bitcorn_result.content.balance, cornaddy: bitcorn_result.content.cornaddy },
                            { balance: bitcorn_result.content.balance, cornaddy: bitcorn_result.content.cornaddy },
                        ]
                    });
                    return pending.complete(event, reply);
                } default: {
                    await cmdHelper.throwAndLogError(event, {
                        method: cmdHelper.message.pleasereport,
                        params: {
                            configs: event.configs,
                            twitchUsername: bitcorn_result.content.twitchUsername,
                            twitchId: bitcorn_result.content.twitchId,
                            code: bitcorn_result.code
                        }
                    });
                }
            }
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
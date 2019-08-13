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

            await cmdHelper.throwIfConditionReply(event, token_result.status && token_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: {configs: event.configs, status: token_result.status},
                reply: cmdHelper.reply.whisper
            });

            if (token_result.isSuccess === true) {
                const reply = cmdHelper.commandReply(event, {
                    methods: {
                        message: cmdHelper.message.token.success,
                        reply: cmdHelper.reply.whisper
                    },
                    params: {token}
                });
                return pending.complete(event, reply);
            } else if (token_result.userExists === false) {
                const reply = cmdHelper.commandReply(event, {
                    methods: {
                        message: cmdHelper.message.token.failed,
                        reply: cmdHelper.reply.respond
                    },
                    params: {}
                });
                return pending.complete(event, reply);
            }
            await cmdHelper.throwAndLogError(event, {
                method: cmdHelper.message.pleasereport,
                params: {
                    configs: event.configs,
                    twitchUsername: token_result.senderResponse.twitchUsername,
                    twitchId: token_result.senderResponse.twitchId,
                    code: token_result.senderResponse.code
                }
            });
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
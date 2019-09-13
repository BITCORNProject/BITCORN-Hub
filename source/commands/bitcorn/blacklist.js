/*

*/

"use strict";

const tmi = require('../../config/tmi');
const helix = require('../../config/authorize/helix');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending();

module.exports = Object.create({
    configs: {
        name: 'blacklist',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Add user to the blacklist for all BITCORN services',
        example: '$blacklist @username',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {
            const receiverArg = event.args[0];

            const twitchId = cmdHelper.twitch.id(event.user);
            const receiverName = cmdHelper.clean.atLower(receiverArg);

            cmdHelper.throwIfConditionSelf(event, receiverName === cmdHelper.twitch.username(event.user));

            cmdHelper.throwIfConditionReply(event, receiverName === '', {
                method: cmdHelper.message.noname,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            const { id: receiverId } = await helix.getUserLogin(receiverName);

            if(!receiverId) {
                return pending.complete(event, `blacklist result user ${receiverName} not Twitch user OK`);
            }

            const blacklist_result = await databaseAPI.blacklistRequest(twitchId, receiverId);

            cmdHelper.throwIfConditionBanned(event, blacklist_result.status && blacklist_result.status === 423);

            cmdHelper.throwIfConditionRefused(event, blacklist_result.status && blacklist_result.status === 503);

            cmdHelper.throwIfConditionReply(event, blacklist_result.status && blacklist_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: { configs: event.configs, status: blacklist_result.status },
                reply: cmdHelper.reply.whisper
            });

            switch (blacklist_result) {
                case databaseAPI.banResultCode.Invalid: {
                    return pending.complete(event, `blacklist result Invalid ${blacklist_result} OK`);
                }
                case databaseAPI.banResultCode.Unauthorized: {
                    return pending.complete(event, `blacklist result Unauthorized ${blacklist_result} OK`);
                }
                case databaseAPI.banResultCode.Success: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.blacklist.success,
                            reply: cmdHelper.reply.whisper
                        },
                        params: { userBanned: receiverName }
                    });
                    return pending.complete(event, reply);
                }
                case databaseAPI.banResultCode.AlreadyBanned: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.blacklist.alreadybanned,
                            reply: cmdHelper.reply.whisper
                        },
                        params: { userBanned: receiverName }
                    });
                    return pending.complete(event, reply);
                }
                case databaseAPI.banResultCode.Success: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.success.blacklist,
                            reply: cmdHelper.reply.whisper
                        },
                        params: { userBanned: receiverName }
                    });
                    return pending.complete(event, reply);
                }
                default: {
                    await cmdHelper.asyncThrowAndLogError(event, {
                        method: cmdHelper.message.pleasereport,
                        params: {
                            configs: event.configs,
                            twitchUsername: cmdHelper.twitch.username(event.user),
                            twitchId: twitchId,
                            code: blacklist_result
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
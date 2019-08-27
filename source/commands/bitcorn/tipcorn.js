/*

*/

'use strict';

const tmi = require('../../config/tmi');
const helix = require('../../config/authorize/helix');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
const serverSettings = require('../../../settings/server-settings');
const Pending = require('../../utils/pending');

const pending = new Pending();

module.exports = Object.create({
    configs: {
        name: 'tipcorn',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Tips a user with bitcorn',
        example: '$tipcorn <username> <amount>',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {

            const receiverArg = event.args[0];
            const amountArg = event.args[1];

            cmdHelper.throwIfConditionReply(event, !cmdHelper.isNumber(amountArg), {
                method: cmdHelper.message.notnumber,
                params: { configs: event.configs },
                reply: cmdHelper.reply.respond
            });

            const twitchId = cmdHelper.twitch.id(event.user);
            const receiverName = cmdHelper.clean.atLower(receiverArg);
            const tipcornAmount = cmdHelper.clean.amount(amountArg);

            cmdHelper.throwIfConditionReply(event, tipcornAmount <= 0, {
                method: cmdHelper.message.nonegitive,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfConditionReply(event, tipcornAmount < serverSettings.getValues().MIN_TIPCORN_AMOUNT, {
                method: cmdHelper.message.minamount,
                params: { configs: event.configs, minamount: serverSettings.getValues().MIN_TIPCORN_AMOUNT },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfConditionReply(event, tipcornAmount > databaseAPI.MAX_WALLET_AMOUNT, {
                method: cmdHelper.message.maxamount,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfConditionReply(event, receiverName === '', {
                method: cmdHelper.message.noname,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            const { id: receiverId } = await helix.getUserLogin(receiverName);

            cmdHelper.throwIfConditionReply(event, !receiverId, {
                method: cmdHelper.message.badname,
                params: { receiverName },
                reply: cmdHelper.reply.chat
            });

            const tipcorn_result = await databaseAPI.tipcornRequest(twitchId, receiverId, tipcornAmount);

            cmdHelper.throwIfConditionReply(event, tipcorn_result.status && tipcorn_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: { configs: event.configs, status: tipcorn_result.status },
                reply: cmdHelper.reply.whisper
            });

            cmdHelper.throwIfConditionReply(event, tipcorn_result.senderResponse.code !== databaseAPI.paymentCode.InternalServerError
                && twitchId !== tipcorn_result.senderResponse.platformUserId, {
                    method: cmdHelper.message.idmismatch,
                    params: { configs: event.configs, twitchId: twitchId, twitchid: tipcorn_result.senderResponse.platformUserId },
                    reply: cmdHelper.reply.whisper
                });

            switch (tipcorn_result.senderResponse.code) {
                case databaseAPI.paymentCode.NoRecipients: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.norecipients.tipcorn,
                            reply: cmdHelper.reply.chat
                        },
                        params: {}
                    });
                    return pending.complete(event, `${reply} - ${tipcorn_result.senderResponse.code}`);
                } case databaseAPI.paymentCode.InsufficientFunds: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.insufficientfunds.tipcorn,
                            reply: cmdHelper.reply.whisper
                        },
                        params: { balance: tipcorn_result.senderResponse.userBalance }
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.QueryFailure: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.queryfailure.tipcorn.sender,
                            reply: cmdHelper.reply.chat
                        },
                        params: {}
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.Success: {

                    const recipientResponse = tipcorn_result.recipientResponses[0];

                    switch (recipientResponse.code) {
                        case databaseAPI.paymentCode.Success: {

                            const totalTippedAmount = Math.abs(tipcorn_result.senderResponse.balanceChange);

                            const reply = cmdHelper.commandRepliesWho(event, [
                                { reply: cmdHelper.reply['whisper-who'], message: cmdHelper.message.tipcorn.recipient, params: { who: receiverName, senderName: event.user.username, balanceChange: recipientResponse.balanceChange } },
                                { reply: cmdHelper.reply['chatnomention-who'], message: cmdHelper.message.tipcorn.tochat, params: { who: event.target, totalTippedAmount, senderName: event.user['display-name'], recipientName: receiverName } },
                                { reply: cmdHelper.reply['whisper-who'], message: cmdHelper.message.tipcorn.sender, params: { who: event.user.username, totalTippedAmount, twitchUsername: receiverName, userBalance: tipcorn_result.senderResponse.userBalance } }
                            ]);
                            return pending.complete(event, reply);
                        } case databaseAPI.paymentCode.QueryFailure: {
                            const reply = cmdHelper.commandReply(event, {
                                methods: {
                                    message: cmdHelper.message.queryfailure.tipcorn.recipient,
                                    reply: cmdHelper.reply.chat
                                },
                                params: { twitchUsername: receiverName }
                            });
                            return pending.complete(event, reply);
                        } case databaseAPI.paymentCode.InsufficientFunds: {
                            const reply = cmdHelper.commandReply(event, {
                                methods: {
                                    message: cmdHelper.message.insufficientfunds.tipcorn,
                                    reply: cmdHelper.reply.whisper
                                },
                                params: { balance: tipcorn_result.senderResponse.userBalance }
                            });
                            return pending.complete(event, reply);
                        } case databaseAPI.paymentCode.InvalidPaymentAmount: {
                            const reply = cmdHelper.commandReply(event, {
                                methods: {
                                    message: cmdHelper.message.invalidpaymentamount.tipcorn,
                                    reply: cmdHelper.reply.whisper
                                },
                                params: { balance: tipcorn_result.senderResponse.userBalance }
                            });
                            return pending.complete(event, reply);
                        } default: {
                            cmdHelper.throwIfConditionReply(event, true, {
                                method: cmdHelper.message.pleasereport,
                                params: { configs: event.configs, code: tipcorn_result.senderResponse.code }, //entryId
                                reply: cmdHelper.reply.whisper
                            });
                        }
                    }
                } default: {
                    await cmdHelper.throwAndLogError(event, {
                        method: cmdHelper.message.pleasereport,
                        params: {
                            configs: event.configs,
                            twitchUsername: cmdHelper.twitch.username(event.user),
                            twitchId: tipcorn_result.senderResponse.twitchId,
                            code: tipcorn_result.senderResponse.code
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
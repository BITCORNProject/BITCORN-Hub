/*

*/

'use strict';

const tmi = require('../../config/tmi');
const helix = require('../../config/authorize/helix');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending('tipcorn');

module.exports = Object.create({
    configs: {
        name: 'tipcorn',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Tips a user with bitcorn',
        example: '$tipcorn <amount> <username>',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.started(event)) return pending.reply(event, tmi);

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {

            cmdHelper.throwIfCondition(event, !cmdHelper.isNumber(event.args[0]), {
                method: cmdHelper.message.notnumber,
                params: { configs: event.configs },
                reply: cmdHelper.reply.respond
            });

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const receiverName = cmdHelper.clean.atLower(event.args[1]);
            const tipcorn_amount = cmdHelper.clean.amount(event.args[0]);

            cmdHelper.throwIfCondition(event, tipcorn_amount <= 0, {
                method: cmdHelper.message.nonegitive,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfCondition(event, tipcorn_amount > databaseAPI.MAX_AMOUNT, {
                method: cmdHelper.message.maxamount,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfCondition(event, receiverName === '', {
                method: cmdHelper.message.noname,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            const { id: receiverId } = await helix.getUserLogin(receiverName);

            cmdHelper.throwIfCondition(event, !receiverId, {
                method: cmdHelper.message.badname,
                params: { receiverName },
                reply: cmdHelper.reply.chat
            });

            const tipcorn_result = await databaseAPI.tipcornRequest(twitchId, twitchUsername, receiverId, receiverName, tipcorn_amount);

            cmdHelper.throwIfCondition(event, tipcorn_result.status && tipcorn_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: { configs: event.configs, status: tipcorn_result.status },
                reply: cmdHelper.reply.whisper
            });

            switch (tipcorn_result.senderResponse.code) {
                case databaseAPI.paymentCode.NoRecipients: {
                    const reply = cmdHelper.selectSwitchCase(event, {
                        methods: {
                            message: cmdHelper.message.norecipients.tipcorn,
                            reply: cmdHelper.reply.chat
                        },
                        params: {}
                    });
                    return pending.complete(event, `${reply} - ${tipcorn_result.senderResponse.code}`);
                } case databaseAPI.paymentCode.InsufficientFunds: {
                    const reply = cmdHelper.selectSwitchCase(event, {
                        methods: {
                            message: cmdHelper.message.insufficientfunds.tipcorn,
                            reply: cmdHelper.reply.whisper
                        },
                        params: { balance: tipcorn_result.senderResponse.userBalance }
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.QueryFailure: {
                    const reply = cmdHelper.selectSwitchCase(event, {
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
                            const msg = `You received ${recipientResponse.balanceChange} BITCORN from ${tipcorn_result.senderResponse.twitchUsername}!`;
                            tmi.botWhisper(recipientResponse.twitchUsername, msg);

                            tmi.botSay(event.target, `cttvCorn @${tipcorn_result.senderResponse.twitchUsername} just slipped @${recipientResponse.twitchUsername} ${totalTippedAmount} BITCORN with a FIRM handshake. cttvCorn`);
                            tmi.botWhisper(tipcorn_result.senderResponse.twitchUsername, `You tipped ${recipientResponse.twitchUsername} ${totalTippedAmount} BITCORN! Your BITCORN balance remaining is: ${tipcorn_result.senderResponse.userBalance}`);
                            const reply = `User: ${tipcorn_result.senderResponse.twitchUsername} tipped ${totalTippedAmount} CORN to ${recipientResponse.twitchUsername} user`;
                            return pending.complete(event, reply);
                        } case databaseAPI.paymentCode.QueryFailure: {
                            const reply = cmdHelper.selectSwitchCase(event, {
                                methods: {
                                    message: cmdHelper.message.queryfailure.tipcorn.recipient,
                                    reply: cmdHelper.reply.chat
                                },
                                params: {twitchUsername: recipientResponse.twitchUsername}
                            });
                            return pending.complete(event, reply);
                        } default: {
                            cmdHelper.throwIfCondition(event, true, {
                                method: cmdHelper.message.somethingwrong,
                                params: {configs: event.configs, code: tipcorn_result.senderResponse.code},
                                reply: cmdHelper.reply.whisper
                            });
                        }
                    }
                } default: {
                    cmdHelper.throwIfCondition(event, true, {
                        method: cmdHelper.message.somethingwrong,
                        params: {configs: event.configs, code: tipcorn_result.senderResponse.code},
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
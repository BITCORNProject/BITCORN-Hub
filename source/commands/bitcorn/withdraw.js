/*

*/

'use strict';

const fs = require('fs');
const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending('withdraw');

module.exports = Object.create({
    configs: {
        name: 'withdraw',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Withraw your funds off the bot :: Commands do not work in Direct Messages',
        example: '$withdraw <amount> <address>',
        prefix: '$',
        whisper: true,
        enabled: true
    },
    async execute(event) {

        if (pending.started(event)) return pending.reply(event, tmi);

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {

            await cmdHelper.throwIfConditionReply(event, !cmdHelper.isNumber(event.args[0]), {
                method: cmdHelper.message.notnumber,
                params: { configs: event.configs },
                reply: cmdHelper.reply.respond
            });

            const withdraw_amount = cmdHelper.clean.amount(event.args[0]);
            //IMPORTANT: Do not .toLowerCase() the address is case sensitive
            const to_cornaddy = cmdHelper.clean.at(event.args[1]);

            await cmdHelper.throwIfConditionReply(event, withdraw_amount <= 0, {
                method: cmdHelper.message.nonegitive,
                params: { configs: event.configs },
                reply: cmdHelper.reply.whisper
            });

            await cmdHelper.throwIfConditionReply(event, withdraw_amount > databaseAPI.MAX_WITHDRAW_AMOUNT, {
                method: cmdHelper.message.maxamount,
                params: { configs: event.configs },
                reply: cmdHelper.reply.whisper
            });

            await cmdHelper.throwIfConditionReply(event, withdraw_amount >= databaseAPI.MAX_WALLET_AMOUNT, {
                method: cmdHelper.message.maxamount,
                params: { configs: event.configs },
                reply: cmdHelper.reply.whisper
            });

            await cmdHelper.throwIfConditionReply(event, !to_cornaddy, {
                method: cmdHelper.message.cornaddyneeded,
                params: { configs: event.configs },
                reply: cmdHelper.reply.whisper
            });

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const withdraw_result = await databaseAPI.withdrawRequest(twitchId, twitchUsername, withdraw_amount, to_cornaddy);

            await cmdHelper.throwIfConditionReply(event, withdraw_result.status && withdraw_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: { configs: event.configs, status: withdraw_result.status },
                reply: cmdHelper.reply.whisper
            });

            switch (withdraw_result.code) {
                case databaseAPI.walletCode.TransactionTooLarge: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.transactiontoolarge.withdraw,
                            reply: cmdHelper.reply.whisper
                        },
                        params: {}
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.walletCode.QueryFailure: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.queryfailure.withdraw,
                            reply: cmdHelper.reply.whisper
                        },
                        params: {}
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.walletCode.InsufficientFunds: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.insufficientfunds.withdraw,
                            reply: cmdHelper.reply.whisper
                        },
                        params: {}
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.InvalidPaymentAmount: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.invalidpaymentamount.withdraw,
                            reply: cmdHelper.reply.whisper
                        },
                        params: {}
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.walletCode.Success: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.success.withdraw,
                            reply: cmdHelper.reply.whisper
                        },
                        params: { txid: withdraw_result.content.txid }
                    });
                    return pending.complete(event, reply);
                } default: {
                    await cmdHelper.throwAndLogError(event, {
                        method: cmdHelper.message.pleasereport,
                        params: {
                            configs: event.configs,
                            twitchUsername: withdraw_result.content.twitchUsername,
                            twitchId: withdraw_result.content.twitchId,
                            code: withdraw_result.code
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
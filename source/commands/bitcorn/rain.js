/*

*/

'use strict';

const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const math = require('../../utils/math');
const activityTracker = require('../../activity-tracker');
const cmdHelper = require('../cmd-helper');
const serverSettings = require('../../../settings/server-settings');
const Pending = require('../../utils/pending');

const pending = new Pending();

module.exports = Object.create({
    configs: {
        name: 'rain',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Rain a certain Amount to the last 1-3 of People who were active',
        example: '$rain <amount> <1-10>',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {

            cmdHelper.throwIfConditionReply(event, !cmdHelper.isNumber(event.args[0]) || !cmdHelper.isNumber(event.args[1]), {
                method: cmdHelper.message.notnumber,
                params: { configs: event.configs },
                reply: cmdHelper.reply.respond
            });

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const rain_amount = cmdHelper.clean.amount(event.args[0]);
            const rain_user_count = cmdHelper.clean.amount(event.args[1]);

            cmdHelper.throwIfConditionReply(event, rain_amount <= 0, {
                method: cmdHelper.message.nonegitive,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfConditionReply(event, rain_amount < serverSettings.getValues().MIN_RAIN_AMOUNT, {
                method: cmdHelper.message.minamount,
                params: { configs: event.configs, minamount: serverSettings.getValues().MIN_RAIN_AMOUNT },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfConditionReply(event, rain_amount > databaseAPI.MAX_WALLET_AMOUNT, {
                method: cmdHelper.message.maxamount,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfConditionReply(event, rain_user_count <= 0 || rain_user_count > databaseAPI.MAX_RAIN_USERS, {
                method: cmdHelper.message.numpeople,
                params: { configs: event.configs, max: databaseAPI.MAX_RAIN_USERS },
                reply: cmdHelper.reply.chat
            });

            const chatternamesArr = activityTracker.getChatterActivity(event.target).filter(x => x.username !== twitchUsername);

            cmdHelper.throwIfConditionReply(event, chatternamesArr.length === 0, {
                method: cmdHelper.message.nochatters,
                params: {},
                reply: cmdHelper.reply.chat
            });

            const items = chatternamesArr.slice(0, rain_user_count);
            const amount = math.fixed8(rain_amount / items.length);
            const recipients = items.map(x => ({ id: x.id, amount: amount }));

            const rain_result = await databaseAPI.rainRequest(recipients, twitchId);
            cmdHelper.throwIfConditionBanned(event, rain_result.status && rain_result.status === 423);

            cmdHelper.throwIfConditionRefused(event, rain_result.status && rain_result.status === 503);

            cmdHelper.throwIfConditionReply(event, rain_result.status && rain_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: { configs: event.configs, status: rain_result.status },
                reply: cmdHelper.reply.whisper
            });

            cmdHelper.throwIfConditionReply(event, rain_result.senderResponse.code !== databaseAPI.paymentCode.InternalServerError
                && twitchId !== rain_result.senderResponse.platformUserId, {
                    method: cmdHelper.message.idmismatch,
                    params: { configs: event.configs, twitchId: twitchId, twitchid: rain_result.senderResponse.platformUserId },
                    reply: cmdHelper.reply.whisper
                });

            switch (rain_result.senderResponse.code) {
                case databaseAPI.paymentCode.NoRecipients: {
                    if (rain_result.recipientResponses.length > 0) {
                        // missed out on rain
                        const failureNamesArray = rain_result.recipientResponses.filter(x => x.code === databaseAPI.paymentCode.QueryFailure).map(x => {
                            return items.filter(m => m.id === x.platformUserId)[0].username;
                        });
                        const failureNames = failureNamesArray.join(' ');
                        const reply = `PepeWhy ${failureNames} please visit the sync site https://bitcornsync.com/ to register an account PepeWhy`;

                        tmi.botSay(event.target, reply);
                        return pending.complete(event, reply);
                    } else {
                        const reply = cmdHelper.commandReply(event, {
                            methods: {
                                message: cmdHelper.message.norecipients.rain,
                                reply: cmdHelper.reply.chat
                            },
                            params: {}
                        });
                        return pending.complete(event, reply);
                    }
                } case databaseAPI.paymentCode.InsufficientFunds: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.insufficientfunds.rain,
                            reply: cmdHelper.reply.chat
                        },
                        params: { balance: rain_result.senderResponse.userBalance }
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.InvalidPaymentAmount: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.invalidpaymentamount.rain,
                            reply: cmdHelper.reply.whisper
                        },
                        params: { balance: rain_result.senderResponse.userBalance }
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.QueryFailure: {
                    const reply = cmdHelper.commandReply(event, {
                        methods: {
                            message: cmdHelper.message.queryfailure.rain,
                            reply: cmdHelper.reply.chat
                        },
                        params: {}
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.Success: {
                    const totalRainedAmount = Math.abs(rain_result.senderResponse.balanceChange);
                    let singleRainedAmount = 0;
                    let totalRainedUsers = 0;
                    const recipientResponses = rain_result.recipientResponses.filter(x => x.code !== databaseAPI.paymentCode.Banned);
                    for (let i = 0; i < recipientResponses.length; i++) {
                        const recipientResponse = recipientResponses[i];
                        if (recipientResponse.code === databaseAPI.paymentCode.Success) {

                            const recipientName = items.filter(x => x.id === recipientResponse.platformUserId)[0].username;

                            const msg = `Hey ${recipientName}, ${event.user['display-name']} just rained ${recipientResponse.balanceChange} $BITCORN on you in CryptoTradersTV's chat!`;
                            //tmi.botWhisper(recipientName, msg);
                            totalRainedUsers += 1;
                            singleRainedAmount = recipientResponse.balanceChange;
                        }
                    }

                    // missed out on rain
                    const failureNamesArray = recipientResponses.filter(x => x.code === databaseAPI.paymentCode.QueryFailure).map(x => {
                        return items.filter(m => m.id === x.platformUserId)[0].username;
                    });
                    const failureNames = failureNamesArray.join(' ');

                    // success recipients
                    const successNames = recipientResponses.filter(x => x.code === databaseAPI.paymentCode.Success).map(x => {
                        return items.filter(m => m.id === x.platformUserId)[0].username;
                    }).join(' ');

                    const successMessage = `FeelsRainMan ${successNames}, you all just received a glorious CORN shower of ${singleRainedAmount} BITCORN rained on you by ${event.user['display-name']}! FeelsRainMan`;
                    const failedMessage = ` // PepeWhy ${failureNames} please visit the sync site https://bitcornsync.com/ to register an account PepeWhy`;

                    const allMsg = `${successMessage}${(failureNamesArray.length > 0 ? failedMessage : '')}`;

                    tmi.botSay(event.target, allMsg);
                    tmi.botWhisper(event.user.username, `Thank you for spreading ${totalRainedAmount} BITCORN by makin it rain on dem.. ${successNames} ..hoes?  Your BITCORN balance remaining is: ${rain_result.senderResponse.userBalance}`);

                    /*const reply = cmdHelper.commandReplies(event, [
                        {reply: cmdHelper.reply.chatnomention, message: cmdHelper.message.rain.tochat, params:{senderName: event.user['display-name']}},
                        {reply: cmdHelper.reply.whisper, message: cmdHelper.message.rain.sender, params:{totalRainedAmount, successNames, userBalance: rain_result.senderResponse.userBalance}},
                    ]);*/

                    const reply = `User: ${event.user.username} rain ${totalRainedAmount} CORN on ${totalRainedUsers} users`;
                    return pending.complete(event, reply);

                } default: {
                    await cmdHelper.asyncThrowAndLogError(event, {
                        method: cmdHelper.message.pleasereport,
                        params: {
                            configs: event.configs,
                            twitchUsername: event.user['display-name'],
                            twitchId: rain_result.senderResponse.platformUserId,
                            code: rain_result.senderResponse.code
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
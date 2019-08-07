/*

*/

'use strict';

const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const math = require('../../utils/math');
const activityTracker = require('../../activity-tracker');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending('rain');

module.exports = Object.create({
    configs: {
        name: 'rain',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Rain a certain Amount to the last 1-3 of People who were active',
        example: '$rain <amount> <1-3>',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.started(event)) return pending.reply(event, tmi);

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

        try {

            cmdHelper.throwIfCondition(event, !cmdHelper.isNumber(event.args[0]) || !cmdHelper.isNumber(event.args[1]), {
                method: cmdHelper.message.notnumber,
                params: { configs: event.configs },
                reply: cmdHelper.reply.respond
            });

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const rain_user_count = cmdHelper.clean.amount(event.args[1]);
            const rain_amount = cmdHelper.clean.amount(event.args[0]);

            cmdHelper.throwIfCondition(event, rain_amount <= 0, {
                method: cmdHelper.message.nonegitive,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfCondition(event, rain_amount > databaseAPI.MAX_AMOUNT, {
                method: cmdHelper.message.maxamount,
                params: { configs: event.configs },
                reply: cmdHelper.reply.chat
            });

            cmdHelper.throwIfCondition(event, rain_user_count <= 0 || rain_user_count > databaseAPI.MAX_RAIN_USERS, {
                method: cmdHelper.message.numpeople,
                params: { configs: event.configs, max: databaseAPI.MAX_RAIN_USERS },
                reply: cmdHelper.reply.chat
            });

            const chatternamesArr = activityTracker.getChatterActivity(event.target).filter(x => x.username !== twitchUsername);

            cmdHelper.throwIfCondition(event, chatternamesArr.length === 0, {
                method: cmdHelper.message.nochatters,
                params: {},
                reply: cmdHelper.reply.chat
            });

            const items = chatternamesArr.slice(0, rain_user_count);
            const amount = math.fixed8(rain_amount / items.length);
            const recipients = items.map(x => ({ twitchId: x.id, twitchUsername: x.username, amount: amount }));

            const rain_result = await databaseAPI.rainRequest(recipients, twitchId, twitchUsername);

            cmdHelper.throwIfCondition(event, rain_result.status && rain_result.status !== 200, {
                method: cmdHelper.message.apifailed,
                params: { configs: event.configs, status: rain_result.status },
                reply: cmdHelper.reply.whisper
            });

            switch (rain_result.senderResponse.code) {
                case databaseAPI.paymentCode.NoRecipients: {
                    const reply = cmdHelper.selectSwitchCase(event, {
                        methods: {
                            message: cmdHelper.message.norecipients.rain,
                            reply: cmdHelper.reply.chat
                        },
                        params: {}
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.InsufficientFunds: {
                    const reply = cmdHelper.selectSwitchCase(event, {
                        methods: {
                            message: cmdHelper.message.insufficientfunds.rain,
                            reply: cmdHelper.reply.whisper
                        },
                        params: { balance: rain_result.senderResponse.userBalance }
                    });
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.QueryFailure: {
                    const reply = cmdHelper.selectSwitchCase(event, {
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
                    for (let i = 0; i < rain_result.recipientResponses.length; i++) {
                        const recipientResponse = rain_result.recipientResponses[i];
                        if (recipientResponse.code === databaseAPI.paymentCode.Success) {
                            const msg = `Hey ${recipientResponse.twitchUsername}, ${rain_result.senderResponse.twitchUsername} just rained ${recipientResponse.balanceChange} $BITCORN on you in CryptoTradersTV's chat!`;
                            tmi.botWhisper(recipientResponse.twitchUsername, msg);
                            totalRainedUsers += 1;
                            singleRainedAmount = recipientResponse.balanceChange;
                        }
                    }
                    if (totalRainedUsers > 0 && totalRainedAmount > 0) {
                        // missed out on rain
                        const failureNamesArray = rain_result.recipientResponses.filter(x => x.code === databaseAPI.paymentCode.QueryFailure).map(x => x.twitchUsername);
                        const failureNames = failureNamesArray.join();

                        // success recipients
                        const successNames = rain_result.recipientResponses.filter(x => x.code === databaseAPI.paymentCode.Success).map(x => x.twitchUsername).join();

                        const successMessage = `FeelsRainMan EUREKAAA ${successNames}, you all just received a glorious golden shower of ${singleRainedAmount} BITCORN rained on you by ${rain_result.senderResponse.twitchUsername}! FeelsRainMan`;
                        const failedMessage = ` // PepeWhy ${failureNames} type $bitcorn to register an account PepeWhy`;

                        const allMsg = `${successMessage}${(failureNamesArray.length > 0 ? failedMessage : '')}`;

                        tmi.botSay(event.target, allMsg);
                        tmi.botWhisper(rain_result.senderResponse.twitchUsername, `Thank you for spreading ${totalRainedAmount} BITCORN by makin it rain on dem.. ${successNames} ..hoes?  Your BITCORN balance remaining is: ${rain_result.senderResponse.userBalance}`);
                        const reply = `User: ${rain_result.senderResponse.twitchUsername} rain ${totalRainedAmount} CORN on ${totalRainedUsers} users`;
                        return pending.complete(event, reply);
                    } else {
                        const failedNameAndCodes = rain_result.recipientResponses.filter(x => x.code !== 1).map(x => `${x.twitchUsername}:code:${x.code}`).join();
                        const reply = `No rain ${event.configs.prefix}${event.configs.name} command, please report this: totalRainedAmount=${totalRainedAmount} codes:${failedNameAndCodes}`;
                        tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                        return pending.complete(event, reply);
                    }
                } default: {
                    cmdHelper.throwIfCondition(event, true, {
                        method: cmdHelper.message.somethingwrong,
                        params: { configs: event.configs, code: rain_result.senderResponse.code },
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
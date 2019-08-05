/*

*/

'use strict';

const fs = require('fs');
const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const math = require('../../utils/math');
const activityTracker = require('../../activity-tracker');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const max_rain_users_amount = 3;
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

            if(!cmdHelper.isNumber(event.args[0]) || !cmdHelper.isNumber(event.args[1])) {
                const reply = `@${event.user.username}, ${cmdHelper.message.example(event.configs)}`;
                tmi.botRespond(event.type, event.target, reply);
                return pending.complete(event, reply);
            }

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const rain_user_count = cmdHelper.clean.amount(event.args[1]);
            const rain_amount = cmdHelper.clean.amount(event.args[0]);

            if (rain_amount <= 0) {
                // ask timkim for conformation on this response
                const reply = `@${event.user.username}, can not ${event.configs.name} zero negative amount`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            }

            if (rain_user_count <= 0 || rain_user_count > max_rain_users_amount) {
                // ask timkim for conformation on this response
                const reply = `@${event.user.username}, number of people you can rain to is 1 to ${max_rain_users_amount}`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            }

            const chatternamesArr = activityTracker.getChatterActivity(event.target);

            if(chatternamesArr.length === 0) {
                const reply = `There are no active chatters, let's make some noise`;                
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            }

            const items = chatternamesArr.slice(0, rain_user_count);
            const amount = math.fixed8(rain_amount / items.length);
            const recipients = items.map(x => ({ twitchId: x.id, twitchUsername: x.username, amount: amount }));

            const rain_result = await databaseAPI.rainRequest(recipients, twitchId, twitchUsername);
            
            pending.throwNotConnected(event, tmi, rain_result);

            switch (rain_result.senderResponse.code) {
                case databaseAPI.paymentCode.InternalServerError: {
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report it: code ${rain_result.senderResponse.code}`;
                    tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.InvalidPaymentAmount: {
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report it: code ${rain_result.senderResponse.code}`;
                    tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.DatabaseSaveFailure: {
                    // ask timkim for conformation on this response
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report it: code ${rain_result.senderResponse.code}`;
                    tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.NoRecipients: {
                    let reply = `@${rain_result.senderResponse.twitchUsername}, no registered users in chat to make it rain!`;
                    reply = `DogePls SourPls You failed to summon rain, with your weak ass rain dance. ${reply} DogePls SourPls`;
                    tmi.botSay(event.target, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.InsufficientFunds: {
                    // ask timkim for conformation on this response
                    const reply = `You do not have enough in your balance! (${rain_result.senderResponse.userBalance} CORN)`;
                    tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.QueryFailure: {
                    let reply = `@${rain_result.senderResponse.twitchUsername}, you need to register and deposit / earn BITCORN in order to make it rain!`;
                    reply = `DogePls SourPls You failed to summon rain, with your weak ass rain dance. ${reply} DogePls SourPls`;
                    tmi.botSay(event.target, reply);
                    return pending.complete(event, reply);
                } case databaseAPI.paymentCode.Success: {
                    const totalRainedAmount = Math.abs(rain_result.senderResponse.balanceChange);
                    let singleRainedAmount = 0;
                    let totalRainedUsers = 0;
                    for (let i = 0; i < rain_result.recipientResponses.length; i++) {
                        const recipientResponse = rain_result.recipientResponses[i];
                        if (recipientResponse.code === 1) { // Success 
                            const msg = `Hey ${recipientResponse.twitchUsername}, ${rain_result.senderResponse.twitchUsername} just rained ${recipientResponse.balanceChange} $BITCORN on you in CryptoTradersTV's chat!`;
                            tmi.botWhisper(recipientResponse.twitchUsername, msg);
                            totalRainedUsers += 1;
                            singleRainedAmount = recipientResponse.balanceChange;
                        }
                    }
                    const recipieNames = rain_result.recipientResponses.filter(x => x.code === 1).map(x => x.twitchUsername).join();
                    const allMsg = `FeelsRainMan FeelsRainMan FeelsRainMan EUREKAAA ${recipieNames}, you all just received a glorious golden shower of ${singleRainedAmount} $BITCORN rained on you by ${rain_result.senderResponse.twitchUsername}! FeelsRainMan FeelsRainMan FeelsRainMan`
                    tmi.botSay(event.target, allMsg);

                    tmi.botSay(event.target, `GetMoney cttvGold Holy smokes! ${rain_result.senderResponse.twitchUsername} just made it RAIN ${totalRainedAmount} BITCORN on the last ${totalRainedUsers} active chatters! GetMoney cttvMadGainz`);
                    tmi.botWhisper(rain_result.senderResponse.twitchUsername, `Thank you for spreading ${totalRainedAmount} BITCORN by makin it rain on dem.. ${recipieNames} ..hoes?  Your BITCORN balance remaining is: ${rain_result.senderResponse.userBalance}`);
                    const reply = `User: ${rain_result.senderResponse.twitchUsername} rain ${totalRainedAmount} CORN on ${totalRainedUsers} users`;
                    return pending.complete(event, reply);
                } default: {
                    // ask timkim for conformation on this response
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report this: code ${rain_result.senderResponse.code}`;
                    tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                    return pending.complete(event, reply);
                }
            }
        } catch (error) {
            const reply = `Command error in ${event.configs.prefix}${event.configs.name}, please report this: ${error}`;
            return pending.complete(event, reply);
        }
    }
});
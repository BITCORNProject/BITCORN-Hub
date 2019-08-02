/*

*/

'use strict';

const tmi = require('../../config/tmi');
const math = require('../../utils/math');
const databaseAPI = require('../../config/api-interface/database-api');
const activityTracker = require('../../activity-tracker');

const max_rain_users_amount = 3;

const Pending = require('../../utils/pending');

const pending = new Pending('rain');

module.exports = Object.create({
    configs: {
        name: 'rain',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: true,
        description: 'Rain a certain Amount to the last 1-3 of People who were active',
        example: '$rain <amount> <1-3>',
        prefix: '$'
    },
    async execute(event) {

        const rain_response =
        {
            senderResponse: {
                balanceChange: 100,
                amount: 0,
                code: 1,
                twitchId: "403023969",
                twitchUsername: "bitcornhub",
                userBalance: 10101
            },
            recipientResponses: [
                {
                    balanceChange: 1,
                    code: 1,
                    twitchId: "403023969",
                    twitchUsername: "bitcornhub",
                    userBalance: 10101
                }
            ]
        }

        tmi.botSay(event.target, `@${event.user.username}, ${event.configs.prefix}${event.configs.name} system is currently under construction cttvDump System will return soon! cttvDump`);
        return { success: false, event };

        if (pending.started(even)) return pending.reply(event, tmi);

        const twitchId = event.user['user-id'];
        const twitchUsername = event.user.username;

        const rain_user_count = +(event.args[1] ? event.args[1] : 0);
        const rain_amount = +(event.args[0] ? event.args[0].replace('<', '').replace('>', '') : 0);

        if (rain_amount <= 0) {
            // ask timkim for conformation on this response
            const reply = `@${event.user.username}, can not rain zero negative amount`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        if (rain_user_count <= 0 || rain_user_count > max_rain_users_amount) {
            // ask timkim for conformation on this response
            const reply = `@${event.user.username}, number of people you can rain to is 1 to ${max_rain_users_amount}`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        const chatternamesArr = activityTracker.getChatterActivity();

        const items = chatternamesArr.slice(0, rain_user_count);
        const amount = math.fixed8(rain_amount / items.length);
        const recipients = items.map(x => ({ twitchId: x.id, twitchUsername: x.username, amount: amount }));

        const rain_result = await databaseAPI.rainRequest(recipients, twitchId, twitchUsername);

        switch (rain_result.senderResponse.code) {
            case databaseAPI.paymentCode.InternalServerError: {
                const reply = `Something went wrong with the $rain command, please report it: code ${rain_result.senderResponse.code}`;
                tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                return pending.complete(event, reply);
            } case databaseAPI.paymentCode.InvalidPaymentAmount: {
                const reply = `Something went wrong with the $rain command, please report it: code ${rain_result.senderResponse.code}`;
                tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                return pending.complete(event, reply);
            } case databaseAPI.paymentCode.DatabaseSaveFailure: {
                // ask timkim for conformation on this response
                const reply = `Something went wrong with the $rain command, please report it: code ${rain_result.senderResponse.code}`;
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
                const totalTippedAmount = +rain_result.senderResponse.balanceChange;
                const singleRainedAmount = 0;
                const totalRainedUsers = 0;
                for (let i = 0; i < rain_result.senderResponse.recipientResponses.length; i++) {
                    const recipientResponse = rain_result.senderResponse.recipientResponses[i];
                    if (recipientResponse.code === 1) { // Success 
                        const msg = `Hey ${recipientResponse.twitchUsername}, ${rain_result.senderResponse.twitchUsername} just rained ${recipientResponse.amount} $BITCORN on you in CryptoTradersTV's chat!`;
                        tmi.botWhisper(recipientResponse.twitchUsername, msg);
                        totalRainedUsers += 1;
                        singleRainedAmount = recipientResponse.amount;
                    }
                }
                const recipieNames = rain_result.senderResponse.recipientResponses.filter(x => x.code === 1).map(x => x.twitchUsername).join();
                const allMsg = `FeelsRainMan FeelsRainMan FeelsRainMan EUREKAAA ${recipieNames}, you all just received a glorious golden shower of ${singleRainedAmount} $BITCORN rained on you by ${rain_result.senderResponse.twitchUsername}! FeelsRainMan FeelsRainMan FeelsRainMan`
                tmi.botSay(event.target, allMsg);

                tmi.botSay(event.target, `GetMoney cttvGold Holy smokes! ${rain_result.senderResponse.twitchUsername} just made it RAIN ${totalTippedAmount} BITCORN on the last ${totalRainedUsers} active chatters! GetMoney cttvMadGainz`);
                tmi.botWhisper(rain_result.senderResponse.twitchUsername, `Thank you for spreading ${totalTippedAmount} BITCORN by makin it rain on dem.. ${recipieNames} ..hoes?  Your BITCORN balance remaining is: ${rain_result.senderResponse.userBalance}`);
                return pending.complete(event);
            } default: {
                // ask timkim for conformation on this response
                const reply = `Something went wrong with the rain command, please report this: code ${rain_result.senderResponse.code}`;
                tmi.botWhisper(rain_result.senderResponse.twitchUsername, reply);
                return pending.complete(event, reply);
            }
        }
    }
});
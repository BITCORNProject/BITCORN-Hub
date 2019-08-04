/*

*/

"use strict";

const fs = require('fs');
const tmi = require('../../config/tmi');
const databaseAPI = require('../../config/api-interface/database-api');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending('bitcorn');

module.exports = Object.create({
    configs: {
        name: 'bitcorn',
        accessLevel: 'CHAT',
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

        if (!event.configs.enabled) {
            const reply = `@${event.user.username}, ${cmdHelper.message.enabled(event.configs)}`;
            tmi.botRespond(event.type, event.target, reply);
            return pending.complete(event, reply);
        }

        const allowed_testers = fs.readFileSync('command_testers.txt', 'utf-8').split('\r\n').filter(x => x);
        if(allowed_testers.indexOf(event.user.username) === -1) {
            if(allowed_testers.length > 0) { 
                const reply = `@${event.user.username}, ${cmdHelper.message.enabled(event.configs)}`;
                tmi.botRespond(event.type, event.target, reply);
                return pending.complete(event, reply);
            }
        } 

        try {

            const twitchId = cmdHelper.twitch.id(event.user);
            const twitchUsername = cmdHelper.twitch.username(event.user);

            const bitcorn_result = await databaseAPI.bitcornRequest(twitchId, twitchUsername);
            if (bitcorn_result.status && bitcorn_result.status !== 200) {
                const reply = `Can not connect to server ${event.configs.prefix}${event.configs.name} failed, please report this: status ${bitcorn_result.status}`;
                tmi.botWhisper(event.user.username, reply);
                return pending.complete(event, reply);
            }

            switch (bitcorn_result.code) {
                case databaseAPI.paymentCode.Success: {
                    const reply = bitcorn_result.content.isnewuser ?
                        `Hey! You just registered a new BITCORN wallet address ${bitcorn_result.content.cornaddy} to your twitchID! Your current balance of $BITCORN is ${bitcorn_result.content.balance}` :
                        `Howdy BITCORN Farmer!  You have amassed ${bitcorn_result.content.balance} $BITCORN in your corn silo!  Your silo is currently located at this BITCORN Address: ${bitcorn_result.content.cornaddy}`
                    tmi.botWhisper(bitcorn_result.content.twitchUsername, reply);
                    return pending.complete(event, reply);
                } default: {
                    const reply = `Something went wrong with the ${event.configs.prefix}${event.configs.name} command, please report this: code ${bitcorn_result.code}`;
                    tmi.botWhisper(bitcorn_result.content.twitchUsername, reply);
                    return pending.complete(event, reply);
                }
            }
        } catch (error) {
            const reply = `Command error in ${event.configs.prefix}${event.configs.name}, please report this: ${error}`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }
    }
});
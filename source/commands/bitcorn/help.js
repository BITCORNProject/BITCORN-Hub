/*

*/

"use strict";

const tmi = require('../../config/tmi');
const tmiCommands = require('../../tmi-commands');

const Pending = require('../../utils/pending');

const pending = new Pending('help');

module.exports = Object.create({
    configs: {
        name: 'help',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Prints bitcorn commands to the chat.',
        example: '',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {
        try {

            if (pending.started(event)) return pending.reply(event, tmi);

            if(!event.configs.enabled) {
                const reply = `@${event.user.username}, ${event.configs.prefix}${event.configs.name} down for MEGASUPERUPGRADES - INJECTING STEROIDS INTO SOIL 4 cttvPump cttvCorn`;
                tmi.botSay(event.target, reply);
                return pending.complete(event, reply);
            }

            const reply = `@${event.user.username} - cttvCorn To see all available BITCORN commands, please visit https://bitcorntimes.com/help cttvCorn`;
            tmi.botSay(event.target, reply);

            return pending.complete(event, reply);
        } catch (error) {
            const reply = `Something went wrong please report this: ${error}`;
            return pending.complete(event, reply);
        }
    }
});
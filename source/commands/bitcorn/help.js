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

        if (pending.started(event)) return pending.reply(event, tmi);

        if(!event.configs.enabled) {
            const reply = `@${event.user.username}, ${event.configs.prefix}${event.configs.name} down for MEGASUPERUPGRADES - INJECTING STEROIDS INTO SOIL 4 cttvPump cttvCorn`;
            tmi.botRespond(event.type, event.target, reply);
            return pending.complete(event, reply);
        }

        try {
            
            const reply = `@${event.user.username} - cttvCorn To see all available BITCORN commands, please visit https://bitcorntimes.com/help cttvCorn`;
            tmi.botRespond(event.type, event.target, reply);

            return pending.complete(event, reply);
        } catch (error) {
            const reply = `Command error in ${event.configs.prefix}${event.configs.name}, please report this: ${error}`;
            return pending.complete(event, reply);
        }
    }
});
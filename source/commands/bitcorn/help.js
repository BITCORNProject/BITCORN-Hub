/*

*/

"use strict";

const fs = require('fs');
const tmi = require('../../config/tmi');
const cmdHelper = require('../cmd-helper');
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

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);

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
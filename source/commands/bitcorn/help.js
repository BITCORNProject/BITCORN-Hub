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

        if(!event.configs.enabled) {
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
            
            const reply = `@${event.user.username} - cttvCorn To see all available BITCORN commands, please visit https://bitcorntimes.com/help cttvCorn`;
            tmi.botRespond(event.type, event.target, reply);

            return pending.complete(event, reply);
        } catch (error) {
            const reply = `Command error in ${event.configs.prefix}${event.configs.name}, please report this: ${error}`;
            return pending.complete(event, reply);
        }
    }
});
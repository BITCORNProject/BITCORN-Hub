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
        prefix: '$'
    },
    async execute(event) {

        tmi.botSay(event.target, `@${event.user.username}, ${event.configs.prefix}${event.configs.name} system is currently under construction cttvDump System will return soon! cttvDump`);
        return { success: false, event };

        if(pending.started(event)) return pending.reply(event, tmi);

        tmi.botSay(event.target, `@${event.user.username} - cttvCorn To see all available BITCORN commands, please visit https://bitcorntimes.com/help cttvCorn`);
    
        return pending.complete(event);
    }
});
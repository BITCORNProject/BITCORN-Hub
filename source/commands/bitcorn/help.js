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
            return pending.complete(event, cmdHelper.commandHelp(event, {
                method: cmdHelper.message.help,
                params: {}
            }));
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
/*

*/

"use strict";

const fs = require('fs');
const tmi = require('../../config/tmi');
const cmdHelper = require('../cmd-helper');
const Pending = require('../../utils/pending');

const pending = new Pending();

module.exports = Object.create({
    configs: {
        name: 'reg',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Tells user to use $bitcorn instead.',
        example: '',
        prefix: '$',
        whisper: false,
        enabled: true
    },
    async execute(event) {

        if (pending.notEnabled(event)) return pending.respond(event, tmi, cmdHelper);

        if (pending.notAllowed(event)) return pending.respond(event, tmi, cmdHelper);
        
        try {
            return pending.complete(event, cmdHelper.commandHelp(event, {
                method: cmdHelper.message.usebitcorn,
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
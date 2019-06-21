/*

*/

"use strict";

const tmi = require('../../config/tmi');
const tmiCommands = require('../../tmi-commands');
const reloadModule = require('../../../reload-module');

module.exports = Object.create({
    configs: {
        name: 'reload-mod',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Reload a changed module from chat.',
        example: '',
        prefix: '!'
    },
    async execute(event) {
        const commandPath = reloadModule.fixPath(event.args[0]);
        const relPath = `./source/commands/${commandPath}`;
        const result = reloadModule.reload(relPath);
        let message= ``;
        if(result.success === true) {
            const reloaded = tmiCommands.reloadDirty(result.module);
            if(reloaded.success === true) {
                message = `Module ${event.args[0]} reloaded successfully`;
            } else {
                const added = tmiCommands.addCommand(result.module);
                if(added.success === true) {
                    message = `New module ${event.args[0]} added successfully`;
                } else {
                    message = `Adding new module ${event.args[0]} failed`;
                }
            }
        } else {
            message = `Reload module ${event.args[0]} failed`;
        }

        tmi.botSay(event.target, message);

        return { success: result.success, event };
    }
});
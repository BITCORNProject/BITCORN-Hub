/*

*/

"use strict";

const tmi = require('../../config/tmi');
const io = require('../../../main').io;
const tmiCommands = require('../../tmi-commands');

const CommandModel = require('../../models/command-model');

module.exports = Object.create({
    configs: {
        name: 'delete-command',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Deletes a command created from chat.',
        example: '',
        prefix: '!'
    },
    async execute(event) {

        const name = event.args.shift();

        const doc = await CommandModel.findOneAndDelete({ name: name }).exec();

        if (!doc) {
            tmi.botSay(event.target, `The command '${name}' does not exists`);
            return { success: false, event };
        } else {
            const commands = tmiCommands.getCommands('!');
            if (commands && commands.delete(name)) {
                tmi.botSay(event.target, `Command '${name}' was deleted`);
                io().emit('delete-command', { name: name });
                return { success: true, event };
            } else {
                tmi.botSay(event.target, `Opps the command '${name}' could not be deleted`);
                return { success: false, event };
            }
        }
    }
});
/*

*/

"use strict";

const tmi = require('../../config/tmi');
const io = require('../../../main').io;
const tmiCommands = require('../../tmi-commands');

const CommandModel = require('../../models/command-model');

module.exports = Object.create({
    configs: {
        name: 'create-command',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Create a new command to print stuff in chat.',
        example: '',
        prefix: '!'
    },
    async execute(event) {

        const name = event.args.shift();
        if(!name) {
            tmi.botSay(event.target, 'The command to be created needs a name');
            return { success: false, event };
        }

        const description = event.args.join(' ');
        if(!description) {
            tmi.botSay(event.target, 'The command to be created needs a description');
            return { success: false, event };
        }

        if (tmiCommands.hasCommand('!', name)) {
            tmi.botSay(event.target, `The command ${name} exists please use another name`);
            return { success: false, event };
        }

        const data = {
            name: name,
            description: description,
            prefix: '!'
        };
        const commandModel = new CommandModel(data);

        const result = await commandModel.save();

        tmiCommands.addCommand(data);

        tmi.botSay(event.target, `New command '${result.name}' created`);
        
        io().emit('create-command', { name: name });
        return { success: true, event };
    }
});
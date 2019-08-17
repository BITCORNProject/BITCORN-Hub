/*

*/

"use strict";

const moduleloader = require('./commands/moduleloader');

const JsonFile = require('../source/utils/json-file');

const commandPrefixes = ['!', '$'];
const commandsPaths = [
    './system',
    './twitch',
    './bitcorn'
];

const maps = {};
const files = {};

for (let i = 0; i < commandPrefixes.length; i++) {
    const prefix = commandPrefixes[i];
    maps[prefix] = new Map();
    files[prefix] = new Map();
}

function getCommands(prefix) {
    return prefix in maps ? maps[prefix] : null;
}

function getPrefixes() {
    return Object.keys(maps);
}

function hasCommand(prefix, name) {
    if (prefix in maps) {
        return maps[prefix].has(name);
    } else {
        return false;
    }
}

function getCommand(prefix, name) {
    if (prefix in maps) {
        return maps[prefix].get(name);
    } else {
        return null;
    }
}

function reloadDirty(command) {
    const { name, prefix } = prefixname(command);

    if (prefix in maps) {
        if(maps[prefix].has(name) === true) {
            return setCommandMapsValues(command);
        } else {
            return addCommand(command);
        }
    } else {
        return { success: false, command: command, message: `Can not remove command ${name} because of prefix ${prefix} not in map` };
    }
}

function addCommand(command) {
    const { name, prefix } = prefixname(command);

    if (prefix in maps) {
        if (maps[prefix].has(name) === false) {
            return setCommandMapsValues(command);
        } else {
            return { success: false, command: command, message: `Command ${name} already in map, can not add` };
        }
    } else {
        return { success: false, command: command, message: `Can not add command ${name} because of prefix ${prefix} not in map` };
    }
}

function setCommandMapsValues(command) {
    const { name, prefix, data } = prefixname(command);
    files[prefix].set(name, new JsonFile(`./settings/commands/${prefix}/${name}.json`, data));
    if(command.configs) {
        for (const key in command.__proto__.configs) {
            if (key in files[prefix].get(name).data) {
                continue;
            }
            files[prefix].get(name).data[key] = command.__proto__.configs[key];
        }
        files[prefix].get(name).setValues(files[prefix].get(name).data);
        command.__proto__.configs = files[prefix].get(name).data;
    }
    maps[prefix].set(name, command);
    return { success: true, command: command };
}

function updateCommand(command, parsed) {
    const { name, prefix } = prefixname(command);
    if (prefix in maps) {
        files[prefix].get(name).setValues(parsed);
        reloadDirty(command);
        return { success: true, command: maps[prefix].get(name) };
    } else {
        return { success: false, command: command, message: `Can not add command ${name} because of prefix ${prefix} not in map` };
    }
}

function verifyCommand(message) {
    const prefix = message.substr(0, 1);
    if (prefix in maps) {

        const args = message.slice(prefix.length).split(/ +/);
        const name = args.shift().toLowerCase();

        if (maps[prefix].has(name) === true) {
            return {success: true, command: maps[prefix].get(name), args: args};
        } else {
            return {success: false, message: `Message ${message} is not a command`};
        }
    } else {
        return {success: false, message: `Message prefix no match ${message}`};
    }
}

function prefixname(command) {
    return {
        name: command.configs ? command.configs.name : command.name,
        prefix: command.configs ? command.configs.prefix : command.prefix,
        data: command.configs ? command.configs : command
    };
}

(async () => {
    //ConfigsModel.deleteMany({}).exec();
    for (let i = 0; i < commandsPaths.length; i++) {

        const commandsPath = commandsPaths[i];
        const commands = moduleloader(commandsPath);
        for (const command of commands) {

            addCommand(command);

            const jfile = files[command.configs.prefix].get(command.configs.name);
            const file_configs = jfile.data; //await ConfigsModel.findOne({ name: command.configs.name, prefix: command.configs.prefix }).exec();

            if (file_configs) {
                for (const key in file_configs) {
                    if (key in command.configs) {
                        command.configs[key] = file_configs[key] || command.configs[key];
                    }
                }
                reloadDirty(command);
                const result = jfile.setValues(file_configs);
                if(result.success === true) {
                    console.log(`Loaded db entry for command ${command.configs.name}`);
                } else {
                    console.log(`Failed to to load command ${command.configs.name}`);
                }

            }/* else {
                try {
                    await (new ConfigsModel(command.configs)).save();
                } catch (error) {
                    console.error(error, command.configs);
                }
            }*/
        }
    }
})();

exports.getPrefixes = getPrefixes;
exports.getCommands = getCommands;
exports.getCommand = getCommand;
exports.hasCommand = hasCommand;
exports.reloadDirty = reloadDirty;
exports.addCommand = addCommand;
exports.verifyCommand = verifyCommand;
exports.updateCommand = updateCommand;
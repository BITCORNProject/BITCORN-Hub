"use strict";

const auth = require('../settings/auth');
const mysqlauth = require('../settings/mysqlauth');
const serverSettings = require('../settings/server-settings');

const tmi = require('./config/tmi');
const kraken = require('./config/authorize/kraken');
const helix = require('./config/authorize/helix');
const tmiCommands = require('./tmi-commands');
const accessLevels = require('../settings/access-levels');

//const ConfigsModel = require('./models/configs-model');
const CommandModel = require('./models/command-model');

//ConfigsModel.deleteMany({}).exec();
const controlNames = [
    'control-dashboard',
    'control-commands',
    'control-subscription',
    'control-polls',
    'control-give-aways',
    'control-settings'
];
const controlActions = new Map();

controlActions.set('control-dashboard', async (data) => {
    const authValues = auth.getValues();

    const user = await helix.getUserLogin(authValues.CHANNEL_NAME);
    const stream = await helix.getStreamById(user.id);
    const game = await helix.getGame(stream.game_id);
    stream.game = stream.success === true && game ? game : {};

    return { user: user, stream: stream };
});
controlActions.set('control-commands', async (data) => {
    const commandConfigs = {};
    const prefixes = tmiCommands.getPrefixes();
    for (let i = 0; i < prefixes.length; i++) {
        const prefix = prefixes[i];
        commandConfigs[prefix] = {};
        tmiCommands.getCommands(prefix).forEach((value, key) => {
            commandConfigs[prefix][key] = value.configs || value;
        });
    }
    return { commands: commandConfigs, prefixes: prefixes, access: accessLevels.keys };
});
controlActions.set('control-subscription', async (data) => {
    const authValues = auth.getValues();

    const user = await helix.getUserLogin(authValues.CHANNEL_NAME);

    const offset = data.index * data.limit;
    return kraken.getLimitedSubscribersById(user.id, data.limit, offset);
});
controlActions.set('control-polls', async (data) => { });
controlActions.set('control-give-aways', async (data) => { });
controlActions.set('control-settings', async (data) => {
    return { 
        auth: auth.getValues(), 
        mysql: mysqlauth.getValues(),
        server: serverSettings.getValues(), 
        'access-levels': accessLevels.getValues() 
    };
});

async function onControlRequest(data, fn) {

    const result = await controlActions.get(data.name)(data);
    data.result = result;

    fn(data);
}

async function init(app) {

    app.on('connection', (socket) => {
        const lastIndex = socket.handshake.headers.referer.lastIndexOf('/');
        const clientName = socket.handshake.headers.referer.substring(lastIndex + 1, socket.handshake.headers.referer.length);

        if (clientName === 'control-panel') {
            for (let index = 0; index < controlNames.length; index++) {
                const name = controlNames[index];
                socket.on(name, onControlRequest);
            }
            socket.on('join-chatroom', async (data, fn) => {
                const result = await tmi.joinChannel(data.channel);
                if (result.success === true) {
                    fn(result);
                } else {
                    const channels = tmi.getChannels();
                    if (channels.indexOf(data.channel) !== -1) {
                        fn({ success: true, channel: data.channel });
                    } else {
                        console.log(result);
                    }
                }
            });
            socket.on('part-chatroom', async (data, fn) => {
                const result = await tmi.partChannel(data.channel);
                if (result.success === true) {
                    fn(result);
                } else {
                    const channels = tmi.getChannels();
                    if (channels.indexOf(data.channel) === -1) {
                        fn({ success: true, channel: data.channel });
                    } else {
                        console.log(result);
                    }
                }
            });
            socket.on('chatroom-channels', (data, fn) => {
                fn(tmi.getChannels());
            });
            socket.on('access-levels', (data, fn) => {
                switch (data.action) {
                    case 'add':
                        accessLevels.add(data.name);
                        accessLevels.setValues(accessLevels.data);
                        accessLevels.setAccessLevels();
                        break;
                    case 'remove':
                        accessLevels.remove(data.name);
                        accessLevels.setValues(accessLevels.data);
                        accessLevels.setAccessLevels();
                        break;
                    default:
                        break;
                }
                fn(accessLevels.access);
            });
            socket.on('control-commands-changed', async (parsed) => {

                if (!tmiCommands.hasCommand(parsed.prefix, parsed.name)) return;

                let command = tmiCommands.getCommand(parsed.prefix, parsed.name);

                tmiCommands.updateCommand(command, parsed);
                tmiCommands.reloadDirty(command);

                console.log(`Updated command ${parsed.name}`);
            });
            socket.on('control-settings-changed', async (parsed) => {
                let result = { success: false, error: `property not found for parsed settings` };
                let updated = 'none';
                if ('auth' in parsed) {
                    result = auth.setValues(parsed.auth);
                    updated = 'auth';
                } else if ('server' in parsed) {
                    result = serverSettings.setValues(parsed.server);
                    updated = 'server';
                } else if ('mysql' in parsed) {
                    result.success = mysqlauth.setValues(parsed.mysql);
                    updated = 'mysql';
                } else if ('access-levels' in parsed) {
                    for (const key in parsed['access-levels']) {
                        if (parsed['access-levels'][key].hasOwnProperty('priority') === true) {
                            accessLevels.data[key] = parsed['access-levels'][key];
                        } else {
                            accessLevels.data[key].names = parsed['access-levels'][key]
                                .split(/[\r\n]/g)
                                .filter(x => x);
                        }
                    }

                    result = accessLevels.setValues(accessLevels.data);
                    accessLevels.setAccessLevels();
                    updated = 'access-levels';
                }
                if (result.success === false) {
                    console.error(result.error);
                } else {
                    console.log(`Update ${updated} file`);
                }
            });
        }
    });

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;
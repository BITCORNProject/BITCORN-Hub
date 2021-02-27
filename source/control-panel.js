"use strict";

const auth = require('../settings/auth');
const serverSettings = require('../settings/server-settings.json');

const tmi = require('./config/tmi');
const helix = require('./config/authorize/helix');
const tmiCommands = require('./tmi-commands');

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

    const user = await helix.getUserLogin(tmi.mainChannel());
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
    return { commands: commandConfigs, prefixes: prefixes };
});

controlActions.set('control-polls', async (data) => { });
controlActions.set('control-give-aways', async (data) => { });
controlActions.set('control-settings', async (data) => {
    return { 
        auth: auth.getValues(), 
        server: serverSettings.getValues()
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
                const result = await tmi.asyncJoinChannel(data.channel);
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
                const result = await tmi.asyncPartChannel(data.channel);
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
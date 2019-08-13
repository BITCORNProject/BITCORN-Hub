/*

*/

"use strict";

const tmi = require("tmi.js");
const auth = require('../../settings/auth');
const serverSettings = require('../../settings/server-settings');
const tmiCommands = require('../tmi-commands');
const accessLevels = require('../../settings/access-levels');
const { Queue } = require('../../public/js/server/queue');
const { Timer } = require('../../public/js/server/timer');
const math = require('../../source/utils/math');

const chatQueue = {
    items: new Queue(),
    isBusy: false
};

const whisperQueue = {
    items: new Queue(),
    isBusy: false
};

const BOT_CHAT = 'bot-chat';
const BOT_WHISPER = 'bot-whisper';

const chatUsers = {};
const clients = {};

const cooldowns = {};
const global_cooldowns = {};

async function sendChatMessages() {

    if (chatQueue.items.size() == 0) return;

    if (chatQueue.isBusy === true) return;

    chatQueue.isBusy = true;

    const chatItem = chatQueue.items.peek();

    try {
        let value = null;
        switch (chatItem.client) {
            case BOT_CHAT:
                value = await clients[BOT_CHAT].say(chatItem.target, chatItem.message)
                    .catch(error => { throw new Error(`Chat Channel [queue-size: ${chatQueue.items.size()}]: ${error}`) });
                break;
            default:
                console.error(`Queue chat item type [${chatItem.client}]`);
        }
        console.log({ value: value, sent: chatItem.client, to: chatItem.target, size: chatQueue.items.size(), message: chatItem.message });
        chatQueue.items.dequeue();
    } catch (e) {
        console.error(e);
    }

    (new Promise((resolve) => setTimeout(resolve, serverSettings.data.IRC_DELAY_MS)))
        .then(() => {
            chatQueue.isBusy = false;
            sendChatMessages();
        })
}

async function sendWhisperMessages() {

    if (whisperQueue.items.size() == 0) return;

    if (whisperQueue.isBusy === true) return;

    whisperQueue.isBusy = true;

    const whisperItem = whisperQueue.items.peek();

    try {
        let value = null;
        switch (whisperItem.client) {
            case BOT_WHISPER:
                value = await clients[BOT_WHISPER].whisper(whisperItem.target, whisperItem.message)
                    .catch(error => { throw new Error(`Whisper Channel [queue-size: ${whisperQueue.items.size()}]: ${error}`) });
                break;
            default:
                console.error(`Queue whisper item type [${chatItem.client}]`);
        }
        console.log({ value: value, sent: whisperItem.client, to: whisperItem.target, size: whisperQueue.items.size(), message: whisperItem.message });
        whisperQueue.items.dequeue();
    } catch (e) {
        console.error(e);
    }

    (new Promise((resolve) => setTimeout(resolve, serverSettings.data.IRC_DELAY_MS)))
        .then(() => {
            whisperQueue.isBusy = false;
            sendWhisperMessages();
        })
}

async function onMessage(type, target, user, msg, self) {
    try {

        const { success, command, args, message } = tmiCommands.verifyCommand(msg.trim());


        if (success === true) {
            const cname = command.configs.prefix + command.configs.name
            if ('cooldown' in command.configs) {

                if (command.configs.global_cooldown === false) {
                    if (user.username in cooldowns) {
                        const cooldownTime = +(cooldowns[user.username][cname]);
                        const time = (new Date()).getTime();
                        if (time < cooldownTime) {
                            const timeLeft = math.fixed((cooldownTime - time) * 0.001, 2);
                            const cooldown_result = { success: false, message: `@${user.username} cooldown ${timeLeft} seconds remaining on ${cname} command` };
                            console.log(cooldown_result);
                            botWhisper(user.username, cooldown_result.message);
                            return cooldown_result;
                        }
                    } else {
                        cooldowns[user.username] = {};
                    }
                    cooldowns[user.username][cname] = (new Date()).getTime() + (+command.configs.cooldown);
                } else {
                    if (cname in global_cooldowns) {
                        const cooldownTime = +(global_cooldowns[cname]);
                        const time = (new Date()).getTime();
                        if (time < cooldownTime) {
                            const timeLeft = math.fixed((cooldownTime - time) * 0.001, 2);
                            const cooldown_result = { success: false, message: `@${user.username} global cooldown ${timeLeft} seconds remaining on ${cname} command` };
                            console.log(cooldown_result);
                            botWhisper(user.username, cooldown_result.message);
                            return cooldown_result;
                        }
                    }
                    global_cooldowns[cname] = (new Date()).getTime() + (+command.configs.cooldown);
                }
            }
            if (command.execute) {

                //if (command.configs.whisper && type !== 'whisper') return { success: false, message: `type=${type}` };
                //if (!command.configs.whisper && type === 'whisper') return { success: false, message: `type=${type}` };
                if (!command.configs.whisper && type === 'whisper') return { success: false, message: `Command ${cname} whisper not enabled type=${type}` };
                const timer = new Timer();

                timer.start();
                const result = await command.execute(Object.create({
                    type,
                    target,
                    msg,
                    args,
                    user,
                    configs: command.configs
                }));
                timer.stop(`Command Execution: ${result.event.user.username} ${result.event.configs.name} ${result.event.msg} `);
                console.log(result);
                if (result.success === false) {
                    console.log(`Command ${result.event.configs.prefix}${result.event.configs.name} execution failed - message: ${result.message}`, result);
                }
                return result;
            } else {
                botSay(target, command.description);
                return { success: true };
            }
        } else if (message) {
            const message_result = { success: success, message: message };
            //console.log(message_result);
            return message_result;
        }

        const failed_result = { success: success, message: `User ${user.username} does not have access to ${command.configs.name}` };
        console.log(failed_result);
        return failed_result;
    } catch (error) {
        const result = { success: false, message: `Command ${msg.trim()} is not for this bot for user ${user.username}` };
        /*
            // TODO: log to file or database
                const logged = logit('Auto.Twitch', `Error: ${error}`);
                console.log(logged);
        */
        console.log(result);
        console.error(error);
        return result;
    }
}

async function onWhisperHandler(target, user, msg, self) {

    if (user.username.toLowerCase() === auth.data.BOT_USERNAME.toLowerCase()) return { success: false, message: `self` };

    onMessage('whisper', target, user, msg, self);

}

async function onMessageHandler(target, user, msg, self) {

    if (self) return { success: false, message: `self` };

    onMessage('chat', target, user, msg, self);
}

function onConnectedChatHandler(addr, port) {
    console.log({ success: true, message: `TMI connected to chat ${addr}:${port}` });
}

function onConnectedWhisperHandler(addr, port) {
    console.log({ success: true, message: `TMI connected to whisper channel ${addr}:${port}` });
}

function onNamesHandler(channel, usernames) {
    for (let i = 0; i < usernames.length; i++) {
        const username = usernames[i];
        addChatUser(channel, username);
    }
}

function onJoinHandler(channel, username) {
    addChatUser(channel, username);
}

function onPartHandler(channel, username) {
    removeChatUser(channel, username);
}

function botSay(target, message) {
    enqueueMessageByType(BOT_CHAT, target, message);
}

function botWhisper(target, message) {
    enqueueMessageByType(BOT_WHISPER, target, message);
}

function botRespond(type, target, message) {
    switch (type) {
        case 'chat':
            botSay(target, message);
            break;
        case 'whisper':
            botWhisper(target, message);
            break;
        default:
            console.error(`botRespond type ${type} is not a valid type`);
            break;
    }
}

function enqueueMessageByType(client, target, message) {

    switch (client) {
        case BOT_CHAT:
            if (clients[client].readyState() != 'OPEN') {
                console.log({ success: false, message: `IRC client ${client} not OPEN`, 'irc-client': client, position: chatQueue.items.size() });
            }
            chatQueue.items.enqueue({ target, message, client });
            sendChatMessages();
            break;
        case BOT_WHISPER:
            if (clients[client].readyState() != 'OPEN') {
                console.log({ success: false, message: `IRC client ${client} not OPEN`, 'irc-client': client, position: whisperQueue.items.size() });
            }
            whisperQueue.items.enqueue({ target, message, client });
            sendWhisperMessages();
            break;
        default:
            console.error(`Queue enqueueMessageByType item type [${client}]`);
    }
}

function cleanChannel(channel) {
    channel = channel.replace ? channel.replace(/#/g, '') : channel;
    return channel;
}

function addChannel(channel) {
    channel = cleanChannel(channel);
    if (!(channel in chatUsers)) {
        chatUsers[channel] = {};
        //console.log(`+ ${channel}`);
    }
}

function removeChannel(channel) {
    channel = cleanChannel(channel);
    if (channel in chatUsers) {
        //console.log(`- ${channel}`);
        delete chatUsers[channel];
    }
}

function addChatUser(channel, username) {
    channel = cleanChannel(channel);
    addChannel(channel);
    if (!(username in chatUsers[channel])) {
        chatUsers[channel][username] = { channel: channel, username: username };
        //console.log(`++ ${channel} ${username}`);
    }
}

function removeChatUser(channel, username) {
    channel = cleanChannel(channel);
    if (channel in chatUsers) {
        if (username in chatUsers[channel]) {
            //console.log(`-- ${channel} ${username}`);
            delete chatUsers[channel][username];
        }
        if (Object.keys(chatUsers[channel]).length === 0) {
            removeChannel(channel);
        }
    }
}

function getChannels() {
    return auth.data.CHANNEL_NAME.split(',').map(x => x.trim());
}

function mainChannel() {
    return getChannels()[0];
}

async function init() {

    const channels = getChannels();
    clients[BOT_CHAT] = new tmi.client({
        connection: {
            cluster: "aws",
            reconnect: true
        },
        identity: {
            username: auth.data.BOT_USERNAME,
            password: auth.data.OAUTH_TOKEN
        },
        channels: channels
    });

    clients[BOT_WHISPER] = new tmi.client({
        connection: {
            reconnect: true,
            server: "group-ws.tmi.twitch.tv",
            port: 80
        },
        identity: {
            username: auth.data.BOT_USERNAME,
            password: auth.data.OAUTH_TOKEN
        },
        channels: channels
    });

    clients[BOT_CHAT].on('connected', onConnectedChatHandler);
    clients[BOT_CHAT].on('chat', onMessageHandler);

    clients[BOT_CHAT].on('names', onNamesHandler);
    clients[BOT_CHAT].on('join', onJoinHandler);
    clients[BOT_CHAT].on('part', onPartHandler);

    clients[BOT_WHISPER].on('connected', onConnectedWhisperHandler);
    clients[BOT_WHISPER].on('whisper', onWhisperHandler);

    try {
        await clients[BOT_CHAT].connect();
        await clients[BOT_WHISPER].connect();
        return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
    } catch (error) {
        return { success: false, message: `${require('path').basename(__filename).replace('.js', '.')}init()`, error };
    }
}

async function joinChannel(channel) {
    try {
        const data = await clients[BOT_CHAT].join(channel);
        addChannel(data);
        return { success: true, channel: cleanChannel(data) };
    } catch (error) {
        console.log(`Join Error: `, error);
        return { success: false, error: error };
    }
}

async function partChannel(channel) {
    try {
        const data = await clients[BOT_CHAT].part(channel);
        removeChannel(data);
        return { success: true, channel: cleanChannel(data) };
    } catch (error) {
        console.log(`Part Error: `, error);
        return { success: false, error: error };
    }
}

function getChannels() {
    return auth.data.CHANNEL_NAME.split(',').map(x => cleanChannel(x));
}

function getChatUsers(channel) {
    return chatUsers[channel] || {}
}

function addMessageCallback(callback) {
    clients[BOT_CHAT].on('chat', callback);
}

function removeMessageCallback(callback) {
    clients[BOT_CHAT].off('chat', callback);
}

exports.init = init;
exports.getChannels = getChannels;
exports.mainChannel = mainChannel;
exports.botSay = botSay;
exports.botWhisper = botWhisper;
exports.botRespond = botRespond;
exports.getChannels = getChannels;
exports.getChatUsers = getChatUsers;
exports.joinChannel = joinChannel;
exports.partChannel = partChannel;
exports.addMessageCallback = addMessageCallback;
exports.removeMessageCallback = removeMessageCallback;
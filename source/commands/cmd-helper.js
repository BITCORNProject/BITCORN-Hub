/*

*/

"use strict";

const util = require('util');
const tmi = require('../config/tmi');

function brackets(value) {
    return value ? value.replace('<', '').replace('>', '') : ''
}

function at(value) {
    return brackets(value).replace('@', '');
}

function atLower(value) {
    return at(value).toLowerCase();
}

function amount(value) {
    return +brackets(value);
}

function isNumber(value) {
    return !isNaN(value);
}

function _respond(func, target, condition, reply) {
    if (condition) {
        func(target, reply);
        return true;
    }
    return false;
}

const funcs = {
    'chat': (event, condition, reply) => _respond(tmi.botSay, event.target, condition, `@${event.user.username}, ${reply}`),
    'whisper': (event, condition, reply) => _respond(tmi.botWhisper, event.user.username, condition, reply)
};

function throwIfCondition(event, condition, obj) {
    const message = obj.method(obj.params);
    if (obj.reply(event, condition, message)) {
        const e = new Error(message);
        e.hasMessage = true;
        throw e;
    }
}

const messages = {
    example: (obj) => util.format(`Here is an example of the command - %s`, obj.configs.example),
    insufficientfunds: {
        notenough: (obj) => util.format(`You do not have enough in your balance! (%d CORN)`, obj.balance),
        failed: () => `You failed to withdraw: insufficient funds`
    }
}

function selectSwitchCase(event, obj) {
    const reply = obj.methods.message(obj.params);
    obj.methods.reply(event, true, reply);
    return reply;
}

function commandError(event, obj) {
    const reply = obj.method(obj.params);
    funcs['whisper'](event, true, reply);
    return reply;
}

function commandHelp(event, obj) {
    const reply = obj.method(obj.params);
    funcs[event.type](event, true, reply);
    return reply;
}

module.exports = {
    isNumber: isNumber,
    clean: {
        brackets: brackets,
        at: at,
        atLower: atLower,
        amount: amount    
    },
    twitch: {
        id: (user) => user['user-id'],
        username: (user) => user['username'],
    },
    message: {
        enabled: (obj) => `${obj.configs.prefix}${obj.configs.name} down for MEGASUPERUPGRADES - INJECTING STEROIDS INTO SOIL 4 cttvPump cttvCorn`,
        example: messages.example,
        nonegitive: (obj) => `Can not ${obj.configs.name} zero or negative amount`,
        maxamount: (obj) => `Can not ${obj.configs.name} an amount that large - ${messages.example(obj)}`,
        numpeople: (obj) => `Number of people you can ${obj.configs.name} to is 1 to ${obj.max}`,
        noname: (obj) => `You must ${obj.configs.name} someone - ${messages.example(obj)}`,
        badname: (obj) => `cttvMOONMAN Here's a tip for you: ${obj.receiverName} who? cttvMOONMAN`,
        nochatters: () => `There are no active chatters, let's make some noise cttvCarlos cttvGo cttv3`,
        cornaddyneeded: () => `Can not withdraw without a cornaddy - $withdraw <amount> <address>`,
        apifailed: (obj) => `Can not connect to server ${obj.configs.prefix}${obj.configs.name} failed, please report this: status ${obj.status}`,
        somethingwrong: (obj) => `Something went wrong with the ${obj.configs.prefix}${obj.configs.name} command, please report this: code ${obj.code}`,
        commanderror: (obj) => `Command error in ${obj.configs.prefix}${obj.configs.name}, please report this: ${obj.error}`,
        help: () => `cttvCorn To see all available BITCORN commands, please visit https://bitcorntimes.com/help cttvCorn`,
        notnumber: messages.example,
        insufficientfunds: {
            rain: messages.insufficientfunds.notenough,
            tipcorn: messages.insufficientfunds.notenough,
            withdraw: messages.insufficientfunds.failed
        },
        queryfailure: {
            rain: () => `DogePls SourPls You failed to summon rain, with your weak ass rain dance. You need to register and deposit / earn BITCORN in order to make it rain! DogePls SourPls`,
            tipcorn: {
                sender: () => `cttvMOONMAN Here's a tip for you: You need to register and deposit / earn BITCORN in order to use tip! cttvMOONMAN`,
                recipient: (obj) => `${obj.twitchUsername} needs to register before they can be tipped!`
            }
        },
        norecipients: {
            rain: () => `DogePls SourPls You failed to summon rain, with your weak ass rain dance. No registered users in chat to make it rain! DogePls SourPls`,
            tipcorn: () => `cttvMOONMAN Here's a tip for you: Not a registered user. cttvMOONMAN`
        }
    },
    reply: {
        chat: (event, condition, reply) => funcs['chat'](event, condition, reply),
        whisper: (event, condition, reply) => funcs['whisper'](event, condition, reply),
        respond: (event, condition, reply) => funcs[event.type](event, condition, reply)
    },
    throwIfCondition: throwIfCondition,
    selectSwitchCase: selectSwitchCase,
    commandError: commandError,
    commandHelp: commandHelp
};
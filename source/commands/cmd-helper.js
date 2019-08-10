/*

*/

"use strict";

const util = require('util');
const tmi = require('../config/tmi');
const JsonFile = require('../../source/utils/json-file');

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
    'chat': (event, condition, reply, mention = true) => _respond(tmi.botSay, event.target, condition, mention ? `@${event.user.username}, ${reply}` : reply),
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

function commandReply(event, obj) {
    const reply = obj.methods.message(obj.params);
    obj.methods.reply(event, true, reply);
    return reply;
}

function commandReplyByCondition(event, condition, obj) {
    const index = condition ? 1 : 0;
    const reply = obj.messages[index](obj.params[index]);
    obj.reply(event, true, reply);
    return reply;
}

function commandReplies(event, objs) {
    let reply = ``;
    for (let index = 0; index < objs.length; index++) {
        const obj = objs[index];
        reply = obj.message(obj.params);
        obj.reply(event, true, reply);
    }
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
//an error occured please contact bitcorn support staff on discord
const messageStrings = new JsonFile('./settings/strings.json', {
    enabled: `%s%s down for MEGASUPERUPGRADES - INJECTING STEROIDS INTO SOIL 4 cttvPump cttvCorn`,
    example: `Here is an example of the command - %s`,
    nonegitive: `Can not %s zero or negative amount`,
    maxamount: `Can not %s an amount that large - %s`,
    numpeople: `Number of people you can %s to is 1 to %d`,
    noname: `You must %s someone - %s`,
    badname: `cttvMOONMAN Here's a tip for you: %s who? cttvMOONMAN`,
    nochatters: `There are no active chatters, let's make some noise cttvCarlos cttvGo cttv3`,
    cornaddyneeded: `Can not withdraw without a cornaddy - $withdraw <amount> <address>`,
    apifailed: `Can not connect to server %s%s failed, please report this: status %d`,
    somethingwrong: `Something went wrong with the %s%s command, please report this: code %d`,
    commanderror: `Command error in %s%s, please report this: %s`,
    help: `cttvCorn To see all available BITCORN commands, please visit https://bitcornproject.com/help/ cttvCorn`,
    usebitcorn: `Use $bitcorn to register and see your balance`,
    notnumber: `Here is an example of the command - %s`,
    success: {
        withdraw: `You have successfully withdrawn BITCORN off of your Twitch Wallet Address: https://explorer.bitcornproject.com/tx/%s`
    },
    insufficientfunds: {
        rain: `You do not have enough in your balance! (%d CORN)`,
        tipcorn: `You do not have enough in your balance! (%d CORN)`,
        withdraw: `You failed to withdraw: insufficient funds`
    },
    queryfailure: {
        rain: `DogePls SourPls You failed to summon rain, with your weak ass rain dance. You need to register and deposit / earn BITCORN in order to make it rain! DogePls SourPls`,
        tipcorn: {
            sender: `cttvMOONMAN Here's a tip for you: You need to register and deposit / earn BITCORN in order to use tip! cttvMOONMAN`,
            recipient: `%s needs to register before they can be tipped!`
        },
        withdraw: `You failed to withdraw: you need to register with the $bitcorn command to use withdraw`
    },
    norecipients: {
        rain: `DogePls SourPls You failed to summon rain, with your weak ass rain dance. No registered users in chat to make it rain! DogePls SourPls`,
        tipcorn: `cttvMOONMAN Here's a tip for you: Not a registered user. cttvMOONMAN`
    },
    transactiontoolarge: {
        withdraw: `Withdraw transaction too large`
    },
    token: {
        success: `Your Token is '%s' (no ' ' quotes) - Use this to login here: https://dashboard.bitcornproject.com/ - If you use $token again you will receive a new token your old token will be deleted.`,
        failed: `You need to register with the $bitcorn command to request a token`
    },
    bitcorn: {
        isnewuser: `Hey! You just registered a new BITCORN wallet address %s to your twitchID! Your current balance of $BITCORN is %s`,
        notnewuser: `Howdy BITCORN Farmer!  You have amassed %s $BITCORN in your corn silo!  Your silo is currently located at this BITCORN Address: %s`
    },
    tipcorn: {
        recipient: `You received %d BITCORN from %s!`,
        tochat: `cttvCorn @%s just slipped @%s %d BITCORN with a FIRM handshake. cttvCorn`,
        sender: `You tipped %s %d BITCORN! Your BITCORN balance remaining is: %d`
    }
});

function strings() {
    return messageStrings.getValues();
}

const messages = {
    example: (obj) => util.format(strings().example, obj.configs.example)
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
        enabled: (obj) => util.format(strings().enabled, obj.configs.prefix, obj.configs.name),
        example: (obj) => util.format(strings().example, obj.configs.example),
        nonegitive: (obj) => util.format(strings().nonegitive, obj.configs.name),
        maxamount: (obj) => util.format(strings().maxamount, obj.configs.name, messages.example(obj)),
        numpeople: (obj) => util.format(strings().numpeople, obj.configs.name, obj.max),
        noname: (obj) => util.format(strings().noname, obj.configs.name, messages.example(obj)),
        badname: (obj) => util.format(strings().badname, obj.receiverName),
        nochatters: () => util.format(strings().nochatters),
        cornaddyneeded: () => util.format(strings().cornaddyneeded),
        apifailed: (obj) => util.format(strings().apifailed, obj.configs.prefix, obj.configs.name, obj.status),
        somethingwrong: (obj) => util.format(strings().somethingwrong, obj.configs.prefix, obj.configs.name, obj.code),
        commanderror: (obj) => util.format(strings().commanderror, obj.configs.prefix, obj.configs.name, obj.error),
        help: () => util.format(strings().help),
        usebitcorn: () => util.format(strings().usebitcorn),
        notnumber: (obj) => util.format(strings().notnumber, obj.configs.example),
        success: {
            withdraw:  (obj) => util.format(strings().success.withdraw, obj.txid),
        },
        insufficientfunds: {
            rain: (obj) => util.format(strings().insufficientfunds.rain, obj.balance),
            tipcorn: (obj) => util.format(strings().insufficientfunds.tipcorn, obj.balance),
            withdraw: () => util.format(strings().insufficientfunds.withdraw)
        },
        queryfailure: {
            rain: () => util.format(strings().queryfailure.rain),
            tipcorn: {
                sender: () => util.format(strings().queryfailure.tipcorn.sender),
                recipient: (obj) => util.format(strings().queryfailure.tipcorn.recipient, obj.twitchUsername)
            },
            withdraw: () => util.format(strings().queryfailure.withdraw),
        },
        norecipients: {
            rain: () => util.format(strings().norecipients.rain),
            tipcorn: () => util.format(strings().norecipients.tipcorn)
        },
        transactiontoolarge: {
            withdraw: () => util.format(strings().transactiontoolarge.withdraw)
        },
        token: {
            success: (obj) => util.format(strings().token.success, obj.token),
            failed: () => util.format(strings().token.failed),
        },
        bitcorn: {
            isnewuser: (obj) => util.format(strings().bitcorn.isnewuser, obj.cornaddy, obj.balance),
            notnewuser: (obj) => util.format(strings().bitcorn.notnewuser, obj.balance, obj.cornaddy)
        },
        tipcorn: {
            recipient: (obj) => util.format(strings().tipcorn.recipient, obj.balanceChange, obj.twitchUsername),
            tochat: (obj) => util.format(strings().tipcorn.tochat, obj.senderName, obj.recipientName, obj.totalTippedAmount),
            sender: (obj) => util.format(strings().tipcorn.sender, obj.twitchUsername, obj.totalTippedAmount, obj.userBalance)
        }
    },
    reply: {
        chat: (event, condition, reply) => funcs['chat'](event, condition, reply),
        chatnomention: (event, condition, reply) => funcs['chat'](event, condition, reply, false),
        whisper: (event, condition, reply) => funcs['whisper'](event, condition, reply),
        respond: (event, condition, reply) => funcs[event.type](event, condition, reply)
    },
    throwIfCondition: throwIfCondition,
    commandReply: commandReply,
    commandReplyByCondition: commandReplyByCondition,
    commandReplies: commandReplies,
    commandError: commandError,
    commandHelp: commandHelp
};
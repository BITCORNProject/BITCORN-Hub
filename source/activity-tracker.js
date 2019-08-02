/*

*/

"use strict";

const tmi = require('./config/tmi');


const MAX_RAIN_USER_CACHE = 100 * 1.4;
const activeChatters = [];
let cursorIndex = -1;

async function onChatMessage(target, user, msg, self) {
    const event = Object.create({ target, user, msg, self });
    if (event.self) { return { success: false, message: `self`, event }; }
    addToActiveChatters(event.user['user-id'], event.user.username);
}

const ommit_usernames = [
    "nightbot",
    "cttvbotcorn",
    "bitcornhub",
    "stay_hydrated_bot"
];

function addToActiveChatters(id, username) {
    if (ommit_usernames.indexOf(username) !== -1) return;

    cursorIndex = (cursorIndex + 1) % MAX_RAIN_USER_CACHE;
    activeChatters[cursorIndex] = { id, username };
}

function getChatterActivity() {

    const chatternames = {};
    for (let index = 0; index < activeChatters.length; index++) {
        const username = activeChatters[index].username;
        const id = activeChatters[index].id;
        if (!chatternames[username]) chatternames[username] = { id, username, count: 0 };
        chatternames[username].count++;
    }

    const chatternamesArr = [];
    for (const key in chatternames) {
        chatternamesArr.push(chatternames[key]);
    }

    chatternamesArr.sort((a, b) => b.count - a.count);

    return chatternamesArr;
}

async function init() {

    tmi.addMessageCallback(onChatMessage);

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;
exports.getChatterActivity = getChatterActivity;


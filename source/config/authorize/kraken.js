/*

*/

"use strict";

const { TwitchAPI, AppOptions } = require('./twitch-api');
const auth = require('../../../settings/auth');

const appOptions = new AppOptions(
	'https://api.twitch.tv/kraken/oauth2/authorize',
	auth.data.KRAKEN_CLIENT_ID,
	auth.data.KRAKEN_SECRET,
	auth.data.KRAKEN_CALLBACK_URL,
	[
        'openid',
        'viewing_activity_read',
        'user_subscriptions',
        'channel_editor',
        'channel_read',
        'channel_subscriptions',
        'channel_check_subscription'
    ]
);

const api = new TwitchAPI(appOptions);

api.setChannel = () => {
	return getChannel()
		.then((_id) => {
			api.channel.user_id = _id;
		})
		.catch(error => { error });
};

async function getChannel() {
    return api.getEndpoint(`https://api.twitch.tv/kraken/channel`);
}

async function getUserLogins(usernames) {
	return api.getEndpoint(`https://api.twitch.tv/kraken/users?login=${usernames}`);
}

async function getSubscribersById(channel_id) {
    return getLimitedSubscribersById(channel_id, 100, 0, 'asc');
}

// direction = asc || desc
async function getLimitedSubscribersById(channel_id, limit, offset, direction = 'asc') {
    return api.getEndpoint(`https://api.twitch.tv/kraken/channels/${channel_id}/subscriptions?limit=${limit}&offset=${offset}&direction=${direction}`);
}

async function getLimitedSubscribers(limit, offset, direction = 'asc') {
    return getLimitedSubscribersById(getChannelId(), limit, offset, direction);
}

async function getChannelSubscribers() {
    return getSubscribersById(getChannelId());
}
async function getUserSubscribes(user_id) {
    return api.getEndpoint(`https://api.twitch.tv/kraken/channels/${getChannelId()}/subscriptions/${user_id}`);
}

function getChannelId() {
    return api.channel.user_id;
}

async function init(app) {
    app.on('connection', (socket) => {
        const lastIndex = socket.handshake.headers.referer.lastIndexOf('/');
        const clientName = socket.handshake.headers.referer.substring(lastIndex + 1, socket.handshake.headers.referer.length);

        if (clientName === 'control-panel') {
            //console.log('KRAKEN', clientName);
            socket.emit('login-kraken', { name: 'kraken', authenticated: api.channel.user_id });
        }
    });

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;
exports.authUrl = () => appOptions.authUrl();
exports.authenticateCode = ({ code, state }) => api.authenticateCode({ code, state });
exports.getChannel = getChannel;
exports.getUserLogins = getUserLogins;
exports.getUserSubscribes = getUserSubscribes;
exports.getChannelSubscribers = getChannelSubscribers;
exports.getLimitedSubscribers = getLimitedSubscribers;
exports.getLimitedSubscribersById = getLimitedSubscribersById;

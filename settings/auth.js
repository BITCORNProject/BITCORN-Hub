/*
   
*/

"use strict";

const JsonFile = require('../source/utils/json-file');

// These are example values
const auth = new JsonFile('./settings/auth.json', {
    PORT: 3000,
    BOT_USERNAME: 'wollac',
    OAUTH_TOKEN: 'oauth:lkjlklfvb9085klmndf9d78b908590ojkl',

	CHANNEL_NAME: 'markettraderstv,callowcreation,d4rkcide',
	
    HELIX_CLIENT_ID: '1lhfgjh008rfgsd0lsdg90438jpdg9u904j',
    HELIX_SECRET: '1lkjlklfvb9085klmndf9d78b908590ojkl',
    HELIX_CALLBACK_URL: 'http://localhost:3000/auth/helix/callback',
});


module.exports = auth;
require('dotenv').config({ path: __dirname + '/./.env' });

require('./_api-shared/settings-service');
require('./_twitch-service/app');
require('./_bot-service/app');
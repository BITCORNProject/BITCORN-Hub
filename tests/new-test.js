
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
	try {

		const timer = new _.Timer();
		timer.start();

		const url = _.databaseApi.db_endpoints.getValues().rain;
		const user = await _.helix.getUserLogin('naivebot');
		const recipients = [
			`twitch|75987197`,
			`twitch|${user.id}`
		];
		const amount = 41 / recipients.length;
		const body = {
			from: `twitch|120524051`,
			to: recipients,
			platform: 'twitch',
			amount: amount,
			columns: ['balance', 'twitchusername']
		};

		const result = await _.databaseApi._criticalArbitraryRequest(url, '120524051', body);

		console.log(result);

		const time = timer.stop();
		console.log('Execution time: ' + time);

		_.assert(time);
	} catch (error) {
		console.error(error);
	}
})();
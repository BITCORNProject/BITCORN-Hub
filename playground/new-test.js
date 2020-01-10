
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
	try {

		const timer = new _.Timer();
		timer.start();

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
			columns: ['balance', 'twitchusername', 'isbanned']
		};


		const result = await _.databaseApi.request('120524051', null).bitcorn();

		console.log(result);

		const time = timer.stop();
		console.log('Execution time: ' + time);

		_.assert(time);
	} catch (error) {
		console.log(error);

		/*const result = await _.errorLogger.asyncErrorLogger(error, 0);

		console.log(result.status ? result.status : result);*/
	}
})();
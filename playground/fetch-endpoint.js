
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
	try {

		const twitchId = (await _.helix.getUserLogin('callowcreation')).id;
		const recipients = [
			{
				id: (await _.helix.getUserLogin('naivebot')).id,
				amount: 100
			},
		];

		const result = await _.databaseApi.rainRequest(recipients, twitchId);

		console.log(recipients);

		console.log(result);
		_.assert(result);
	} catch (error) {
		console.error(error);
	}
})();
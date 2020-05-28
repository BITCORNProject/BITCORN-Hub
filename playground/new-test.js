
/*

*/

"use strict";

const auth = require('../settings/auth');
//const _ = require('./test-dependencies');

const { Timer } = require('../public/js/server/timer');

(async () => {
	try {

		const timer = new Timer();
		timer.start();
		// client.js

		const WebSocket = require('ws')
		const url = 'ws://localhost:8080'
		const connection = new WebSocket(url)
		
		connection.onopen = () => {
			connection.send('Message From Client')
		}

		connection.onerror = (error) => {
			console.log('WebSocket error:', error)
		}

		connection.onmessage = (e) => {
			console.log(e.data)
		}

		if(connection.readyState === connection.OPEN) {
			connection.send();
		}

		const time = timer.stop();
		console.log('Execution time: ' + time);

		assert(time);
	} catch (error) {
		console.log(error);

		/*const result = await _.errorLogger.asyncErrorLogger(error, 0);

		console.log(result.status ? result.status : result);*/
	}
})();
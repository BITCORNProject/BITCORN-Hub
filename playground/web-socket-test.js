
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
	try {

		const timer = new _.Timer();
		timer.start();

		const url = "http://localhost:1338" ;//_.databaseApi.rooturl().database


		let ws;
		let reconnectInterval = 1000 * 3; //ms to wait before reconnect

		function heartbeat() {
			const message = {
				type: 'PING'
			};
			console.log(['SENT: ' + JSON.stringify(message)]);
			ws.send(JSON.stringify(message));
		}

		function connect() {
			const heartbeatInterval = 1000 * 60 * 4; //ms between PING's
			let heartbeatHandle;
	
			ws = new _.WebSocket(url);
	
			ws.onopen = (event) => {
				console.log(['INFO: Socket Opened'], event);
				heartbeat();
				heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
			};
	
			ws.onerror = (error) => {
				console.log(['ERR:  ' + error]);
			};
	
			ws.onmessage = async (event) => {
				console.log([event]);
			};
	
			ws.onclose = () => {
				console.log(['INFO: Socket Closed']);
				clearInterval(heartbeatHandle);
				console.log(['INFO: Reconnecting...']);
				reconnectInterval = reconnectInterval * 2 + Math.random() * 1000;
				setTimeout(connect, reconnectInterval);
			};
	
		}
	
		connect();

		const time = timer.stop();
		console.log('Execution time: ' + time);

		_.assert(time);
	} catch (error) {
		console.error(error);
	}
})();
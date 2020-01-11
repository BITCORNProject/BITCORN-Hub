
const express = require('express');
const auth = require('./settings/auth');

const app = express();

let io = null;

app.get('/', (req, res) => {
	res.status(200).send('Hello, World!');
});

if (module === require.main) {

	(async () => {

		const tmi = require('./src/configs/tmi');
		
		tmi.registerEvents();

		const results = await Promise.all([
			tmi.connectToChat()
		]);

		console.log(results);

		const server = await new Promise(resolve => {
			const server = app.listen(auth.data.PORT, () => {
				resolve(server);
			});
		});

		
		io = require('socket.io')(server);

		const port = server.address().port;
		console.log(`App listening on port ${port}`);

	})();

}

module.exports = {
	app,
	io: () => io
};
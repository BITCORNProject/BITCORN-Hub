
const express = require('express');
const auth = require('./settings/auth');

const app = express();

let io = null;

app.get('/', (req, res) => {
	res.status(200).send('Hello, World!');
});

if (module === require.main) {

	new Promise(resolve => {
		const server = app.listen(auth.data.PORT, () => {
			resolve(server);
		});
	}).then(server => {
		
        io = require('socket.io')(server);

		const port = server.address().port;
		console.log(`App listening on port ${port}`);
	});

}

module.exports = {
	app,
	io: () => io
};
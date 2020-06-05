/*

*/

"use strict";

const controllers = require('../controllers');
const helix = require('../authorize/helix');
const login = controllers.login;
const callback = controllers.callback;

const authMap = new Map();
authMap.set('helix', { login: login.helix, callback: callback.helix });

exports.init = async (app) => {
	app.post('/user', async (req, res, next) => {

		try {
			
			if (!verifyAuthorization({ headers: req.headers })) throw new Error('Unauthorized');

			const { username, columns } = req.body;

			if (!username) throw new Error('Username can not be empty a username is required');

			const { data: [user] } = await helix.getUserLogin(username);

			if (!user) return res.status(404).json({ error: new Error(`User not found with username: ${username}`) });

			if (user.error) return res.json(user);

			res.json(assignColumns(columns, user));

		} catch (error) {
			res.json({ error: error.message ? error.message : error });
		}
	});

	app.post('/users', async (req, res, next) => {

		try {

			if (!verifyAuthorization({ headers: req.headers })) throw new Error('Unauthorized');

			const { user_logins: chunked, columns } = req.body;

			if (chunked.length === 0) throw new Error('Users logins array can not be empty at least one username is required');

			const user_logins = chunked.map(x => `login=${x}`).join('&');
			const result = await helix.getUserLogins(user_logins);

			if (result.error) return res.json(result);

			const outUsers = [];

			for (let i = 0; i < result.data.length; i++) {
				outUsers.push(assignColumns(columns, result.data[i]));
			}

			res.json(outUsers);

		} catch (error) {
			res.json({ error: error.message ? error.message : error });
		}
	});

	app.get('/', (req, res, next) => res.redirect('/control-panel'));
	app.get('/overlay', controllers.home.index);
	app.get('/control-panel', controllers.home.index);

	authMap.forEach((value, key) => {
		app.get(`/login-${key}`, value.login);
		app.get(`/auth/${key}/callback`, value.callback);
	});

	app.all('*', async (req, res, next) => {
		res.status(404);
		res.send('404 Not Found!');
		res.end();
	});

	return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

function verifyAuthorization({ headers }) {
	console.log(headers['authorization']);
	console.log('Basic ' + (Buffer.from(process.env.HELIX_CLIENT_ID + ':' + process.env.HELIX_CLIENT_SECRET).toString('base64')));
	return headers['authorization'] === 'Basic ' + (Buffer.from(process.env.HELIX_CLIENT_ID + ':' + process.env.HELIX_CLIENT_SECRET).toString('base64'));
}

function assignColumns(columns, user) {
	const outUser = {};
	for (let i = 0; i < columns.length; i++) {
		const column = columns[i];
		if (user.hasOwnProperty(column)) {
			outUser[column] = user[column];
		}
	}
	return outUser;
}

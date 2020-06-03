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

		const { username, columns } = req.body;

		try {
			const { data: [user] } = await helix.getUserLogin(username);

			if (!user) return res.status(404).json({ error: new Error(`User not found with username: ${username}`) });
			
			if (user.error) return res.json(user);

			res.json(assignColumns(columns, user));

		} catch (error) {
			res.json({ error: new Error(error.message) });
		}
	});

	app.post('/users', async (req, res, next) => {
		const { user_logins: chunked, columns } = req.body;

		try {

			const user_logins = chunked.map(x => `login=${x}`).join('&');
			const result = await helix.getUserLogins(user_logins);
			
			if (result.error) return res.json(user);
			
			const outUsers = [];

			for (let i = 0; i < result.data.length; i++) {
				outUsers.push(assignColumns(columns, result.data[i]));
			}

			res.json(outUsers);

		} catch (error) {
			res.json({ error: new Error(error.message) });
		}

		res.json(resUsers);
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

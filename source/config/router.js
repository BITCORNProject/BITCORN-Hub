/*

*/

"use strict";

const qs = require('querystring');
const helix = require('./authorize/helix');
const pubSub = require('./pubsub');
const controllers = require('../controllers');
const auth = require('../../settings/auth');
const e = require('express');
const login = controllers.login;
const callback = controllers.callback;

const authMap = new Map();
authMap.set('helix', { login: login.helix, callback: callback.helix });

exports.init = async (app) => {
	app.get('/user', async (req, res, next) => {
		const req_data = qs.parse(req.url.split('?')[1]);
		const username = req_data.username;
		const resUser = await helix.getUserLogin(username);
		res.json(resUser);
	});

	app.post('/users', async (req, res, next) => {

		const { ids, usernames } = req.body;

		if (ids) {
			const resUsers = await helix.getUsersByIds(ids);
			res.json(resUsers);
		} else if (usernames) {
			const resUsers = await helix.getUsersByName(usernames);
			res.json(resUsers);
		} else {
			res.status(404).end();
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
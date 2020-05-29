/*

*/

"use strict";

const helix = require('../authorize/helix');
const qs = require('querystring');

async function redirectAuthCode(name, obj, req, res, next) {
	const req_data = qs.parse(req.url.split('?')[1]);
	const code = req_data.code;
	const state = req_data.state;
	const { error } = await obj.authenticateCode({ code, state });
	if(error) {
		console.error(error);
	}
	res.redirect('/control-panel');
}

module.exports = {
	helix: async (req, res, next) => {
		await redirectAuthCode('helix', helix, req, res, next);
	}
}
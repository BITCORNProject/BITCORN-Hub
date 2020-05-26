/*

*/

"use strict";

const kraken = require('../config/authorize/kraken');
const helix = require('../config/authorize/helix');
const qs = require('querystring');

async function redirectAuthCode(name, obj, req, res, next) {
    const req_data = qs.parse(req.url.split('?')[1]);
    const code = req_data.code;
    const state = req_data.state;
	const { error } = await obj.authenticateCode({code, state});
	if(error) {
		console.error(`${name} error`, error);
	}
    res.redirect('/control-panel');
}

module.exports = {
    kraken: async (req, res, next) => {
        await redirectAuthCode('kraken', kraken, req, res, next);
    },
    helix: async (req, res, next) => {
        await redirectAuthCode('helix', helix, req, res, next);
    }
}
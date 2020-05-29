const crypto = require('crypto');
const fetch = require('node-fetch');

class AppOptions {

	constructor({ authorize_path, client_id, client_secret, redirect_uri, scope }) {

		this.client_id = client_id;
		this.client_secret = client_secret;
		this.redirect_uri = redirect_uri;
		this.scope = scope;

		const buf = crypto.randomBytes(32);
		const state = buf.toString('hex');
		this.state = state;

		const urlParams = [
			`client_id=${this.client_id}`,
			`redirect_uri=${encodeURIComponent(this.redirect_uri)}`,
			`response_type=code`,
			`scope=${encodeURIComponent(this.scope.join(' '))}`,
			`state=${this.state}`
		];
		const urlQuery = urlParams.join('&');
		this.authUrl = `${authorize_path}?${urlQuery}`;
	}

	formAuthorizationCode(code) {
		return {
			client_id: this.client_id,
			client_secret: this.client_secret,
			code: code,
			grant_type: 'authorization_code',
			redirect_uri: this.redirect_uri
		};
	}

	formRefreshToken(token) {
		return {
			grant_type: 'refresh_token',
			refresh_token: token,
			client_id: this.client_id,
			client_secret: this.client_secret
		};
	}

	async postForm({ token_url, form, headers }) {

		const options = {
			method: 'POST',
			body: new URLSearchParams(form)
		};

		if (headers) {
			options.headers = headers;
		}

		return fetch(token_url, options)
			.then(res => res.json())
			.catch(error => { error });
	}

	getBearerOptions(access_token) {
		return {
			headers: {
				'Authorization': 'Bearer ' + access_token,
				'Client-ID': this.client_id,
				'Content-Type': 'application/json'
			}
		};
	}
}

module.exports = AppOptions;

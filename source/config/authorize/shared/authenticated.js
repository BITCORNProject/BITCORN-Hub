
class Authenticated {

	constructor() {
		this.access_token = '';
		this.token_type = '';
		this.scope = '';
		this.expires_in = 0;
		this.refresh_token = '';
		this.id_token = '';
	}

	updateValues(json) {
		if (json.error) throw json.error;
		for (const key in json) {
			if (this.hasOwnProperty(key)) {
				this[key] = json[key];
			}
		}
	}

}

module.exports = Authenticated;

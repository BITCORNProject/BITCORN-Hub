require('dotenv').config({ path: __dirname + '/../.env' });

const is_production = (process.env.NODE_ENV || 'production') === 'production';

function wrap_in_test_mode(content) {
	return is_production ? content : `(TESTMODE) ${content} (TESTMODE)`
}

module.exports = { is_production, wrap_in_test_mode };
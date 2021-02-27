require('dotenv').config({ path: __dirname + '/./.env' });

const is_production = (process.env.NODE_ENV || 'production') === 'production';

module.exports = { is_production };
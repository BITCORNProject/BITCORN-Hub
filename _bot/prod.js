require('dotenv').config();

const is_production = (process.env.NODE_ENV || 'production') === 'production';

module.exports = { is_production };
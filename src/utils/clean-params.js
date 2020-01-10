'use strict';

function brackets(value) {
    return value ? value.replace('<', '').replace('>', '') : ''
}

function at(value) {
    return brackets(value).replace('@', '');
}

function atLower(value) {
    return at(value).toLowerCase();
}

function amount(value) {
    return +brackets(value);
}

function isNumber(value) {
    return !isNaN(value);
}

module.exports = {
	isNumber,
	amount,
	at,
	brackets
};
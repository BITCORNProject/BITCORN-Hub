'use strict';

function brackets(value) {
	if(isNumber(value)) return value;
    return value ? value.replace(/[\<\>]+/g, '') : '';
}

function at(value) {
	if(isNumber(value)) return value;
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
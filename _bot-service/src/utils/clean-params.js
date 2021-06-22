'use strict';

/**
 * 
 * @throws if value is not a string
 * 
 */
function replaceBrackets(value) {
    return value.replace(/[\<\>]+/g, '');
}

/**
 * 
 * @throws if value is not a string
 * 
 */
function replaceAtSymbol(value) {
    return value.replace('@', '');
}

function brackets(value) {
	if(isNumber(value)) return value;
    return value ? value.replace(/[\<\>]+/g, '') : '';
}

function at(value) {
	if(isNumber(value)) return value;
    return brackets(value).replace('@', '');
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
	brackets,
	replaceBrackets,
	replaceAtSymbol
};
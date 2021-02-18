/*
    
*/

"use strict";

function Math() {}

Math.prototype.fixed = function fixed8(value, precision) {
    return Number.parseFloat(value).toFixed(precision);
}

Math.prototype.fixed8 = function fixed8(value) {
    return +this.fixed(value, 8);
}

Math.prototype.convertMinsToMs = function (minutes) {
	const MINUTES_AS_MILLISECONDS = 60000;
	return +minutes * MINUTES_AS_MILLISECONDS;
}

module.exports = new Math();
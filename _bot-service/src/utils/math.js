/*
    
*/

function Math() {}

Math.prototype.fixed = function fixed8(value, precision) {
    return Number.parseFloat(value).toFixed(precision);
}

Math.prototype.fixed8 = function fixed8(value) {
    return +this.fixed(value, 8);
}

module.exports = new Math();
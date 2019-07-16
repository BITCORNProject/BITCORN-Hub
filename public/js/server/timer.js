/*

*/

"use strict";

const tickers = {};

(() => {

    /**
    * Construct a timer to show execution time
    * @constructs namespace.Timer
    */
    this.Timer = function Timer() { }

    this.Timer.prototype.start = function () {
        this.starttime = new Date().getTime();
    }

    this.Timer.prototype.stop = function (label) {
        this.endtime = new Date().getTime();
        this.time = (this.endtime - this.starttime) / 1000;
        if(label) {
            console.log(`${label} ${this.time}`);
        }
        return this.time;
    }
})(typeof exports === 'undefined' ? this['timer'] = {} : exports);
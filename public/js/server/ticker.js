/*

*/

"use strict";

const tickers = {};

(() => {

    /**
    * Construct a ticker with an time and an action
    * @constructs namespace.Ticker
    * @param {String} name The unique identifier to access this ticker
    * @param {Number} time The time in milliseconds to tick
    * @param {Function} action The action to perform on tick
    */
    this.Ticker = function Ticker(name, time, action) {
        if (name in tickers) {
            throw new Error(`Ticker with name [${name}] already exists`);
        }
        this.name = name;
        this.time = time;
        this.action = action;
        this.interval = null;
        tickers[name] = this;
        return this;
    }

    this.Ticker.prototype.start = function start() {
        if(this.interval !== null) {
            console.log(`Ticker [${this.name}] is already started`)
            return;
        }
        this.interval = setInterval(this.action, this.time);
    }

    this.Ticker.prototype.stop = function stop() {
        clearInterval(this.interval);
        this.interval = null;
    }

    /**
     * Static methods
     */
    this.Ticker.remove = function remove(name) {
        if(name in tickers) {
            delete tickers[name];
        }
    }
    
    this.Ticker.start = function start(name) {
        if(name in tickers) {
            tickers[name].start();
        }
    }

    this.Ticker.stop = function stop(name) {
        if(name in tickers) {
            tickers[name].stop();
        }
    }
})(typeof exports === 'undefined' ? this['ticker'] = {} : exports);
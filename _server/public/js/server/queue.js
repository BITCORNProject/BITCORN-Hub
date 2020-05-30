/**
 * Summary. Standard Queue
 *
 * Description. Queue for server and client to enqueue and dequeue items
 *
 * @link   URL
 * @file   This files defines the Queue class.
 * @author caLLowCreation
 */

"use strict";

/**
* Queue for server and client to enqueue and dequeue items
*/
(() => {
    
    /**
    * Queue for server and client to enqueue and dequeue items
    * @constructs namespace.Queue
    */
    this.Queue = function Queue() {
        this.items = [];
    }

    /**
    * @param {Object} item The thing to enqueue
    */
    this.Queue.prototype.enqueue = function(item) {
        this.items.push(item);
    }
    
    /**
    * @return {Object} Returns the first item in the queue and removes it from the queue
    */
    this.Queue.prototype.dequeue = function() {
        return this.items.shift();
    }
    
    /**
    * @return {Object} Returns the first item in the queue but does not remove it
    */
    this.Queue.prototype.peek = function() {
        return this.items[0];
    }
    
    /**
    * @return {Number} Returns the amount of items in the queue
    */
    this.Queue.prototype.size = function() {
        return this.items.length;
    }

})(typeof exports === 'undefined' ? this['queue'] = {} : exports);

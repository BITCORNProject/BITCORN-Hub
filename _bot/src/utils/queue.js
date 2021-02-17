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
* @constructs namespace.Queue
*/
function Queue() {
	this.items = [];
}

/**
* @param {Object} item The thing to enqueue
*/
Queue.prototype.enqueue = function (item) {
	this.items.push(item);
}

/**
* @return {Object} Returns the first item in the queue and removes it from the queue
*/
Queue.prototype.dequeue = function () {
	return this.items.shift();
}

/**
* @return {Object} Removes all items from the queue and returns them
*/
Queue.prototype.empty = function () {
	return this.items.splice(0, this.items.length);
}

/**
* @return {Object} Returns the first item in the queue but does not remove it
*/
Queue.prototype.peek = function () {
	return this.items[0];
}

/**
* @return {Number} Returns the amount of items in the queue
*/
Queue.prototype.size = function () {
	return this.items.length;
}

module.exports = Queue;
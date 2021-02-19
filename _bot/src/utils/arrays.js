/*
    
*/

"use strict";

function shuffleArray(array) {
	array.sort(function () {
		return Math.random() - .5;
	});
	return array;
}

module.exports = {
	shuffleArray
};
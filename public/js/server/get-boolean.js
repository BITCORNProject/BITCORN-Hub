/*

*/

"use strict";

((exports) => {

    exports.fromValue = (value) => {
        switch (value) {
            case true:
            case "true":
            case 1:
            case "1":
            case "on":
            case "yes":
                return true;
            default:
                return false;
        };
    }

})(typeof exports === 'undefined' ? this['get-boolean'] = {} : exports);
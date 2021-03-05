/*
    
*/

"use strict";

function Time(milliseconds) {
    this.date = new Date(milliseconds);
    this.days = this.date.getUTCDate() - 1;
    this.hours = this.date.getUTCHours();
    this.minutes = this.date.getUTCMinutes();
    this.seconds = this.date.getUTCSeconds();
    this.milliseconds = this.date.getUTCMilliseconds();

    if(this.days === 1 && this.hours === 0) {
        this.days = 0;
        this.hours = 24;
    }

    this.format = {
        days: (this.days < 10 ? ('0' + this.days) : this.days),
        hours: (this.hours < 10 ? ('0' + this.hours) : this.hours),
        minutes: (this.minutes < 10 ? ('0' + this.minutes) : this.minutes),
        seconds: (this.seconds < 10 ? ('0' + this.seconds) : this.seconds),
        milliseconds: (this.milliseconds < 10 ? ('0' + this.milliseconds) : this.milliseconds)
    };

    this.formatted = this.format.days
        + ":" + this.format.hours
        + ":" + this.format.minutes
        + ":" + this.format.seconds
        + ":" + this.format.milliseconds;

    this.toString = () =>
        this.days > 0 ? this.days + ' days' : '' +
            this.hours > 0 ? this.hours + ' hours' : '' +
                this.minutes > 0 ? this.minutes + ' minutes' : '' +
                    this.seconds > 0 ? this.seconds + ' seconds' : '' +
                        this.milliseconds > 0 ? this.milliseconds + ' milliseconds' : '';
}

module.exports = Time;
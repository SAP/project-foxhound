/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * TimeKeeper keeps track of the time states. Given min, max, step, and
 * format (12/24hr), TimeKeeper will determine the ranges of possible
 * selections, and whether or not the current time state is out of range
 * or off step.
 *
 * @param {object} props
 *        {
 *          {Date} min
 *          {Date} max
 *          {Number} step
 *          {String} format: Either "12" or "24"
 *        }
 */
function TimeKeeper(props) {
  this.props = props;
  this.state = { time: new Date(0), ranges: {} };
}

{
  const DAY_PERIOD_IN_HOURS = 12,
    SECOND_IN_MS = 1000,
    MINUTE_IN_MS = 60000,
    HOUR_IN_MS = 3600000,
    DAY_PERIOD_IN_MS = 43200000,
    DAY_IN_MS = 86400000,
    TIME_FORMAT_24 = "24";

  TimeKeeper.prototype = {
    /**
     * Getters for different time units.
     *
     * @return {number}
     */
    get hour() {
      return this.state.time.getUTCHours();
    },
    get minute() {
      return this.state.time.getUTCMinutes();
    },
    get second() {
      return this.state.time.getUTCSeconds();
    },
    get millisecond() {
      return this.state.time.getUTCMilliseconds();
    },
    get dayPeriod() {
      // 0 stands for AM and 12 for PM
      return this.state.time.getUTCHours() < DAY_PERIOD_IN_HOURS
        ? 0
        : DAY_PERIOD_IN_HOURS;
    },

    /**
     * Get the ranges of different time units.
     *
     * @return {object}
     *         {
     *           {Array<Number>} dayPeriod
     *           {Array<Number>} hours
     *           {Array<Number>} minutes
     *           {Array<Number>} seconds
     *           {Array<Number>} milliseconds
     *         }
     */
    get ranges() {
      return this.state.ranges;
    },

    /**
     * Set new time, check if the current state is valid, and set ranges.
     *
     * @param {object} timeState: The new time
     *        {
     *          {Number} hour [optional]
     *          {Number} minute [optional]
     *          {Number} second [optional]
     *          {Number} millisecond [optional]
     *        }
     */
    setState(timeState) {
      const { min, max } = this.props;
      const { hour, minute, second, millisecond } = timeState;

      if (hour != undefined) {
        this.state.time.setUTCHours(hour);
      }
      if (minute != undefined) {
        this.state.time.setUTCMinutes(minute);
      }
      if (second != undefined) {
        this.state.time.setUTCSeconds(second);
      }
      if (millisecond != undefined) {
        this.state.time.setUTCMilliseconds(millisecond);
      }

      this.state.isOffStep = this._isOffStep(this.state.time);
      this.state.isOutOfRange = this.state.time < min || this.state.time > max;
      this.state.isInvalid = this.state.isOutOfRange || this.state.isOffStep;

      this._setRanges(this.dayPeriod, this.hour, this.minute, this.second);
    },

    /**
     * Set day-period (AM/PM)
     *
     * @param {number} dayPeriod: 0 as AM, 12 as PM
     */
    setDayPeriod(dayPeriod) {
      if (dayPeriod == this.dayPeriod) {
        return;
      }

      if (dayPeriod == 0) {
        this.setState({ hour: this.hour - DAY_PERIOD_IN_HOURS });
      } else {
        this.setState({ hour: this.hour + DAY_PERIOD_IN_HOURS });
      }
    },

    /**
     * Set hour in 24hr format (0 ~ 23)
     *
     * @param {number} hour
     */
    setHour(hour) {
      this.setState({ hour });
    },

    /**
     * Set minute (0 ~ 59)
     *
     * @param {number} minute
     */
    setMinute(minute) {
      this.setState({ minute });
    },

    /**
     * Set second (0 ~ 59)
     *
     * @param {number} second
     */
    setSecond(second) {
      this.setState({ second });
    },

    /**
     * Set millisecond (0 ~ 999)
     *
     * @param {number} millisecond
     */
    setMillisecond(millisecond) {
      this.setState({ millisecond });
    },

    /**
     * Calculate the range of possible choices for each time unit.
     * Reuse the old result if the input has not changed.
     *
     * @param {number} dayPeriod
     * @param {number} hour
     * @param {number} minute
     * @param {number} second
     */
    _setRanges(dayPeriod, hour, minute, second) {
      this.state.ranges.dayPeriod =
        this.state.ranges.dayPeriod || this._getDayPeriodRange();

      if (this.state.dayPeriod != dayPeriod) {
        this.state.ranges.hours = this._getHoursRange(dayPeriod);
      }

      if (this.state.hour != hour) {
        this.state.ranges.minutes = this._getMinutesRange(hour);
      }

      if (this.state.hour != hour || this.state.minute != minute) {
        this.state.ranges.seconds = this._getSecondsRange(hour, minute);
      }

      if (
        this.state.hour != hour ||
        this.state.minute != minute ||
        this.state.second != second
      ) {
        this.state.ranges.milliseconds = this._getMillisecondsRange(
          hour,
          minute,
          second
        );
      }

      // Save the time states for comparison.
      this.state.dayPeriod = dayPeriod;
      this.state.hour = hour;
      this.state.minute = minute;
      this.state.second = second;
    },

    /**
     * Get the AM/PM range. Return an empty array if in 24hr mode.
     *
     * @return {Array<number>}
     */
    _getDayPeriodRange() {
      if (this.props.format == TIME_FORMAT_24) {
        return [];
      }

      const start = 0;
      const end = DAY_IN_MS - 1;
      const minStep = DAY_PERIOD_IN_MS;
      const formatter = time =>
        new Date(time).getUTCHours() < DAY_PERIOD_IN_HOURS
          ? 0
          : DAY_PERIOD_IN_HOURS;

      return this._getSteps(start, end, minStep, formatter);
    },

    /**
     * Get the hours range.
     *
     * @param  {number} dayPeriod
     * @return {Array<number>}
     */
    _getHoursRange(dayPeriod) {
      const { format } = this.props;
      const start = format == "24" ? 0 : dayPeriod * HOUR_IN_MS;
      const end = format == "24" ? DAY_IN_MS - 1 : start + DAY_PERIOD_IN_MS - 1;
      const minStep = HOUR_IN_MS;
      const formatter = time => new Date(time).getUTCHours();

      return this._getSteps(start, end, minStep, formatter);
    },

    /**
     * Get the minutes range
     *
     * @param  {number} hour
     * @return {Array<number>}
     */
    _getMinutesRange(hour) {
      const start = hour * HOUR_IN_MS;
      const end = start + HOUR_IN_MS - 1;
      const minStep = MINUTE_IN_MS;
      const formatter = time => new Date(time).getUTCMinutes();

      return this._getSteps(start, end, minStep, formatter);
    },

    /**
     * Get the seconds range
     *
     * @param  {number} hour
     * @param  {number} minute
     * @return {Array<number>}
     */
    _getSecondsRange(hour, minute) {
      const start = hour * HOUR_IN_MS + minute * MINUTE_IN_MS;
      const end = start + MINUTE_IN_MS - 1;
      const minStep = SECOND_IN_MS;
      const formatter = time => new Date(time).getUTCSeconds();

      return this._getSteps(start, end, minStep, formatter);
    },

    /**
     * Get the milliseconds range
     *
     * @param  {number} hour
     * @param  {number} minute
     * @param  {number} second
     * @return {Array<number>}
     */
    _getMillisecondsRange(hour, minute, second) {
      const start =
        hour * HOUR_IN_MS + minute * MINUTE_IN_MS + second * SECOND_IN_MS;
      const end = start + SECOND_IN_MS - 1;
      const minStep = 1;
      const formatter = time => new Date(time).getUTCMilliseconds();

      return this._getSteps(start, end, minStep, formatter);
    },

    /**
     * Calculate the range of possible steps.
     *
     * @param  {number} startValue: Start time in ms
     * @param  {number} endValue: End time in ms
     * @param  {number} minStep: Smallest step in ms for the time unit
     * @param  {Function} formatter: Outputs time in a particular format
     * @return {Array<object>}
     *         {
     *           {Number} value
     *           {Boolean} enabled
     *         }
     */
    _getSteps(startValue, endValue, minStep, formatter) {
      const { min, max, step } = this.props;
      // The timeStep should be big enough so that there won't be
      // duplications. Ex: minimum step for minute should be 60000ms,
      // if smaller than that, next step might return the same minute.
      const timeStep = Math.max(minStep, step);

      // Make sure the starting point and end point is not off step
      let time =
        min.valueOf() +
        Math.ceil((startValue - min.valueOf()) / timeStep) * timeStep;
      let maxValue =
        min.valueOf() +
        Math.floor((max.valueOf() - min.valueOf()) / step) * step;
      let steps = [];

      // Increment by timeStep until reaching the end of the range.
      while (time <= endValue) {
        steps.push({
          value: formatter(time),
          // Check if the value is within the min and max. If it's out of range,
          // also check for the case when minStep is too large, and has stepped out
          // of range when it should be enabled.
          enabled:
            (time >= min.valueOf() && time <= max.valueOf()) ||
            (time > maxValue &&
              startValue <= maxValue &&
              endValue >= maxValue &&
              formatter(time) == formatter(maxValue)),
        });
        time += timeStep;
      }

      return steps;
    },

    /**
     * A generic function for stepping up or down from a value of a range.
     * It stops at the upper and lower limits.
     *
     * @param  {number} current: The current value
     * @param  {number} offset: The offset relative to current value
     * @param  {Array<object>} range: List of possible steps
     * @return {number} The new value
     */
    _step(current, offset, range) {
      const index = range.findIndex(step => step.value == current);
      const newIndex =
        offset > 0
          ? Math.min(index + offset, range.length - 1)
          : Math.max(index + offset, 0);
      return range[newIndex].value;
    },

    /**
     * Step up or down AM/PM
     *
     * @param  {number} offset
     */
    stepDayPeriodBy(offset) {
      const current = this.dayPeriod;
      const dayPeriod = this._step(
        current,
        offset,
        this.state.ranges.dayPeriod
      );

      if (current != dayPeriod) {
        this.hour < DAY_PERIOD_IN_HOURS
          ? this.setState({ hour: this.hour + DAY_PERIOD_IN_HOURS })
          : this.setState({ hour: this.hour - DAY_PERIOD_IN_HOURS });
      }
    },

    /**
     * Step up or down hours
     *
     * @param  {number} offset
     */
    stepHourBy(offset) {
      const current = this.hour;
      const hour = this._step(current, offset, this.state.ranges.hours);

      if (current != hour) {
        this.setState({ hour });
      }
    },

    /**
     * Step up or down minutes
     *
     * @param  {number} offset
     */
    stepMinuteBy(offset) {
      const current = this.minute;
      const minute = this._step(current, offset, this.state.ranges.minutes);

      if (current != minute) {
        this.setState({ minute });
      }
    },

    /**
     * Step up or down seconds
     *
     * @param  {number} offset
     */
    stepSecondBy(offset) {
      const current = this.second;
      const second = this._step(current, offset, this.state.ranges.seconds);

      if (current != second) {
        this.setState({ second });
      }
    },

    /**
     * Step up or down milliseconds
     *
     * @param  {number} offset
     */
    stepMillisecondBy(offset) {
      const current = this.milliseconds;
      const millisecond = this._step(
        current,
        offset,
        this.state.ranges.millisecond
      );

      if (current != millisecond) {
        this.setState({ millisecond });
      }
    },

    /**
     * Checks if the time state is off step.
     *
     * @param  {Date} time
     * @return {boolean}
     */
    _isOffStep(time) {
      const { min, step } = this.props;

      return (time.valueOf() - min.valueOf()) % step != 0;
    },
  };
}

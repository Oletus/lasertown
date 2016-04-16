'use strict';

/**
 * A class for runtime developer settings and tuning game parameters.
 * @constructor
 * @param {Object} params An object with parameters that can be adjusted. Example:
 *  {
 *    'playerJumpHeight': {initial: 1, min: 0.1, max: 2},
 *    'muteAudio': false
 *  }
 */
var GameParameters = function(params) {
    this._params = params;
    this._values = {};
    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            if (params[key].options !== undefined && params[key].initial === undefined) {
                this._values[key] = params[key].options[0];
            } else {
                this._values[key] = params[key].initial;
            }
        }
    }
};

/**
 * Add dat.gui for changing the parameters.
 * @param {Object=} preset Preset data for dat.GUI.
 */
GameParameters.prototype.initGUI = function(preset) {
    if (preset !== undefined) {
        preset = {load: preset};
    }
    var gui = new dat.GUI(preset);
    var params = this._params;
    gui.remember(this._values);
    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            var param = params[key];
            var added = null;
            if (param.color !== undefined) {
                added = gui.addColor(this._values, key);
            } else if (param.options !== undefined) {
                added = gui.add(this._values, key, param.options);
            } else if (param.min !== undefined) {
                added = gui.add(this._values, key, param.min, param.max);
            } else {
                added = gui.add(this._values, key);
            }
            if (param.step !== undefined) {
                added.step(param.step);
            }
            if (added) {
                added.listen();
            }
        }
    }
};

/**
 * @param {string} key Key for the parameter.
 * @return {Object} The current value of a parameter.
 */
GameParameters.prototype.get = function(key) {
    return this._values[key];
};

/**
 * @param {string} key Key for the parameter.
 * @param {Object} value The value of a parameter to set.
 */
GameParameters.prototype.set = function(key, value) {
    if (this._values.hasOwnProperty(key)) {
        this._values[key] = value;
    }
};

/**
 * @param {string} key Key for the parameter.
 * @return {function} Function that returns the value of the parameter.
 */
GameParameters.prototype.wrap = function(key) {
    var values = this._values;
    return function() {
        return values[key];
    };
};

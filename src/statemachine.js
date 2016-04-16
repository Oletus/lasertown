'use strict';

// Requires utiljs.js

/**
 * A very simple state machine. Tracks state and the time that the machine has been in that state.
 * @constructor
 * @param {Object} options Options for the object. Contains keys:
 *   stateSet: An object with number values, each key-value pair identifying a state. Example:
 *     { IDLE: 0, RUNNING: 1 }
 *   id: Number that identifies the initial state.
 */
var StateMachine = function(options) {
    var defaults = {
        id: null,
        stateSet: {}
    };
    objectUtil.initWithDefaults(this, defaults, options);
    if (this.id === null) {
        for (var key in this.stateSet) {
            if (this.stateSet.hasOwnProperty(key)) {
                this.id = this.stateSet[key];
                break;
            }
        }
    }
    this.time = 0;
};

/**
 * @param {number} newStateId Id of the new state.
 */
StateMachine.prototype.change = function(newStateId) {
    this.id = newStateId;
    this.time = 0;
};

/**
 * Call this regularly to update the state machine.
 * @param {number} deltaTime Time change since last call to this function.
 */
StateMachine.prototype.update = function(deltaTime) {
    this.time += deltaTime;
};

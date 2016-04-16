'use strict';

/**
 * @constructor
 */
var Gamepad = function(callbackObj) {
    this.downListeners = [];
    this.indexToPlayer = {};
    this.players = [];
    this.callbackObj = callbackObj;
};

Gamepad.debugLogEnabled = false;

Gamepad.prototype.gamepadForPlayer = function(gamepads, playerNumber) {
    for (var i = 0; i < gamepads.length; ++i) {
        if (gamepads[i] !== undefined && gamepads[i] !== null && gamepads[i].index === this.players[playerNumber]) {
            return gamepads[i];
        }
    }
    return null;
};

/**
 * @protected
 */
Gamepad.prototype._markDownAndCallback = function(l, p, value) {
    if (value > 0.5) {
        if (!l.isDown[p]) {
            l.isDown[p] = true;
            if (l.callback !== undefined) {
                l.callback.call(this.callbackObj, p);
            }
        }
    } else if (value < 0.3) {
        if (l.isDown[p]) {
            l.isDown[p] = false;
            if (l.callbackUp !== undefined) {
                l.callbackUp.call(this.callbackObj, p);
            }
        }
    }
};

Gamepad.prototype.update = function() {
    var gamepads;
    if (navigator.getGamepads) {
        gamepads = navigator.getGamepads();
    } else if (navigator.webkitGetGamepads) {
        gamepads = navigator.webkitGetGamepads();
    }
    if (gamepads === undefined) {
        return;
    }

    for (var i = 0; i < gamepads.length; ++i) {
        if (gamepads[i] !== undefined && gamepads[i] !== null) {
            var key = 'index' + gamepads[i].index;
            if (!this.indexToPlayer.hasOwnProperty(key)) {
                this.indexToPlayer[key] = this.players.length;
                this.players.push(gamepads[i].index);
            }
        }
    }
    for (var i = 0; i < this.downListeners.length; ++i) {
        for (var p = 0; p < this.players.length; ++p) {
            var l = this.downListeners[i];
            var pad = this.gamepadForPlayer(gamepads, p);
            if (pad != null) {
                var value;
                var buttonNumber = l.buttonNumber;
                if (l.buttonNumber > 100) {
                    buttonNumber -= 100;
                }
                try {
                    if ('value' in pad.buttons[buttonNumber]) {
                        value = pad.buttons[buttonNumber].value;
                    } else {
                        value = pad.buttons[buttonNumber];
                    }
                } catch(e) {
                    // Accessing pad.buttons seems to randomly fail in Firefox after long uptime sometimes.
                    if (Gamepad.debugLogEnabled) {
                        console.log('Accessing pad.buttons failed, pad.buttons is: ', pad.buttons);
                    }
                    continue;
                }
                if (l.buttonNumber > 100) {
                    var axis = (l.buttonNumber <= Gamepad.BUTTONS.DOWN_OR_ANALOG_DOWN) ? 1 : 0;
                    var axisValue = pad.axes[axis];
                    // positive values are down/right, negative up/left
                    if (l.buttonNumber % 2 === Gamepad.BUTTONS.UP_OR_ANALOG_UP % 2) {
                        axisValue = -axisValue;
                    }
                    this._markDownAndCallback(l, p, Math.max(value, axisValue));
                } else {
                    this._markDownAndCallback(l, p, value);
                }
            }
        }
    }
};

Gamepad.prototype.addButtonChangeListener = function(buttonNumber, callbackDown, callbackUp) {
    this.downListeners.push({buttonNumber: buttonNumber, callback: callbackDown, callbackUp: callbackUp, isDown: [false, false, false, false]});
};

/**
 * Face button names according to the common XBox 360 gamepad.
 */
Gamepad.BUTTONS = {
  A: 0, // Face (main) buttons
  B: 1,
  X: 2,
  Y: 3,
  L1: 4, // Top shoulder buttons
  R1: 5,
  L2: 6, // Bottom shoulder buttons
  R2: 7,
  SELECT: 8,
  START: 9,
  LEFT_STICK: 10, // Analogue sticks (if depressible)
  RIGHT_STICK: 11,
  UP: 12, // Directional (discrete) pad
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
  UP_OR_ANALOG_UP: 112,
  DOWN_OR_ANALOG_DOWN: 113,
  LEFT_OR_ANALOG_LEFT: 114,
  RIGHT_OR_ANALOG_RIGHT: 115
};

/**
 * Face button names according to the common XBox 360 gamepad.
 */
Gamepad.BUTTON_INSTRUCTION = [
    'A',
    'B',
    'X',
    'Y',
    'L1',
    'R1',
    'L2',
    'R2',
    'SELECT',
    'START',
    'LEFT STICK',
    'RIGHT STICK',
    'UP',
    'DOWN',
    'LEFT',
    'RIGHT'
];

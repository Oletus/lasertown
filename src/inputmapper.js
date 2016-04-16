"use strict";

/**
 * Mapper that automatically maps keyboard / gamepad input to different player numbers.
 * This can be used to implement keyboard / gamepad controls for a single player or a local
 * multiplayer game that allows players on the keyboard to play against players on gamepads.
 * Requires gamepad.js, mousetrap.js and mousetrap-global-bind.js to be included.
 * @constructor
 * @param {Object} callbackObj Object on which the callback functions will be called.
 * @param {number} maxPlayers Maximum number of players. If there are more active controllers
 * than this, then two controllers may be mapped to the same player.
 */
var InputMapper = function(callbackObj, maxPlayers) {
    this.gamepads = new Gamepad(this);
    this.callbackObj = callbackObj;
    this.maxPlayers = maxPlayers;
    this.resetPlayerMap();
    this.keysDown = []; // Keyboard keys that are currently down
    this.callbacks = []; // Callback information for mapping callbacks back to buttons
    this.upCallbacksForKey = {}; // Map from keys to lists of callbacks, so each key can have multiple callbacks
    this.downCallbacksForKey = {}; // Map from keys to lists of callbacks, so each key can have multiple callbacks
    this._defaultController = new InputMapper.Controller(InputMapper.GAMEPAD, 0);
};

// Controller types
InputMapper.GAMEPAD = 0;
InputMapper.KEYBOARD = 1;

/**
 * Helper class to store the controller config each player has.
 * @constructor
 * @param {number} controllerType Controller type: either InputMapper.GAMEPAD or InputMapper.KEYBOARD
 * @param {number} controllerIndex Controller index: in case of keyboard, index into the array of keyboard keys given
 * to addListener. In case of gamepad, index of the gamepad.
 */
InputMapper.Controller = function(controllerType, controllerIndex) {
    this.controllerType = controllerType;
    this.controllerIndex = controllerIndex;
    this.lastUsed = 0; // A timestamp for when this controller was last used
};

/**
 * Reset the map between controllers and player numbers.
 * @param {number?} maxPlayers Maximum player count. Default is to keep existing value.
 */
InputMapper.prototype.resetPlayerMap = function(maxPlayers) {
    if (maxPlayers !== undefined) {
        this.maxPlayers = maxPlayers;
    }
    this.players = []; // An array of arrays of controllers. Each player can have multiple controllers.
    for (var i = 0; i < this.maxPlayers; ++i) {
        this.players.push([]);
    }
};

/**
 * Update the controller state and call listeners based on that.
 */
InputMapper.prototype.update = function() {
    this.gamepads.update();
};

/**
 * Return a player index for a player using a given controller.
 * @param {number} controllerType Controller type: either InputMapper.GAMEPAD or InputMapper.KEYBOARD
 * @param {number} controllerIndex Controller index: in case of keyboard, index into the array of keyboard keys given
 * to addListener. In case of gamepad, index of the gamepad.
 */
InputMapper.prototype.getPlayerIndex = function(controllerType, controllerIndex) {
    for (var i = 0; i < this.players.length; ++i) {
        var player = this.players[i];
        for (var j = 0; j < player.length; ++j) {
            if (player[j].controllerType == controllerType && player[j].controllerIndex == controllerIndex) {
                player[j].lastUsed = Date.now();
                return i;
            }
        }
    }
    var controller = new InputMapper.Controller(controllerType, controllerIndex);
    controller.lastUsed = Date.now();
    // Map the controller for a player without a controller if there is one
    for (var i = 0; i < this.players.length; ++i) {
        var player = this.players[i];
        if (player.length === 0) {
            player.push(controller);
            return i;
        }
    }
    // Map the controller for the first player without this type of a controller
    for (var i = 0; i < this.players.length; ++i) {
        var player = this.players[i];
        var hasSameTypeController = false;
        for (var j = 0; j < player.length; ++j) {
            if (player[j].controllerType == controllerType) {
                hasSameTypeController = true;
            }
        }
        if (!hasSameTypeController) {
            player.push(controller);
            return i;
        }
    }
    // Just map the controller for the first player
    this.players[0].push(controller);
    return 0;
};

/**
 * @param {number} gamepadButton A button from Gamepad.BUTTONS
 * @param {Array} keyboardBindings List of bindings for different players, for example ['up', 'w']
 * @param {function=} downCallback Callback when the button is pressed down, that takes a player number as a parameter.
 * @param {function=} upCallback Callback when the button is released, that takes a player number as a parameter.
 */
InputMapper.prototype.addListener = function(gamepadButton, keyboardButtons, downCallback, upCallback) {
    var gamepadDownCallback = function(gamepadNumber) {
        var player = this.getPlayerIndex(InputMapper.GAMEPAD, gamepadNumber);
        if (downCallback !== undefined) {
            downCallback.call(this.callbackObj, player);
        }
    };
    var gamepadUpCallback = function(gamepadNumber) {
        var player = this.getPlayerIndex(InputMapper.GAMEPAD, gamepadNumber);
        if (upCallback !== undefined) {
            upCallback.call(this.callbackObj, player);
        }
    };
    this.gamepads.addButtonChangeListener(gamepadButton, gamepadDownCallback, gamepadUpCallback);

    var gamepadInstruction;
    
    if (gamepadButton < 100) {
        gamepadInstruction = Gamepad.BUTTON_INSTRUCTION[gamepadButton];
    } else {
        gamepadInstruction = Gamepad.BUTTON_INSTRUCTION[gamepadButton - 100];
    }
    
    if (downCallback !== undefined) {
        this.callbacks.push({key: gamepadInstruction, callback: downCallback, controllerType: InputMapper.GAMEPAD});
    }
    if (upCallback !== undefined) {
        this.callbacks.push({key: gamepadInstruction, callback: upCallback, controllerType: InputMapper.GAMEPAD});
    }

    var that = this;
    for (var i = 0; i < keyboardButtons.length; ++i) {
        (function(kbIndex) {
            if (!that.downCallbacksForKey.hasOwnProperty(keyboardButtons[kbIndex])) {
                that.keysDown[keyboardButtons[kbIndex]] = false;
                that.downCallbacksForKey[keyboardButtons[kbIndex]] = [];
                that.upCallbacksForKey[keyboardButtons[kbIndex]] = [];
                var keyDownCallback = function() {
                    var player = that.getPlayerIndex(InputMapper.KEYBOARD, kbIndex);
                    // Down events get generated multiple times while a key is down. Work around this.
                    if (!that.keysDown[keyboardButtons[kbIndex]]) {
                        that.keysDown[keyboardButtons[kbIndex]] = true;
                        var callbacksToCall = that.downCallbacksForKey[keyboardButtons[kbIndex]];
                        for (var i = 0; i < callbacksToCall.length; ++i) {
                            callbacksToCall[i].call(that.callbackObj, player);
                        }
                    }
                };
                var keyUpCallback = function() {
                    var player = that.getPlayerIndex(InputMapper.KEYBOARD, kbIndex);
                    that.keysDown[keyboardButtons[kbIndex]] = false;
                    var callbacksToCall = that.upCallbacksForKey[keyboardButtons[kbIndex]];
                    for (var i = 0; i < callbacksToCall.length; ++i) {
                        callbacksToCall[i].call(that.callbackObj, player);
                    }
                };
                window.Mousetrap.bindGlobal(keyboardButtons[kbIndex], keyDownCallback, 'keydown');
                window.Mousetrap.bindGlobal(keyboardButtons[kbIndex], keyUpCallback, 'keyup');
            }
            if (downCallback !== undefined) {
                that.downCallbacksForKey[keyboardButtons[kbIndex]].push(downCallback);
            }
            if (upCallback !== undefined) {
                that.upCallbacksForKey[keyboardButtons[kbIndex]].push(upCallback);
            }
        })(i);
        if (downCallback !== undefined) {
            this.callbacks.push({key: keyboardButtons[i], callback: downCallback, controllerType: InputMapper.KEYBOARD, kbIndex: i});
        }
        if (upCallback !== undefined) {
            this.callbacks.push({key: keyboardButtons[i], callback: upCallback, controllerType: InputMapper.KEYBOARD, kbIndex: i});
        }
    }
};

/**
 * Check if a given callback uses a given type of controller. Doesn't care about gamepad indices.
 * @protected
 * @param {InputMapper.Controller} controller
 * @param {Object} cbInfo Information on the callback, with keys controllerType and kbIndex in case of a keyboard.
 * @return {boolean} True if the given callback uses the given type of a controller.
 */
InputMapper._usesController = function(controller, cbInfo) {
    if (cbInfo.controllerType === controller.controllerType) {
        if (cbInfo.controllerType === InputMapper.KEYBOARD && controller.controllerIndex !== cbInfo.kbIndex) {
            // Each keyboard "controller" has different key bindings.
            return false;
        }
        return true;
    }
};

/**
 * From an array of controllers, determine the one that was most recently used.
 * @protected
 * @param {Array.<InputMapper.Controller>} player Array of controllers to check.
 * @return {InputMapper.Controller} The most recently used controller.
 */
InputMapper.prototype._getLastUsedController = function(player) {
    var controller;
    var lastUsed = 0;
    for (var j = 0; j < player.length; ++j) {
        if (player[j].lastUsed > lastUsed) {
            controller = player[j];
            lastUsed = player[j].lastUsed;
        }
    }
    return controller;
};

/**
 * Cycle the controller that is used for showing instructions by default.
 */
InputMapper.prototype.cycleDefaultControllerForInstruction = function() {
    if (this._defaultController.controllerType === InputMapper.KEYBOARD) {
        this._defaultController = new InputMapper.Controller(InputMapper.GAMEPAD, 0);
    } else {
        this._defaultController = new InputMapper.Controller(InputMapper.KEYBOARD, 0);
    }
};

/**
 * Get instruction for a key. Prioritizes gamepad over keyboard if keyboard hasn't been used. If you want to change the
 * controller which is prioritized, call cycleDefaultControllerForInstruction().
 * @param {function} callback A callback that has been previously attached to a button.
 * @param {playerIndex} index of the player to return information for. Set to undefined if the listener doesn't care
 * about the player number.
 * @return {string} String identifying the button for the player.
 */
InputMapper.prototype.getKeyInstruction = function(callback, playerIndex) {
    var controller;
    if (playerIndex !== undefined && this.players.length > playerIndex) {
        if (this.players[playerIndex].length > 0) {
            controller = this._getLastUsedController(this.players[playerIndex]);
        } else {
            // Gamepad instructions by default
            controller = this._defaultController;
        }
    }
    var returnStr = [];
    for (var i = 0; i < this.callbacks.length; ++i) {
        var cbInfo = this.callbacks[i];
        if (cbInfo.callback === callback) {
            if (controller === undefined) {
                // Listener doesn't care about the player number.
                // Determine all keys mapped to that callback from different controllers.
                for (var j = 0; j < this.players.length; ++j) {
                    for (var k = 0; k < this.players[j].length; ++k) {
                        if (InputMapper._usesController(this.players[j][k], cbInfo)) {
                            var hasInstruction = false;
                            var instruction = cbInfo.key.toUpperCase();
                            for (var l = 0; l < returnStr.length; ++l) {
                                if (returnStr[l] == instruction) {
                                    hasInstruction = true;
                                }
                            }
                            if (!hasInstruction) {
                                returnStr.push(instruction);
                            }
                        }
                    }
                }
            } else {
                if (InputMapper._usesController(controller, cbInfo)) {
                    return cbInfo.key.toUpperCase();
                }
            }
        }
    }
    if (controller === undefined) {
        return returnStr.join('/');
    }
    return '';
};

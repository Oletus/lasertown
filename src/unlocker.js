'use strict';

// Requires utiljs.js

/**
 * Class to inherit to implement a condition for unlocking a single unlock.
 * @constructor
 */
var UnlockCondition = function(options) {
};

/**
 * Initialize the condition.
 * @param {Object} options Object with the following keys:
 *   unlockId: string Identifier for the unlock.   
 */
UnlockCondition.prototype.initCondition = function(options) {
    var defaults = {
        unlockId: ''
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.fulfilled = false;
};

/**
 * Set the unlock id for the condition. Only call before the condition is added to the Unlocker.
 * @param {string} unlockId Identifier for the unlock.   
 */
UnlockCondition.prototype.setId = function(unlockId) {
    this.unlockId = unlockId;
};

/**
 * Evaluate unlocking condition and set the member "fulfilled" when the condition is fulfilled.
 * @param {Object} gameState Object that unlocking is based on.
 * @param {number} deltaTime Time that has passed since the last update in seconds.
 */
UnlockCondition.prototype.update = function(gameState, deltaTime) {
    return;
};

/**
 * @return {string} A description of the unlock condition.
 */
UnlockCondition.prototype.getDescription = function() {
    return "";
};


/**
 * An unlock condition that always passes.
 * @constructor
 * @param {Object} options Object with the following keys:
 *   unlockId: string Identifier for the unlock.
 */
var UnlockByDefault = function(options) {
    this.initCondition(options);
    this.fulfilled = true;
};

UnlockByDefault.prototype = new UnlockCondition();


/**
 * An unlock condition that never passes.
 * @constructor
 * @param {Object} options Object with the following keys:
 *   unlockId: string Identifier for the unlock.
 */
var NeverUnlock = function(options) {
    this.initCondition(options);
};

NeverUnlock.prototype = new UnlockCondition();


/**
 * @constructor
 * Engine for managing game unlocks. Each unlock is identified by an id, has a condition that's an instance of
 * UnlockCondition based on game state and can be either unlocked (true) or locked (false).
 */
var Unlocker = function(options) {
    var defaults = {
        gameName: 'game',
        needCommitUnlocks: false,
        conditions: []
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this._fulfilledConditions = [];
    this.unlocks = {};
    this.unlocksInOrder = [];
    for (var i = 0; i < this.conditions.length; ++i) {
        var condition = this.conditions[i];
        this.unlocks[condition.unlockId] = false;
        this._checkFulfilled(condition);
    }
};

/**
 * @param {UnlockCondition} condition Check if a condition is fulfilled.
 * @protected
 */
Unlocker.prototype._checkFulfilled = function(condition) {
    if (condition.fulfilled) {
        this._fulfilledConditions.push(condition.unlockId);
        if (!this.needCommitUnlocks) {
            this.commitUnlock(condition.unlockId);
        }
    }
};

/**
 * Evaluate unlocking conditions.
 * @param {Object} gameState Object that unlocking is based on.
 * @param {number} deltaTime Time that has passed since the last update in seconds.
 */
Unlocker.prototype.update = function(gameState, deltaTime) {
    for (var i = 0; i < this.conditions.length; ++i) {
        var condition = this.conditions[i];
        if (!this.unlocks[condition.unlockId] && this._fulfilledConditions.indexOf(condition.unlockId) < 0) {
            condition.update(gameState, deltaTime);
            this._checkFulfilled(condition);
        }
    }
};

/**
 * @param {string} unlockId Id of the condition to get the description for.
 * @return {string} A description of the unlock condition.
 */
Unlocker.prototype.getDescription = function(unlockId) {
    for (var i = 0; i < this.conditions.length; ++i) {
        var condition = this.conditions[i];
        if (condition.unlockId === unlockId) {
            return condition.getDescription();
        }
    }
    return '';
};

/**
 * @return {Array.<string>} List of unlockIds of the conditions that have been fulfilled since the last time this
 * function was called.
 */
Unlocker.prototype.popFulfilledUnlockConditions = function() {
    var fulfilledConditions = this._fulfilledConditions;
    this._fulfilledConditions = [];
    return fulfilledConditions;
};

/**
 * @param {string} unlockId Id to mark as unlocked.
 * @return {boolean} True if the unlock was actually stored.
 */
Unlocker.prototype.commitUnlock = function(unlockId) {
    if (this.unlocks.hasOwnProperty(unlockId)) {
        this.unlocks[unlockId] = true;
        this.unlocksInOrder.push(unlockId);
        return true;
    }
    return false;
};

/**
 * Load unlocks from storage.
 * @param {Storage} storage Storage object to load from.
 */
Unlocker.prototype.loadFrom = function(storage) {
    var unlocksInOrder = null;
    try {
        unlocksInOrder = JSON.parse(storage.getItem(this.gameName + '-gameutilsjs-unlocks-in-order'));
    } catch(e) {
        return;
    }
    if (unlocksInOrder === null) {
        return;
    }
    this.unlocksInOrder = [];
    for (var i = 0; i < unlocksInOrder.length; ++i) {
        var key = unlocksInOrder[i];
        this.commitUnlock(key);
    }
};

/**
 * Save unlocks to storage.
 * @param {Storage} storage Storage object to save to.
 */
Unlocker.prototype.saveTo = function(storage) {
    storage.setItem(this.gameName + '-gameutilsjs-unlocks-version', '1');
    storage.setItem(this.gameName + '-gameutilsjs-unlocks-in-order', JSON.stringify(this.unlocksInOrder));
};

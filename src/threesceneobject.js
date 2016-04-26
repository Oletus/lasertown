'use strict';

// Requires utiljs.js

if (typeof GJS === "undefined") {
    var GJS = {};
}

/**
 * An object that owns a THREE.Object3D.
 * @constructor
 */
GJS.ThreeSceneObject = function() {
};

/**
 * Initialize.
 * @param {Object} options Options with the following keys:
 *   sceneParent (Object3D): Parent of the object in the scene.
 *   object (Object3D): Object that this object will own and add under sceneParent.
 */
GJS.ThreeSceneObject.prototype.initThreeSceneObject = function(options) {
    var defaults = {
        sceneParent: null,
        object: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this._inScene = false;
};

/**
 * Add this object to the scene if it is not there.
 */
GJS.ThreeSceneObject.prototype.addToScene = function() {
    if (!this._inScene) {
        this.sceneParent.add(this.object);
        this._inScene = true;
    }
};

/**
 * Remove this object from the scene if it is in there.
 */
GJS.ThreeSceneObject.prototype.removeFromScene = function() {
    if (this._inScene) {
        this.sceneParent.remove(this.object);
        this._inScene = false;
    }
};

/**
 * @param {THREE.Object3D} object Object to query.
 * @return {boolean} True if object is in the owned part of the scene graph.
 */
GJS.ThreeSceneObject.prototype.ownsSceneObject = function(object) {
    var matches = false;
    this.getOwnQueryObject().traverse(function(obj) {
        if (obj === object) {
            matches = true;
        }
    });
    return matches;
};

/**
 * Override this to customize which parts of the scene this object is considered to own for the purposes of
 * ownsSceneObject.
 * @return {THREE.Object3D} object this object owns
 */
GJS.ThreeSceneObject.prototype.getOwnQueryObject = function() {
    return this.object;
};

/**
 * Update the object. Override this to do time-based updates.
 */
GJS.ThreeSceneObject.prototype.update = function(deltaTime) {
};

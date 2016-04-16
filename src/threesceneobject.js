'use strict';

/**
 * @constructor
 */
var ThreeSceneObject = function() {
};

ThreeSceneObject.prototype.initThreeSceneObject = function(options) {
    var defaults = {
        scene: null,
        object: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this._inScene = false;
};

ThreeSceneObject.prototype.addToScene = function() {
    if (!this._inScene) {
        this.scene.add(this.object);
        this._inScene = true;
    }
};

ThreeSceneObject.prototype.removeFromScene = function() {
    if (this._inScene) {
        this.scene.remove(this.object);
        this._inScene = false;
    }
};

ThreeSceneObject.prototype.update = function(deltaTime) {
};

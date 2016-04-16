'use strict';

/**
 * @constructor
 */
var ThreeSceneObject = function() {
};

ThreeSceneObject.prototype.initThreeSceneObject = function(options) {
    var defaults = {
        scene: null,
        mesh: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this._inScene = false;
};

ThreeSceneObject.prototype.addToScene = function() {
    if (!this._inScene) {
        this.scene.add(this.mesh);
        this._inScene = true;
    }
};

ThreeSceneObject.prototype.removeFromScene = function() {
    if (this._inScene) {
        this.scene.remove(this.mesh);
        this._inScene = false;
    }
};

ThreeSceneObject.prototype.update = function(deltaTime) {
};

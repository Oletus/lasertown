'use strict';

/**
 * Camera controller class to use with Three.js. Does not bind into mouse or touch automatically, so that the controls
 * can be activated conditionally by the game depending on where the cursor is clicked.
 * @constructor
 */
var OrbitCameraControl = function(options) {
    var defaults = {
        camera: null,
        zoomMovesY: true,
        y: 15,
        minY: 5,
        maxY: 30,
        orbitDistance: 20,
        orbitAngle: 0,
        minOrbitAngle: -Infinity,
        maxOrbitAngle: Infinity,
        lookAt: new THREE.Vector3(0, 0, 0)
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.updateCamera();
};

OrbitCameraControl.prototype.updateCamera = function() {
    if (this.camera !== null) {
        var orbitDistance = this.orbitDistance;
        this.camera.position.z = this.lookAt.z + orbitDistance * Math.sin(this.orbitAngle);
        this.camera.position.x = this.lookAt.x + orbitDistance * Math.cos(this.orbitAngle);
        this.camera.position.y = this.lookAt.y + this.y;
        this.camera.lookAt(this.lookAt);
    }
};

/**
 * @param {THREE.Vector3} lookAt
 */
OrbitCameraControl.prototype.setLookAt = function(lookAt) {
    this.lookAt = lookAt.clone();
};

OrbitCameraControl.prototype.zoom = function(amount) {
    if (this.zoomMovesY) {
        this.y -= amount;
        this.clampY();
    }
    this.updateCamera();
};

OrbitCameraControl.prototype.clampY = function() {
    this.y = mathUtil.clamp(this.minY, this.maxY, this.y);
};

OrbitCameraControl.prototype.moveOrbitAngle = function(amount) {
    this.orbitAngle += amount * 0.1;
    this.clampOrbitAngle();
    this.updateCamera();
};

OrbitCameraControl.prototype.clampOrbitAngle = function() {
    this.orbitAngle = mathUtil.clamp(this.minOrbitAngle, this.maxOrbitAngle, this.orbitAngle);
};

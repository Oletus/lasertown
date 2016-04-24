'use strict';

// Requires statemachine.js, utiljs.js

if (typeof GJS === "undefined") {
    var GJS = {};
}

/**
 * Camera controller class to use with Three.js. Does not bind into mouse or touch automatically, so that the controls
 * can be activated conditionally by the game depending on where the cursor is clicked.
 *
 * The camera orbits around the target in the x and z directions, and moves up and down in the y direction.
 *
 * @param {Object} options Options for the camera. Angles are in radians.
 * @constructor
 */
GJS.OrbitCameraControl = function(options) {
    var defaults = {
        camera: null,
        zoomMovesY: true,
        y: 15,
        minY: 5,
        maxY: 30,
        relativeY: true,
        orbitDistance: 20,
        orbitAngle: 0,
        minOrbitAngle: -Infinity,
        maxOrbitAngle: Infinity,
        lookAt: new THREE.Vector3(0, 0, 0)
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.updateCamera();
    this.state = new StateMachine({stateSet: GJS.OrbitCameraControl.State, id: GJS.OrbitCameraControl.State.CONTROLLABLE});
};

GJS.OrbitCameraControl.State = {
    ANIMATING: 0,
    CONTROLLABLE: 1
};

/**
 * Update the camera position based on the data stored in the class.
 */
GJS.OrbitCameraControl.prototype.updateCamera = function() {
    if (this.camera !== null) {
        var orbitDistance = this.orbitDistance;
        this.camera.position.z = this.lookAt.z + orbitDistance * Math.sin(this.orbitAngle);
        this.camera.position.x = this.lookAt.x + orbitDistance * Math.cos(this.orbitAngle);
        if (this.relativeY) {
            this.camera.position.y = this.lookAt.y + this.y;
        } else {
            this.camera.position.y = this.y;
        }
        this.camera.lookAt(this.lookAt);
    }
};

/**
 * @param {THREE.Vector3} lookAt The position to point the camera at.
 */
GJS.OrbitCameraControl.prototype.setLookAt = function(lookAt) {
    this.lookAt = lookAt.clone();
    this.updateCamera();
};

/**
 * Update the camera in case it is animating. Animations always last for 1 second. TODO: Make this configurable.
 * @param {number} deltaTime Time difference since the last call to this function.
 */
GJS.OrbitCameraControl.prototype.update = function(deltaTime) {
    this.state.update(deltaTime);
    if (this.state.id === GJS.OrbitCameraControl.State.ANIMATING) {
        var t = this.state.time / this.animationDuration;
        if (t > 1) {
            t = 1;
            this.state.change(GJS.OrbitCameraControl.State.CONTROLLABLE);
        }
        this.orbitAngle = mathUtil.mixSmooth(this.startOrbitAngle, this.targetOrbitAngle, t);
        this.y = mathUtil.mixSmooth(this.startY, this.targetY, t);
        this.updateCamera();
    }
};

/**
 * Start animated camera transition.
 * @param {Object} options Options for the animation to start.
 */
GJS.OrbitCameraControl.prototype.animate = function(options) {
    this.state.change(GJS.OrbitCameraControl.State.ANIMATING);
    this.startOrbitAngle = this.orbitAngle;
    this.startY = this.y;
    var defaults = {
        targetY: this.y,
        targetOrbitAngle: this.orbitAngle,
        animationDuration: 1
    };
    objectUtil.initWithDefaults(this, defaults, options);
};

/**
 * Zoom the camera (move it up and down on the y axis). TODO: Add more options for zooming.
 * @param {number} amount How much to change the zoom level.
 */
GJS.OrbitCameraControl.prototype.zoom = function(amount) {
    if (this.zoomMovesY) {
        this.y -= amount;
        this.clampY();
    }
    this.updateCamera();
};

/**
 * Clamp the camera position in the y position to the configured max and min values.
 */
GJS.OrbitCameraControl.prototype.clampY = function() {
    this.y = mathUtil.clamp(this.minY, this.maxY, this.y);
};

/**
 * Move the orbit angle of the camera.
 * @param {number} amount How much to move the orbit angle in radians.
 */
GJS.OrbitCameraControl.prototype.moveOrbitAngle = function(amount) {
    this.orbitAngle += amount;
    this.clampOrbitAngle();
    this.updateCamera();
};

/**
 * Clamp the orbit angle to the configured max and min values.
 */
GJS.OrbitCameraControl.prototype.clampOrbitAngle = function() {
    this.orbitAngle = mathUtil.clamp(this.minOrbitAngle, this.maxOrbitAngle, this.orbitAngle);
};

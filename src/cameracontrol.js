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
        relativeY: true,
        orbitDistance: 20,
        orbitAngle: 0,
        minOrbitAngle: -Infinity,
        maxOrbitAngle: Infinity,
        lookAt: new THREE.Vector3(0, 0, 0)
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.updateCamera();
    this.state = new StateMachine({stateSet: OrbitCameraControl.State, id: OrbitCameraControl.State.CONTROLLABLE});
};

OrbitCameraControl.State = {
    ANIMATING: 0,
    CONTROLLABLE: 1
};

OrbitCameraControl.prototype.updateCamera = function() {
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
 * @param {THREE.Vector3} lookAt
 */
OrbitCameraControl.prototype.setLookAt = function(lookAt) {
    this.lookAt = lookAt.clone();
    this.updateCamera();
};

OrbitCameraControl.prototype.update = function(deltaTime) {
    this.state.update(deltaTime);
    if (this.state.id === OrbitCameraControl.State.ANIMATING) {
        var t = this.state.time / this.animationDuration;
        if (t > 1) {
            t = 1;
            this.state.change(OrbitCameraControl.State.CONTROLLABLE);
        }
        this.orbitAngle = mathUtil.mixSmooth(this.startOrbitAngle, this.targetOrbitAngle, t);
        this.y = mathUtil.mixSmooth(this.startY, this.targetY, t);
        this.updateCamera();
    }
};

OrbitCameraControl.prototype.animate = function(options) {
    this.state.change(OrbitCameraControl.State.ANIMATING);
    this.startOrbitAngle = this.orbitAngle;
    this.startY = this.y;
    var defaults = {
        targetY: this.y,
        targetOrbitAngle: this.orbitAngle,
        animationDuration: 1
    };
    objectUtil.initWithDefaults(this, defaults, options);
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

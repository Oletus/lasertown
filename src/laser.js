'use strict';

/**
 * @constructor
 */
var LaserSegmentLocation = function(options) {
    var defaults = {
        x: -1,
        y: 1.5,
        z: 2,
        direction: Laser.Direction.POSITIVE_X,
    };
    objectUtil.initWithDefaults(this, defaults, options);
};

LaserSegmentLocation.prototype.copy = function() {
    return new LaserSegmentLocation({
        x: this.x,
        y: this.y,
        z: this.z,
        direction: this.direction
    });
};

LaserSegmentLocation.prototype.equals = function(other) {
    return this.x === other.x &&
           this.y === other.y &&
           this.z === other.z &&
           this.direction === other.direction;
};

LaserSegmentLocation.prototype.getSceneLocation = function(level) {
    return new THREE.Vector3(level.gridXToWorld(this.x), this.y, level.gridZToWorld(this.z));
};


/**
 * @constructor
 */
var Laser = function(options) {
    var defaults = {
        level: null,
        sceneParent: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.segments = [];
    this.laserCannon = new LaserCannon({laser: this, sceneParent: this.sceneParent, level: this.level});
    this.state = new StateMachine({stateSet: Laser.State});
};

Laser.State = {
    OFF: 0,
    ON: 1
};

Laser.Handling = {
    STOP: 0,
    CONTINUE: 1,
    INFINITY: 2,
    GOAL: 3
};

Laser.Direction = {
    POSITIVE_X: 0,
    NEGATIVE_X: 1,
    POSITIVE_Z: 2,
    NEGATIVE_Z: 3,
    POSITIVE_Y: 4,
    NEGATIVE_Y: 5
};


Laser.cycleHorizontalDirection = function(direction) {
    direction += 1;
    if (direction > Laser.Direction.NEGATIVE_Z) {
        direction = Laser.Direction.POSITIVE_X;
    }
    return direction;
};

Laser.isVerticalDirection = function(direction) {
    return (direction === Laser.Direction.POSITIVE_Y || direction === Laser.Direction.NEGATIVE_Y);
};

Laser.offsetFromDirection = function(direction) {
    switch (direction) {
        case Laser.Direction.POSITIVE_X:
            return new THREE.Vector3(1, 0, 0);
        case Laser.Direction.NEGATIVE_X:
            return new THREE.Vector3(-1, 0, 0);
        case Laser.Direction.POSITIVE_Y:
            return new THREE.Vector3(0, 1, 0);
        case Laser.Direction.NEGATIVE_Y:
            return new THREE.Vector3(0, -1, 0);
        case Laser.Direction.POSITIVE_Z:
            return new THREE.Vector3(0, 0, 1);
        case Laser.Direction.NEGATIVE_Z:
            return new THREE.Vector3(0, 0, -1);
    }
};

Laser.oppositeDirection = function(direction) {
    switch (direction) {
        case Laser.Direction.POSITIVE_X:
            return Laser.Direction.NEGATIVE_X;
        case Laser.Direction.POSITIVE_Y:
            return Laser.Direction.NEGATIVE_Y;
        case Laser.Direction.POSITIVE_Z:
            return Laser.Direction.NEGATIVE_Z;
        case Laser.Direction.NEGATIVE_X:
            return Laser.Direction.POSITIVE_X;
        case Laser.Direction.NEGATIVE_Y:
            return Laser.Direction.POSITIVE_Y;
        case Laser.Direction.NEGATIVE_Z:
            return Laser.Direction.POSITIVE_Z;
    }
};

Laser.inPath = function(path, segment) {
    for (var i = 0; i < path.length; ++i) {
        if (path[i].equals(segment)) {
            return true;
        }
    }
    return false;
};

Laser.startSound = new Audio('laser-start');

Laser.prototype.update = function(deltaTime) {
    this.laserCannon.update(deltaTime);
    if (this.state.id === Laser.State.OFF) {
        this.pruneSegments(0);
    } else if (this.state.id === Laser.State.ON &&
               (this.segments.length === 0 || !this.segments[0].loc.equals(this.laserCannon.loc)))
    {
        if (this.segments.length === 0) {
            Laser.startSound.play();
        }
        this.ensureSegmentExists(0);
        this.segments[0].loc = this.laserCannon.loc.copy();
    }
    
    if (this.segments.length === 0) {
        return;
    }
    var segmentIndex = 0;
    var loc = this.segments[segmentIndex].loc.copy();

    this.segments[segmentIndex].length = 0;
    var laserContinues = true;
    var path = [];
    while (laserContinues) {
        var offset = Laser.offsetFromDirection(loc.direction);
        loc.x = Math.round(loc.x + offset.x);
        loc.y = Math.round(loc.y + offset.y - 0.5) + 0.5;
        loc.z = Math.round(loc.z + offset.z);
        if (offset.y !== 0) {
            this.segments[segmentIndex].length += 1;
        } else {
            this.segments[segmentIndex].length += GRID_SPACING;
        }
        var handling = this.level.handleLaser(loc);
        if (handling instanceof LaserSegmentLocation) {
            // Make sure that laser doesn't loop
            if (Laser.inPath(path, handling)) {
                laserContinues = false;
            } else {
                path.push(handling.copy());
                ++segmentIndex;
                this.ensureSegmentExists(segmentIndex);
                this.segments[segmentIndex].loc = handling;
                loc = this.segments[segmentIndex].loc.copy();
                this.segments[segmentIndex].length = 0;
            }
        } else if (handling === Laser.Handling.STOP) {
            laserContinues = false;
            this.segments[segmentIndex].length -= 0.5;  // stop at building wall
        } else if (handling === Laser.Handling.INFINITY) {
            laserContinues = false;
            this.segments[segmentIndex].length += GRID_SPACING * 10; // go beyond the edge of the level
        }
    }
    this.pruneSegments(segmentIndex + 1);
    for (var i = 0; i < this.segments.length; ++i) {
        this.segments[i].update(deltaTime);
    }
};

Laser.prototype.ensureSegmentExists = function(i) {
    if (i >= this.segments.length) {
        this.segments.push(new LaserSegment({
            level: this.level,
            sceneParent: this.sceneParent,
            laser: this
        }));
    }
};

Laser.prototype.pruneSegments = function(startFrom) {
    if (startFrom < this.segments.length) {
        for (var i = startFrom; i < this.segments.length; ++i) {
            this.segments[i].removeFromScene();
        }
        this.segments.splice(startFrom);
    }
};

/**
 * @constructor
 */
var LaserCannon = function(options) {
    var defaults = {
        laser: null,
        level: null
    };
    objectUtil.initWithDefaults(this, defaults, options);

    this.mesh = LaserCannon.model.clone();
    this.mesh.position.x = -0.75;
    this.mesh.position.y = -0.8;
    
    this.origin = new THREE.Object3D();
    this.origin.add(this.mesh);
    
    var boxGeometry = new THREE.BoxGeometry(4, 1, 3);
    var material = Level.groundMaterial;
    var box = new THREE.Mesh(boxGeometry, material);
    box.position.y = -2;
    this.origin.add(box);
    
    this.loc = new LaserSegmentLocation({});
    
    this.initThreeSceneObject({
        object: this.origin,
        sceneParent: options.sceneParent
    });
    
    this.addToScene();
};

LaserCannon.prototype = new ThreeSceneObject();

LaserCannon.model = null;

LaserCannon.prototype.update = function(deltaTime) {
    var originPos = this.loc.getSceneLocation(this.level);
    this.origin.position.set(originPos.x, originPos.y, originPos.z);
};

/**
 * @constructor
 */
var LaserSegment = function(options) {
    var defaults = {
        loc: new LaserSegmentLocation({}),
        length: 2 * GRID_SPACING,
        level: null,
        laser: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    this.mesh = new THREE.Object3D();
    
    var geometry = new THREE.BoxGeometry( 0.2, 0.2, 1 );
    var material = LaserSegment.outerMaterial;
    var outerMesh = new THREE.Mesh(geometry, material);
    this.mesh.add(outerMesh);
    
    var geometry = new THREE.BoxGeometry( 0.07, 0.07, 1 );
    var material = LaserSegment.innerMaterial;
    var innerMesh = new THREE.Mesh(geometry, material);
    this.mesh.add(innerMesh);
    
    this.origin = new THREE.Object3D();
    this.origin.add(this.mesh);
    
    this.initThreeSceneObject({
        object: this.origin,
        sceneParent: options.sceneParent
    });

    this.addToScene();
};

LaserSegment.prototype = new ThreeSceneObject();

LaserSegment.outerMaterial = (function() {
    var material = new THREE.MeshPhongMaterial( { color: 0x0, emissive: 0xff5555 } );
    material.blending = THREE.AdditiveBlending;
    material.transparent = true;
    material.opacity = 0.7;
    return material;
})();
LaserSegment.innerMaterial = (function() {
    var material = new THREE.MeshPhongMaterial( { color: 0x0, emissive: 0xffffff } );
    return material;
})();

LaserSegment.prototype.update = function(deltaTime) {
    var originPos = this.loc.getSceneLocation(this.level);
    this.origin.position.set(originPos.x, originPos.y, originPos.z);
    this.origin.rotation.x = 0;
    this.origin.rotation.y = 0;
    switch (this.loc.direction) {
        case Laser.Direction.POSITIVE_X:
            this.origin.rotation.y = Math.PI * 0.5;
            break;
        case Laser.Direction.NEGATIVE_X:
            this.origin.rotation.y = -Math.PI * 0.5;
            break;
        case Laser.Direction.POSITIVE_Z:
            this.origin.rotation.y = 0;
            break;
        case Laser.Direction.NEGATIVE_Z:
            this.origin.rotation.y = Math.PI;
            break;
        case Laser.Direction.POSITIVE_Y:
            this.origin.rotation.x = -Math.PI * 0.5;
            break;
        case Laser.Direction.NEGATIVE_Y:
            this.origin.rotation.x = Math.PI * 0.5;
            break;
    }
    
    this.mesh.position.z = this.length * 0.5;
    this.mesh.scale.z = this.length;
};

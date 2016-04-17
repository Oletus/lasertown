'use strict';

/**
 * @constructor
 */
var LaserSegmentLocation = function(options) {
    var defaults = {
        originX: -1,
        originZ: 2,
        y: 1.5,
        direction: Laser.Direction.POSITIVE_X,
    };
    objectUtil.initWithDefaults(this, defaults, options);
};

LaserSegmentLocation.prototype.copy = function() {
    return new LaserSegmentLocation({
        originX: this.originX,
        originZ: this.originZ,
        y: this.y,
        direction: this.direction
    });
};

LaserSegmentLocation.prototype.equals = function(other) {
    return this.originX === other.originX &&
           this.originZ === other.originZ &&
           this.y === other.y &&
           this.direction === other.direction;
};


/**
 * @constructor
 */
var Laser = function(options) {
    var defaults = {
        level: null,
        scene: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.segments = [];
    this.ensureSegmentExists(0);
};

Laser.Handling = {
    STOP: 0,
    CONTINUE: 1,
    INFINITY: 2
};

Laser.Direction = {
    POSITIVE_X: 0,
    NEGATIVE_X: 1,
    POSITIVE_Z: 2,
    NEGATIVE_Z: 3
};


Laser.cycleDirection = function(direction) {
    direction += 1;
    if (direction > Laser.Direction.NEGATIVE_Z) {
        direction = Laser.Direction.POSITIVE_X;
    }
    return direction;
};

Laser.offsetFromDirection = function(direction) {
    switch (direction) {
        case Laser.Direction.POSITIVE_X:
            return new THREE.Vector3(1, 0, 0);
        case Laser.Direction.NEGATIVE_X:
            return new THREE.Vector3(-1, 0, 0);
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
        case Laser.Direction.NEGATIVE_X:
            return Laser.Direction.POSITIVE_X;
        case Laser.Direction.POSITIVE_Z:
            return Laser.Direction.NEGATIVE_Z;
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

Laser.prototype.update = function(deltaTime) {
    var segmentIndex = 0;
    var loc = this.segments[segmentIndex].loc;
    var x = loc.originX;
    var z = loc.originZ;

    this.segments[segmentIndex].length = 0;
    var laserContinues = true;
    var path = [];
    while (laserContinues) {
        var offset = Laser.offsetFromDirection(loc.direction);
        x = Math.round(x + offset.x);
        z = Math.round(z + offset.z);
        this.segments[segmentIndex].length += GRID_SPACING;
        var handling = this.level.handleLaser(x, z, loc);
        if (handling instanceof LaserSegmentLocation) {
            // Make sure that laser doesn't loop
            if (Laser.inPath(path, handling)) {
                laserContinues = false;
            } else {
                path.push(handling.copy());
                ++segmentIndex;
                this.ensureSegmentExists(segmentIndex);
                this.segments[segmentIndex].loc = handling;
                loc = this.segments[segmentIndex].loc;
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
            scene: this.scene,
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
        scene: options.scene
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
    this.origin.position.y = this.loc.y;
    this.origin.position.x = this.level.gridXToWorld(this.loc.originX);
    this.origin.position.z = this.level.gridZToWorld(this.loc.originZ);
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
    }
    
    this.mesh.position.z = this.length * 0.5;
    this.mesh.scale.z = this.length;
};

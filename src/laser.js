'use strict';

/**
 * @constructor
 */
var LaserSegmentLocation = function(options) {
    var defaults = {
        originX: -1,
        originZ: 2,
        y: 1.5,
        direction: LaserSegment.Direction.POSITIVE_X,
    };
    objectUtil.initWithDefaults(this, defaults, options);
};


/**
 * @constructor
 */
var Laser = function(options) {
    var defaults = {
        loc: new LaserSegmentLocation({}),
        level: null,
        scene: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.segments = [];
    
    this.segments.push(new LaserSegment({
        loc: this.loc,
        level: this.level,
        scene: this.scene,
        laser: this
    }));
};

Laser.offsetFromDirection = function(direction) {
    switch (direction) {
        case LaserSegment.Direction.POSITIVE_X:
            return new THREE.Vector3(1, 0, 0);
        case LaserSegment.Direction.NEGATIVE_X:
            return new THREE.Vector3(-1, 0, 0);
        case LaserSegment.Direction.POSITIVE_Z:
            return new THREE.Vector3(0, 0, 1);
        case LaserSegment.Direction.NEGATIVE_X:
            return new THREE.Vector3(0, 0, -1);
    }
};

Laser.prototype.update = function(deltaTime) {
    var segmentIndex = 0;
    var loc = this.segments[segmentIndex].loc;
    var x = loc.originX;
    var z = loc.originZ;

    var segmentLength = 0;
    var laserContinues = true;
    while (laserContinues) {
        var offset = Laser.offsetFromDirection(loc.direction);
        x = Math.round(x + offset.x);
        z = Math.round(z + offset.z);
        segmentLength += GRID_SPACING;
        var building = this.level.getBuildingFromGrid(x, z);
        if (!building) {
            laserContinues = false;
            segmentLength += GRID_SPACING * 10;
        } else {
            var handling = building.handleLaser(loc);
            if (handling === null) {
                laserContinues = false;
                segmentLength -= 0.5;  // stop at building wall
            }
        }
        this.segments[segmentIndex].length = segmentLength;
    }
    for (var i = 0; i < this.segments.length; ++i) {
        this.segments[i].update(deltaTime);
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
    
    var geometry = new THREE.BoxGeometry( 0.2, 0.2, 1 );
    var material = new THREE.MeshPhongMaterial( { color: 0x0, emissive: 0xff8888 } );
    /*material.blending = THREE.AdditiveBlending;
    material.transparent = true;
    material.opacity = 0.6;*/
    this.mesh = new THREE.Mesh(geometry, material);
    
    this.origin = new THREE.Object3D();
    this.origin.add(this.mesh);
    
    this.initThreeSceneObject({
        object: this.origin,
        scene: options.scene
    });

    this.addToScene();
};

LaserSegment.prototype = new ThreeSceneObject();

LaserSegment.Direction = {
    POSITIVE_X: 0,
    NEGATIVE_X: 1,
    POSITIVE_Z: 2,
    NEGATIVE_Z: 3
};

LaserSegment.prototype.update = function(deltaTime) {
    this.origin.position.y = this.loc.y;
    this.origin.position.x = this.level.gridXToWorld(this.loc.originX);
    this.origin.position.z = this.level.gridZToWorld(this.loc.originZ);
    switch (this.loc.direction) {
        case LaserSegment.Direction.POSITIVE_X:
            this.origin.rotation.y = Math.PI * 0.5;
            break;
        case LaserSegment.Direction.NEGATIVE_X:
            this.origin.rotation.y = -Math.PI * 0.5;
            break;
        case LaserSegment.Direction.POSITIVE_Z:
            this.origin.rotation.y = 0;
            break;
        case LaserSegment.Direction.NEGATIVE_X:
            this.origin.rotation.y = Math.PI;
            break;
    }
    
    this.mesh.position.z = this.length * 0.5;
    this.mesh.scale.z = this.length;
};
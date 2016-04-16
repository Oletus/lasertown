'use strict';

/**
 * @constructor
 */
var Building = function() {
};
    
Building.prototype = new ThreeSceneObject();

Building.prototype.initBuilding = function(options) {
    var defaults = {
        gridX: 0,
        gridZ: 0,
        topY: mathUtil.randomInt(2) + 1,
        height: 3,
        level: null
    };
    objectUtil.initWithDefaults(this, defaults, options);

    // Test geometry
    var geometry = new THREE.BoxGeometry( 1, this.height, 1 );
    var material = new THREE.MeshPhongMaterial( { color: 0xff8888, specular: 0xffffff } );
    this.baseMesh = new THREE.Mesh( geometry, material );

    this.origin = new THREE.Object3D();
    this.origin.add(this.baseMesh);

    this.initThreeSceneObject({
        object: this.origin,
        scene: options.scene
    });    
    this.addToScene();
    
    this.stationary = true;
};

Building.prototype.update = function(deltaTime) {
    this.object.position.x = this.level.gridXToWorld(this.gridX);
    this.object.position.z = this.level.gridZToWorld(this.gridZ);
    this.object.position.y = this.topY - this.height * 0.5;
};

/**
 * @return {Object} true if laser is let through. Null if laser stops. LaserSegmentLocation object if a new segment is started. 
 */
Building.prototype.handleLaser = function(laserSegmentLoc) {
    if (laserSegmentLoc.y > this.topY) {
        return true;
    } else {
        return null;
    }
};

/**
 * @constructor
 */
var BlockBuilding = function(options) {
    this.initBuilding(options);
    this.stationary = true;
};

BlockBuilding.prototype = new Building();


/**
 * @constructor
 */
var MirrorBuilding = function(options) {
    this.initBuilding(options);
    var defaults = {
        mirrorDirection: true // true means positive x gets mirrored to positive z.
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.stationary = false;
};

MirrorBuilding.prototype = new Building();

MirrorBuilding.prototype.mirror = function(laserSegmentLoc) {
    var newLoc = new LaserSegmentLocation({
        originX: this.gridX,
        originZ: this.gridZ,
        y: laserSegmentLoc.y
    });
    if (this.mirrorDirection) {
        if (laserSegmentLoc.direction === LaserSegment.Direction.POSITIVE_Z) {
            newLoc.direction = LaserSegment.Direction.POSITIVE_X;
        } else if (laserSegmentLoc.direction === LaserSegment.Direction.POSITIVE_X) {
            newLoc.direction = LaserSegment.Direction.POSITIVE_Z;
        } else if (laserSegmentLoc.direction === LaserSegment.Direction.NEGATIVE_Z) {
            newLoc.direction = LaserSegment.Direction.NEGATIVE_X;
        } else if (laserSegmentLoc.direction === LaserSegment.Direction.NEGATIVE_X) {
            newLoc.direction = LaserSegment.Direction.NEGATIVE_Z;
        }
    } else {
        if (laserSegmentLoc.direction === LaserSegment.Direction.POSITIVE_Z) {
            newLoc.direction = LaserSegment.Direction.NEGATIVE_X;
        } else if (laserSegmentLoc.direction === LaserSegment.Direction.POSITIVE_X) {
            newLoc.direction = LaserSegment.Direction.NEGATIVE_Z;
        } else if (laserSegmentLoc.direction === LaserSegment.Direction.NEGATIVE_Z) {
            newLoc.direction = LaserSegment.Direction.POSITIVE_X;
        } else if (laserSegmentLoc.direction === LaserSegment.Direction.NEGATIVE_X) {
            newLoc.direction = LaserSegment.Direction.POSITIVE_Z;
        }
    }
    return newLoc;
};

MirrorBuilding.prototype.handleLaser = function(laserSegmentLoc) {
    if (laserSegmentLoc.y > this.topY - 1 && laserSegmentLoc.y < this.topY) {
        return this.mirror(laserSegmentLoc);
    } else {
        return Building.prototype.handleLaser.call(this, laserSegmentLoc);
    }
};

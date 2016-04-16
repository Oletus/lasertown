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
        topY: mathUtil.randomInt(1) + 1,
        height: 2,
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
    this.stationary = false;
};

MirrorBuilding.prototype = new Building();

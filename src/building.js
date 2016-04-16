'use strict';

/**
 * @constructor
 */
var Building = function() {
};

Building.prototype.initBuilding = function(options) {
    var defaults = {
        level: null,
        scene: null,
        gridX: 0,
        gridZ: 0,
        topY: 2,
        blocksSpec: [] // Listed from top downwards
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.blocks = [];
    for (var i = 0; i < this.blocksSpec.length; ++i) {
        var spec = this.blocksSpec[i];
        var options = {
            level: this.level,
            building: this,
            scene: this.scene
        };
        for (var key in spec) {
            if (spec.hasOwnProperty(key)) {
                options[key] = spec[key];
            }
        }
        this.blocks.push(new spec.blockConstructor(options));
    }
    this.stationary = false;
};

Building.prototype.update = function(deltaTime) {
    for (var i = 0; i < this.blocks.length; ++i) {
        this.blocks[i].topY = this.topY - i;
        this.blocks[i].update(deltaTime);
    }
};

/**
 * @return {Object} true if laser is let through. Null if laser stops. LaserSegmentLocation object if a new segment is started. 
 */
Building.prototype.handleLaser = function(laserSegmentLoc) {
    if (laserSegmentLoc.y >= this.topY || laserSegmentLoc.y <= this.topY - this.blocks.length) {
        return Laser.Handling.CONTINUE;
    } else {
        var yFromTop = this.topY - laserSegmentLoc.y;
        return this.blocks[Math.floor(yFromTop)].handleLaser(laserSegmentLoc);
    }
};

/**
 * @constructor
 */
var BuildingBlock = function() {
    
};

BuildingBlock.prototype = new ThreeSceneObject();

BuildingBlock.prototype.initBuildingBlock = function(options) {
    var defaults = {
        topY: 2,
        building: null,
        level: null
    };
    objectUtil.initWithDefaults(this, defaults, options);

    // Test geometry
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
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

BuildingBlock.prototype.update = function(deltaTime) {
    this.object.position.x = this.level.gridXToWorld(this.building.gridX);
    this.object.position.z = this.level.gridZToWorld(this.building.gridZ);
    this.object.position.y = this.topY - 0.5;
};


/**
 * @constructor
 */
var GoalBuilding = function(options) {
    options.blocksSpec = [
        {blockConstructor: GoalBlock},
        {blockConstructor: StopBlock}
    ];
    this.initBuilding(options);
    this.stationary = true;
};

GoalBuilding.prototype = new Building();


/**
 * @constructor
 */
var StopBlock = function(options) {
    this.initBuildingBlock(options);
};

StopBlock.prototype = new BuildingBlock();

StopBlock.prototype.handleLaser = function(laserSegmentLoc) {
    return Laser.Handling.STOP;
};


/**
 * @constructor
 */
var GoalBlock = function(options) {
    this.initBuildingBlock(options);
};

GoalBlock.prototype = new BuildingBlock();

GoalBlock.prototype.handleLaser = function(laserSegmentLoc) {
    return Laser.Handling.INFINITY;
};


/**
 * @constructor
 */
var MirrorBlock = function(options) {
    this.initBuildingBlock(options);
    var defaults = {
        mirrorDirection: true // true means positive x gets mirrored to positive z.
    };
    objectUtil.initWithDefaults(this, defaults, options);
};

MirrorBlock.prototype = new BuildingBlock();

MirrorBlock.prototype.handleLaser = function(laserSegmentLoc) {
    var newLoc = new LaserSegmentLocation({
        originX: this.building.gridX,
        originZ: this.building.gridZ,
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

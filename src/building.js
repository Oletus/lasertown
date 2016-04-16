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
    this.topYTarget = this.topY;
    this.blocks = [];
    for (var i = 0; i < this.blocksSpec.length; ++i) {
        var spec = this.blocksSpec[i];
        this.blocks.push(this.constructBlockFromSpec(spec));
    }
    this.stationary = false;
};

Building.prototype.update = function(deltaTime) {
    this.topY = towardsValue(this.topY, this.topYTarget, deltaTime * 7);
    for (var i = 0; i < this.blocks.length; ++i) {
        this.blocks[i].topY = this.topY - i;
        this.blocks[i].update(deltaTime);
    }
};

Building.prototype.upPress = function() {
    if (this.stationary) {
        return;
    }
    if (this.topYTarget < this.blocks.length) {
        ++this.topYTarget;
    }
};

Building.prototype.downPress = function() {
    if (this.stationary) {
        return;
    }
    if (this.topYTarget > 0) {
        --this.topYTarget;
    }
};

Building.prototype.getBlockAtLevel = function(y) {
    if (y >= this.topY || y <= this.topY - this.blocks.length) {
        return null;
    } else {
        var yFromTop = this.topY - y;
        return this.blocks[Math.floor(yFromTop)];
    }
};

/**
 * @return {Object} Laser.Handling in case of simple handling. LaserSegmentLocation object if a new segment is started. 
 */
Building.prototype.handleLaser = function(laserSegmentLoc) {
    var block = this.getBlockAtLevel(laserSegmentLoc.y);
    if (block === null) {
        return Laser.Handling.CONTINUE;
    } else {
        return block.handleLaser(laserSegmentLoc);
    }
};

Building.prototype.constructBlockFromSpec = function(spec) {
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
    return new spec.blockConstructor(options);
};

Building.prototype.replaceBlockSpec = function(block, spec) {
    var ind = this.blocks.indexOf(block);
    block.removeFromScene();
    this.blocks[ind] = this.constructBlockFromSpec(spec);
};

Building.prototype.ownsSceneObject = function(object) {
    for (var i = 0; i < this.blocks.length; ++i) {
        if (this.blocks[i].ownsSceneObject(object)) {
            return true;
        }
    }
    return false;
};

/**
 * @constructor
 */
var BuildingCursor = function(options) {
    var defaults = {
        level: null,
        gridX: 0,
        gridZ: 0,
        color: 0xaaccff,
        y: 0.2
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    this.mesh = this.createMesh();
    
    this.initThreeSceneObject({
        object: this.mesh,
        scene: options.scene
    });
};

BuildingCursor.prototype = new ThreeSceneObject();

BuildingCursor.prototype.update = function(deltaTime) {
    this.object.position.x = this.level.gridXToWorld(this.gridX);
    this.object.position.z = this.level.gridZToWorld(this.gridZ);
    this.object.position.y = this.y;
    this.object.rotation.y += deltaTime;
};

BuildingCursor.prototype.createMesh = function() {
    var shape = utilTHREE.createSquareWithHole(1.9, 1.5);

    var line = new THREE.LineCurve3(new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0, 0.1, 0));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    var material = new THREE.MeshPhongMaterial( { color: this.color, emissive: 0x448888 } );
    material.transparent = true;
    material.opacity = 0.7;

    return new THREE.Mesh(geometry, material);
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

    this.mesh = this.createMesh();

    this.origin = new THREE.Object3D();
    this.origin.add(this.mesh);

    this.initThreeSceneObject({
        object: this.origin,
        scene: options.scene
    });
    this.addToScene();
    
    this.stationary = true;
};

BuildingBlock.wallMaterial = new THREE.MeshPhongMaterial( { color: 0xffaa88, specular: 0xffffff } );

BuildingBlock.prototype.createMesh = function() {
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    var material = BuildingBlock.wallMaterial;
    return new THREE.Mesh(geometry, material);
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
var HoleBlock = function(options) {
    var defaults = {
        holeDirection: true // true means hole letting through lasers between positive x and negative x.
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.initBuildingBlock(options);
};

HoleBlock.prototype = new BuildingBlock();

HoleBlock.prototype.handleLaser = function(laserSegmentLoc) {
    var zLaser = (laserSegmentLoc.direction === Laser.Direction.POSITIVE_Z || laserSegmentLoc.direction === Laser.Direction.NEGATIVE_Z);
    if (this.holeDirection) {
        if (zLaser) {
            return Laser.Handling.STOP;
        } else {
            return Laser.Handling.CONTINUE;
        }
    } else {
        if (zLaser) {
            return Laser.Handling.CONTINUE;
        } else {
            return Laser.Handling.STOP;
        }
    }
};

HoleBlock.prototype.createMesh = function() {
    var shape = utilTHREE.createSquareWithHole(1.0, 0.6);

    var line = new THREE.LineCurve3(new THREE.Vector3(0, 0, -0.3), new THREE.Vector3(0, 0, 0.3));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    var material = BuildingBlock.wallMaterial;
    var mesh = new THREE.Mesh(geometry, material);
    var parent = new THREE.Object3D();
    parent.add(mesh);
    parent.rotation.y = Math.PI * (this.holeDirection ? 0.5 : 0);
    return parent;
};


/**
 * @constructor
 */
var MirrorBlock = function(options) {
    var defaults = {
        mirrorDirection: true // true means positive x gets mirrored to positive z.
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.initBuildingBlock(options);
};

MirrorBlock.prototype = new BuildingBlock();

MirrorBlock.prototype.createMesh = function() {
    var geometry = new THREE.BoxGeometry( 1, 1, 0.15 );
    var material = new THREE.MeshPhongMaterial( { color: 0x2288ff, specular: 0xffffff } );
    material.transparent = true;
    material.opacity = 0.7;
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI * (0.25 + (this.mirrorDirection ? 0.5 : 0));
    var parent = new THREE.Object3D();
    parent.add(mesh);
    return parent;
};

MirrorBlock.prototype.handleLaser = function(laserSegmentLoc) {
    var newLoc = new LaserSegmentLocation({
        originX: this.building.gridX,
        originZ: this.building.gridZ,
        y: laserSegmentLoc.y
    });
    if (this.mirrorDirection) {
        if (laserSegmentLoc.direction === Laser.Direction.POSITIVE_Z) {
            newLoc.direction = Laser.Direction.POSITIVE_X;
        } else if (laserSegmentLoc.direction === Laser.Direction.POSITIVE_X) {
            newLoc.direction = Laser.Direction.POSITIVE_Z;
        } else if (laserSegmentLoc.direction === Laser.Direction.NEGATIVE_Z) {
            newLoc.direction = Laser.Direction.NEGATIVE_X;
        } else if (laserSegmentLoc.direction === Laser.Direction.NEGATIVE_X) {
            newLoc.direction = Laser.Direction.NEGATIVE_Z;
        }
    } else {
        if (laserSegmentLoc.direction === Laser.Direction.POSITIVE_Z) {
            newLoc.direction = Laser.Direction.NEGATIVE_X;
        } else if (laserSegmentLoc.direction === Laser.Direction.POSITIVE_X) {
            newLoc.direction = Laser.Direction.NEGATIVE_Z;
        } else if (laserSegmentLoc.direction === Laser.Direction.NEGATIVE_Z) {
            newLoc.direction = Laser.Direction.POSITIVE_X;
        } else if (laserSegmentLoc.direction === Laser.Direction.NEGATIVE_X) {
            newLoc.direction = Laser.Direction.POSITIVE_Z;
        }
    }
    return newLoc;
};

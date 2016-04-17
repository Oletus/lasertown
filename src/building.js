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
        blocksSpec: [], // Listed from top downwards
        stationary: false,
        topY: undefined
    };
    objectUtil.initWithDefaults(this, defaults, options);
    if (this.topY === undefined) {
        this.topY = this.blocksSpec.length - 1;
    }
    this.topYTarget = this.topY;
    this.blocks = [];
    for (var i = 0; i < this.blocksSpec.length; ++i) {
        var spec = this.blocksSpec[i];
        this.blocks.push(this.constructBlockFromSpec(spec));
    }
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
    ++this.topYTarget;
    this.clampY();
};

Building.prototype.downPress = function() {
    if (this.stationary) {
        return;
    }
    --this.topYTarget;
    this.clampY();
};

Building.prototype.clampY = function() {
    if (this.topYTarget > this.blocks.length - 1) {
        this.topYTarget = this.blocks.length - 1;
    }
    if (this.topYTarget < 0) {
        this.topYTarget = 0;
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
    var block = new spec.blockConstructor(options);
    if (this.stationary) {
        block.setStationary(this.stationary);
    }
    return block;
};

Building.prototype.addBlock = function(spec) {
    this.blocks.push(this.constructBlockFromSpec(spec));
};

Building.prototype.addBlockToTop = function(spec) {
    this.blocks.splice(0, 0, this.constructBlockFromSpec(spec));
};

Building.prototype.removeBlock = function(block) {
    var ind = this.blocks.indexOf(block);
    block.removeFromScene();
    this.blocks.splice(ind, 1);
    if (this.blocks.length === 1) {
        this.setStationary(true);
    }
};

Building.prototype.replaceBlockSpec = function(blockToReplace, spec) {
    var ind = this.blocks.indexOf(blockToReplace);
    blockToReplace.removeFromScene();
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

Building.prototype.setStationary = function(stationary) {
    if (this.stationary !== stationary) {
        this.stationary = stationary;
        for (var i = 0; i < this.blocks.length; ++i) {
            this.blocks[i].setStationary(stationary);
        }
    }
};

Building.fromSpec = function(options, spec) {
    var parsedSpec = parseSpec(spec);
    options.blocksSpec = parsedSpec.blocksSpec;
    options.stationary = parsedSpec.stationary;
    options.topY = parsedSpec.topY;
    var building = new Building();
    building.initBuilding(options);
    return building;
};

Building.prototype.getSpec = function() {
    var spec = '{blocksSpec: ['
    for (var i = 0; i < this.blocks.length; ++i) {
        spec += this.blocks[i].getSpec();
        if (i < this.blocks.length - 1) {
            spec += ', ';
        }
    }
    spec += ']';
    spec += ', stationary: ' + this.stationary;
    spec += ', topY: ' + this.topY;
    spec += '}';
    return spec;
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

BuildingBlock.prototype.setStationary = function(stationary) {
    this.object.traverse(function(obj) {
        if (obj instanceof THREE.Mesh) {
            if (stationary) {
                if (obj.material === BuildingBlock.wallMaterial) {
                    obj.material = BuildingBlock.stationaryWallMaterial;
                }
                if (obj.material === BuildingBlock.wallMaterial2) {
                    obj.material = BuildingBlock.stationaryWallMaterial2;
                }
            } else {
                if (obj.material === BuildingBlock.stationaryWallMaterial) {
                    obj.material = BuildingBlock.wallMaterial;
                }
                if (obj.material === BuildingBlock.stationaryWallMaterial2) {
                    obj.material = BuildingBlock.wallMaterial2;
                }
            }
        }
    });
};

BuildingBlock.wallMaterial = new THREE.MeshPhongMaterial( { color: 0xff88aa, specular: 0x222222 } );
BuildingBlock.wallMaterial2 = new THREE.MeshPhongMaterial( { color: 0xffbbdd, specular: 0x222222 } );
BuildingBlock.stationaryWallMaterial = new THREE.MeshPhongMaterial( { color: 0x888888, specular: 0x222222 } );
BuildingBlock.stationaryWallMaterial2 = new THREE.MeshPhongMaterial( { color: 0xaaaaaa, specular: 0x222222 } );
BuildingBlock.goalMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x888888 } );
BuildingBlock.mirrorMaterial = new THREE.MeshPhongMaterial( { color: 0x2288ff, specular: 0xffffff } );
BuildingBlock.mirrorMaterial.transparent = true;
BuildingBlock.mirrorMaterial.opacity = 0.7;

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

BuildingBlock.prototype.getSpec = function() {
    var spec = "{blockConstructor: ";
    if (this instanceof StopBlock) {
        spec += 'StopBlock';
    } else if (this instanceof MirrorBlock) {
        spec += 'MirrorBlock';
    } else if (this instanceof HoleBlock) {
        spec += 'HoleBlock';
    } else if (this instanceof PeriscopeBlock) {
        spec += 'PeriscopeBlock';
    }
    var specProps = this.specProperties();
    for (var i = 0; i < specProps.length; ++i) {
        spec += ', ' + specProps[i] + ': ' + this[specProps[i]];
    }
    spec += "}";
    return spec;
};

BuildingBlock.prototype.specProperties = function() {
    return [];
};


/**
 * @constructor
 */
var GoalBuilding = function(options) {
    options.blocksSpec = [
        {blockConstructor: GoalBlock},
        {blockConstructor: GoalPostBlock},
        {blockConstructor: StopBlock}
    ];
    this.initBuilding(options);
    this.setStationary(true);
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

StopBlock.prototype.createMesh = function() {
    var geometry = new THREE.BoxGeometry( 0.95, 0.8, 0.95 );
    var material = BuildingBlock.wallMaterial;
    var blockMesh = new THREE.Mesh(geometry, material);
    blockMesh.position.y = -0.1;
    
    var decorGeometry = new THREE.BoxGeometry( 1, 0.2, 1 );
    var material2 = BuildingBlock.wallMaterial2;
    var decorMesh = new THREE.Mesh(decorGeometry, material2);
    decorMesh.position.y = 0.4;
    
    var parent = new THREE.Object3D();
    parent.add(blockMesh);
    parent.add(decorMesh);
    return parent;
};

/**
 * @constructor
 */
var GoalBlock = function(options) {
    this.goalDirection = (options.building.gridX > options.building.gridZ) || (options.building.gridX < 0);
    this.initBuildingBlock(options);
};

GoalBlock.prototype = new BuildingBlock();

GoalBlock.prototype.handleLaser = function(laserSegmentLoc) {
    return Laser.Handling.INFINITY;
};

GoalBlock.prototype.createMesh = function() {
    var shape = utilTHREE.createUShape(1.0, 0.1, 0.3);

    var line = new THREE.LineCurve3(new THREE.Vector3(0, 0, -0.05), new THREE.Vector3(0, 0, 0.05));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    var material = BuildingBlock.goalMaterial;
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = -Math.PI * 0.5;
    var parent = new THREE.Object3D();
    parent.add(mesh);
    parent.rotation.y = Math.PI * (this.goalDirection ? 0.5 : 0);
    return parent;
};

/**
 * @constructor
 */
var GoalPostBlock = function(options) {
    this.goalDirection = (options.building.gridX > options.building.gridZ) || (options.building.gridX < 0);
    this.initBuildingBlock(options);
};

GoalPostBlock.prototype = new BuildingBlock();

GoalPostBlock.prototype.handleLaser = function(laserSegmentLoc) {
    return Laser.Handling.INFINITY;
};

GoalPostBlock.prototype.createMesh = function() {
    var geometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    var material = BuildingBlock.goalMaterial;
    var mesh1 = new THREE.Mesh(geometry, material);
    var mesh2 = new THREE.Mesh(geometry, material);
    var parent = new THREE.Object3D();
    parent.add(mesh1);
    parent.add(mesh2);
    mesh1.position.x = -0.45;
    mesh2.position.x = 0.45;
    parent.rotation.y = Math.PI * (this.goalDirection ? 0.5 : 0);
    return parent;
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

HoleBlock.prototype.specProperties = function() {
    return ['holeDirection'];
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
    var mesh = new THREE.Mesh(geometry, BuildingBlock.mirrorMaterial);
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

MirrorBlock.prototype.specProperties = function() {
    return ['mirrorDirection'];
};


/**
 * @constructor
 */
var PeriscopeBlock = function(options) {
        var defaults = {
        periscopeDirection: Laser.Direction.POSITIVE_Z,
        isUpperBlock: true
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.initBuildingBlock(options);
};

PeriscopeBlock.prototype = new BuildingBlock();

PeriscopeBlock.prototype.createMesh = function() {
    var meshParent = new THREE.Object3D();
    var geometry = new THREE.BoxGeometry( 0.8, 0.8, 0.15 );
    var mesh = new THREE.Mesh(geometry, BuildingBlock.mirrorMaterial);
    mesh.rotation.x = Math.PI * 0.25;
    meshParent.add(mesh);

    if (this.isUpperBlock) {
        mesh.rotation.x = -mesh.rotation.x;
    }
    var offset = Laser.offsetFromDirection(this.periscopeDirection);
    meshParent.rotation.y = Math.atan2(-offset.x, -offset.z);
    
    var fs = 0.5;
    var shape = new THREE.Shape();
    shape.moveTo(-fs, -fs);
    shape.lineTo(-fs,  fs);
    if (this.isUpperBlock) {
        shape.lineTo( fs, fs);
        shape.lineTo( fs * 0.3, fs * 0.3);
        shape.lineTo( fs * 0.3, -fs);
    } else {
        shape.lineTo( fs * 0.3, fs);
        shape.lineTo( fs * 0.3, -fs * 0.3);
        shape.lineTo( fs, -fs);
    }
    var line = new THREE.LineCurve3(new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(0.1, 0, 0));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    var edgeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    var edgeMesh1 = new THREE.Mesh(edgeGeometry, BuildingBlock.wallMaterial);
    edgeMesh1.position.x = -0.4;
    var edgeMesh2 = new THREE.Mesh(edgeGeometry, BuildingBlock.wallMaterial);
    edgeMesh2.position.x = 0.4;
    meshParent.add(edgeMesh1);
    meshParent.add(edgeMesh2);
    var backFaceGeometry = new THREE.BoxGeometry(1, 1, 0.2);
    var backFaceMesh = new THREE.Mesh(backFaceGeometry, BuildingBlock.wallMaterial);
    backFaceMesh.position.z = 0.4;
    meshParent.add(backFaceMesh);
    
    var parent = new THREE.Object3D();
    parent.add(meshParent);
    return parent;
};

PeriscopeBlock.prototype.getPair = function() {
    var blocks = this.building.blocks;
    var i = blocks.indexOf(this);
    var pair = null;
    while (pair === null) {
        if (this.isUpperBlock) {
            ++i;
        } else {
            --i;
        }
        if (i < 0 || i >= blocks.length) {
            return null;
        }
        if (blocks[i] instanceof PeriscopeBlock) {
            return blocks[i];
        }
    }
    return pair;
};

PeriscopeBlock.prototype.handleLaser = function(laserSegmentLoc) {
    var pairBlock = this.getPair();
    if (pairBlock === null) {
        return Laser.Handling.STOP;
    }
    if (this.periscopeDirection === Laser.oppositeDirection(laserSegmentLoc.direction)) {
        return new LaserSegmentLocation({
            originX: this.building.gridX,
            originZ: this.building.gridZ,
            y: pairBlock.topY - 0.5,
            direction: pairBlock.periscopeDirection
        });
    } else {
        return Laser.Handling.STOP;
    }
};

PeriscopeBlock.prototype.specProperties = function() {
    return ['periscopeDirection', 'isUpperBlock'];
};

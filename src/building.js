'use strict';

/**
 * @constructor
 */
var Building = function() {
};

Building.prototype.initBuilding = function(options) {
    var defaults = {
        level: null,
        sceneParent: null,
        gridX: 0,
        gridZ: 0,
        blocksSpec: [], // Listed from top downwards
        stationary: false,
        topY: undefined,
        deltaY: 0
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
    for (var i = 0; i < this.blocks.length; ++i) {
        this.blocks[i].updateModel();
    }
    this.roof = new BuildingRoof({building: this, sceneParent: this.sceneParent, level: this.level});
    this.roof.setStationary(this.stationary);
    this.goalIndicator = null;
    this.updateRoof();
};

Building.prototype.update = function(deltaTime) {
    this.deltaY = (this.deltaY + (this.topYTarget - this.topY) * Game.parameters.get('buildingSpringStrength')) * Game.parameters.get('buildingSpringDamping');
    this.topY += this.deltaY;
    //this.topY = towardsValue(this.topY, this.topYTarget, deltaTime * 7);
    for (var i = 0; i < this.blocks.length; ++i) {
        this.blocks[i].topY = this.topY - i;
        this.blocks[i].update(deltaTime);
    }
    this.roof.update();
    if (this.goalIndicator) {
        this.goalIndicator.update(deltaTime);
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

Building.prototype.getMaxTopY = function() {
    return this.blocks.length - 1;
};

Building.prototype.clampY = function() {
    if (this.topYTarget > this.getMaxTopY()) {
        this.topYTarget = this.getMaxTopY();
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
        if (Laser.isVerticalDirection(laserSegmentLoc.direction)) {
            return Laser.Handling.INFINITY;
        }
        return Laser.Handling.CONTINUE;
    } else {
        return block.handleLaser(laserSegmentLoc);
    }
};

Building.prototype.constructBlockFromSpec = function(spec) {
    var options = {
        level: this.level,
        building: this,
        sceneParent: this.sceneParent,
        stationary: this.stationary
    };
    for (var key in spec) {
        if (spec.hasOwnProperty(key)) {
            options[key] = spec[key];
        }
    }
    var block = new spec.blockConstructor(options);
    return block;
};

Building.prototype.addBlock = function(spec) {
    this.blocks.push(this.constructBlockFromSpec(spec));
    this.blocks[this.blocks.length - 1].updateModel();
    this.updateRoof();
};

Building.prototype.addBlockToTop = function(spec) {
    this.blocks.splice(0, 0, this.constructBlockFromSpec(spec));
    this.blocks[0].updateModel();
    this.updateRoof();
};

Building.prototype.removeBlock = function(block) {
    var ind = this.blocks.indexOf(block);
    block.removeFromScene();
    this.blocks.splice(ind, 1);
    if (this.blocks.length === 1) {
        this.setStationary(true);
    }
    this.updateRoof();
};

Building.prototype.replaceBlockSpec = function(blockToReplace, spec) {
    var ind = this.blocks.indexOf(blockToReplace);
    blockToReplace.removeFromScene();
    this.blocks[ind] = this.constructBlockFromSpec(spec);
    this.blocks[ind].updateModel();
    this.updateRoof();
};

Building.prototype.updateRoof = function() {
    if (this.blocks[0] instanceof MirrorBlock || this.blocks[0] instanceof GoalBlock) {
        this.roof.removeFromScene();
    } else {
        this.roof.addToScene();
    }
    if (this.hasGoal()) {
        this.addGoalIndicator();
    } /*else {
        this.removeGoalIndicator();
    }*/
};

Building.prototype.addGoalIndicator = function() {
    if (this.goalIndicator === null) {
        this.goalIndicator = new Building.GoalIndicator({building: this, sceneParent: this.sceneParent, level: this.level});
    }
    this.goalIndicator.addToScene();
};

Building.prototype.removeGoalIndicator = function() {
    if (this.goalIndicator !== null) {
        this.goalIndicator.removeFromScene();
    }
};

Building.prototype.ownsSceneObject = function(object) {
    if (this.roof.ownsSceneObject(object)) {
        return true;
    }
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
        this.roof.setStationary(stationary);
    }
};

Building.fromSpec = function(options, spec) {
    if (spec === null) {
        return null;
    }
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
    spec += ', topY: ' + Math.round(this.topY);
    spec += '}';
    return spec;
};

Building.prototype.hasGoal = function() {
    for (var i = 0; i < this.blocks.length; ++i) {
        if (this.blocks[i] instanceof GoalBlock || this.blocks[i] instanceof GoalPostBlock) {
            return true;
        }
    }
    return false;
};


/**
 * @constructor
 */
Building.GoalIndicator = function(options) {
    var defaults = {
        building: null,
        level: null
    };
    objectUtil.initWithDefaults(this, defaults, options);

    this.origin = new THREE.Object3D();

    var textGeo = new THREE.TextGeometry( 'GOAL', {
        font: Level.font,
        size: 0.8,
        height: 0.3,
        curveSegments: 3,
        bevelEnabled: false,
    });
    textGeo.center();
    var material = BuildingCursor.material(0xcc9966, 0xffbb77);
    this.textMesh = new THREE.Mesh(textGeo, material);
    this.origin.add(this.textMesh);

    this.initThreeSceneObject({
        object: this.origin,
        sceneParent: options.sceneParent
    });
};

Building.GoalIndicator.prototype = new ThreeSceneObject();

Building.GoalIndicator.prototype.update = function(deltaTime) {
    this.textMesh.rotation.y += deltaTime;
    this.origin.position.x = this.level.gridXToWorld(this.building.gridX);
    this.origin.position.z = this.level.gridZToWorld(this.building.gridZ);
    this.origin.position.y = this.building.topY + 1.5;
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
        arrows: true,
        y: 1.0
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    this.mesh = this.createMesh();
    
    this.origin = new THREE.Object3D();
    this.origin.add(this.mesh);
    
    this.arrowsVisible = true;
    if (this.arrows) {
        this.arrows = [];
        this.arrows.push(new BuildingCursorArrow({z: 0.85, down: false, sceneParent: this.mesh, color: this.color}));
        this.arrows.push(new BuildingCursorArrow({z: -0.85, down: false, sceneParent: this.mesh, color: this.color}));
        this.arrows.push(new BuildingCursorArrow({z: 0.85, down: true, sceneParent: this.mesh, color: this.color}));
        this.arrows.push(new BuildingCursorArrow({z: -0.85, down: true, sceneParent: this.mesh, color: this.color}));
    }
    
    this.initThreeSceneObject({
        object: this.origin,
        sceneParent: options.sceneParent
    });
};
    
BuildingCursor.prototype = new ThreeSceneObject();

BuildingCursor.material = function(color, emissiveColor) {
    if (emissiveColor === undefined) emissiveColor = 0x448888;
    var material = new THREE.MeshPhongMaterial( { color: color, emissive: emissiveColor } );
    material.transparent = true;
    material.opacity = 0.7;
    return material;
};

BuildingCursor.prototype.update = function(deltaTime) {
    this.object.position.x = this.level.gridXToWorld(this.gridX);
    this.object.position.z = this.level.gridZToWorld(this.gridZ);
    this.object.position.y = this.y;
    this.mesh.rotation.y += deltaTime;
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

    return new THREE.Mesh(geometry, BuildingCursor.material(this.color));
};

BuildingCursor.prototype.setArrowsVisible = function(upArrowsVisible, downArrowsVisible) {
    if (this.upArrowsVisible !== upArrowsVisible) {
        for (var i = 0; i < this.arrows.length; ++i) {
            if (!this.arrows[i].down) {
                if (!upArrowsVisible) {
                    this.arrows[i].removeFromScene();
                } else {
                    this.arrows[i].addToScene();
                }
            }
        }
        this.upArrowsVisible = upArrowsVisible;
    }
    if (this.downArrowsVisible !== downArrowsVisible) {
        for (var i = 0; i < this.arrows.length; ++i) {
            if (this.arrows[i].down) {
                if (!downArrowsVisible) {
                    this.arrows[i].removeFromScene();
                } else {
                    this.arrows[i].addToScene();
                }
            }
        }
        this.downArrowsVisible = downArrowsVisible;
    }
};


/**
 * @constructor
 */
var BuildingCursorArrow = function(options) {
    var defaults = {
        color: 0xaaccff,
        z: 0,
        down: false
    };
    objectUtil.initWithDefaults(this, defaults, options);

    this.arrowMesh = this.createArrowMesh();
    if (this.down) {
        this.arrowMesh.rotation.z = -Math.PI * 0.5;
        this.arrowMesh.position.y = -0.5;
    } else {
        this.arrowMesh.rotation.z = Math.PI * 0.5;
        this.arrowMesh.position.y = 0.5;
    }
    
    this.arrows = new THREE.Object3D();
    this.arrows.add(this.arrowMesh);
    this.arrows.position.z = this.z;
    
    this.initThreeSceneObject({
        object: this.arrows,
        sceneParent: options.sceneParent
    });
    this.addToScene();
};

BuildingCursorArrow.prototype = new ThreeSceneObject();

BuildingCursorArrow.prototype.createArrowMesh = function() {
    var shape = utilTHREE.createArrowShape(0.6, 0.4, 0.3, 0.2);
    var line = new THREE.LineCurve3(new THREE.Vector3(0, 0, -0.1), new THREE.Vector3(0, 0, 0.1));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    return new THREE.Mesh(geometry, BuildingCursor.material(this.color));
};


/**
 * @constructor
 */
var BuildingRoof = function(options) {
    var defaults = {
        building: null,
        level: null,
        stationary: false
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.modelParent = new THREE.Object3D();
    this.initThreeSceneObject({
        object: this.modelParent,
        sceneParent: options.sceneParent
    });
    this.updateModel();
};

BuildingRoof.prototype = new ThreeSceneObject();

BuildingRoof.prototype.setStationary = function(stationary) {
    this.stationary = stationary;
    this.updateModel();
};

BuildingRoof.prototype.updateModel = function() {
    this.modelParent.children = [];
    this.modelParent.add(this.getModel());
};

BuildingRoof.prototype.getModel = function() {
    if (this.stationary) {
        return BuildingRoof.stationaryModel.clone();
    } else {
        return BuildingRoof.model.clone();
    }
};

BuildingRoof.prototype.update = function(deltaTime) {
    this.object.position.x = this.level.gridXToWorld(this.building.gridX);
    this.object.position.z = this.level.gridZToWorld(this.building.gridZ);
    this.object.position.y = this.building.topY;
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
        level: null,
        stationary: true
    };
    objectUtil.initWithDefaults(this, defaults, options);

    this.modelParent = new THREE.Object3D();
    this.object = this.createObject3D();

    this.origin = new THREE.Object3D();
    this.origin.add(this.object);

    this.initThreeSceneObject({
        object: this.origin,
        sceneParent: options.sceneParent
    });
    this.addToScene();
};

BuildingBlock.goalMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x888888 } );

BuildingBlock.loadModels = function() {
    utilTHREE.loadJSONModel('stop', function(object) {
        StopBlock.model = object;
    });
    utilTHREE.loadJSONModel('hole', function(object) {
        HoleBlock.model = object;
    });
    utilTHREE.loadJSONModel('mirror', function(object) {
        MirrorBlock.model = object;
    });
    utilTHREE.loadJSONModel('periscope', function(object) {
        PeriscopeBlock.model = object;
    });
    utilTHREE.loadJSONModel('periscope2', function(object) {
        PeriscopeBlock.adjacentModel = object;
    });
    utilTHREE.loadJSONModel('roof', function(object) {
        BuildingRoof.model = object;
    });
    utilTHREE.loadJSONModel('stop_stationary', function(object) {
        StopBlock.stationaryModel = object;
    });
    utilTHREE.loadJSONModel('hole_stationary', function(object) {
        HoleBlock.stationaryModel = object;
    });
    utilTHREE.loadJSONModel('mirror_stationary', function(object) {
        MirrorBlock.stationaryModel = object;
    });
    utilTHREE.loadJSONModel('periscope_stationary', function(object) {
        PeriscopeBlock.stationaryModel = object;
    });
    utilTHREE.loadJSONModel('roof_stationary', function(object) {
        BuildingRoof.stationaryModel = object;
    });
    utilTHREE.loadJSONModel('laser_cannon', function(object) {
        LaserCannon.model = object;
    });
};

BuildingBlock.prototype.setStationary = function(stationary) {
    if (this.stationary !== stationary) {
        this.stationary = stationary;
        this.updateModel();
    }
};

BuildingBlock.prototype.updateModel = function() {
    this.modelParent.children = [];
    var model = this.getModel();
    model.castShadow = true;
    this.modelParent.add(model);
};

BuildingBlock.prototype.getModel = function() {
    if (this.stationary) {
        return this.getStationaryModel().clone();
    } else {
        return this.getMovableModel().clone();
    }
};

/**
 * Create an object aligned to origin that has the modelParent in the tree.
 */
BuildingBlock.prototype.createObject3D = function() {
    return this.modelParent;
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
    } else if (this instanceof GoalBlock) {
        spec += 'GoalBlock';
    } else if (this instanceof GoalPostBlock) {
        spec += 'GoalPostBlock';
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
    if (Laser.isVerticalDirection(laserSegmentLoc.direction) && this.topY !== this.building.topY) {
        return Laser.Handling.CONTINUE;
    }
    return Laser.Handling.STOP;
};

StopBlock.prototype.getStationaryModel = function() {
    return StopBlock.stationaryModel;
};

StopBlock.prototype.getMovableModel = function() {
    return StopBlock.model;
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
    var zLaser = (laserSegmentLoc.direction === Laser.Direction.POSITIVE_Z || laserSegmentLoc.direction === Laser.Direction.NEGATIVE_Z);
    if (Laser.isVerticalDirection(laserSegmentLoc.direction)) {
        return Laser.Handling.CONTINUE;
    }
    if (this.goalDirection) {
        if (zLaser) {
            return Laser.Handling.STOP;
        } else {
            return Laser.Handling.GOAL;
        }
    } else {
        if (zLaser) {
            return Laser.Handling.GOAL;
        } else {
            return Laser.Handling.STOP;
        }
    }
};

GoalBlock.prototype.getModel = function() {
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
    return mesh;
};

GoalBlock.prototype.createObject3D = function() {
    var parent = new THREE.Object3D();
    parent.add(this.modelParent);
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
    var zLaser = (laserSegmentLoc.direction === Laser.Direction.POSITIVE_Z || laserSegmentLoc.direction === Laser.Direction.NEGATIVE_Z);
    if (Laser.isVerticalDirection(laserSegmentLoc.direction)) {
        return Laser.Handling.CONTINUE;
    }
    if (this.goalDirection) {
        if (zLaser) {
            return Laser.Handling.STOP;
        } else {
            return Laser.Handling.GOAL;
        }
    } else {
        if (zLaser) {
            return Laser.Handling.GOAL;
        } else {
            return Laser.Handling.STOP;
        }
    }
};

GoalPostBlock.prototype.createObject3D = function() {
    var parent = new THREE.Object3D();
    parent.add(this.modelParent);
    parent.rotation.y = Math.PI * (this.goalDirection ? 0.5 : 0);
    return parent;
};

GoalPostBlock.prototype.getModel = function() {
    var geometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    var material = BuildingBlock.goalMaterial;
    var mesh1 = new THREE.Mesh(geometry, material);
    var mesh2 = new THREE.Mesh(geometry, material);
    var parent = new THREE.Object3D();
    parent.add(mesh1);
    parent.add(mesh2);
    mesh1.position.x = -0.45;
    mesh2.position.x = 0.45;
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
    if (Laser.isVerticalDirection(laserSegmentLoc.direction)) {
        return Laser.Handling.CONTINUE;
    }
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

HoleBlock.prototype.createObject3D = function() {
    var parent = new THREE.Object3D();
    parent.add(this.modelParent);
    parent.rotation.y = Math.PI * (this.holeDirection ? 0.5 : 0);
    return parent;
};

HoleBlock.prototype.specProperties = function() {
    return ['holeDirection'];
};

HoleBlock.prototype.getStationaryModel = function() {
    return HoleBlock.stationaryModel;
};

HoleBlock.prototype.getMovableModel = function() {
    return HoleBlock.model;
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

MirrorBlock.prototype.createObject3D = function() {
    var parent = new THREE.Object3D();
    parent.add(this.modelParent);
    parent.rotation.y = Math.PI * (this.mirrorDirection ? 0.5 : 0);
    return parent;
};

MirrorBlock.prototype.handleLaser = function(laserSegmentLoc) {
    var newLoc = new LaserSegmentLocation({
        x: laserSegmentLoc.x,
        z: laserSegmentLoc.z,
        y: laserSegmentLoc.y
    });
    if (Laser.isVerticalDirection(laserSegmentLoc.direction)) {
        return Laser.Handling.CONTINUE;
    }
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

MirrorBlock.prototype.getStationaryModel = function() {
    return MirrorBlock.stationaryModel;
};

MirrorBlock.prototype.getMovableModel = function() {
    return MirrorBlock.model;
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
    this.verticalDirection = (this.isUpperBlock ? Laser.Direction.NEGATIVE_Y : Laser.Direction.POSITIVE_Y);
};

PeriscopeBlock.prototype = new BuildingBlock();

PeriscopeBlock.prototype.createObject3D = function() {
    
    var parent = new THREE.Object3D();

    var flipParent = new THREE.Object3D();
    flipParent.rotation.z = (this.isUpperBlock ? 0 : Math.PI);
    flipParent.add(this.modelParent);
    parent.add(flipParent);
    
    var offset = Laser.offsetFromDirection(this.periscopeDirection);
    parent.rotation.y = Math.atan2(offset.x, offset.z);
    return parent;
};

PeriscopeBlock.prototype.handleLaser = function(laserSegmentLoc) {
    if (this.periscopeDirection === Laser.oppositeDirection(laserSegmentLoc.direction)) {
        return new LaserSegmentLocation({
            x: this.building.gridX,
            z: this.building.gridZ,
            y: this.topY - 0.5,
            direction: this.verticalDirection
        });
    } else if (this.verticalDirection === Laser.oppositeDirection(laserSegmentLoc.direction)) {
        return new LaserSegmentLocation({
            x: this.building.gridX,
            z: this.building.gridZ,
            y: this.topY - 0.5,
            direction: this.periscopeDirection
        });
    } else {
        return Laser.Handling.STOP;
    }
};

PeriscopeBlock.prototype.getModel = function() {
    if (this.stationary) {
        return this.getStationaryModel().clone();
    } else {
        var ownIndex = this.building.blocks.indexOf(this);
        if (ownIndex >= 0) {
            var nextToIndex = this.isUpperBlock ? ownIndex + 1 : ownIndex - 1;
            if (nextToIndex >= 0 && nextToIndex < this.building.blocks.length) {
                var nextTo = this.building.blocks[nextToIndex];
                if ((nextTo instanceof PeriscopeBlock && nextTo.periscopeDirection === this.periscopeDirection) || 
                    (!(nextTo instanceof MirrorBlock) && !(nextTo instanceof PeriscopeBlock))) {
                    return PeriscopeBlock.adjacentModel.clone();
                }
            }
        }
        return this.getMovableModel().clone();
    }
};

PeriscopeBlock.prototype.specProperties = function() {
    return ['periscopeDirection', 'isUpperBlock'];
};

PeriscopeBlock.prototype.getStationaryModel = function() {
    return PeriscopeBlock.stationaryModel;
};

PeriscopeBlock.prototype.getMovableModel = function() {
    return PeriscopeBlock.model;
};

BuildingBlock.loadModels();

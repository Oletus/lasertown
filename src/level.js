'use strict';

var GRID_SPACING = 3;

/**
 * @constructor
 */
var Level = function(options) {
    var defaults = {
        width: 5,
        depth: 5,
        cameraAspect: 16 / 9,
        buildingGridSpec: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    this.scene = new THREE.Scene();
    this.interactiveScene = new THREE.Object3D();
    this.scene.add(this.interactiveScene);
    this.camera = new THREE.PerspectiveCamera( 40, this.cameraAspect, 1, 10000 );
    this.raycaster = new THREE.Raycaster();
    
    this.objects = [];
    
    if (this.buildingGridSpec === null) {
        var buildingSpec = "{blocksSpec: [{blockConstructor: StopBlock}, {blockConstructor: StopBlock}]}";
        this.buildingGridSpec = [];
        for (var x = 0; x < this.width; ++x) {
            this.buildingGridSpec.push([]);
            for (var z = 0; z < this.depth; ++z) {
                this.buildingGridSpec[x].push(buildingSpec);
            }
        }
    }
    
    this.setupGrid();
    
    this.buildingGrid = [];
    
    for (var x = 0; x < this.buildingGridSpec.length; ++x) {
        var rowSpec = this.buildingGridSpec[x];
        this.buildingGrid.push([]);
        for (var z = 0; z < rowSpec.length; ++z) {
            var building = Building.fromSpec({
                level: this,
                scene: this.interactiveScene,
                gridX: x,
                gridZ: z
            }, rowSpec[z]);

            this.objects.push(building);
            this.buildingGrid[x].push(building);
            for (var i = 0; i < this.objects.length; ++i) {
                if (this.objects[i] instanceof GridTile && this.objects[i].x === x && this.objects[i].z === z) {
                    this.objects[i].building = building;
                }
            }
        }
    }
    
    this.laser = new Laser({
        level: this,
        scene: this.scene
    });
    this.objects.push(this.laser);
    
    this.goal = new GoalBuilding({
        level: this,
        scene: this.scene,
        gridX: this.width,
        gridZ: 2
    });
    this.objects.push(this.goal);
    this.state = new StateMachine({stateSet: Level.State, id: Level.State.IN_PROGRESS});
    this.chosenBuilding = null;
    
    this.buildingCursor = new BuildingCursor({
        level: this,
        scene: this.scene
    });
    this.objects.push(this.buildingCursor);
    this.updateChosenBuilding();
    
    this.cameraControl = new OrbitCameraControl({
        camera: this.camera,
        lookAt: this.getLookAtCenter(),
        orbitAngle: Math.PI * 0.34
    });
    this.mouseDownBuilding = null;
    this.mouseDownMoveCamera = false;

    this.sign = new Level.Sign({scene: this.scene});
    this.sign.setText('LASER TOWN');
    this.setupLights();
    
    if (DEV_MODE) {
        this.editor = new LevelEditor(this, this.scene);
    }
};

Level.fromSpec = function(options, spec) {
    var parsedSpec = parseSpec(spec);
    options.buildingGridSpec = parsedSpec.buildingGridSpec;
    return new Level(options);
};

Level.prototype.getSpec = function() {
    var buildingGridSpec = '[';
    for (var x = 0; x < this.buildingGrid.length; ++x) {
        var row = this.buildingGrid[x];
        var rowSpec = '[';
        for (var z = 0; z < row.length; ++z) {
            rowSpec += "'" + row[z].getSpec() + "'";
            if (z < row.length - 1) {
                rowSpec += ', '
            }
        }
        rowSpec += ']';
        buildingGridSpec += rowSpec;
        if (x < this.buildingGrid.length - 1) {
            buildingGridSpec += ','
        }
    }
    buildingGridSpec += ']';
    return '{buildingGridSpec: ' + buildingGridSpec + '}';
};

Level.State = {
    IN_PROGRESS: 0,
    SUCCESS: 1
};

Level.prototype.gridXToWorld = function(gridX) {
    return gridX * GRID_SPACING;
};

Level.prototype.gridZToWorld = function(gridZ) {
    return gridZ * GRID_SPACING;
};

Level.prototype.gridLengthToWorld = function(gridLength) {
    return gridLength * GRID_SPACING;
};

Level.prototype.update = function(deltaTime) {
    this.state.update(deltaTime);
    for (var i = 0; i < this.objects.length; ++i) {
        this.objects[i].update(deltaTime);
    }
    if (this.editor) {
        this.editor.update(deltaTime);
    }
};

Level.prototype.render = function(renderer) {
    renderer.render(this.scene, this.camera);
};

Level.prototype.getBuildingFromGrid = function(x, z) {
    if (x < 0 || x >= this.buildingGrid.length) {
        return null;
    }
    if (z < 0 || z >= this.buildingGrid[x].length) {
        return null;
    }
    return this.buildingGrid[x][z];
};

Level.prototype.handleLaser = function(loc) {
    var building = this.getBuildingFromGrid(loc.x, loc.z);
    if (!building) {
        if (loc.x === this.goal.gridX && loc.z === this.goal.gridZ && !this.mouseDownBuilding) {
            if (this.state.id !== Level.State.SUCCESS) {
                this.state.change(Level.State.SUCCESS);
                this.sign.setText('SUCCESS!');
            }
        }
        return Laser.Handling.INFINITY;
    } else {
        return building.handleLaser(loc);
    }
};

Level.prototype.getLookAtCenter = function() {
    return new THREE.Vector3(
        (this.buildingGrid.length - 1) * GRID_SPACING * 0.5,
        -1.5,
        (this.buildingGrid[0].length - 1) * GRID_SPACING * 0.5
    );
};

Level.groundMaterial = new THREE.MeshPhongMaterial( { color: 0x777777, specular: 0x222222 } );
Level.sidewalkMaterial = new THREE.MeshPhongMaterial( { color: 0xdddddd, specular: 0x111111 } );

var GridTile = function(options) {
    var defaults = {
        z: 0,
        x: 0
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.building = null;
    
    var gridMesh = this.createGroundTileMesh();
    gridMesh.position.x = this.x * GRID_SPACING;
    gridMesh.position.z = this.z * GRID_SPACING;
    
    this.initThreeSceneObject({
        object: gridMesh,
        scene: options.scene
    });
    this.addToScene();
};

GridTile.prototype = new ThreeSceneObject();

GridTile.prototype.createGroundTileMesh = function() {
    var groundShape = utilTHREE.createSquareWithHole(GRID_SPACING, 1.4);
    var line = new THREE.LineCurve3(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    this.groundGeometry = new THREE.ExtrudeGeometry(groundShape, extrudeSettings);
    var groundMesh = new THREE.Mesh( this.groundGeometry, Level.groundMaterial );
    
    var sidewalkShape = utilTHREE.createSquareWithHole(2.0, 1.2);
    var line = new THREE.LineCurve3(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, -1.2, 0));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    this.sidewalkGeometry = new THREE.ExtrudeGeometry(sidewalkShape, extrudeSettings);
    this.sidewalk = new THREE.Mesh( this.sidewalkGeometry, Level.sidewalkMaterial );
    
    var parent = new THREE.Object3D();
    parent.add(groundMesh);
    parent.add(this.sidewalk);
    parent.traverse(function(obj) {
        obj.receiveShadow = true;
    });
    return parent;
};

GridTile.prototype.getOwnQueryObject = function() {
    return this.sidewalk;
};

Level.prototype.setupGrid = function() {    
    for (var x = 0; x < this.buildingGridSpec.length; ++x) {
        for (var z = 0; z < this.buildingGridSpec[0].length; ++z) {
            var tile = new GridTile({
                x: x,
                z: z,
                scene: this.interactiveScene
            });
            this.objects.push(tile);
        }
    }
};

/**
 * @constructor
 */
Level.Sign = function(options) {
    var box = new THREE.BoxGeometry(15, 3, 0.1);
    var boxMesh = new THREE.Mesh(box, BuildingBlock.goalMaterial);
    
    this.parent = new THREE.Object3D();
    this.parent.position.x = 6;
    this.parent.position.y = 3;
    this.parent.position.z = -2;
    this.parent.add(boxMesh);
    
    this.textParent = new THREE.Object3D();
    this.parent.add(this.textParent);
    
    this.initThreeSceneObject({
        scene: options.scene,
        object: this.parent
    });
    
    this.addToScene();
};

Level.Sign.prototype = new ThreeSceneObject();

Level.Sign.prototype.setText = function(text) {
    var textGeo = new THREE.TextGeometry( text, {
        font: Level.font,
        size: 2,
        height: 0.1,
        curveSegments: 3,
        bevelEnabled: false,
    });
    textGeo.center();
    var material = new THREE.MeshPhongMaterial( { color: 0x333333, specular: 0x222222 } );
    var textMesh = new THREE.Mesh( textGeo, material );
    textMesh.position.z = 0.1;
    
    this.textParent.children = [];
    this.textParent.add(textMesh);
};

Level.prototype.setupLights = function() {
    this.scene.add(new THREE.AmbientLight(0x222222));
    var mainLight = new THREE.DirectionalLight(0xaaa588, 1);
    mainLight.position.set(0.5, 1, -1).normalize();
    this.scene.add(mainLight);
    
    var spotLight = new THREE.SpotLight(0x665555);
    spotLight.position.set( 125, 250, -250 );
    var spotTarget = this.getLookAtCenter();
    
    spotLight.target = new THREE.Object3D();
    this.scene.add(spotLight.target);
    spotLight.target.position.set(spotTarget.x, spotTarget.y, spotTarget.z);

    spotLight.castShadow = true;
    
    /*var helper = new THREE.CameraHelper( spotLight.shadow.camera );
    this.scene.add(helper);*/

    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;

    spotLight.shadow.camera.near = 5;
    spotLight.shadow.camera.far = 500;
    spotLight.shadow.camera.fov = 4;
    spotLight.shadow.opacity = 0.5;

    this.scene.add( spotLight );
    
    var fillLight = new THREE.DirectionalLight(0x333355, 1);
    fillLight.position.set(-1, 1, 1).normalize();
    this.scene.add(fillLight);
};

Level.prototype.setCursorPosition = function(viewportPos) {
    this.raycaster.setFromCamera(viewportPos.clone(), this.camera);
    var intersects = this.raycaster.intersectObjects(this.interactiveScene.children, true);
    var mouseOverBuilding = null;
    if (intersects.length > 0) {
        var nearest = intersects[0];
        for (var i = 0; i < this.objects.length; ++i) {
            if (this.objects[i] instanceof Building && this.objects[i].ownsSceneObject(nearest.object)) {
                mouseOverBuilding = this.objects[i];
            }
            if (this.objects[i] instanceof GridTile && this.objects[i].ownsSceneObject(nearest.object)) {
                mouseOverBuilding = this.objects[i].building;
            }
        }
    }
    
    if (this.mouseDownMoveCamera) {
        var diffY = (viewportPos.y - this.lastCursorPosition.y) / 0.05;
        var diffX = (viewportPos.x - this.lastCursorPosition.x) / 0.05;
        this.cameraControl.zoom(diffY);
        //this.cameraControl.moveOrbitAngle(-diffX * Math.abs(this.mouseDownCursorPosition.y) * 2 * Math.sign(viewportPos.y));
        this.cameraControl.moveOrbitAngle(diffX);
    } else if (this.mouseDownBuilding) {
        var steps = (this.mouseDownCursorPosition.y - this.lastCursorPosition.y) / 0.05;
        if (Game.parameters.get('roundedMovement')) {
            steps = Math.round(steps);
        }
        this.chosenBuilding.topYTarget = this.mouseDownTopYTarget - steps;
        this.chosenBuilding.clampY();
        if (!Game.parameters.get('roundedMovement')) {
            this.chosenBuilding.topY = this.chosenBuilding.topYTarget;
        }
    } else if (mouseOverBuilding !== this.chosenBuilding) {
        if (mouseOverBuilding !== null) {
            if (!mouseOverBuilding.stationary || this.editor) {
                this.chosenBuilding = mouseOverBuilding;
            } else {
                this.chosenBuilding = null;
            }
        } else {
            this.chosenBuilding = null;
        }
    }
    this.updateChosenBuilding();
    this.lastCursorPosition = viewportPos;
};

Level.prototype.mouseDown = function() {
    this.mouseDownCursorPosition = this.lastCursorPosition;
    if (this.chosenBuilding !== null && (this.state.id !== Level.State.SUCCESS || this.editor)) {
        if (!this.chosenBuilding.stationary) {
            this.mouseDownBuilding = this.chosenBuilding;
            this.mouseDownTopYTarget = this.chosenBuilding.topYTarget;
            this.mouseDownMoveCamera = false;
        }
    } else {
        this.mouseDownMoveCamera = true;
    }
};

Level.prototype.mouseUp = function() {
    if (this.mouseDownBuilding) {
        this.chosenBuilding.topYTarget = Math.round(this.chosenBuilding.topYTarget);
        this.chosenBuilding.clampY();
    }
    this.mouseDownBuilding = null;
    this.mouseDownMoveCamera = false;
    this.updateChosenBuilding();
};

Level.prototype.updateChosenBuilding = function() {
    if (this.chosenBuilding === null) {
        this.buildingCursor.removeFromScene();
    } else {
        this.buildingCursor.gridX = this.chosenBuilding.gridX;
        this.buildingCursor.gridZ = this.chosenBuilding.gridZ;
        this.buildingCursor.addToScene();
        this.buildingCursor.setArrowsVisible(this.mouseDownBuilding === null);
    }
};

Level.prototype.upPress = function() {
    if (this.chosenBuilding !== null) {
        this.chosenBuilding.upPress();
    }
};

Level.prototype.downPress = function() {
    if (this.chosenBuilding !== null) {
        this.chosenBuilding.downPress();
    }
};

Level.font = null;

Level.loadAssets = function() {
    utilTHREE.loadFont('aldo_the_apache_regular', function(font) {
        Level.font = font;
    });
};

Level.loadAssets();

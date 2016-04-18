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
        buildingGridSpec: null,
        signText: 'LASER TOWN',
        needGoal: true
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    this.scene = new THREE.Scene();
    this.townParent = new THREE.Object3D();
    this.scene.add(this.townParent);

    this.interactiveTown = new THREE.Object3D();
    this.townParent.add(this.interactiveTown);

    this.camera = new THREE.PerspectiveCamera( 40, this.cameraAspect, 1, 500000 );
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
    
    this.buildingGrid = [];
    
    var hasGoal = false;
    for (var x = 0; x < this.buildingGridSpec.length; ++x) {
        var rowSpec = this.buildingGridSpec[x];
        this.buildingGrid.push([]);
        for (var z = 0; z < rowSpec.length; ++z) {
            var building = Building.fromSpec({
                level: this,
                sceneParent: this.interactiveTown,
                gridX: x,
                gridZ: z
            }, rowSpec[z]);

            if (building !== null) {
                this.objects.push(building);
                for (var i = 0; i < building.blocks.length; ++i) {
                    if (building.blocks[i] instanceof GoalBlock) {
                        hasGoal = true;
                    }
                }
            }
            this.buildingGrid[x].push(building);
        }
    }
    
    this.laser = new Laser({
        level: this,
        sceneParent: this.townParent
    });
    this.objects.push(this.laser);
    
    if (!hasGoal && this.needGoal) {
        this.buildingGrid.push([]); // Extra x row for goal
        for (var i = 0; i < this.buildingGrid[0].length; ++i) {
            this.buildingGrid[this.buildingGrid.length - 1].push(null);
        }
        var goal = new GoalBuilding({
            level: this,
            sceneParent: this.townParent,
            gridX: this.buildingGridSpec.length,
            gridZ: 2
        });
        this.buildingGrid[goal.gridX][goal.gridZ] = goal;
        this.objects.push(goal);
    }
    
    this.setupGrid();

    this.state = new StateMachine({stateSet: Level.State, id: Level.State.INTRO});
    this.introState = new StateMachine({stateSet: Level.IntroState, id: Level.IntroState.LAUNCH});
    this.successState = new StateMachine({stateSet: Level.SuccessState, id: Level.SuccessState.LAUNCH});
    this.chosenBuilding = null;
    
    this.buildingCursor = new BuildingCursor({
        level: this,
        sceneParent: this.townParent
    });
    this.objects.push(this.buildingCursor);
    this.updateChosenBuilding();
    
    this.cameraControl = new OrbitCameraControl({
        camera: this.camera,
        lookAt: this.getLookAtCenter(),
        y: 5,
        relativeY: false,
        orbitAngle: Math.PI * 0.9
    });
    this.mouseDownBuilding = null;
    this.sinceNudge = 0;
    this.movedChosenBuilding = false;
    this.mouseDownMoveCamera = false;

    this.sign = new Level.Sign({sceneParent: this.scene});
    this.sign.setText(this.signText);
    this.setupLights();
    //this.scene.fog = new THREE.FogExp2( 0xefd1b5, 0.01 );
    
    if (DEV_MODE) {
        this.editor = new LevelEditor(this, this.townParent);
    }
};

Level.completedSound = new Audio('laser_completed');

Level.fromSpec = function(options, spec) {
    var parsedSpec = parseSpec(spec);
    options.buildingGridSpec = parsedSpec.buildingGridSpec;
    if (parsedSpec.signText !== undefined) {
        options.signText = parsedSpec.signText;
    }
    if (parsedSpec.needGoal !== undefined) {
        options.needGoal = parsedSpec.needGoal;
    }
    return new Level(options);
};

Level.prototype.getSpec = function() {
    var buildingGridSpec = '[';
    for (var x = 0; x < this.buildingGrid.length; ++x) {
        var row = this.buildingGrid[x];
        var rowSpec = '[';
        for (var z = 0; z < row.length; ++z) {
            if (row[z] === null) {
                rowSpec += "null";
            } else {
                rowSpec += "'" + row[z].getSpec() + "'";
            }
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
    INTRO: 0,
    IN_PROGRESS: 1,
    SUCCESS: 2
};

Level.IntroState = {
    LAUNCH: 0,
    CAMERA_ZOOM_OUT: 1,
    FINISHED: 2
};

Level.SuccessState = {
    LAUNCH: 0,
    FADE_OUT: 1
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
    if (this.state.id === Level.State.INTRO) {
        if (this.updateIntro(deltaTime)) {
            this.state.change(Level.State.IN_PROGRESS);
        }
    }
    this.cameraControl.update(deltaTime);
    this.cameraControl.setLookAt(this.getLookAtCenter());

    for (var i = 0; i < this.objects.length; ++i) {
        this.objects[i].update(deltaTime);
    }
    
    if (this.chosenBuilding !== null && !this.chosenBuilding.stationary) {
        this.sinceNudge += deltaTime;
        if (this.sinceNudge > 2.0 && !this.movedChosenBuilding) {
            this.chosenBuilding.deltaY = 0.06 + Math.random() * 0.05;
            this.sinceNudge = -Math.random() * 2.0;
        }
    }
    
    if (this.editor) {
        this.editor.update(deltaTime);
    } else {
        if (this.state.id === Level.State.SUCCESS && !this.editor) {
            this.updateSuccess(deltaTime);
        }
    }
    this.updateSpotLightTarget();
};

Level.prototype.updateIntro = function(deltaTime) {
    this.introState.update(deltaTime);
    if (this.introState.id === Level.IntroState.LAUNCH) {
        if (this.introState.time > 1.0) {
            this.laser.state.change(Laser.State.ON);
        }
        if (this.introState.time > 1.5) {
            this.introState.change(Level.IntroState.CAMERA_ZOOM_OUT);
            this.cameraControl.animate({
                targetY: 15,
                targetOrbitAngle: Math.PI * 0.34,
                animationDuration: 1.5
            });
        }
    } else if (this.introState.id === Level.IntroState.CAMERA_ZOOM_OUT) {
        if (this.introState.time > 1.5) {
            this.introState.change(Level.IntroState.FINISHED);
        }
    }
    return (this.introState.id === Level.IntroState.FINISHED);
};

Level.prototype.updateSuccess = function(deltaTime) {
    this.successState.update(deltaTime);
    this.townParent.position.y += deltaTime * this.state.time * 5;
    if (this.successState.id === Level.SuccessState.LAUNCH) {
        if (this.successState.time > 4.0) {
            this.successState.change(Level.SuccessState.FADE_OUT);
        }
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
        return Laser.Handling.INFINITY;
    } else {
        var handling = building.handleLaser(loc);
        if (handling === Laser.Handling.GOAL) {
            if (!this.mouseDownBuilding &&
                this.state.id !== Level.State.SUCCESS &&
                this.allBuildingsCloseToTarget())
            {
                this.state.change(Level.State.SUCCESS);
                this.sign.setText('SUCCESS!');
                Level.completedSound.play();
            }
            handling = Laser.Handling.CONTINUE;
        }
        return handling;
    }
};

Level.prototype.allBuildingsCloseToTarget = function() {
    for (var i = 0; i < this.objects.length; ++i) {
        if (this.objects[i] instanceof Building) {
            if (Math.abs(this.objects[i].topY - this.objects[i].topYTarget) > 0.1) {
                return false;
            }
        }
    }
    return true;
};

Level.prototype.getLookAtCenter = function() {
    return new THREE.Vector3(
        (this.buildingGrid.length - 1) * GRID_SPACING * 0.5,
        -1.5 + this.townParent.position.y,
        (this.buildingGrid[0].length - 1) * GRID_SPACING * 0.5
    );
};

Level.groundMaterial = new THREE.MeshPhongMaterial( { color: 0x222222, specular: 0x555555 } );
Level.sidewalkMaterial = new THREE.MeshPhongMaterial( { color: 0xdddddd, specular: 0x111111 } );

var GridTile = function(options) {
    var defaults = {
        z: 0,
        x: 0,
        building: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    var gridMesh = this.createGroundTileMesh();
    gridMesh.position.x = this.x * GRID_SPACING;
    gridMesh.position.z = this.z * GRID_SPACING;
    
    this.initThreeSceneObject({
        object: gridMesh,
        sceneParent: options.sceneParent
    });
    this.addToScene();
};

GridTile.prototype = new ThreeSceneObject();

GridTile.prototype.createGroundTileMesh = function() {
    /*var groundShape = utilTHREE.createSquareWithHole(GRID_SPACING, 1.4);
    var line = new THREE.LineCurve3(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    this.groundGeometry = new THREE.ExtrudeGeometry(groundShape, extrudeSettings);
    var groundMesh = new THREE.Mesh( this.groundGeometry, Level.groundMaterial );*/
    var groundMesh = Level.streetsModel.clone();
    groundMesh.position.y = -0.39;
    
    /*var sidewalkShape = utilTHREE.createSquareWithHole(2.0, 1.2);
    var line = new THREE.LineCurve3(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, -1.2, 0));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    this.sidewalkGeometry = new THREE.ExtrudeGeometry(sidewalkShape, extrudeSettings);
    this.sidewalk = new THREE.Mesh( this.sidewalkGeometry, Level.sidewalkMaterial );*/
    this.sidewalk = Level.sidewalkModel.clone();
    this.sidewalk.position.y = -0.39;
    
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
    for (var i = 0; i < this.objects.length; ++i) {
        if (this.objects[i] instanceof Building) {
            var tile = new GridTile({
                x: this.objects[i].gridX,
                z: this.objects[i].gridZ,
                sceneParent: this.interactiveTown,
                building: this.objects[i]
            });
            this.objects.push(tile);
        }
    }
};

/**
 * @constructor
 */
Level.Sign = function(options) {
    var box = new THREE.BoxGeometry(15, 3.3, 0.1);
    var boxMesh = new THREE.Mesh(box, BuildingBlock.goalMaterial);
    
    this.parent = new THREE.Object3D();
    this.parent.position.x = 6;
    this.parent.position.y = 3;
    this.parent.position.z = -2;
    this.parent.add(boxMesh);
    
    this.textParent = new THREE.Object3D();
    this.textParent.position.y = 0.3;
    this.parent.add(this.textParent);
    
    this.initThreeSceneObject({
        sceneParent: options.sceneParent,
        object: this.parent
    });
    
    this.setSecondaryText('LD35 GAME BY OLLI ETUAHO, VALTTERI HEINONEN AND ANASTASIA DIATLOVA');
    
    this.addToScene();
};

Level.Sign.prototype = new ThreeSceneObject();

Level.Sign.prototype.setText = function(text) {
    var textGeo = new THREE.TextGeometry( text, {
        font: Level.font,
        size: 2,
        height: 0.1,
        curveSegments: 1,
        bevelEnabled: false,
    });
    textGeo.center();
    var material = new THREE.MeshPhongMaterial( { color: 0x333333, specular: 0x222222 } );
    var textMesh = new THREE.Mesh( textGeo, material );
    textMesh.position.z = 0.1;
    
    this.textParent.children = [];
    this.textParent.add(textMesh);
};

Level.Sign.prototype.setSecondaryText = function(text) {
    var textGeo = new THREE.TextGeometry( text, {
        font: Level.font,
        size: 0.35,
        height: 0.05,
        curveSegments: 1,
        bevelEnabled: false,
    });
    textGeo.center();
    var material = new THREE.MeshPhongMaterial( { color: 0x888888, specular: 0x222222 } );
    var textMesh = new THREE.Mesh( textGeo, material );
    textMesh.position.z = 0.05;
    textMesh.position.y = -1.2;
    this.parent.add(textMesh);
};

Level.prototype.updateSpotLightTarget = function() {
    var spotTarget = this.getLookAtCenter();
    this.spotLight.target.position.set(spotTarget.x, spotTarget.y, spotTarget.z);
};

Level.prototype.setupLights = function() {
    this.scene.add(new THREE.AmbientLight(0x222222));
    var mainLight = new THREE.DirectionalLight(0xaaa588, 1);
    mainLight.position.set(0.5, 1, -1).normalize();
    this.scene.add(mainLight);
    
    var spotLight = new THREE.SpotLight(0x665555);
    this.spotLight = spotLight;
    spotLight.position.set( 125, 250, -250 );
    spotLight.target = new THREE.Object3D();
    this.scene.add(spotLight.target);
    this.updateSpotLightTarget();

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
    
    this.sky = new THREE.Sky();
    this.scene.add(this.sky.mesh);
    var uniforms = this.sky.uniforms;
    uniforms.turbidity.value = 10;
    uniforms.reileigh.value = 1.3;
    uniforms.luminance.value = 1;
    uniforms.mieCoefficient.value = 0.052;
    uniforms.mieDirectionalG.value = 0.83;
    uniforms.sunPosition.value.copy(mainLight.position);
    uniforms.sunPosition.value.y *= 0.4;
};

Level.prototype.setCursorPosition = function(viewportPos) {
    this.raycaster.setFromCamera(viewportPos.clone(), this.camera);
    var intersects = this.raycaster.intersectObjects(this.interactiveTown.children, true);
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
        if (this.state.id !== Level.State.SUCCESS || this.editor) {
            var diffY = (viewportPos.y - this.lastCursorPosition.y) / 0.05;
            var diffX = (viewportPos.x - this.lastCursorPosition.x) / 0.05;
            this.cameraControl.zoom(diffY);
            this.cameraControl.moveOrbitAngle(diffX);
        }
    } else if (this.mouseDownBuilding) {
        var steps = (this.mouseDownCursorPosition.y - this.lastCursorPosition.y) / 0.05;
        if (Game.parameters.get('roundedMovement')) {
            steps = Math.round(steps);
        }
        if (steps !== 0) {
            this.movedChosenBuilding = true;
        }
        this.chosenBuilding.topYTarget = this.mouseDownTopYTarget - steps;
        this.chosenBuilding.clampY();
        if (!Game.parameters.get('roundedMovement')) {
            this.chosenBuilding.topY = this.chosenBuilding.topYTarget;
        }
    } else if (mouseOverBuilding !== this.chosenBuilding) {
        if (mouseOverBuilding !== null && (this.state.id === Level.State.IN_PROGRESS || this.editor)) {
            if (!mouseOverBuilding.stationary || this.editor) {
                this.chosenBuilding = mouseOverBuilding;
                this.movedChosenBuilding = false;
                this.sinceNudge = 0;
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
    if (this.state.id === Level.State.INTRO) {
        return;
    }
    this.mouseDownCursorPosition = this.lastCursorPosition;
    if (this.chosenBuilding !== null && (this.state.id !== Level.State.SUCCESS || this.editor)) {
        if (!this.chosenBuilding.stationary) {
            this.sinceNudge = 0;
            this.mouseDownBuilding = this.chosenBuilding;
            this.mouseDownTopYTarget = this.chosenBuilding.topYTarget;
            this.mouseDownMoveCamera = false;
        }
    } else {
        this.mouseDownMoveCamera = true;
    }
};

Level.prototype.mouseUp = function() {
    if (this.state.id === Level.State.INTRO) {
        return;
    }
    if (this.mouseDownBuilding) {
        this.chosenBuilding.topYTarget = Math.round(this.chosenBuilding.topYTarget);
        this.chosenBuilding.clampY();
    }
    this.mouseDownBuilding = null;
    this.mouseDownMoveCamera = false;
    this.updateChosenBuilding();
};

Level.prototype.updateChosenBuilding = function() {
    if (this.chosenBuilding === null || this.chosenBuilding.stationary) {
        this.buildingCursor.removeFromScene();
    } else {
        this.buildingCursor.gridX = this.chosenBuilding.gridX;
        this.buildingCursor.gridZ = this.chosenBuilding.gridZ;
        this.buildingCursor.addToScene();
        
        var upArrows = false;
        var downArrows = false;
        if (this.mouseDownBuilding === null)
        {
            upArrows = (this.chosenBuilding.topYTarget < this.chosenBuilding.getMaxTopY());
            downArrows = (this.chosenBuilding.topYTarget > 0);
        }
        this.buildingCursor.setArrowsVisible(upArrows, downArrows);
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
Level.sidewalkModel = null;
Level.streetsModel = null;

Level.loadAssets = function() {
    utilTHREE.loadFont('aldo_the_apache_regular', function(font) {
        Level.font = font;
    });
    utilTHREE.loadJSONModel('sidewalk', function(object) {
        Level.sidewalkModel = object;
    });
    utilTHREE.loadJSONModel('streets', function(object) {
        Level.streetsModel = object;
    });
};

Level.loadAssets();

'use strict';

var GRID_SPACING = 3;

/**
 * @constructor
 */
var Level = function(options) {
    var defaults = {
        width: 5,
        depth: 5,
        cameraAspect: 16 / 9
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 40, this.cameraAspect, 1, 10000 );
    this.moveCamera(new THREE.Vector3((this.width - 1) * GRID_SPACING * 0.5, 0, (this.depth - 1) * GRID_SPACING * 0.5));
    this.raycaster = new THREE.Raycaster();
    
    this.setupLights();
    this.setupGridGeometry();
    
    this.objects = [];
    this.buildingGrid = [];
    for (var x = 0; x < this.width; ++x) {
        this.buildingGrid.push([]);
        for (var z = 0; z < this.depth; ++z) {
            var building = new Building();
            var blocksSpec = [
                {blockConstructor: HoleBlock, mirrorDirection: true},
                {blockConstructor: StopBlock}
            ];
            building.initBuilding({
                level: this,
                scene: this.scene,
                blocksSpec: blocksSpec,
                gridX: x,
                gridZ: z,
                mirrorDirection: Math.random() < 0.5
            });
            this.objects.push(building);
            this.buildingGrid[x].push(building);
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
    for (var i = 0; i < this.objects.length; ++i) {
        this.objects[i].update(deltaTime);
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

Level.prototype.handleLaser = function(x, z, loc) {
    var building = this.getBuildingFromGrid(x, z);
    if (!building) {
        if (x === this.goal.gridX && z === this.goal.gridZ) {
            this.state.change(Level.State.SUCCESS);
        }
        return Laser.Handling.INFINITY;
    } else {
        return building.handleLaser(loc);
    }
};

Level.prototype.moveCamera = function(lookAt) {
    this.camera.position.z = lookAt.z + 15;
    this.camera.position.x = lookAt.x + 15;
    this.camera.position.y = lookAt.y + 15;
    this.camera.lookAt(lookAt);
};

Level.prototype.setupGridGeometry = function() {
    var faceSize = GRID_SPACING;
    var holeSize = 1.2; // hole size
    var shape = utilTHREE.createSquareWithHole(faceSize, holeSize);
    var line = new THREE.LineCurve3(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0));
    var extrudeSettings = {
        steps: 1,
        bevelEnabled: false,
        extrudePath: line
    };
    this.gridGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    for (var x = 0; x < this.width; ++x) {
        for (var z = 0; z < this.depth; ++z) {
            var material = new THREE.MeshPhongMaterial( { color: 0x88ff88, specular: 0x222222 } );
            var gridMesh = new THREE.Mesh( this.gridGeometry, material );
            gridMesh.position.x = x * GRID_SPACING;
            gridMesh.position.z = z * GRID_SPACING;
            this.scene.add(gridMesh);
        }
    }
};

Level.prototype.setupLights = function() {
    this.scene.add(new THREE.AmbientLight(0x222222));
    var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0.5, 1, -1).normalize();
    this.scene.add(directionalLight);
};

Level.prototype.setCursorPosition = function(viewportPos) {
    this.raycaster.setFromCamera(viewportPos, this.camera);
    var intersects = this.raycaster.intersectObjects(this.scene.children, true);
    this.chosenBuilding = null;
    if (intersects.length > 0) {
        var nearest = intersects[0];
        console.log(nearest.object);
        for (var i = 0; i < this.objects.length; ++i) {
            if (this.objects[i] instanceof Building && this.objects[i].ownsSceneObject(nearest.object)) {
                this.chosenBuilding = this.objects[i];
            }
        }
    }
    this.updateChosenBuilding();
};

Level.prototype.updateChosenBuilding = function() {
    if (this.chosenBuilding === null) {
        this.buildingCursor.removeFromScene();
    } else {
        this.buildingCursor.gridX = this.chosenBuilding.gridX;
        this.buildingCursor.gridZ = this.chosenBuilding.gridZ;
        this.buildingCursor.addToScene();
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

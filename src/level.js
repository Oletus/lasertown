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
    
    this.setupLights();
    this.setupGridGeometry();
    
    this.objects = [];
    for (var x = 0; x < this.width; ++x) {
        for (var z = 0; z < this.depth; ++z) {
            this.objects.push(new Building({
                level: this,
                scene: this.scene,
                gridX: x,
                gridZ: z
            }));
        }
    }
    
    this.laser = new LaserSegment({
        level: this,
        scene: this.scene
    });
    this.objects.push(this.laser);
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

Level.prototype.moveCamera = function(lookAt) {
    this.camera.position.z = lookAt.z + 15;
    this.camera.position.x = lookAt.x + 15;
    this.camera.position.y = lookAt.y + 15;
    this.camera.lookAt(lookAt);
};

Level.prototype.setupGridGeometry = function() {
    this.gridGeometry = new THREE.Geometry();
    
    var gs = GRID_SPACING * 0.5;
    var hs = 0.5; // hole size
    // A plane with a square hole in the middle
    this.gridGeometry.vertices.push(new THREE.Vector3(-gs,  0,  -gs));
    this.gridGeometry.vertices.push(new THREE.Vector3( gs,  0,  -gs));
    this.gridGeometry.vertices.push(new THREE.Vector3(-hs,  0,  -hs));
    this.gridGeometry.vertices.push(new THREE.Vector3( hs,  0,  -hs));
    this.gridGeometry.vertices.push(new THREE.Vector3(-hs,  0,   hs));
    this.gridGeometry.vertices.push(new THREE.Vector3( hs,  0,   hs));
    this.gridGeometry.vertices.push(new THREE.Vector3(-gs,  0,   gs));
    this.gridGeometry.vertices.push(new THREE.Vector3( gs,  0,   gs));
    this.gridGeometry.faces.push(new THREE.Face3(0, 2, 1));
    this.gridGeometry.faces.push(new THREE.Face3(1, 2, 3));
    this.gridGeometry.faces.push(new THREE.Face3(0, 6, 2));
    this.gridGeometry.faces.push(new THREE.Face3(2, 6, 4));
    this.gridGeometry.faces.push(new THREE.Face3(1, 3, 5));
    this.gridGeometry.faces.push(new THREE.Face3(1, 5, 7));
    this.gridGeometry.faces.push(new THREE.Face3(6, 5, 4));
    this.gridGeometry.faces.push(new THREE.Face3(6, 7, 5));
    this.gridGeometry.computeBoundingBox();
    this.gridGeometry.computeFaceNormals();
    this.gridGeometry.computeVertexNormals();
    
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

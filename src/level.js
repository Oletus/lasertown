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
    
    this.objects = [];
    for (var x = 0; x < this.width; ++x) {
        for (var z = 0; z < this.depth; ++z) {
            this.objects.push(new Building({
                scene: this.scene,
                gridX: x,
                gridZ: z
            }));
        }
    }
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
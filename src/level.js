'use strict';

var Level = function(options) {
    var defaults = {
        width: 5,
        height: 5,
        cameraAspect: 16 / 9
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 75, this.cameraAspect, 1, 10000 );
    this.camera.position.z = 1000;
    
    // Test geometry
    var geometry = new THREE.BoxGeometry( 200, 200, 200 );
    var material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
    this.mesh = new THREE.Mesh( geometry, material );
    this.scene.add(this.mesh);
};

Level.prototype.update = function() {
    this.mesh.rotation.x += 0.01;
    this.mesh.rotation.y += 0.02;
};

Level.prototype.render = function(renderer) {
    renderer.render(this.scene, this.camera);
};
'use strict';

var LaserSegment = function(options) {
    var defaults = {
        originX: -1,
        originZ: 2,
        height: 1,
        gridLength: 2,
        originDirection: LaserSegment.Direction.POSITIVE_X,
        level: null
    };
    objectUtil.initWithDefaults(this, defaults, options);
    
    var geometry = new THREE.BoxGeometry( 0.2, 0.2, 1 );
    var material = new THREE.MeshPhongMaterial( { color: 0x0, emissive: 0xff8888 } );
    /*material.blending = THREE.AdditiveBlending;
    material.transparent = true;
    material.opacity = 0.6;*/
    this.mesh = new THREE.Mesh(geometry, material);
    
    this.origin = new THREE.Object3D();
    this.origin.add(this.mesh);
    
    this.initThreeSceneObject({
        object: this.origin,
        scene: options.scene
    });

    this.addToScene();
};

LaserSegment.prototype = new ThreeSceneObject();

LaserSegment.Direction = {
    POSITIVE_X: 0,
    NEGATIVE_X: 1,
    POSITIVE_Z: 2,
    NEGATIVE_Z: 3
};

LaserSegment.prototype.update = function(deltaTime) {
    this.origin.position.y = this.height;
    this.origin.position.x = this.level.gridXToWorld(this.originX);
    this.origin.position.z = this.level.gridZToWorld(this.originZ);
    switch (this.originDirection) {
        case LaserSegment.Direction.POSITIVE_X:
            this.origin.rotation.y = Math.PI * 0.5;
            break;
        case LaserSegment.Direction.NEGATIVE_X:
            this.origin.rotation.y = -Math.PI * 0.5;
            break;
        case LaserSegment.Direction.POSITIVE_Z:
            this.origin.rotation.y = 0;
            break;
        case LaserSegment.Direction.NEGATIVE_X:
            this.origin.rotation.y = Math.PI;
            break;
    }
    
    this.mesh.position.z = this.level.gridLengthToWorld(this.gridLength * 0.5);
    this.mesh.scale.z = this.level.gridLengthToWorld(this.gridLength);
};

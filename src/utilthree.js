'use strict';

var utilTHREE = {};

utilTHREE.createSquareWithHole = function(faceSize, holeSize) {
    var fs = faceSize / 2;
    var hs = holeSize / 2;
    var shape = new THREE.Shape();
    shape.moveTo(-fs, -fs);
    shape.lineTo( fs, -fs);
    shape.lineTo( fs,  fs);
    shape.lineTo(-fs,  fs);
    var hole = new THREE.Path();
    hole.moveTo(-hs, -hs);
    hole.lineTo( hs, -hs);
    hole.lineTo( hs,  hs);
    hole.lineTo(-hs,  hs);
    shape.holes.push(hole);
    return shape;
};

utilTHREE.createUShape = function(faceSize, edgeSize, bottomEdgeSize) {
    if (bottomEdgeSize === undefined) {
        bottomEdgeSize = edgeSize;
    }
    var fs = faceSize / 2;
    var es = edgeSize;
    var bs = bottomEdgeSize;
    var shape = new THREE.Shape();
    shape.moveTo(-fs, -fs);
    shape.lineTo( fs, -fs);
    shape.lineTo( fs,  fs);
    shape.lineTo( fs - es,  fs);
    shape.lineTo( fs - es, -fs + bs);
    shape.lineTo(-fs + es, -fs + bs);
    shape.lineTo(-fs + es,  fs);
    shape.lineTo(-fs,  fs);
    return shape;
};

utilTHREE.modelsPath = 'assets/models/';

/**
 * How many models have been created.
 */
utilTHREE.createdCount = 0;
/**
 * How many models have been fully loaded.
 */
utilTHREE.loadedCount = 0;

utilTHREE.loadMTLOBJ = function(objFilename, mtlFilename, objectCallback) {
    var materials;
    
    var onProgress = function() {};
    var onError = function() {};
    
    ++utilTHREE.createdCount;
    
    var loadObj = function() {
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials( materials);
        objLoader.setPath(utilTHREE.modelsPath);
        objLoader.load(objFilename, function(object) {
            ++utilTHREE.loadedCount;
            objectCallback(object);
        }, onProgress, onError);
    };
    
    if (typeof mtlFilename !== 'string') {
        var materials = mtlFilename;
        loadObj();
    } else {
        var mtlLoader = new THREE.MTLLoader();
        mtlLoader.setBaseUrl(utilTHREE.modelsPath);
        mtlLoader.setPath(utilTHREE.modelsPath);
        mtlLoader.load(mtlFilename, function(loadedMaterials) {
            materials = loadedMaterials;
            materials.preload();
            loadObj();
        });
    }
};

utilTHREE.onAllLoaded = function(callback) {
    var checkLoaded = function() {
        if (utilTHREE.loadedCount === utilTHREE.createdCount) {
            callback();
        } else {
            setTimeout(checkLoaded, 0.1);
        }
    }
    setTimeout(checkLoaded, 0.0);
};

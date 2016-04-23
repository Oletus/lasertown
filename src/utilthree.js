'use strict';

// Three.js utils.
var utilTHREE = {};

/**
 * Path to load models from.
 */
utilTHREE.modelsPath = 'assets/models/';

/**
 * Path to load fonts from.
 */
utilTHREE.fontsPath = 'assets/fonts/';

/**
 * How many models/fonts have been created.
 */
utilTHREE.createdCount = 0;
/**
 * How many models/fonts have been fully loaded.
 */
utilTHREE.loadedCount = 0;

/**
 * @param {string} filename Name of the model file to load without the .json extension.
 * @param {function} objectCallback Function to call with the created mesh as a parameter.
 */
utilTHREE.loadJSONModel = function(filename, objectCallback) {
    var loader = new THREE.JSONLoader();
    
    ++utilTHREE.createdCount;
    
    loader.load(utilTHREE.modelsPath + filename + '.json', function(geometry, materials) {
        var material = new THREE.MeshFaceMaterial(materials);
        var mesh = new THREE.Mesh(geometry, material);
        objectCallback(mesh);
        ++utilTHREE.loadedCount;
    });
};

/**
 * @param {string} fontName Name of the font to load.
 * @param {function} objectCallback Function to call with the created font as a parameter.
 */
utilTHREE.loadFont = function(fontName, objectCallback) {
    var loader = new THREE.FontLoader();

    ++utilTHREE.createdCount;

    loader.load(utilTHREE.fontsPath + fontName + '.js', function ( response ) {
        objectCallback(response);
        ++utilTHREE.loadedCount;
    });
};

/**
 * @param {function} callback Function to call when all Three.js assets are loaded.
 */
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

/**
 * @param {number} faceSize The width and height of the shape.
 * @param {number} holeSize The width and height of the hole in the middle.
 * @return {THREE.Shape}
 */
utilTHREE.createSquareWithHoleShape = function(faceSize, holeSize) {
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

/**
 * @param {number} faceSize The width and height of the U shape.
 * @param {number} edgeSize The width of the edges of the U.
 * @param {number} bottomEdgeSize The width of the bottom edge of the U. Defaults to edgeSize.
 * @return {THREE.Shape}
 */
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

/**
 * @param {number} triWidth The width of the triangle part of the arrow.
 * @param {number} triHeight The height of the triangle part of the arrow.
 * @param {number} stemWidth The width of the stem of the arrow.
 * @param {number} stemHeight The height of the stem of the arrow.
 * @return {THREE.Shape}
 */
utilTHREE.createArrowShape = function(triWidth, triHeight, stemWidth, stemHeight) {
    var tw = triWidth * 0.5;
    var sw = stemWidth * 0.5;

    var shape = new THREE.Shape();
    shape.moveTo( tw, 0);
    shape.lineTo( 0,  triHeight);
    shape.lineTo(-tw, 0);
    shape.lineTo(-sw, 0);
    shape.lineTo(-sw, -stemHeight);
    shape.lineTo( sw, -stemHeight);
    shape.lineTo( sw, 0);
    return shape;
};

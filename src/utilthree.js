'use strict';

if (typeof GJS === "undefined") {
    var GJS = {};
}

// Three.js utils.
GJS.utilTHREE = {};

/**
 * Path to load models from.
 */
GJS.utilTHREE.modelsPath = 'assets/models/';

/**
 * Path to load fonts from.
 */
GJS.utilTHREE.fontsPath = 'assets/fonts/';

/**
 * How many models/fonts have been created.
 */
GJS.utilTHREE.createdCount = 0;
/**
 * How many models/fonts have been fully loaded.
 */
GJS.utilTHREE.loadedCount = 0;

/**
 * @return {number} Amount of three.js models/fonts that have been fully loaded per amount that has been created.
 * Name specified as string to support Closure compiler together with loadingbar.js.
 */
GJS.utilTHREE['loadedFraction'] = function() {
    if (GJS.utilTHREE.createdCount === 0) {
        return 1.0;
    }
    return GJS.utilTHREE.loadedCount / GJS.utilTHREE.createdCount;
};

/**
 * @param {string} filename Name of the model file to load without the .json extension.
 * @param {function} objectCallback Function to call with the created mesh as a parameter.
 */
GJS.utilTHREE.loadJSONModel = function(filename, objectCallback) {
    var loader = new THREE.JSONLoader();
    
    ++GJS.utilTHREE.createdCount;
    
    loader.load(GJS.utilTHREE.modelsPath + filename + '.json', function(geometry, materials) {
        var material = new THREE.MeshFaceMaterial(materials);
        var mesh = new THREE.Mesh(geometry, material);
        objectCallback(mesh);
        ++GJS.utilTHREE.loadedCount;
    });
};

/**
 * @param {string} fontName Name of the font to load.
 * @param {function} objectCallback Function to call with the created font as a parameter.
 */
GJS.utilTHREE.loadFont = function(fontName, objectCallback) {
    var loader = new THREE.FontLoader();

    ++GJS.utilTHREE.createdCount;

    loader.load(GJS.utilTHREE.fontsPath + fontName + '.js', function ( response ) {
        objectCallback(response);
        ++GJS.utilTHREE.loadedCount;
    });
};

/**
 * @param {number} faceSize The width and height of the shape.
 * @param {number} holeSize The width and height of the hole in the middle.
 * @return {THREE.Shape}
 */
GJS.utilTHREE.createSquareWithHoleShape = function(faceSize, holeSize) {
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
GJS.utilTHREE.createUShape = function(faceSize, edgeSize, bottomEdgeSize) {
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
GJS.utilTHREE.createArrowShape = function(triWidth, triHeight, stemWidth, stemHeight) {
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

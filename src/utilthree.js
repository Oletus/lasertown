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

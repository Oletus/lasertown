'use strict';

var utilTHREE = {};

utilTHREE.createPlaneWithHole = function(faceSize, holeSize) {
    var fs = faceSize / 2;
    var hs = holeSize / 2;
    var holeGeometry = new THREE.Geometry();
    holeGeometry.vertices.push(new THREE.Vector3(-fs,  0,  -fs));
    holeGeometry.vertices.push(new THREE.Vector3( fs,  0,  -fs));
    holeGeometry.vertices.push(new THREE.Vector3(-hs,  0,  -hs));
    holeGeometry.vertices.push(new THREE.Vector3( hs,  0,  -hs));
    holeGeometry.vertices.push(new THREE.Vector3(-hs,  0,   hs));
    holeGeometry.vertices.push(new THREE.Vector3( hs,  0,   hs));
    holeGeometry.vertices.push(new THREE.Vector3(-fs,  0,   fs));
    holeGeometry.vertices.push(new THREE.Vector3( fs,  0,   fs));
    holeGeometry.faces.push(new THREE.Face3(0, 2, 1));
    holeGeometry.faces.push(new THREE.Face3(1, 2, 3));
    holeGeometry.faces.push(new THREE.Face3(0, 6, 2));
    holeGeometry.faces.push(new THREE.Face3(2, 6, 4));
    holeGeometry.faces.push(new THREE.Face3(1, 3, 5));
    holeGeometry.faces.push(new THREE.Face3(1, 5, 7));
    holeGeometry.faces.push(new THREE.Face3(6, 5, 4));
    holeGeometry.faces.push(new THREE.Face3(6, 7, 5));
    holeGeometry.computeBoundingBox();
    holeGeometry.computeFaceNormals();
    holeGeometry.computeVertexNormals();
    return holeGeometry;
};
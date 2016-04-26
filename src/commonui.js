'use strict';

if (typeof GJS === "undefined") {
    var GJS = {};
}

// UI elements that are common to multiple games, like fullscreen / social media buttons.
GJS.commonUI = {};

GJS.commonUI.createFullscreenButton = function(options) {
    var button = document.createElement('canvas');
    button.width = options.width;
    button.height = options.width;
    var ctx = button.getContext('2d');
    var w = ctx.canvas.width * 0.26;
    for (var i = 0; i < 4; ++i) {
        ctx.translate(ctx.canvas.width * 0.5, ctx.canvas.height * 0.5);
        ctx.rotate(i * Math.PI * 0.5);
        ctx.translate(-ctx.canvas.width * 0.5, -ctx.canvas.height * 0.5);
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w * 0.7, w * 0.3);
        ctx.lineTo(w * 1.6, w * 1.2);
        ctx.lineTo(w * 1.2, w * 1.6);
        ctx.lineTo(w * 0.3, w * 0.7);
        ctx.lineTo(0, w);
        ctx.lineTo(0, 0);
    }
    ctx.fillStyle = options.fillStyle;
    ctx.fill();
    button.addEventListener('click', function() {
        GJS.requestFullscreen(options.fullscreenElement);
    });
    GJS.addFullscreenChangeListener(function() {
        button.style.display = GJS.isFullscreen() ? 'none' : 'block';
    });
    return button;
};

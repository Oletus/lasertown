'use strict';

if (typeof GJS === "undefined") {
    var GJS = {};
}

/**
 * Loading bar.
 * @param {Array.<Object>=} objectsToPoll Objects that contain loadedFraction()
 * function that returns 1 when the object is fully loaded.
 * @constructor
 */
GJS.LoadingBar = function(objectsToPoll) {
    if (objectsToPoll === undefined) {
        objectsToPoll = [];
        if (typeof GJS.Sprite !== 'undefined') {
            objectsToPoll.push(GJS.Sprite);
        }
        if (typeof GJS.Audio !== 'undefined') {
            objectsToPoll.push(GJS.Audio);
        }
        if (typeof GJS.utilTHREE !== 'undefined') {
            objectsToPoll.push(GJS.utilTHREE);
        }
    }
    this.objectsToPoll = objectsToPoll;
    this.loadedFraction = 0;
    this.allLoaded = false;
    this.sinceLoaded = 0;
    this.sinceStarted = 0;
};

/**
 * @param {number} deltaTime Time passed from the last frame.
 * @return {boolean} True when fully loaded.
 */
GJS.LoadingBar.prototype.update = function(deltaTime) {
    this.sinceStarted += deltaTime;
    if (this.allLoaded) {
        this.sinceLoaded += deltaTime;
        return this.allLoaded;
    }
    this.loadedFraction = 0;
    this.allLoaded = true;
    for (var i = 0; i < this.objectsToPoll.length; ++i) {
        // 'loadedFraction' function name specified as string to support Closure compiler.
        var loadedFraction = this.objectsToPoll[i]['loadedFraction']();
        if (loadedFraction < 1) {
            this.allLoaded = false;
        }
        this.loadedFraction += Math.min(loadedFraction, 1.0) / this.objectsToPoll.length;
    }
    return this.allLoaded;
};

/**
 * @return {boolean} True when fully loaded.
 */
GJS.LoadingBar.prototype.finished = function() {
    return this.allLoaded;
};

/**
 * Draw the loading bar.
 * @param {CanvasRenderingContext2D} ctx Context to draw the loading bar to.
 */
GJS.LoadingBar.prototype.render = function(ctx) {
    if (ctx === undefined) {
        return;
    }
    if (this.sinceLoaded < 1.0) {
        // Fake some loading animation even if loading doesn't really take any time.
        var percentage = Math.min(this.loadedFraction, this.sinceStarted * 4);

        var gl;
        if (ctx instanceof WebGLRenderingContext) {
            gl = ctx;
        }
        if (typeof THREE !== 'undefined' && ctx instanceof THREE.WebGLRenderer) {
            gl = ctx.context;
        }
        if (gl !== undefined) {
            if (this.sinceLoaded > 0.0) {
                // WebGL loading bar doesn't support fading out yet.
                return;
            }
            var restoreClearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
            var restoreScissor = gl.getParameter(gl.SCISSOR_BOX);
            var restoreScissorTest = gl.isEnabled(gl.SCISSOR_TEST);

            var barWidth = Math.min(gl.canvas.width - 40, 200);
            var width = gl.canvas.width;
            var height = gl.canvas.height;
            
            gl.disable(gl.SCISSOR_TEST);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.enable(gl.SCISSOR_TEST);
            
            gl.clearColor(1, 1, 1, 1);
            gl.scissor(Math.floor(width * 0.5 - barWidth * 0.5), Math.floor(height * 0.5 - 25),
                       barWidth, 50);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.clearColor(0, 0, 0, 1);
            gl.scissor(Math.floor(width * 0.5 - (barWidth - 10) * 0.5), Math.floor(height * 0.5 - 20),
                       barWidth - 10, 40);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.clearColor(1, 1, 1, 1);
            gl.scissor(Math.floor(width * 0.5 - (barWidth - 20) * 0.5), Math.floor(height * 0.5 - 15),
                       Math.floor((barWidth - 20) * percentage), 30);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.clearColor(restoreClearColor[0], restoreClearColor[1], restoreClearColor[2], restoreClearColor[3]);
            gl.scissor(restoreScissor[0], restoreScissor[1], restoreScissor[2], restoreScissor[3]);
            if (!restoreScissorTest) {
                gl.disable(gl.SCISSOR_TEST);
            }
            return;
        }
        if (ctx.fillRect === undefined) {
            return;
        }
        var barWidth = Math.min(ctx.canvas.width - 40, 200);
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, (1.0 - this.sinceLoaded) * 1.5);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.translate(ctx.canvas.width * 0.5, ctx.canvas.height * 0.5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-barWidth * 0.5, -25, barWidth, 50);
        ctx.fillStyle = '#000';
        ctx.fillRect(-(barWidth - 10) * 0.5, -20, barWidth - 10, 40);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-(barWidth - 20) * 0.5, -15, (barWidth - 20) * percentage, 30);
        ctx.restore();
    }
};

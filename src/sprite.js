'use strict';

/**
 * A sprite that can be drawn on a 2D canvas.
 * @constructor
 * @param {string|HTMLImageElement|HTMLCanvasElement|Sprite} filename File to load, a graphical element that's already
 * loaded, or another Sprite.
 * @param {string=} filter Filter function to convert the sprite, for example Sprite.turnSolidColored('black')
 * @param {string|HTMLImageElement|HTMLCanvasElement=} fallback Fallback file to load or a graphical element that's
 * already loaded.
 */
var Sprite = function(filename, /* Optional */ filter, fallback) {
    this.filename = filename;
    this.missing = false;
    this.fallback = fallback;
    this.filter = filter;
    Sprite.createdCount++;
    this.loadedListeners = [];
    this.implementsGameutilsSprite = true;
    this._reload();
};

Sprite.prototype.addLoadedListener = function(callback) {
    if (this.loaded) {
        callback();
    }
    else {
        this.loadedListeners.push(callback);
    }
};

Sprite.prototype._callLoadedListeners = function() {
    for (var i = 0; i < this.loadedListeners.length; ++i) {
        this.loadedListeners[i]();
    }
};

/**
 * Reload the Sprite.
 * @protected
 */
Sprite.prototype._reload = function() {
    if (typeof this.filename != typeof '') {
        this.img = this.filename;
        if (this.img instanceof Sprite) {
            var that = this;
            this.img.addLoadedListener(function() {
                that.filename = that.img.img;
                that._reload();
            });
            return;
        }
        this.loaded = true;
        Sprite.loadedCount++;
        this.width = this.img.width;
        this.height = this.img.height;
        if (this.filter !== undefined) {
            this.filter(this);
        }
    } else {
        this.img = document.createElement('img');
        if (this.filename.substring(0, 5) === 'data:' || this.filename.substring(0, 5) === 'http:') {
            this.img.src = this.filename;
        } else {
            this.img.src = Sprite.gfxPath + this.filename;
        }
        var that = this;
        this.loaded = false;
        this.img.onload = function() {
            that.loaded = true;
            Sprite.loadedCount++;
            that.width = that.img.width;
            that.height = that.img.height;
            if (that.filter !== undefined) {
                that.filter(that);
            }
            that._callLoadedListeners();
        };
        this.img.onerror = function() {
            if (that.fallback) {
                that.filename = that.fallback;
                that.fallback = undefined;
                that._reload();
                return;
            }
            that.loaded = true;
            that.missing = true;
            Sprite.loadedCount++;
            that.img = document.createElement('canvas');
            that.img.width = 150;
            that.img.height = 20;
            that.width = that.img.width;
            that.height = that.img.height;
            var ctx =that.img.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#000';
            ctx.fillText('Missing: ' + that.filename, 0, 0);
            that._callLoadedListeners();
        };
    }
};

/**
 * Path for graphics files. Set this before creating any Sprite objects.
 */
Sprite.gfxPath = 'assets/gfx/';

/**
 * Filter for turning the sprite solid colored.
 */
Sprite.turnSolidColored = function(solidColor) {
    return function(sprite) {
        var canvas = document.createElement('canvas');
        canvas.width = sprite.width;
        canvas.height = sprite.height;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = solidColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-in';
        sprite.draw(ctx, 0, 0);
        sprite.img = canvas;
    };
};

/**
 * Filter for generating a different hued variation of the sprite.
 */
Sprite.varyHue = function(options) {
    var defaults = {
        minHue: 0,
        maxHue: 1,
        hueChange: 0
    };
    for(var key in defaults) {
        if(!options.hasOwnProperty(key)) {
            options[key] = defaults[key];
        }
    }
    while (options.hueChange < 0) {
        options.hueChange += 1;
    }
    while (options.hueChange > 1) {
        options.hueChange -= 1;
    }
    return function(sprite) {
        var canvas = document.createElement('canvas');
        canvas.width = sprite.width;
        canvas.height = sprite.height;
        var ctx = canvas.getContext('2d');
        sprite.draw(ctx, 0, 0);
        try {
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            if (e.name == 'SecurityError') {
                if (!Sprite.reportedSecurityError) {
                    Sprite.reportedSecurityError = true;
                    console.log(e.message);
                }
                return;
            }
        }
        for (var i = 0; i < data.data.length; i += 4) {
            var r = data.data[i];
            var g = data.data[i + 1];
            var b = data.data[i + 2];
            var hsl = rgbToHsl(r, g, b);
            if (hsl[0] >= options.minHue && hsl[0] <= options.maxHue) {
                hsl[0] += options.hueChange;
                if (hsl[0] > 1.0) {
                    hsl[0] -= 1.0;
                }
                var rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
                data.data[i] = rgb[0];
                data.data[i + 1] = rgb[1];
                data.data[i + 2] = rgb[2];
            }
        }
        ctx.putImageData(data, 0, 0);
        sprite.img = canvas;
    };
};

/**
 * Filter for generating a variation of the Sprite with colors replaced with others.
 * @param {Object} paletteMap A mapping from RGB source color values to target values. Source colors should be strings
 * in "R, G, B" format. Target colors should be arrays [R, G, B]. In both cases the scale is 0-255.
 * @param {number=} tolerance Tolerance for detecting source colors.
 */
Sprite.repalette = function(paletteMap, tolerance) {
    if (tolerance === undefined) {
        tolerance = 10;
    }
    var palette = [];
    for (var key in paletteMap) {
        if (paletteMap.hasOwnProperty(key)) {
            var sourceRgb = key.split(', ');
            palette.push({
                r: sourceRgb[0],
                g: sourceRgb[1],
                b: sourceRgb[2],
                target: paletteMap[key]
            });
        }
    }
    return function(sprite) {
        var canvas = document.createElement('canvas');
        canvas.width = sprite.width;
        canvas.height = sprite.height;
        var ctx = canvas.getContext('2d');
        sprite.draw(ctx, 0, 0);
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < data.data.length; i += 4) {
            var r = data.data[i];
            var g = data.data[i + 1];
            var b = data.data[i + 2];
            for (var j = 0; j < palette.length; ++j) {
                if (Math.abs(r - palette[j].r) < tolerance &&
                    Math.abs(g - palette[j].g) < tolerance &&
                    Math.abs(b - palette[j].b) < tolerance)
                {
                    var rgb = palette[j].target;
                    data.data[i] = rgb[0];
                    data.data[i + 1] = rgb[1];
                    data.data[i + 2] = rgb[2];
                }
            }
        }
        ctx.putImageData(data, 0, 0);
        sprite.img = canvas;
    };
};

Sprite.reportedSecurityError = false;

/**
 * How many Sprite objects have been created.
 */
Sprite.createdCount = 0;
/**
 * How many Sprite objects have been fully loaded.
 */
Sprite.loadedCount = 0;

/**
 * @return {number} Amount of Sprite objects that have been fully loaded per amount that has been created.
 * Name specified as string to support Closure compiler together with loadingbar.js.
 */
Sprite['loadedFraction'] = function() {
    return Sprite.loadedCount / Sprite.createdCount;
};

/**
 * Draw this to the given 2D canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} leftX X coordinate of the left edge.
 * @param {number} topY Y coordinate of the top edge.
 */
Sprite.prototype.draw = function(ctx, leftX, topY) {
    if (this.loaded) {
        ctx.drawImage(this.img, leftX, topY);
    }
};

/**
 * Draw the sprite to the given 2D canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} centerX X coordinate of the center of the sprite on the canvas.
 * @param {number} centerY Y coordinate of the center of the sprite on the canvas.
 * @param {number} angleRadians Angle to rotate the sprite with (relative to its center).
 * @param {number} scale Scale to scale the sprite with (relative to its center).
 */
Sprite.prototype.drawRotated = function(ctx, centerX, centerY, angleRadians, /* optional */ scale) {
    if (!this.loaded) {
        return;
    }
    if (angleRadians === undefined) {
        angleRadians = 0.0;
    }
    if (scale === undefined) {
        scale = 1.0;
    }
    if (this.loaded) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angleRadians);
        ctx.scale(scale, scale);
        ctx.translate(-this.width * 0.5, -this.height * 0.5);
        ctx.drawImage(this.img, 0, 0);
        ctx.restore();
    }
};

/**
 * Draw the sprite to the given 2D canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} centerX X coordinate of the center of the sprite on the canvas.
 * @param {number} centerY Y coordinate of the center of the sprite on the canvas.
 * @param {number} angleRadians Angle to rotate the sprite with (relative to its center).
 * @param {number} scaleX Scale to scale the sprite with along the x axis (relative to its center).
 * @param {number} scaleY Scale to scale the sprite with along the y axis (relative to its center).
 */
Sprite.prototype.drawRotatedNonUniform = function(ctx, centerX, centerY, angleRadians, scaleX, scaleY) {
    if (!this.loaded) {
        return;
    }
    if (angleRadians === undefined) {
        angleRadians = 0.0;
    }
    if (scaleX === undefined) {
        scaleX = 1.0;
    }
    if (scaleY === undefined) {
        scaleY = 1.0;
    }
    if (this.loaded) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angleRadians);
        ctx.scale(scaleX, scaleY);
        ctx.translate(-this.width * 0.5, -this.height * 0.5);
        ctx.drawImage(this.img, 0, 0);
        ctx.restore();
    }
};

/**
 * Fill the canvas with the sprite, preserving the sprite's aspect ratio, with the sprite centered on the canvas.
 * @param {CanvasRenderingContext2D} ctx
 */
Sprite.prototype.fillCanvas = function(ctx) {
    if (!this.loaded) {
        return;
    }
    var scale = Math.max(ctx.canvas.width / this.width, ctx.canvas.height / this.height);
    this.drawRotated(ctx, ctx.canvas.width * 0.5, ctx.canvas.height * 0.5, 0, scale);
};

/**
 * Fill the canvas with the sprite, preserving the sprite's aspect ratio, with the sprite's bottom touching the bottom
 * of the canvas.
 * @param {CanvasRenderingContext2D} ctx
 */
Sprite.prototype.fillCanvasFitBottom = function(ctx) {
    if (!this.loaded) {
        return;
    }
    var scale = Math.max(ctx.canvas.width / this.width, ctx.canvas.height / this.height);
    this.drawRotated(ctx, ctx.canvas.width * 0.5, ctx.canvas.height - scale * this.height * 0.5, 0, scale);
};

/**
 * Fill the canvas horizontally with the sprite, preserving the sprite's aspect ratio, with the sprite's bottom touching the bottom
 * of the canvas.
 * @param {CanvasRenderingContext2D} ctx
 */
Sprite.prototype.fillCanvasHorizontallyFitBottom = function(ctx) {
    if (!this.loaded) {
        return;
    }
    var scale = ctx.canvas.width / this.width;
    this.drawRotated(ctx, ctx.canvas.width * 0.5, ctx.canvas.height - scale * this.height * 0.5, 0, scale);
};

/**
 * Just here to make Sprite and AnimatedSpriteInstance interchangeable.
 */
Sprite.prototype.update = function() {
};

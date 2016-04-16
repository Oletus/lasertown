'use strict';

/**
 * An object for storing animations.
 * @constructor
 * @param {Object} animationData Data for animation frames. Keys are animation ids. 
 * Values are arrays containing objects specifying frames.
 * Each frame has two mandatory keys: 'src' for frame source and 'duration' for a duration in milliseconds.
 * A series of frames can also be defined by using a wildcard. The number of frames needs to be specified.
 * Frame numbering starts from 1 if a wildcard is used.
 * Duration can be set to 0 to have the frame run into infinity.
 * Example:
 * {
 *  idle: [{src: 'idle.png', duration: 0}],
 *  walk: [{src: 'walk1.png', duration: 50}, {src: 'walk2.png', duration: 50}]
 *  run: [{src: 'run*.png', frames: 5}]
 * }
 * @param {Object} options Object with the following optional keys:
 *  frameConstructor: function Constructor for single frames that takes the
 *      frame source as a parameter. Defaults to AnimatedSprite.frameConstructor.
 *  durationMultiplier: number Multiplier for specified frame durations. Useful if you
 *      want to have frame times relative to fixed FPS, for example. Defaults to 1.
 *  defaultDuration: number Default duration for a single frame. Defaults to 1.
 */
var AnimatedSprite = function(animationData, options) {
    var defaults = {
        frameConstructor: AnimatedSprite.frameConstructor,
        durationMultiplier: 1,
        defaultDuration: 1
    };
    for(var key in defaults) {
        if (!options.hasOwnProperty(key)) {
            this[key] = defaults[key];
        } else {
            this[key] = options[key];
        }
    }
    // Construct animations by generating animation frames based on the sources.
    this.animations = {};
    this.defaultAnimation = undefined;
    for (var key in animationData) {
        if (animationData.hasOwnProperty(key)) {
            var animation = [];
            var singleAnimationData = animationData[key];
            var frameSrc = [];
            for (var i = 0; i < singleAnimationData.length; ++i) {
                var duration = this.defaultDuration;
                if (singleAnimationData[i].duration !== undefined)
                {
                    duration = singleAnimationData[i].duration;
                }
                if (singleAnimationData[i].frames !== undefined) {
                    var frameCount = singleAnimationData[i].frames;
                    var srcTemplate = singleAnimationData[i].src;
                    for (var j = 1; j <= frameCount; ++j) {
                        frameSrc.push({src: srcTemplate.replace('*', j), duration: duration});
                    }
                } else {
                    frameSrc.push({src: singleAnimationData[i].src, duration: duration});
                }
            }
            for (var i = 0; i < frameSrc.length; ++i) {
                var frame = AnimatedSprite._getFrame(frameSrc[i].src, this.frameConstructor);
                animation.push({frame: frame, duration: frameSrc[i].duration * this.durationMultiplier});
            }
            this.animations[key] = animation;
            if (this.defaultAnimation === undefined) {
                this.defaultAnimation = key;
            }
        }
    }
};

/**
 * Default constructor for single frames. Set this before loading any animations.
 */
AnimatedSprite.frameConstructor = null;
if (typeof Sprite !== 'undefined') {
    AnimatedSprite.frameConstructor = Sprite;
}

AnimatedSprite._getFrame = (function() {
    var frameCaches = [];

    return (function(src, frameConstructor) {
        var cachedFrames;
        for (var j = 0; j < frameCaches.length; ++j) {
            if (frameCaches[j].frameConstructor === frameConstructor) {
                cachedFrames = frameCaches[j].cachedFrames;
                break;
            }
        }
        if (cachedFrames === undefined) {
            cachedFrames = {};
            frameCaches.push({frameConstructor: frameConstructor, cachedFrames: cachedFrames});
        }
        if (!cachedFrames.hasOwnProperty('_' + src)) {
            var frame = new frameConstructor(src);
            cachedFrames['_' + src] = frame;
        }
        return cachedFrames['_' + src];
    });
})();

/**
 * An object that stores the current state of an animated sprite.
 * @constructor
 * @param {AnimatedSprite} animatedSprite The animated sprite to use.
 * @param {function=} finishedFrameCallback A callback to execute when an animation has finished. Can be used to
 * switch to a different animation, for example. Takes the finished animation key as a parameter.
 */
var AnimatedSpriteInstance = function(animatedSprite, finishedAnimationCallback) {
    this.animatedSprite = animatedSprite;
    this.finishedAnimationCallback = finishedAnimationCallback;
    this.setAnimation(this.animatedSprite.defaultAnimation);
    var frame = this.animatedSprite.animations[this.animationKey][this.frame].frame;

    // Add draw functions from Sprite if they are defined
    // A bit slow way to do this but needed to make the animation classes more generic.
    if (frame.implementsGameutilsSprite)
    {
        var that = this;
        this.draw = function(ctx, leftX, topY) {
            var frame = that.getCurrentFrame();
            frame.draw(ctx, leftX, topY);
        };
        this.drawRotated = function(ctx, centerX, centerY, angleRadians, /* optional */ scale) {
            var frame = that.getCurrentFrame();
            frame.drawRotated(ctx, centerX, centerY, angleRadians, /* optional */ scale);
        };
        this.drawRotatedNonUniform = function(ctx, centerX, centerY, angleRadians, scaleX, scaleY) {
            var frame = that.getCurrentFrame();
            frame.drawRotatedNonUniform(ctx, centerX, centerY, angleRadians, scaleX, scaleY);
        };
    }
};

/**
 * Start playing an animation.
 * @param {string} animationKey The animation id in the AnimatedSprite.
 */
AnimatedSpriteInstance.prototype.setAnimation = function(animationKey) {
    this.animationKey = animationKey;
    this.frame = 0;
    this.framePos = 0;
};

/**
 * Update the current animation frame.
 * @param {number} deltaTime Time that has passed since the last update.
 */
AnimatedSpriteInstance.prototype.update = function(deltaTime) {
    this._scrubInternal(deltaTime, this.finishedAnimationCallback);
};

/**
 * Scrub the animation backwards or forwards.
 * @param {number} deltaTime Amount to scrub by.
 */
AnimatedSpriteInstance.prototype.scrub = function(deltaTime) {
    this._scrubInternal(deltaTime);
};

AnimatedSpriteInstance.prototype._scrubInternal = function(deltaTime, finishCallback) {
    var currentAnimation = this.animatedSprite.animations[this.animationKey];
    if (currentAnimation[this.frame].duration > 0) {
        this.framePos += deltaTime * 1000;
        while (this.framePos > currentAnimation[this.frame].duration) {
            this.framePos -= currentAnimation[this.frame].duration;
            ++this.frame;
            if (this.frame >= currentAnimation.length) {
                this.frame = 0;
                if (finishCallback !== undefined) {
                    finishCallback(this.animationKey);
                }
            }
            if (currentAnimation[this.frame].duration <= 0) {
                this.framePos = 0.0;
                return;
            }
        }
        while (this.framePos < 0) {
            --this.frame;
            if (this.frame < 0) {
                this.frame = currentAnimation.length - 1;
            }
            this.framePos += currentAnimation[this.frame].duration;
            if (currentAnimation[this.frame].duration <= 0) {
                this.framePos = 0.0;
                return;
            }
        }
    }
};

/**
 * @return {string} The current animation key.
 */
AnimatedSpriteInstance.prototype.getCurrentAnimation = function() {
    return this.animationKey;
};

/**
 * @return {Object} The current frame of the animation.
 */
AnimatedSpriteInstance.prototype.getCurrentFrame = function() {
    return this.animatedSprite.animations[this.animationKey][this.frame].frame;
};

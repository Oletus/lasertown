'use strict';

/**
 * Helpers for doing platforming physics, including tile classes and a function to evaluate movement with collisions.
 * Using the platforming physics classes requires TileMap.
 */
var PlatformingPhysics = {};

/**
 * A character that moves in the platforming level, colliding into other objects and tile maps.
 * @constructor
 */
var PlatformingObject = function() {
};

/**
 * Initialize the character.
 * @param {Object} options Options for the character. May contain:
 *   x: number
 *   y: number
 */
PlatformingObject.prototype.init = function(options) {
    var defaults = {
        x: 0,
        y: 0,
        color: '#0ff',
        collisionGroup: '_all',
        preserveInertiaFromCollisions: true,
        maxStickToGroundDistance: 0, // On downward slopes
        resolvePriority: 0, // The objects with higher resolve priority have their physics resolved first.
        gameObject: null // Reserved for linking back to game-specific object that complements this one.
    }; 
    for(var key in defaults) {
        if (!options.hasOwnProperty(key)) {
            this[key] = defaults[key];
        } else {
            this[key] = options[key];
        }
    }
    this.resetMovement();
};

PlatformingObject.prototype.resetMovement = function() {
    this.lastX = this.x;
    this.lastY = this.y;
    this.lastYAfterUpwardSlopes = this.y;
    this.onGround = false;
    this.groundPlatform = null;
    this.lastOnGround = false;
    this.lastGroundPlatform = null;
    this.lastDeltaTime = 0;
    this.airTime = 0;
    this.dx = 0;
    this.dy = 0;

    this.frameDeltaX = 0;
    this.frameDeltaY = 0;
    this.frameDeltaYWithoutUpwardSlopes = 0;
};

/**
 * Override this to control the this.dx value that the character uses on each frame.
 * @param {number} deltaTime
 */
PlatformingObject.prototype.decideDx = function(deltaTime) {
};

/**
 * Override this to perform custom per-frame changes to this.x instead of the normal dx/dy dependent behavior.
 * @param {number} deltaTime
 * @param {Array.<PlatformingObject>} colliders Objects to collide against.
 */
PlatformingObject.prototype.moveX = function(deltaTime, colliders) {
    PlatformingPhysics.moveAndCollide(this, deltaTime, 'x', colliders);
};

/**
 * Update the x value and do some related bookkeeping.
 * @param {number} deltaTime
 * @param {Array.<PlatformingObject>} colliders Objects to collide against.
 */
PlatformingObject.prototype.updateX = function(deltaTime, colliders) {
    this.lastDeltaTime = deltaTime;
    this.moveX(deltaTime, colliders);
    var prevFrameDeltaX = this.frameDeltaX;
    // Save the real x movement of the object/tilemap this frame, so that other objects can take it into account
    // when colliding against it.
    this.frameDeltaX = this.x - this.lastX;
    // Also measure secondary delta, this can be used to implement moving platforms.
    this.frameDeltaDeltaX = this.frameDeltaX - prevFrameDeltaX;
    if (this.preserveInertiaFromCollisions) {
        this.dx = this.frameDeltaX / deltaTime;
    }
    this.lastYAfterUpwardSlopes = this.y;
};

/**
 * Override this to control the this.dy value that the character uses on each frame.
 * @param {number} deltaTime
 */
PlatformingObject.prototype.decideDy = function(deltaTime) {
    this.dy += 5.0 * deltaTime;
};

/**
 * Override this to perform custom per-frame changes to this.y instead of the normal dx/dy dependent behavior.
 * @param {number} deltaTime
 * @param {Array.<PlatformingObject>} colliders Objects to collide against.
 */
PlatformingObject.prototype.moveY = function(deltaTime, colliders) {
    PlatformingPhysics.moveAndCollide(this, deltaTime, 'y', colliders);
};

/**
 * Update the y value and do some related bookkeeping.
 * @param {number} deltaTime
 * @param {Array.<PlatformingObject>} colliders Objects to collide against.
 */
PlatformingObject.prototype.updateY = function(deltaTime, colliders) {
    this.onGround = false;
    this.groundPlatform = null;
    this.moveY(deltaTime, colliders);
    if (this.onGround) {
        this.airTime = 0.0;
    } else {
        this.airTime += deltaTime;
    }
    // Save the real y movement of the tilemap this frame, so that other objects can take it into account
    // when colliding against it.
    var prevFrameDeltaY = this.frameDeltaY;
    this.frameDeltaY = this.y - this.lastY;
    this.frameDeltaYWithoutUpwardSlopes = this.y - this.lastYAfterUpwardSlopes;
    // Also measure secondary delta, this can be used to implement moving platforms.
    this.frameDeltaDeltaY = this.frameDeltaY - prevFrameDeltaY;
    if (this.preserveInertiaFromCollisions) {
        this.dy = this.frameDeltaYWithoutUpwardSlopes / deltaTime;
    }
};

/**
 * Callback when the character touches ground.
 * @param {PlatformingObject} collisionObject Object that was collided with.
 */
PlatformingObject.prototype._touchGround = function(collisionObject) {
    this.onGround = true;
    this.groundPlatform = collisionObject;
    if (!this.touchGround(collisionObject)) {
        this.dy = (this.y - this.lastY) / this.lastDeltaTime;
    }
};

/**
 * Prefer overriding this if you need to trigger behaviors when touching ground.
 * @param {PlatformingObject} collisionObject Object that was collided with.
 * @return {boolean} Return true to override changes to dy that are done by default when touching ground.
 */
PlatformingObject.prototype.touchGround = function(collisionObject) {
    return false;
};

/**
 * Callback when the character touches the ceiling.
 * @param {PlatformingObject} collisionObject Object that was collided with.
 */
PlatformingObject.prototype._touchCeiling = function(collisionObject) {
    if (!this.touchCeiling(collisionObject)) {
        this.dy = (this.y - this.lastY) / this.lastDeltaTime;
    }
};

/**
 * Prefer overriding this if you need to trigger behaviors when touching ceiling.
 * @param {PlatformingObject} collisionObject Object that was collided with.
 * @return {boolean} Return true to override changes to dy that are done by default when touching the ceiling.
 */
PlatformingObject.prototype.touchCeiling = function(collisionObject) {
    return false;
};

/**
 * Debug rendering of the character.
 * @param {CanvasRenderingContext2D} ctx Context to draw to.
 */
PlatformingObject.prototype.render = function(ctx) {
    ctx.fillStyle = this.color;
    var rect = this.getCollisionRect();
    ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
};

/**
 * Get the object's collision rectangle in case the object is positioned at x, y.
 * Override this instead of getCollisionRect or getLastCollisionRect.
 * @param {number} x Horizontal position.
 * @param {number} y Vertical position.
 * @return {Rect} Collision rectangle.
 */
PlatformingObject.prototype.getPositionedCollisionRect = function(x, y) {
    var width = 1.0;
    var height = 2.0;
    return new Rect(x - width * 0.5, x + width * 0.5,
                    y - height * 0.5, y + height * 0.5);
};

/**
 * Get the object's collision rectangle with the current coordinates for the object.
 * @return {Rect} Collision rectangle.
 * @final
 */
PlatformingObject.prototype.getCollisionRect = function() {
    return this.getPositionedCollisionRect(this.x, this.y);
};

/**
 * Get the object's collision rectangle with the coordinates for the object in the beginning of the current frame.
 * @return {Rect} Collision rectangle.
 * @final
 */
PlatformingObject.prototype.getLastCollisionRect = function() {
    return this.getPositionedCollisionRect(this.lastX, this.lastY);
};

/**
 * A tile map that can be a part of a platforming level.
 * @constructor
 */
var PlatformingTileMap = function() {
};

PlatformingTileMap.prototype = new PlatformingObject();

/**
 * Initialize the tilemap.
 * @param {Object} options Options for the tilemap. May contain:
 *   tileMap: TileMap. Mandatory.
 *   x: number
 *   y: number
 */
PlatformingTileMap.prototype.init = function(options) {
    PlatformingObject.prototype.init.call(this, options);
    var defaults = {
        tileMap: null,
        tilesAffectMovingTilemaps: false,
        resolvePriority: 2
    };
    for(var key in defaults) {
        if (!options.hasOwnProperty(key)) {
            this[key] = defaults[key];
        } else {
            this[key] = options[key];
        }
    }
    this.frameDeltaDeltaX = 0;
    this.frameDeltaDeltaY = 0;
    this.collisionGroup = '_none';
};

/**
 * Get the object's collision rectangle in case the object is positioned at x, y.
 * @param {number} x Horizontal position.
 * @param {number} y Vertical position.
 * @return {Rect} Collision rectangle.
 */
PlatformingTileMap.prototype.getPositionedCollisionRect = function(x, y) {
    return new Rect(x, x + this.tileMap.width,
                    y, y + this.tileMap.height);
};

/**
 * Control the this.dx value that the character uses on each frame.
 * @param {number} deltaTime
 */
PlatformingTileMap.prototype.decideDx = function(deltaTime) {
    this.dx = 0;
};

/**
 * Control the this.dy value that the character uses on each frame.
 * @param {number} deltaTime
 */
PlatformingTileMap.prototype.decideDy = function(deltaTime) {
    this.dy = 0;
};

/**
 * Render all the tiles to a canvas.
 * @param {CanvasRenderingContext2D} ctx Context to draw to.
 */
PlatformingTileMap.prototype.render = function(ctx) {
    ctx.fillStyle = this.color;
    var rect = this.getCollisionRect();
    var defaultRect = PlatformingTileMap.prototype.getPositionedCollisionRect.call(this, this.x, this.y);
    if (Math.abs(rect.left - defaultRect.left) + Math.abs(rect.right - defaultRect.right) + 
        Math.abs(rect.top - defaultRect.top) + Math.abs(rect.bottom - defaultRect.bottom) > 0.1)
    {
        ctx.globalAlpha = ctx.globalAlpha * 0.5;
        ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
        ctx.globalAlpha = ctx.globalAlpha * 2.0;
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    var isWall = function(tile) {
        return tile.isWall();
    };
    this.tileMap.render(ctx, isWall);
    this.renderSlopes(ctx);
    ctx.restore();
};


/**
 * Render only sloped tiles to a canvas.
 * @param {CanvasRenderingContext2D} ctx 2D rendering context to use for drawing.
 */
PlatformingTileMap.prototype.renderSlopes = function(ctx) {
    for (var y = 0; y < this.tileMap.height; ++y) {
        for (var x = 0; x < this.tileMap.width; ++x) {
            var tile = this.tileMap.tiles[y][x];
            if (tile.isFloorSlope()) {
                tile.render(ctx);
            }
        }
    }
};

/**
 * A platforming level composed of tilemaps and objects that collide against them (or against each other).
 * @constructor
 */
var PlatformingLevel = function() {
};

/**
 * Initialize the level.
 */
PlatformingLevel.prototype.init = function() {
    this._objects = [];
    this._colliders = {'_all': []}; // All is a special collision group that includes all objects.
};

PlatformingLevel.resolveSort = function(a, b) {
    if (a.resolvePriority > b.resolvePriority) {
        return -1;
    }
    if (b.resolvePriority > a.resolvePriority) {
        return 1;
    }
    return 0;
};

/**
 * Add an object to the level.
 * @param {PlatformingObject} object Object to add.
 * @param {Array.<string>} collisionGroups Collision groups to add the object to. Will automatically be added to
 *     the "_all" collision group.
 */
PlatformingLevel.prototype.pushObject = function(object, collisionGroups) {
    this._objects.push(object);
    this._objects.sort(PlatformingLevel.resolveSort);
    if (collisionGroups !== undefined) {
        for (var i = 0; i < collisionGroups.length; ++i) {
            if (collisionGroups[i] !== '_all' && collisionGroups[i] !== '_none') {
                if (!this._colliders.hasOwnProperty(collisionGroups[i])) {
                    this._colliders[collisionGroups[i]] = [];
                }
                this._colliders[collisionGroups[i]].push(object);
            }
        }
    }
    this._colliders['_all'].push(object);
};

/**
 * Remove an object from the level.
 * @param {PlatformingObject} object Object to remove.
 */
PlatformingLevel.prototype.removeObject = function(object) {
    this._objects.splice(this._objects.indexOf(object), 1);
    for (var groupKey in this._colliders) {
        var indexInGroup = this._colliders[groupKey].indexOf(object);
        if (indexInGroup >= 0) {
            this._colliders[groupKey].splice(indexInGroup, 1);
        }
    }
};

/**
 * Update all object positions.
 * Tilemap objects may move. Their movement only affects the movement of other objects via collisions (so for example
 * logic for player movement matching moving platforms must be implemented in the decideDx function).
 * When the movement of the tilemap objects themselves is evaluated, the tilemap doesn't affect possible collisions,
 * only the object's bounding geometry does.
 * @param {number} deltaTime
 */
PlatformingLevel.prototype.update = function(deltaTime) {
    for (var i = 0; i < this._objects.length; ++i) {
        var object = this._objects[i];
        object.lastX = object.x;
        object.lastY = object.y;
        object.lastOnGround = object.onGround;
        object.lastGroundPlatform = object.groundPlatform;
        object.decideDx(deltaTime);
    }
    for (var i = 0; i < this._objects.length; ++i) {
        var object = this._objects[i];
        // tilemaps which affect moving tilemaps may not move.
        if (!(object instanceof PlatformingTileMap) || !object.tilesAffectMovingTilemaps) {
            object.updateX(deltaTime, this._colliders[object.collisionGroup]);
        }
    }

    for (var i = 0; i < this._objects.length; ++i) {
        var object = this._objects[i];
        object.decideDy(deltaTime);
    }
    for (var i = 0; i < this._objects.length; ++i) {
        var object = this._objects[i];
        // tilemaps which affect moving tilemaps may not move.
        if (!(object instanceof PlatformingTileMap) || !object.tilesAffectMovingTilemaps) {
            object.updateY(deltaTime, this._colliders[object.collisionGroup]);
        }
    }
};

/**
 * Debug render the level. Renders tiles as 1 wide and 1 tall, so set transform on the rendering context before
 * calling to scale the rendering.
 * @param {CanvasRenderingContext2D} ctx 2D rendering context to use for drawing.
 */
PlatformingLevel.prototype.render = function(ctx) {
    for (var i = 0; i < this._objects.length; ++i) {
        this._objects[i].render(ctx);
    }
};
 
/**
 * A platforming tile.
 * @constructor
 */
var PlatformingTile = function() {
};

/**
 * @return {number} floor height inside sloping tile.
 */
PlatformingTile.prototype.getFloorRelativeHeight = function(xInTile) {
    return 0.0;
};

/**
 * Set the position of the tile relative to the tilemap.
 */
PlatformingTile.prototype.setPos = function(x, y) {
    this._x = x;
    this._y = y;
};

/**
 * @return {number} maximum floor height inside sloping tile.
 */
PlatformingTile.prototype.getMaxFloorRelativeHeight = function() {
    return Math.max(this.getFloorRelativeHeight(0), this.getFloorRelativeHeight(1));
};

/**
 * @return {boolean} True if the tile is a wall for movement towards any direction.
 */
PlatformingTile.prototype.isWall = function() {
    return false;
};

/**
 * @return {boolean} True if the tile is a wall for upwards movement (negative y).
 */
PlatformingTile.prototype.isWallUp = function() {
    return false;
};

/**
 * @return {boolean} True if the tile is sloped for objects moving above it.
 */
PlatformingTile.prototype.isFloorSlope = function() {
    return false;
};


/**
 * A tile with a sloped floor.
 * @constructor
 */
var SlopedFloorTile = function(floorLeft, floorRight) {
    this._floorLeft = floorLeft;
    this._floorRight = floorRight;
    this._maxFloor = Math.max(floorLeft, floorRight);
    this._minFloor = Math.min(floorLeft, floorRight);
};

SlopedFloorTile.prototype = new PlatformingTile();

/**
 * @return {number} floor height inside sloping tile. Must be monotonically increasing or decreasing inside the tile.
 */
SlopedFloorTile.prototype.getFloorRelativeHeight = function(xInTile) {
    return mathUtil.clamp(this._minFloor, this._maxFloor, mathUtil.mix(this._floorLeft, this._floorRight, xInTile));
};

/**
 * @return {boolean} True if the tile is sloped for objects moving above it.
 */
SlopedFloorTile.prototype.isFloorSlope = function() {
    return true;
};

/**
 * Render the sloped tile on a canvas.
 * @param {CanvasRenderingContext2D} ctx 2D rendering context to use for drawing.
 */
SlopedFloorTile.prototype.render = function(ctx) {
    ctx.beginPath();
    ctx.moveTo(this._x, this._y + 1);
    for (var x = 0; x <= 1; x += 0.25) {
        var h = mathUtil.clamp(0, 1, this.getFloorRelativeHeight(x));
        ctx.lineTo(this._x + x, this._y + 1 - h);
    }
    ctx.lineTo(this._x + 1, this._y + 1);
    ctx.fill();
};

/**
 * A tile that's a wall.
 * @constructor
 * @param {boolean} wallUp True if the wall affects upwards movement (negative y).
 */
var WallTile = function(wallUp) {
    if (wallUp === undefined) {
        wallUp = true;
    }
    this._wallUp = wallUp;
};

WallTile.prototype = new PlatformingTile();

/**
 * @return {boolean} True if the tile is a wall for movement towards any direction.
 */
WallTile.prototype.isWall = function() {
    return true;
};

/**
 * @return {boolean} True if the tile is a wall for upwards movement (negative y).
 */
WallTile.prototype.isWallUp = function() {
    return this._wallUp;
};


/**
 * Get a tile map initializer based on an array of character codes representing tiles.
 * @param {Array} data Tile letter codes in an array in row-major form. Example:
 *         ['xxx.      /xxx ',
 *          '  xx^^^^^^xx   '],
 *     Character codes are:
 *         x: wall.
 *         ^: can be jumped through from below, not passable from above.
 *         .: 45 degree slope rising towards left.
 *         /: 45 degree slope rising towards right.
 *         l: low 26 degree slope rising towards left.
 *         L: high 26 degree slope rising towards left.
 *         r: low 26 degree slope rising towards right.
 *         R: high 26 degree slope rising towards right.
 *          : empty space.
 *
 * @param {boolean?} flippedX Set to true to flip the data in the x direction.
 * @return {function} Function that will initialize a TileMap with PlatformingTiles.
 */
PlatformingPhysics.initFromData = function(data, flippedX) {
    if (flippedX === undefined) {
        flippedX = false;
    }
    var transformedData = [];
    for (var i = 0; i < data.length; ++i) {
        var row = data[i];
        var transformedRow = [];
        for (var j = 0; j < row.length; ++j) {
            var tile = null;
            if (row[j] == 'x') {
                tile = new WallTile(true);
            } else if (row[j] == '^') {
                tile = new WallTile(false);
            } else if ((row[j] == '/' && !flippedX) || (row[j] == '.' && flippedX)) {
                tile = new SlopedFloorTile(0, 1);
            } else if ((row[j] == '.' && !flippedX) || (row[j] == '/' && flippedX)) {
                tile = new SlopedFloorTile(1, 0);
            } else if ((row[j] == 'L' && !flippedX) || (row[j] == 'R' && flippedX)) {
                tile = new SlopedFloorTile(1, 0.5);
            } else if ((row[j] == 'R' && !flippedX) || (row[j] == 'L' && flippedX)) {
                tile = new SlopedFloorTile(0.5, 1);
            } else if ((row[j] == 'l' && !flippedX) || (row[j] == 'r' && flippedX)) {
                tile = new SlopedFloorTile(0.5, 0);
            } else if ((row[j] == 'r' && !flippedX) || (row[j] == 'l' && flippedX)) {
                tile = new SlopedFloorTile(0, 0.5);
            } else  {
                tile = new PlatformingTile();
            }
            var x = j;
            if (flippedX) {
                x = row.length - j - 1;
            }
            tile.setPos(x, i);
            transformedRow.push(tile);
        }
        transformedData.push(transformedRow);
    }
    return TileMap.initFromData(transformedData, flippedX);
};


/**
 * Move an object along one axis, reacting to collisions.
 * @param {Object} movingObj Object that moves. Needs to have the following properties in the world coordinate system:
 *   x, y, dx, dy, getCollisionRect()
 * Properties to react to y collisions:
 *   touchGround(), touchCeiling()
 * @param {number} deltaTime Time step to use to move the object.
 * @param {string} dim Either 'x' or 'y' to move the object horizontally or vertically.
 * @param {Array.<PlatformingObject>?} colliders List of objects to collide against. The moved object is
 * automatically excluded in case it is in this array. Colliders must report coordinates relative to the world.
 */
PlatformingPhysics.moveAndCollide = function(movingObj, deltaTime, dim, colliders) {
    var maxStepUp = 0.1;
    var isWall = function(tile) {
        return tile.isWall();
    };
    var isWallUp = function(tile) {
        return tile.isWallUp();
    };
    var isFloorSlope = function(tile) {
        return tile.isFloorSlope();
    };
    var isWallUpOrFloorSlope = function(tile) {
        return tile.isWallUp() || tile.isFloorSlope();
    };
    var done = false;
    var delta = 0;
    if (dim == 'x') {
        delta = movingObj.dx * deltaTime;
    } else {
        delta = movingObj.dy * deltaTime;
    }
    var lastDelta = delta;
    var isMovingObjTileMap = (movingObj instanceof PlatformingTileMap);
    while (!done) {
        var rect = movingObj.getCollisionRect();
        done = true;
        if (dim == 'x') {
            var rectRightHalfWidth = rect.right - movingObj.x;
            var rectLeftHalfWidth = movingObj.x - rect.left;
            var rectBottomHalfHeight = rect.bottom - movingObj.y;

            movingObj.x += delta;
            var xColliders = [];
            if (colliders !== undefined) {
                for (var i = 0; i < colliders.length; ++i) {
                    if (colliders[i] === movingObj) {
                        continue;
                    }
                    // Ensure that the y value from the begining of the frame is used.
                    // This adds a bit of flexibility: for example, some objects that don't themselves collide with
                    // anything can update their positions in a single update function.
                    var colliderRect = colliders[i].getPositionedCollisionRect(colliders[i].x, colliders[i].lastY);
                    if (rect.top < colliderRect.bottom && colliderRect.top < rect.bottom) {
                        xColliders.push(colliders[i]);
                    }
                }
            }
            var slopeFloorY = movingObj.y + rectBottomHalfHeight + TileMap.epsilon * 2;

            var wallXRight = Number.MAX_VALUE;
            var slopeEndXRight = wallXRight;
            var wallXLeft = -Number.MAX_VALUE;
            var slopeEndXLeft = wallXLeft;

            for (var i = 0; i < xColliders.length; ++i) {
                if (xColliders[i] instanceof PlatformingTileMap && (!isMovingObjTileMap || colliders[i].tilesAffectMovingTilemaps)) {
                    var fromWorldToTileMap = new Vec2(-xColliders[i].lastX, -xColliders[i].lastY);
                    var relativeDelta = delta - xColliders[i].frameDeltaX;
                    var relativeRect = new Rect(rect.left, rect.right, rect.top, rect.bottom);
                    relativeRect.translate(fromWorldToTileMap);
                    if (relativeDelta <= 0) {
                        var wallTileX = xColliders[i].tileMap.nearestTileLeftFromRect(relativeRect, isWallUp, Math.abs(relativeDelta));
                        if (wallTileX != -1 && wallXLeft < wallTileX + 1 + xColliders[i].x) {
                            wallXLeft = wallTileX + 1 + xColliders[i].x;
                        }
                        var slopeTiles = xColliders[i].tileMap.getNearestTilesLeftFromRect(relativeRect, isFloorSlope, Math.abs(relativeDelta));
                        if (slopeTiles.length != 0) {
                            var possibleWallX = slopeTiles[0]._x + 1 + xColliders[i].x;
                            for (var j = 0; j < slopeTiles.length; ++j) {
                                var slopeTile = slopeTiles[j];
                                var slopeBaseY = slopeTile._y + 1 + xColliders[i].lastY;
                                var slopeIsEffectivelyWall = (slopeBaseY - slopeTile.getFloorRelativeHeight(1) < rect.bottom - maxStepUp);
                                if (wallXLeft < possibleWallX && slopeIsEffectivelyWall) {
                                    wallXLeft = possibleWallX;
                                }
                                if (!slopeIsEffectivelyWall) {
                                    slopeEndXLeft = slopeTile._x + xColliders[i].x;
                                    var relativeX = movingObj.x - slopeEndXLeft;
                                    var slopeYLeft = slopeBaseY -
                                        slopeTile.getFloorRelativeHeight(relativeX - rectLeftHalfWidth);
                                    if (slopeFloorY > slopeYLeft) {
                                        slopeFloorY = slopeYLeft;
                                    }
                                }
                            }
                        }
                    } else {
                        var wallTileX = xColliders[i].tileMap.nearestTileRightFromRect(relativeRect, isWallUp, Math.abs(relativeDelta));
                        if (wallTileX != -1 && wallXRight > wallTileX + xColliders[i].x) {
                            wallXRight = wallTileX + xColliders[i].x;
                        }
                        var slopeTiles = xColliders[i].tileMap.getNearestTilesRightFromRect(relativeRect, isFloorSlope, Math.abs(relativeDelta));
                        if (slopeTiles.length != 0) {
                            var possibleWallX = slopeTiles[0]._x + xColliders[i].x;
                            for (var j = 0; j < slopeTiles.length; ++j) {
                                var slopeTile = slopeTiles[j];
                                var slopeBaseY = slopeTile._y + 1 + xColliders[i].lastY;
                                var slopeIsEffectivelyWall = (slopeBaseY - slopeTile.getFloorRelativeHeight(0) < rect.bottom - maxStepUp);
                                if (wallXRight > possibleWallX && slopeIsEffectivelyWall) {
                                    wallXRight = possibleWallX;
                                }
                                if (!slopeIsEffectivelyWall) {
                                    slopeEndXRight = slopeTile._x + 1 + xColliders[i].x;
                                    var relativeX = movingObj.x - (slopeEndXRight - 1);
                                    var slopeYRight = slopeBaseY -
                                        slopeTile.getFloorRelativeHeight(relativeX + rectRightHalfWidth);
                                    if (slopeFloorY > slopeYRight) {
                                        slopeFloorY = slopeYRight;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    var colliderLastRect = xColliders[i].getLastCollisionRect();
                    var colliderRect = xColliders[i].getCollisionRect();
                    if (colliderLastRect.right < rect.left && wallXLeft < colliderRect.right) {
                        wallXLeft = colliderRect.right;
                    }
                    if (colliderLastRect.left > rect.right && wallXRight > colliderRect.left) {
                        wallXRight = colliderRect.left;
                    }
                }
            }
            
            if (movingObj.x > slopeEndXRight - rectRightHalfWidth + TileMap.epsilon * 2) {
                var afterOriginalMove = movingObj.x;
                movingObj.x = slopeEndXRight - rectRightHalfWidth + TileMap.epsilon * 2;
                delta = afterOriginalMove - movingObj.x;
                // Finish this iteration on the tile boundary and continue movement on the next slope tile.
                if (delta > TileMap.epsilon * 2 && delta < lastDelta) {
                    done = false;
                    lastDelta = delta;
                }
            }
            if (movingObj.x < slopeEndXLeft + rectLeftHalfWidth - TileMap.epsilon * 2) {
                var afterOriginalMove = movingObj.x;
                movingObj.x = slopeEndXLeft + rectLeftHalfWidth - TileMap.epsilon * 2;
                delta = afterOriginalMove - movingObj.x;
                // Finish this iteration on the tile boundary and continue movement on the next slope tile.
                if (delta < -TileMap.epsilon * 2 && delta > lastDelta) {
                    done = false;
                    lastDelta = delta;
                }
            }
            if (movingObj.y > slopeFloorY - rectBottomHalfHeight - TileMap.epsilon) {
                movingObj.y = slopeFloorY - rectBottomHalfHeight - TileMap.epsilon;
            }
            
            // Apply walls only when movement is done. When moving along a slope, the code may have placed
            // the object right beyond the tile boundary for the next iteration so that movement wouldn't
            // be stuck in cases like below:
            //         /
            //  obj-> /x
            //
            // .
            // x. <- obj
            if (movingObj.x > wallXRight - rectRightHalfWidth - TileMap.epsilon && done) {
                movingObj.x = wallXRight - rectRightHalfWidth - TileMap.epsilon;
            }
            if (movingObj.x < wallXLeft + rectLeftHalfWidth + TileMap.epsilon && done) {
                movingObj.x = wallXLeft + rectLeftHalfWidth + TileMap.epsilon;
            }
        } // dim == 'x'
        if (dim == 'y') {
            var delta = movingObj.dy * deltaTime;
            var rectBottomHalfHeight = rect.bottom - movingObj.y;
            var rectTopHalfHeight = movingObj.y - rect.top;
            var rectRightHalfWidth = rect.right - movingObj.x;
            var rectLeftHalfWidth = movingObj.x - rect.left;

            movingObj.y += delta;
            var yColliders = [];
            if (colliders !== undefined) {
                for (var i = 0; i < colliders.length; ++i) {
                    if (colliders[i] === movingObj) {
                        continue;
                    }
                    var collider = colliders[i].getCollisionRect();
                    if (rect.left < collider.right && collider.left < rect.right) {
                        yColliders.push(colliders[i]);
                    }
                }
            }
            var wallYDown = Number.MAX_VALUE;
            var wallYUp = -Number.MAX_VALUE;
            var wallDownObject = null;
            var wallUpObject = null;
            for (var i = 0; i < yColliders.length; ++i) {
                if (yColliders[i] instanceof PlatformingTileMap && (!isMovingObjTileMap || colliders[i].tilesAffectMovingTilemaps)) {
                    // X movement has already been fully evaluated
                    var fromWorldToTileMap = new Vec2(-yColliders[i].x, -yColliders[i].lastY);
                    var relativeDelta = delta - yColliders[i].frameDeltaY;
                    var relativeRect = new Rect(rect.left, rect.right, rect.top, rect.bottom);
                    relativeRect.translate(fromWorldToTileMap);
                    if (relativeDelta <= 0) {
                        var wallTileY = yColliders[i].tileMap.nearestTileUpFromRect(relativeRect, isWallUpOrFloorSlope, Math.abs(relativeDelta));
                        if (wallTileY != -1 && wallYUp < wallTileY + 1 + yColliders[i].y) {
                            wallYUp = wallTileY + 1 + yColliders[i].y;
                            wallUpObject = yColliders[i];
                        }
                    } else {
                        var floorSearchDistance = Math.max(Math.abs(relativeDelta), movingObj.maxStickToGroundDistance);
                        var origBottom = relativeRect.bottom;
                        relativeRect.bottom += 1;
                        var wallTileY = yColliders[i].tileMap.nearestTileDownFromRect(relativeRect, isWall, floorSearchDistance);
                        if (wallTileY != -1 && wallYDown > wallTileY + yColliders[i].y) {
                            wallYDown = wallTileY + yColliders[i].y;
                            wallDownObject = yColliders[i];
                        }
                        relativeRect.bottom = origBottom;
                        var slopeTiles = yColliders[i].tileMap.getNearestTilesDownFromRect(relativeRect, isFloorSlope,
                                                                                           floorSearchDistance);
                        if (slopeTiles.length != 0 && wallYDown > slopeTiles[0]._y + yColliders[i].y) {
                            for (var j = 0; j < slopeTiles.length; ++j) {
                                var slopeTile = slopeTiles[j];
                                var relativeX = movingObj.x - (slopeTile._x + yColliders[i].x);
                                var slopeBaseY = slopeTile._y + 1 + yColliders[i].y;
                                var slopeYLeft = slopeBaseY -
                                                 slopeTile.getFloorRelativeHeight(relativeX - rectLeftHalfWidth);
                                var slopeYRight = slopeBaseY -
                                                  slopeTile.getFloorRelativeHeight(relativeX + rectRightHalfWidth);
                                if (slopeYLeft < wallYDown) {
                                    wallYDown = slopeYLeft;
                                    wallDownObject = yColliders[i];
                                }
                                if (slopeYRight < wallYDown) {
                                    wallYDown = slopeYRight;
                                    wallDownObject = yColliders[i];
                                }
                            }
                        }
                    }
                } else {
                    var colliderRect = yColliders[i].getCollisionRect();
                    var colliderLastRect = yColliders[i].getLastCollisionRect();
                    if (colliderLastRect.bottom < rect.top && wallYUp < colliderRect.bottom) {
                        wallYUp = colliderRect.bottom;
                        wallUpObject = yColliders[i];
                    }
                    if (colliderLastRect.top > rect.bottom && wallYDown > colliderRect.top) {
                        wallYDown = colliderRect.top;
                        wallDownObject = yColliders[i];
                    }
                }
            }

            if (movingObj.y > wallYDown - rectBottomHalfHeight - TileMap.epsilon) {
                movingObj.y = wallYDown - rectBottomHalfHeight - TileMap.epsilon;
                movingObj._touchGround(wallDownObject);
            } else if (movingObj.lastGroundPlatform === wallDownObject && wallDownObject !== null) {
                var relativeDeltaX = movingObj.frameDeltaX - wallDownObject.frameDeltaX;
                var maxStickToGroundDistance = Math.min(movingObj.maxStickToGroundDistance, Math.abs(relativeDeltaX));
                if (movingObj.y > wallYDown - rectBottomHalfHeight - TileMap.epsilon - maxStickToGroundDistance) {
                    // TODO: There's still a bug where the character teleports downwards when there's a slope like this:
                    // .
                    // xl
                    // Could be solved something like this:
                    /*var relativeDelta = delta - wallDownObject.frameDeltaY;
                    if (PlatformingPhysics.isContinuousFloorSlope(movingObj.lastWallDownX - wallDownObject.lastX,
                                                                  movingObj.lastY + rectBottomHalfHeight - wallDownObject.lastY,
                                                                  wallDownX - wallDownObject.x,
                                                                  wallYDown - wallDownObject.y)) {
                        movingObj.y = wallYDown - rectBottomHalfHeight - TileMap.epsilon;
                        movingObj._touchGround(wallDownObject, wallDownX);
                    }*/
                    movingObj.y = wallYDown - rectBottomHalfHeight - TileMap.epsilon;
                    movingObj._touchGround(wallDownObject);
                }
            }
            if (movingObj.y < wallYUp + rectTopHalfHeight + TileMap.epsilon) {
                movingObj.y = wallYUp + rectTopHalfHeight + TileMap.epsilon;
                movingObj._touchCeiling(wallUpObject);
            }
        }
    }
};

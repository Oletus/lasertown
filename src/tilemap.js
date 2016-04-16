'use strict';

/**
 * Using TileMap requires the Vec2 and Rect classes from util2d.
 */

/**
 * A 2D grid made out of tiles. Tiles can be of any type, but they are strings by default.
 * @constructor
 */
var TileMap = function(options) 
{
    var defaults = {
        width: 1,
        height: 1,
        initTile: function(x, y) { return ' '; }, // Function that returns an initial tile. x and y parameters.
        initEdgeTile: null // Function that returns a tile to fill the edges with. x and y parameters. Optional.
    };
    objectUtil.initWithDefaults(this, defaults, options);
    this.tiles = [];
    var tile;
    for (var y = 0; y < this.height; ++y) {
        var row = [];
        for (var x = 0; x < this.width; ++x) {  
            if (this.initEdgeTile != null && (x == 0 || x == this.width - 1 || y == 0 || y == this.height - 1)) {
                tile = this.initEdgeTile(x, y);
            } else {
                tile = this.initTile(x, y);
            }
            row.push(tile);
        }
        this.tiles.push(row);
    }
};

/**
 * @param {Array} data Tiles in an array in row-major form.
 * @param {boolean?} flippedX Set to true to flip the data in the x direction.
 * @return {function} Function to pass as an init function to TileMap constructor.
 */
TileMap.initFromData = function(data, flippedX) {
    if (flippedX === undefined) {
        flippedX = false;
    }
    if (flippedX) {
        return function(x, y) {
            return data[y][data[y].length - x - 1];
        }
    } else {
        return function(x, y) {
            return data[y][x];
        }
    }
};

/**
 * @param {number} x Horizontal float coordinate
 * @param {number} y Vertical float coordinate
 * @return {Vec2} Integer tile coordinates for the specified tile.
 */
TileMap.prototype.tileAt = function(x, y) {
    var tileX = Math.floor(x);
    var tileY = Math.floor(y);
    return new Vec2(tileX, tileY);
};

/**
 * A function for debug rendering of the tiles. Will fill rectangles at the
 * coordinates of tiles that match.
 * @param {CanvasRenderingContext2D} ctx Context to use.
 * @param {function} matchFunc Gets passed a tile and returns true if the tile should be drawn.
 * @param {number?} extraYTop How much to extend the drawn tiles in the y direction. Defaults to 0.
 * @param {number?} extraYBottom How much to extend the drawn tiles in the y direction. Defaults to 0.
 * @param {number?} extraX How much to extend the drawn tiles in the x direction. Defaults to 0.
 */
TileMap.prototype.render = function(ctx, matchFunc, extraYTop, extraYBottom, extraX) {
    if (extraYTop === undefined) {
        extraYTop = 0;
    }
    if (extraYBottom === undefined) {
        extraYBottom = 0;
    }
    if (extraX === undefined) {
        extraX = 0;
    }
    for (var y = 0; y < this.height; ++y) {
        var matchingTiles = 0;
        var firstMatching = 0;
        for (var x = 0; x < this.width; ++x) {
            var tile = this.tiles[y][x];
            var matching = matchFunc(tile);
            if (matching) {
                if (matchingTiles == 0) {
                    firstMatching = x;
                }
                matchingTiles++;
            }
            if ((!matching || x + 1 >= this.width) && matchingTiles > 0) {
                ctx.fillRect(firstMatching - extraX, y - extraYTop,
                             matchingTiles + extraX * 2, 1.0 + extraYTop + extraYBottom);
            }
            if (!matching) {
                matchingTiles = 0;
            }
        }
    }
};

TileMap.epsilon = 0.00001;

/**
 * @param {Vec2} tileMin Integer coordinates for top left corner of the area.
 * @param {Vec2} tileMax Integer coordinates for bottom right corner of the area.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @return {boolean} True if there are matching tiles within the area limited by tileMin and tileMax
 * Coordinates are inclusive.
 */
TileMap.prototype.isTileInArea = function(tileMin, tileMax, matchFunc) {
    for (var y = tileMin.y; y <= tileMax.y; ++y) {
        if (y < 0) {
            y = -1;
            continue;
        }
        if (y >= this.height) {
            continue;
        }
        for (var x = tileMin.x; x <= tileMax.x; ++x) {
            if (x < 0) {
                x = -1;
                continue;
            }
            if (x >= this.width) {
                break;
            }
            if (matchFunc(this.tiles[y][x])) {
                return true;
            }
        }
    }    
    return false;
};

/**
 * @param {Vec2} tileMin Integer coordinates for top left corner of the area.
 * @param {Vec2} tileMax Integer coordinates for bottom right corner of the area.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @return {Array.<Object>} Matching tiles within the area limited by tileMin and tileMax
 * Coordinates are inclusive.
 */
TileMap.prototype.getTilesInArea = function(tileMin, tileMax, matchFunc) {
    var tiles = [];
    for (var y = tileMin.y; y <= tileMax.y; ++y) {
        if (y < 0) {
            y = -1;
            continue;
        }
        if (y >= this.height) {
            continue;
        }
        for (var x = tileMin.x; x <= tileMax.x; ++x) {
            if (x < 0) {
                x = -1;
                continue;
            }
            if (x >= this.width) {
                break;
            }
            if (matchFunc(this.tiles[y][x])) {
                tiles.push(this.tiles[y][x]);
            }
        }
    }    
    return tiles;
};

/**
 * @param {Rect} rect Rect to test.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @param {number} maxDistance How far from the rect to extend the search.
 * @return {number} x X coordinate of the matching tile, or -1 if no match found.
 */
TileMap.prototype.nearestTileLeftFromRect = function(rect, matchFunc, maxDistance) {
    var epsilon = TileMap.epsilon;
    var tileMin = this.tileAt(rect.left + epsilon, rect.top + epsilon);
    var tileMax = this.tileAt(rect.left + epsilon, rect.bottom - epsilon);
    var match = false;
    var minX = Math.floor(rect.left - maxDistance);
    while (!match && tileMin.x >= 0 && tileMin.x >= minX) {
        // Test one column of tiles
        match = this.isTileInArea(tileMin, tileMax, matchFunc);
        if (!match) {
            --tileMin.x;
            --tileMax.x;
        }
    }
    return match ? tileMin.x : -1;
};

/**
 * @param {Rect} rect Rect to test.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @param {number} maxDistance How far from the rect to extend the search.
 * @return {number} x X coordinate of the matching tile, or -1 if no match found.
 */
TileMap.prototype.nearestTileRightFromRect = function(rect, matchFunc, maxDistance) {
    var epsilon = TileMap.epsilon;
    var tileMin = this.tileAt(rect.right - epsilon, rect.top + epsilon);
    var tileMax = this.tileAt(rect.right - epsilon, rect.bottom - epsilon);
    var match = false;
    var maxX = Math.floor(rect.right + maxDistance);
    while (!match && tileMin.x < this.width && tileMax.x <= maxX) {
        // Test one column of tiles
        match = this.isTileInArea(tileMin, tileMax, matchFunc);
        if (!match) {
            ++tileMin.x;
            ++tileMax.x;
        }
    }
    return match ? tileMin.x : -1;
};

/**
 * @param {Rect} rect Rect to test.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @param {number} maxDistance How far from the rect to extend the search.
 * @return {number} y Y coordinate of the matching tile, or -1 if no match found.
 */
TileMap.prototype.nearestTileUpFromRect = function(rect, matchFunc, maxDistance) {
    var epsilon = TileMap.epsilon;
    var tileMin = this.tileAt(rect.left + epsilon, rect.top + epsilon);
    var tileMax = this.tileAt(rect.right - epsilon, rect.top + epsilon);
    var match = false;
    var minY = Math.floor(rect.top - maxDistance);
    while (!match && tileMin.y >= 0 && tileMin.y >= minY) {
        // Test one row of tiles
        match = this.isTileInArea(tileMin, tileMax, matchFunc);
        if (!match) {
            --tileMin.y;
            --tileMax.y;
        }
    }
    return match ? tileMin.y : -1;
};

/**
 * @param {Rect} rect Rect to test.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @param {number} maxDistance How far from the rect to extend the search.
 * @return {number} y Y coordinate of the matching tile, or -1 if no match found.
 */
TileMap.prototype.nearestTileDownFromRect = function(rect, matchFunc, maxDistance) {
    var epsilon = TileMap.epsilon;
    var tileMin = this.tileAt(rect.left + epsilon, rect.bottom - epsilon);
    var tileMax = this.tileAt(rect.right - epsilon, rect.bottom - epsilon);
    var match = false;
    var maxY = Math.floor(rect.bottom + maxDistance);
    while (!match && tileMin.y < this.height && tileMax.y <= maxY) {
        // Test one row of tiles
        match = this.isTileInArea(tileMin, tileMax, matchFunc);
        if (!match) {
            ++tileMin.y;
            ++tileMax.y;
        }
    }
    return match ? tileMin.y : -1;
};


/**
 * @param {Rect} rect Rect to test.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @param {number} maxDistance How far from the rect to extend the search.
 * @return {Array.<Object>} Nearest matching tiles. May be empty if none are found.
 */
TileMap.prototype.getNearestTilesLeftFromRect = function(rect, matchFunc, maxDistance) {
    var epsilon = TileMap.epsilon;
    var tileMin = this.tileAt(rect.left + epsilon, rect.top + epsilon);
    var tileMax = this.tileAt(rect.left + epsilon, rect.bottom - epsilon);
    var tiles = [];
    var minX = Math.floor(rect.left - maxDistance);
    while (tiles.length == 0 && tileMin.x >= 0 && tileMin.x >= minX) {
        // Test one column of tiles
        tiles = this.getTilesInArea(tileMin, tileMax, matchFunc);
        --tileMin.x;
        --tileMax.x;
    }
    return tiles;
};

/**
 * @param {Rect} rect Rect to test.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @param {number} maxDistance How far from the rect to extend the search.
 * @return {Array.<Object>} Nearest matching tiles. May be empty if none are found.
 */
TileMap.prototype.getNearestTilesRightFromRect = function(rect, matchFunc, maxDistance) {
    var epsilon = TileMap.epsilon;
    var tileMin = this.tileAt(rect.right - epsilon, rect.top + epsilon);
    var tileMax = this.tileAt(rect.right - epsilon, rect.bottom - epsilon);
    var tiles = [];
    var maxX = Math.floor(rect.right + maxDistance);
    while (tiles.length == 0 && tileMin.x < this.width && tileMax.x <= maxX) {
        // Test one column of tiles
        tiles = this.getTilesInArea(tileMin, tileMax, matchFunc);
        ++tileMin.x;
        ++tileMax.x;
    }
    return tiles;
};

/**
 * @param {Rect} rect Rect to test.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @param {number} maxDistance How far from the rect to extend the search.
 * @return {Array.<Object>} Nearest matching tiles. May be empty if none are found.
 */
TileMap.prototype.getNearestTilesUpFromRect = function(rect, matchFunc, maxDistance) {
    var epsilon = TileMap.epsilon;
    var tileMin = this.tileAt(rect.left + epsilon, rect.top + epsilon);
    var tileMax = this.tileAt(rect.right - epsilon, rect.top + epsilon);
    var tiles = [];
    var minY = Math.floor(rect.top - maxDistance);
    while (tiles.length == 0 && tileMin.y >= 0 && tileMin.y >= minY) {
        // Test one row of tiles
        tiles = this.getTilesInArea(tileMin, tileMax, matchFunc);
        --tileMin.y;
        --tileMax.y;
    }
    return tiles;
};

/**
 * @param {Rect} rect Rect to test.
 * @param {function} matchFunc Gets passed a tile and returns true if it matches.
 * @param {number} maxDistance How far from the rect to extend the search.
 * @return {Array.<Object>} Nearest matching tiles. May be empty if none are found.
 */
TileMap.prototype.getNearestTilesDownFromRect = function(rect, matchFunc, maxDistance) {
    var epsilon = TileMap.epsilon;
    var tileMin = this.tileAt(rect.left + epsilon, rect.bottom - epsilon);
    var tileMax = this.tileAt(rect.right - epsilon, rect.bottom - epsilon);
    var tiles = [];
    var maxY = Math.floor(rect.bottom + maxDistance);
    while (tiles.length == 0 && tileMin.y < this.height && tileMax.y <= maxY) {
        // Test one row of tiles
        tiles = this.getTilesInArea(tileMin, tileMax, matchFunc);
        ++tileMin.y;
        ++tileMax.y;
    }
    return tiles;
};


/**
 * @return {boolean} True if matching tiles overlap the given rectangle.
 */
TileMap.prototype.overlapsTiles = function(rect, matchFunc) {
    var epsilon = TileMap.epsilon;
    var tile = this.tileAt(rect.left + epsilon, rect.top + epsilon);
    var tileMax = this.tileAt(rect.right - epsilon, rect.bottom - epsilon);
    return this.isTileInArea(tile, tileMax, matchFunc);
};

/**
 * @return {Rect} tileMap rect representing the size of the tilemap.
 */
TileMap.prototype.getRect = function() {
    return new Rect(0.0, this.width, 0.0, this.height);
};

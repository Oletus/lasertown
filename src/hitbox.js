/*
 * Copyright Olli Etuaho 2015.
 */

'use strict';

/**
 * Requires Rect, Vec2 and mathUtil from util2d.js.
 */

/**
 * A class to store a hit box that can be hit tested against other hit boxes.
 * It's called a box but can also represent other geometry.
 * @constructor
 */
var HitBox = function() {
};

/**
 * Possible hitbox shapes
 * @enum {number}
 */
HitBox.Shape = {
    VEC2: 0,
    RECT: 1,
    CIRCLE: 2,
    SEGMENT: 3,
    COMBO: 4
};

/**
 * @param {Vec2} pos Position to set.
 */
HitBox.prototype.setVec2 = function(pos) {
    this._shape = HitBox.Shape.VEC2;
    this._pos = pos;
};

/**
 * @param {Rect} rect Rect to set.
 */
HitBox.prototype.setRect = function(rect) {
    this._shape = HitBox.Shape.RECT;
    this.rect = rect;
};

/**
 * @param {Vec2} center Center of the circle to set.
 * @param {number} radius Radius of the circle.
 */
HitBox.prototype.setCircle = function(center, radius) {
    this._shape = HitBox.Shape.CIRCLE;
    this._center = center;
    this._radius = radius;
};

/**
 * Set the hitbox to a circle segment smaller than 180 degrees.
 * @param {Vec2} center Center of the circle.
 * @param {number} radius Radius of the circle.
 * @param {number} angle1 Angle of one endpoint of the segment in radians.
 * @param {number} angle2 Angle of another endpoint of the segment in radians.
 */
HitBox.prototype.setSegment = function(center, radius, angle1, angle2) {
    this._shape = HitBox.Shape.SEGMENT;
    this._center = center;
    this._radius = radius;
    this._angle1 = mathUtil.fmod(angle1, Math.PI * 2);
    this._angle2 = mathUtil.fmod(angle2, Math.PI * 2);
    if (this._angle1 > this._angle2) {
        var swapped = this._angle2;
        this._angle2 = this._angle1;
        this._angle1 = swapped;
    }
    if (this._angle2 - this._angle1 > Math.PI) {
        var swapped = this._angle2;
        this._angle2 = this._angle1 + Math.PI * 2;
        this._angle1 = swapped;
    }
    var endPoint1 = new Vec2(this._center.x + Math.cos(this._angle1) * this._radius,
                             this._center.y + Math.sin(this._angle1) * this._radius);
    var endPoint2 = new Vec2(this._center.x + Math.cos(this._angle2) * this._radius,
                             this._center.y + Math.sin(this._angle2) * this._radius);
    this._lineSegmentCenter = new Vec2((endPoint1.x + endPoint2.x) * 0.5,
                                       (endPoint1.y + endPoint2.y) * 0.5);

    // Solve bounding rectangle (not axis aligned)
    var towardsSegCenter = new Vec2(this._lineSegmentCenter.x - this._center.x,
                                    this._lineSegmentCenter.y - this._center.y);
    var dist = towardsSegCenter.length();
    towardsSegCenter.normalize();
    towardsSegCenter.scale(this._radius - dist);
    var enclosingPoint1 = new Vec2(endPoint1.x, endPoint1.y);
    enclosingPoint1.translate(towardsSegCenter);
    var enclosingPoint2 = new Vec2(endPoint2.x, endPoint2.y);
    enclosingPoint2.translate(towardsSegCenter);
    this._boundingPolygon = new Polygon([endPoint1, endPoint2, enclosingPoint2, enclosingPoint1]);
};

/**
 * Set this hitBox to a combination (union) of multiple hitboxes.
 * @param {Array.<HitBox>} hitBoxes Collection to set.
 */
HitBox.prototype.setCombination = function(hitBoxes) {
    this._shape = HitBox.Shape.COMBO;
    this.hitBoxes = hitBoxes;
};

/**
 * @param {Object} target Arbitrary object that this hitbox has hit.
 * @return {Object} Get payload carried by this hitbox. Could be replaced by inheriting object.
 */
HitBox.prototype.getPayload = function(target) {
    return 1;
};

/**
 * @param {HitBox} other Hitbox to test.
 * @return {boolean} True if this hitbox intersects the other one.
 */
HitBox.prototype.intersects = function(other) {
    if (this._shape === HitBox.Shape.COMBO) {
        for (var i = 0; i < this.hitBoxes.length; ++i) {
            if (this.hitBoxes[i].intersects(other)) {
                return true;
            }
        }
        return false;
    }
    if (other._shape === HitBox.Shape.COMBO) {
        return other.intersects(this);
    }
    var that = this;
    if (other._shape < that._shape) {
        that = other;
        other = this;
    }
    if (that._shape === HitBox.Shape.VEC2) {
        if (other._shape === HitBox.Shape.VEC2) {
            return that._shape.x === other._shape.x && that._shape.y === other._shape.y;
        } else if (other._shape === HitBox.Shape.RECT) {
            return other.rect.containsVec2(that._pos);
        } else if (other._shape === HitBox.Shape.CIRCLE) {
            return other._center.distance(that._pos) < other._radius;
        } else if (other._shape === HitBox.Shape.SEGMENT) {
            // Test against circle
            var dist = other._center.distance(that._pos);
            if (dist > other._radius) {
                return false;
            }
            // Test if the point projected to the normal of the segment edge is closer to circle center than the
            // segment edge.
            var segmentCenterAngle = mathUtil.mixAngles(other._angle1, other._angle2, 0.5);
            var pointAngle = Math.atan2(that._pos.y - other._center.y, that._pos.x - other._center.x);
            pointAngle = mathUtil.angleDifference(pointAngle, segmentCenterAngle);
            var distAlongSegmentNormal = Math.cos(pointAngle) * dist;
            return distAlongSegmentNormal > other._lineSegmentCenter.distance(other._center);
        } /*else if (other._shape === HitBox.Shape.SECTOR) { // TODO
            var dist = other._center.distance(that._pos);
            if (dist > other._radius) {
                return false;
            }
            // Test against sector
            var pointAngle = Math.atan2(that._pos.y - other._center.y, that._pos.x - other._center.x);
            if (mathUtil.angleGreater(pointAngle, other._angle2) || mathUtil.angleGreater(other._angle1, pointAngle)) {
                return false;
            }
        }*/
    } else if (that._shape === HitBox.Shape.RECT) {
        if (other._shape === HitBox.Shape.RECT) {
            return other.rect.intersectsRect(that.rect);
        } else if (other._shape === HitBox.Shape.CIRCLE) {
            return that.rect.intersectsCircle(other._center, other._radius);
        } else if (other._shape === HitBox.Shape.SEGMENT) {
            if (!that.rect.intersectsCircle(other._center, other._radius)) {
                return false;
            }
            return other._boundingPolygon.intersectsRect(that.rect);
        }
    } else if (that._shape === HitBox.Shape.CIRCLE) {
        if (other._shape === HitBox.Shape.CIRCLE) {
            return other._center.distance(that._center) < other._radius + that._radius;
        } else if (other._shape === HitBox.Shape.SEGMENT) {
            if (other._center.distance(that._center) >= other._radius + that._radius) {
                return false;
            }
            return other._boundingPolygon.intersectsCircle(that._center, that._radius);
        }
    } else if (that._shape === HitBox.Shape.SEGMENT) {
        if (other._shape === HitBox.Shape.SEGMENT) {
            if (other._center.distance(that._center) >= other._radius + that._radius) {
                return false;
            }
            if (!other._boundingPolygon.intersectsCircle(that._center, that._radius)) {
                return false;
            }
            return that._boundingPolygon.intersectsCircle(other._center, other._radius);
        }
    }
};

/**
 * @return {Vec2} The center point of this hitBox
 */
HitBox.prototype.getCenter = function() {
    if (this._shape === HitBox.Shape.VEC2) {
        return this._pos;
    } else if (this._shape === HitBox.Shape.RECT) {
        return this.rect.getCenter();
    } else if (this._shape === HitBox.Shape.CIRCLE) {
        return this._center;
    } else if (this._shape === HitBox.Shape.SEGMENT) {
        return this._lineSegmentCenter;
    } else if (this._shape === HitBox.Shape.COMBO) {
        var center = new Vec2(0, 0);
        for (var i = 0; i < this.hitBoxes.length; ++i) {
            var subCenter = this.hitBoxes[i].getCenter();
            center.translate(subCenter);
        }
        center.scale(1 / this.hitBoxes.length);
        return center;
    }
};

/**
 * Render this hitbox on a canvas for debugging. Uses current fillStyle.
 * @param {CanvasRenderingContext2D} ctx Canvas to draw to.
 * @param {number?} pointScale Scale to draw points at. Defaults to 1.
 */
HitBox.prototype.render = function(ctx, pointScale) {
    if (pointScale === undefined) {
        pointScale = 1;
    }
    if (this._shape === HitBox.Shape.VEC2) {
        var pos = this._pos;
        ctx.fillRect(pos.x - pointScale * 0.5, pos.y - pointScale * 0.5, pointScale, pointScale);
    } else if (this._shape === HitBox.Shape.RECT) {
        ctx.fillRect(this.rect.left, this.rect.top, this.rect.width(), this.rect.height());
    } else if (this._shape === HitBox.Shape.CIRCLE) {
        ctx.beginPath();
        ctx.arc(this._center.x, this._center.y, this._radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (this._shape === HitBox.Shape.SEGMENT) {
        ctx.beginPath();
        ctx.arc(this._center.x, this._center.y, this._radius, this._angle1, this._angle2);
        ctx.fill();
    } else if (this._shape === HitBox.Shape.COMBO) {
        for (var i = 0; i < this.hitBoxes.length; ++i) {
            this.hitBoxes[i].render(ctx, pointScale);
        }
    }
};

'use strict';

// Requires util2d.js

/**
 * Class for rendering and interacting with UI elements on a canvas.
 * @constructor
 */
var CanvasUI = function(options) {
    var defaults = {
        element: null,
        getCanvasPositionFromEvent: null
    };
    for(var key in defaults) {
        if (!options.hasOwnProperty(key)) {
            this[key] = defaults[key];
        } else {
            this[key] = options[key];
        }
    }
    this.clear();
    
    if (this.element !== null && this.getCanvasPositionFromEvent !== null) {
        var that = this;
        this.element.addEventListener('mousemove', function(event) {
            that.setCursorPosition(that.getCanvasPositionFromEvent(event));
        });
        this.element.addEventListener('touchmove', function(event) {
            that.setCursorPosition(that.getCanvasPositionFromEvent(event));
            event.preventDefault();
        });
        this.element.addEventListener('mousedown', function(event) {
            that.down(that.getCanvasPositionFromEvent(event));
        });
        this.element.addEventListener('touchstart', function(event) {
            that.down(that.getCanvasPositionFromEvent(event));
            event.preventDefault();
        });
        this.element.addEventListener('mouseup', function(event) {
            that.release(that.getCanvasPositionFromEvent(event));
        });
        this.element.addEventListener('touchend', function(event) {
            that.release(undefined);
            event.preventDefault();
        });
    }
};

/**
 * Update UI element state and animations.
 * @param {number} deltaTime Time passed since the last update in seconds.
 */
CanvasUI.prototype.update = function(deltaTime) {
    for (var i = 0; i < this.uiElements.length; ++i) {
        this.uiElements[i].update(deltaTime);
    }
};

/**
 * Render the UI.
 * @param {CanvasRenderingContext2D} ctx The canvas rendering context to use.
 */
CanvasUI.prototype.render = function(ctx) {
    var draggedElements = [];
    var i;
    for (i = 0; i < this.uiElements.length; ++i) {
        if (!this.uiElements[i].dragged) {
            this.uiElements[i].render(ctx, this.cursorX, this.cursorY);
        } else {
            draggedElements.push(this.uiElements[i]);
        }
    }
    for (i = 0; i < draggedElements.length; ++i) {
        draggedElements[i].render(ctx, this.cursorX, this.cursorY);
    }
};

/**
 * Clear the UI from all elements.
 */
CanvasUI.prototype.clear = function() {
    this.uiElements = [];
    this.cursorX = 0;
    this.cursorY = 0;
    this.downButton = null;
};

/**
 * Set the cursor position.
 * @param {Object|Vec2} vec New position to set. Needs to have x and y coordinates. Relative to the canvas coordinate
 * space.
 */
CanvasUI.prototype.setCursorPosition = function(vec) {
    this.cursorX = vec.x;
    this.cursorY = vec.y;
    if (this.downButton !== null && this.downButton.draggable) {
        this.downButton.draggedX = this.downButton.centerX + (this.cursorX - this.dragStartX);
        this.downButton.draggedY = this.downButton.centerY + (this.cursorY - this.dragStartY);
    }
};

/**
 * Handle a mouse / touch down event.
 * @param {Object|Vec2} vec New position to set. Needs to have x and y coordinates. Relative to the canvas coordinate
 * space.
 */
CanvasUI.prototype.down = function(vec) {
    this.setCursorPosition(vec);
    for (var i = 0; i < this.uiElements.length; ++i) {
        if (this.uiElements[i].active && this.uiElements[i].hitTest(this.cursorX, this.cursorY)) {
            this.downButton = this.uiElements[i];
            this.downButton.down();
            if (this.uiElements[i].draggable) {
                this.downButton.dragged = true;
                this.dragStartX = this.cursorX;
                this.dragStartY = this.cursorY;
            }
        }
    }
    this.setCursorPosition(vec);
};

/**
 * Handle a mouse / touch up event.
 * @param {Object|Vec2=} vec New position to set. Needs to have x and y coordinates. Relative to the canvas coordinate
 * space. May be undefined, in which case the last known position will be used to evaluate the effects.
 */
CanvasUI.prototype.release = function(vec) {
    if (vec !== undefined) {
        this.setCursorPosition(vec);
    }
    if (this.downButton !== null) {
        var clicked = false;
        for (var i = 0; i < this.uiElements.length; ++i) {
            if (this.uiElements[i].active && this.uiElements[i].hitTest(this.cursorX, this.cursorY)) {
                if (this.downButton === this.uiElements[i]) {
                    clicked = true;
                } else if (this.uiElements[i].dragTargetCallback !== null && this.downButton.dragged) {
                    this.uiElements[i].dragTargetCallback(this.downButton.draggedObjectFunc());
                }
            }
        }
        this.downButton.release(clicked);
        this.downButton.dragged = false;
        this.downButton = null;
    }
    console.log(this.cursorX, this.cursorY);
};

CanvasUI.prototype.addElement = function(element) {
    this.uiElements.push(element);
};

/**
 * The default font for UI elements.
 */
CanvasUI.defaultFont = 'sans-serif';

/**
 * Minimum interval between clicks on the same button in seconds.
 */
CanvasUI.minimumClickInterval = 0.5;

/**
 * A single UI element to draw on a canvas, typically either a button or a label.
 * Will be rendered with text by default, but can also be drawn with a custom rendering function renderFunc.
 * @constructor
 */
var CanvasUIElement = function(options) {
    var defaults = {
        label: 'Button',
        labelFunc: null, // Function that returns the current text to draw on the element. Overrides label if set.
        renderFunc: null,
        centerX: 0,
        centerY: 0,
        width: 100,
        height: 50,
        clickCallback: null,
        dragTargetCallback: null, // Called when something is dragged onto this object, with the dragged object as parameter.
        draggedObjectFunc: null,
        active: true, // Active elements are visible and can be interacted with. Inactive elements can't be interacted with.
        draggable: false,
        fontSize: 20, // In pixels
        font: CanvasUI.defaultFont,
        appearance: undefined // One of CanvasUIElement.Appearance. By default the appearance is determined based on callbacks.
    };
    for(var key in defaults) {
        if (!options.hasOwnProperty(key)) {
            this[key] = defaults[key];
        } else {
            this[key] = options[key];
        }
    }
    this.draggedX = this.centerX;
    this.draggedY = this.centerY;
    this.dragged = false;
    this.time = 0.5;
    this.isDown = false;
    this.lastClick = 0;
    if (this.appearance === undefined) {
        if (this.clickCallback !== null) {
            this.appearance = CanvasUIElement.Appearance.BUTTON;
        } else {
            this.appearance = CanvasUIElement.Appearance.LABEL;
        }
    }
};

CanvasUIElement.Appearance = {
    BUTTON: 0,
    LABEL: 1
};

/**
 * Update UI element state and animations.
 * @param {number} deltaTime Time passed since the last update in seconds.
 */
CanvasUIElement.prototype.update = function(deltaTime) {
    this.time += deltaTime;
};

/**
 * Render the element. Will call renderFunc if it is defined.
 * @param {CanvasRenderingContext2D} ctx Context to render to.
 * @param {number} cursorX Cursor horizontal coordinate in the canvas coordinate system.
 * @param {number} cursorY Cursor vertical coordinate in the canvas coordinate system.
 */
CanvasUIElement.prototype.render = function(ctx, cursorX, cursorY) {
    if (!this.active) {
        return;
    }
    var pressedExtent = this.isDown ? (this.time - this.lastDownTime) * 8.0 : 1.0 - (this.time - this.lastUpTime) * 3.0;
    pressedExtent = mathUtil.clamp(0, 1, pressedExtent);
    var cursorOn = this.hitTest(cursorX, cursorY);

    if (this.renderFunc !== null) {
        this.renderFunc(ctx, this, cursorOn, pressedExtent);
        return;
    }

    if (this.appearance === CanvasUIElement.Appearance.BUTTON) {
        var rect = this.getRect();
        ctx.fillStyle = '#000';
        if (pressedExtent > 0) {
            ctx.globalAlpha = 1.0 - pressedExtent * 0.2;
        } else if (cursorOn) {
            ctx.globalAlpha = 1.0;
        } else {
            ctx.globalAlpha = 0.5;
        }
        ctx.fillRect(rect.left, rect.top, rect.width(), rect.height());
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        if (!this.canClick()) {
            ctx.globalAlpha *= 0.6;
        }
        ctx.strokeRect(rect.left, rect.top, rect.width(), rect.height());
    }
    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = this.fontSize + 'px ' + this.font;
    var label = this.label;
    if (this.labelFunc) {
        label = this.labelFunc();
    }
    ctx.fillText(label, this.centerX, this.centerY + 7);
};

/**
 * @return {number} The horizontal position to draw the element at. May be different from the logical position if the
 * element is being dragged.
 */
CanvasUIElement.prototype.visualX = function() {
    if (this.dragged) {
        return this.draggedX;
    } else {
        return this.centerX;
    }
};

/**
 * @return {number} The vertical position to draw the element at. May be different from the logical position if the
 * element is being dragged.
 */
CanvasUIElement.prototype.visualY = function() {
    if (this.dragged) {
        return this.draggedY;
    } else {
        return this.centerY;
    }
};

/**
 * @return {boolean} True when the element is being dragged.
 */
CanvasUIElement.prototype.isDragged = function() {
    return this.dragged;
};

/**
 * @param {number} x Horizontal coordinate to test.
 * @param {number} y Vertical coordinate to test.
 * @return {boolean} Whether the coordinate is within the area of the element.
 */
CanvasUIElement.prototype.hitTest = function(x, y) {
    if (this.clickCallback !== null) {
        return this.getRect().containsVec2(new Vec2(x, y));
    }
    return false;
};

/**
 * @return boolean True if the element can generate click events right now. False if the click cooldown hasn't
 * completed.
 */
CanvasUIElement.prototype.canClick = function() {
    var sinceClicked = this.time - this.lastClick;
    return sinceClicked >= CanvasUI.minimumClickInterval;
};

CanvasUIElement.prototype.getRect = function() {
    return new Rect(
        this.centerX - this.width * 0.5,
        this.centerX + this.width * 0.5,
        this.centerY - this.height * 0.5,
        this.centerY + this.height * 0.5
    );
};

/**
 * Mark the element as down, for visual purposes only.
 */
CanvasUIElement.prototype.down = function() {
    this.isDown = true;
    this.lastDownTime = this.time;
};

/**
 * Mark the element as up. Will generate a click event if clicked is true.
 * @param {boolean} clicked True when clicked, false when the cursor position has left the area of the element.
 */
CanvasUIElement.prototype.release = function(clicked) {
    this.isDown = false;
    this.lastUpTime = this.time;
    if (!clicked || !this.canClick()) {
        return;
    }
    this.lastClick = this.time;
    if (this.clickCallback !== null) {
        this.clickCallback();
    }
};

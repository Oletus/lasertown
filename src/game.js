'use strict';

var _parsedSpec;

var parseSpec = function(spec) {
    // TODO: Get rid of this eval().
    eval("_parsedSpec = " + spec + ";");
    return _parsedSpec;
};

var Game = function(resizer, renderer) {
    this.resizer = resizer;
    this.renderer = renderer;
    this.renderer.setClearColor( 0x888888, 1);
    
    this.time = 0;

    var numPlayers = 1;
    this.input = new InputMapper(this, numPlayers);
    //this.input.addListener(Gamepad.BUTTONS.UP_OR_ANALOG_UP, ['up', 'w'], this.upPress/*, this.upRelease*/);
    //this.input.addListener(Gamepad.BUTTONS.DOWN_OR_ANALOG_DOWN, ['down', 's'], this.downPress/*, this.downRelease*/);
    
    if (DEV_MODE) {
        this.input.addListener(undefined, ['a'], this.aPress);
        this.input.addListener(undefined, ['z'], this.zPress);
        this.input.addListener(undefined, ['x'], this.xPress);
        this.input.addListener(undefined, ['c'], this.cPress);
        this.input.addListener(undefined, ['o'], this.oPress);
        this.input.addListener(undefined, ['k'], this.kPress);
        this.input.addListener(undefined, ['m'], this.mPress);
        this.input.addListener(undefined, ['p'], this.pPress);
        this.input.addListener(undefined, ['q'], this.qPress);
        this.input.addListener(undefined, ['ctrl+s'], this.ctrlsPress);
        this.input.addListener(undefined, ['ctrl+n'], this.nextLevelCycle);
    }
    
    this.levelNumber = 0;
    
    var that = this;
    var initLevel = function() {
        var levelId = levelData.levelSequence[that.levelNumber];
        that.loadLevel(levelId);
    };
    utilTHREE.onAllLoaded(initLevel);
};

Game.prototype.zPress = function() {
    this.level.editor.zPress();
};
Game.prototype.aPress = function() {
    this.level.editor.aPress();
};
Game.prototype.oPress = function() {
    this.level.editor.oPress();
};
Game.prototype.kPress = function() {
    this.level.editor.kPress();
};
Game.prototype.mPress = function() {
    this.level.editor.mPress();
};
Game.prototype.pPress = function() {
    this.level.editor.pPress();
};
Game.prototype.cPress = function() {
    this.level.editor.cPress();
};
Game.prototype.xPress = function() {
    this.level.editor.xPress();
};
Game.prototype.qPress = function() {
    this.level.editor.qPress();
};
Game.prototype.ctrlsPress = function() {
    this.level.editor.ctrlsPress();
};

Game.prototype.mouseMove = function(event) {
    if (this.level) {
        this.level.setCursorPosition(this.viewportPos(event));
    }
};

Game.prototype.mouseDown = function(event) {
    if (this.level) {
        this.level.setCursorPosition(this.viewportPos(event));
        this.level.mouseDown();
    }
};

Game.prototype.mouseUp = function(event) {
    if (this.level) {
        this.level.setCursorPosition(this.viewportPos(event));
        this.level.mouseUp();
    }
};

Game.prototype.viewportPos = function(event) {
    var canvasPos = this.resizer.getCanvasPosition(event);
    canvasPos.x = 2 * canvasPos.x / this.resizer.canvas.width - 1;
    canvasPos.y = 1 - 2 * canvasPos.y / this.resizer.canvas.height;
    return new THREE.Vector3(canvasPos.x, canvasPos.y, 0);
};

Game.prototype.setCameraAspect = function(aspect) {
    if (this.level) {
        this.level.camera.aspect = aspect;
        this.level.camera.updateProjectionMatrix();
    }
};

Game.prototype.render = function() {
    if (this.level) {
        var fadeOpacity = 0.0; // Conceptually opacity of black fader over the game
        if (this.level.state.id === Level.State.INTRO) {
            fadeOpacity = 1.0 - this.level.state.time;
        } else if (this.level.state.id === Level.State.SUCCESS && this.level.successState.id === Level.SuccessState.FADE_OUT) {
            fadeOpacity = this.level.successState.time;
        }
        this.resizer.canvas.style.opacity = mathUtil.clamp(0.0, 1.0, 1.0 - fadeOpacity);
        this.level.render(this.renderer);
    }
};

Game.prototype.update = function(deltaTime) {
    this.time += deltaTime;
    this.input.update();

    if (this.level) {
        this.level.update(deltaTime);
        if (this.level.state.id === Level.State.SUCCESS &&
            this.level.successState.id === Level.SuccessState.FADE_OUT &&
            this.level.successState.time > 1.0 && 
            !this.level.editor)
        {
            this.nextLevel();
        }
    }
    
    Audio.muteAll(Game.parameters.get('muteAudio'));
};

Game.prototype.loadLevel = function(id) {
    var options = {
        cameraAspect: this.resizer.canvas.width / this.resizer.canvas.height
    };
    this.level = Level.fromSpec(options, levelData.data[id]);
};

Game.prototype.nextLevel = function() {
    ++this.levelNumber;
    if (this.levelNumber < levelData.levelSequence.length) {
        this.loadLevel(levelData.levelSequence[this.levelNumber]);
    }
};

// For dev mode
Game.prototype.nextLevelCycle = function() {
    if (this.levelNumber >= levelData.levelSequence.length - 1) {
        this.levelNumber = -1;
    }
    this.nextLevel();
};

// Parameters added here can be tuned at run time when in developer mode
Game.parameters = new GameParameters({
    'roundedMovement': {initial: true},
    'buildingSpringStrength': {initial: 0.1, min: 0.01, max: 0.2},
    'buildingSpringDamping': {initial: 0.77, min: 0.5, max: 0.95},
    'muteAudio': {initial: false}
});

var DEV_MODE = (window.location.href.indexOf("?devMode") != -1);

window['start'] = function() {
    var DEBUG_MAIN_LOOP = DEV_MODE && true; // Set to true to allow fast-forwarding main loop with 'f'
    Game.parameters.set('muteAudio', (DEV_MODE && true)); // Set to true if sounds annoy developers
    if (DEV_MODE) {
        Game.parameters.initGUI();
    }

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    
    var game;
    
    var resizer = new CanvasResizer({
        mode: CanvasResizer.Mode.FIXED_ASPECT_RATIO,
        canvas: renderer.domElement,
        width: 16,
        height: 9,
        setCanvasSizeCallback: function(width, height) {
            renderer.setSize(width, height);
            if (game !== undefined) {
                game.setCameraAspect(width / height);
            }
        }
    });
    var eventListener = function(e) {
        if (e.type === 'mousemove') {
            game.mouseMove(e);
        }
        if (e.type === 'mousedown') {
            game.mouseDown(e);
        }
        if (e.type === 'mouseup') {
            game.mouseUp(e);
        }
        e.preventDefault();
    };
    
    game = new Game(resizer, renderer);
    resizer.canvas.addEventListener('mousemove', eventListener);
    resizer.canvas.addEventListener('mouseup', eventListener);
    resizer.canvas.addEventListener('mousedown', eventListener);
    startMainLoop([resizer, game, resizer.pixelator()], {debugMode: DEBUG_MAIN_LOOP});
};

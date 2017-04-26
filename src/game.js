'use strict';

var _parsedSpec;

var parseSpec = function(spec) {
    // TODO: Get rid of this eval().
    eval("_parsedSpec = " + spec + ";");
    return _parsedSpec;
};

var Game = function(resizer, renderer, loadingBar) {
    this.resizer = resizer;
    this.renderer = renderer;
    this.loadingBar = loadingBar;
    this.initializedAfterLoad = false;
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
        this.input.addListener(undefined, ['l'], this.lPress);
        this.input.addListener(undefined, ['k'], this.kPress);
        this.input.addListener(undefined, ['m'], this.mPress);
        this.input.addListener(undefined, ['p'], this.pPress);
        this.input.addListener(undefined, ['q'], this.qPress);
        this.input.addListener(undefined, ['ctrl+s'], this.ctrlsPress);
        this.input.addListener(undefined, ['ctrl+n'], this.nextLevelCycle);
    }
    
    this.levelNumber = 0;
    
    this.downIndex = -1;
};

Game.prototype.loadedInit = function() {
    if (!this.initializedAfterLoad) {
        var levelId = levelData.levelSequence[this.levelNumber];
        this.loadLevel(levelId);
        Game.music.playSingular(true);
        this.initializedAfterLoad = true;
    }
};

Game.music = new GJS.Audio('laser_music');

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
Game.prototype.lPress = function() {
    this.level.editor.lPress();
};
Game.prototype.ctrlsPress = function() {
    this.level.editor.ctrlsPress();
};

Game.prototype.canvasMove = function(event) {
    if (this.level) {
        this.level.setCursorPosition(this.positionAsVec3(event));
    }
};

Game.prototype.canvasPress = function(event) {
    if (this.level && this.downIndex === -1) {
        this.level.setCursorPosition(this.positionAsVec3(event));
        this.level.mouseDown();
        this.downIndex = event.index;
    }
};

Game.prototype.canvasRelease = function(event) {
    if (this.level && this.downIndex === event.index) {
        this.level.setCursorPosition(this.positionAsVec3(event));
        this.level.mouseUp();
        this.downIndex = -1;
    }
};

Game.prototype.positionAsVec3 = function(event) {
    return new THREE.Vector3(event.currentPosition.x, event.currentPosition.y, 0);
};

Game.prototype.setCameraAspect = function(aspect) {
    if (this.level) {
        this.level.camera.aspect = aspect;
        this.level.camera.updateProjectionMatrix();
    }
};

Game.prototype.render = function() {
    if (this.level) {
        var fadeOpacity = 0.0; // Opacity of black fader over the game (implemented by fading the canvas)
        if (this.level.state.id === Level.State.INTRO) {
            fadeOpacity = 1.0 - this.level.state.time;
        } else if (this.level.state.id === Level.State.SUCCESS && this.level.successState.id === Level.SuccessState.FADE_OUT) {
            fadeOpacity = this.level.successState.time;
        }
        this.resizer.canvas.style.opacity = mathUtil.clamp(0.0, 1.0, 1.0 - fadeOpacity);
        this.level.render(this.renderer);
    }
    if (Game.parameters.get('postLD')) {
        return this.renderer;
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
    
    GJS.Audio.muteAll(Game.parameters.get('muteAudio'));
    
    if (this.loadingBar.finished() && !this.initializedAfterLoad) {
        this.loadedInit();
        this.initializedAfterLoad = true;
    }
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
    'playBuildingMoveSound': {initial: false},
    'buildingSpringStrength': {initial: 0.1, min: 0.01, max: 0.2},
    'buildingSpringDamping': {initial: 0.77, min: 0.5, max: 0.95},
    'muteAudio': {initial: false},
    'postLD': {initial: false}  // To activate post-LD improvements
});

var DEV_MODE = querystringUtil.get('devMode') !== undefined;
var POST_COMPO = querystringUtil.get('postCompo') !== undefined;

window['start'] = function() {
    var DEBUG_MAIN_LOOP = DEV_MODE && true; // Set to true to allow fast-forwarding main loop with 'f'
    Game.parameters.set('muteAudio', (DEV_MODE && true)); // Set to true if sounds annoy developers
    Game.parameters.set('postLD', POST_COMPO);
    if (DEV_MODE) {
        Game.parameters.initGUI();
    }

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    
    var game;
    
    var canvasWrapper = document.createElement('div');
    canvasWrapper.appendChild(renderer.domElement);
    
    var postLD = Game.parameters.get('postLD');
    
    if (postLD) {        
        GJS.commonUI.createUI({
            parent: canvasWrapper,
            fullscreenElement: document.body,
            twitterAccount: 'Oletus',
            fillStyle: '#ffffff',
            opacity: 0.2,
            scale: 0.8
        });
    }
    
    var resizer = new GJS.CanvasResizer({
        mode: GJS.CanvasResizer.Mode.FIXED_ASPECT_RATIO,
        canvas: renderer.domElement,
        wrapperElement: canvasWrapper,
        width: 16,
        height: 9,
        setCanvasSizeCallback: function(width, height) {
            renderer.setSize(width, height);
            if (game !== undefined) {
                game.setCameraAspect(width / height);
            }
        }
    });
    
    var loadingBar = new GJS.LoadingBar();
    game = new Game(resizer, renderer, loadingBar);
    var eventListener = resizer.createPointerEventListener(game, false, 
        GJS.CanvasResizer.EventCoordinateSystem.WEBGL_NORMALIZED_DEVICE_COORDINATES);
    resizer.canvas.addEventListener('mousemove', eventListener);
    resizer.canvas.addEventListener('mousedown', eventListener);
    resizer.canvas.addEventListener('mouseup', eventListener);
    resizer.canvas.addEventListener('mouseout', eventListener);
    if (postLD) {
        resizer.canvas.addEventListener('touchmove', eventListener);
        resizer.canvas.addEventListener('touchstart', eventListener);
        resizer.canvas.addEventListener('touchend', eventListener);
        resizer.canvas.addEventListener('touchcancel', eventListener);
    }
    
    startMainLoop([resizer, game, loadingBar, resizer.pixelator()], {debugMode: DEBUG_MAIN_LOOP});
};

'use strict';

var MAX_BLOCKS = 7; // Includes base block

var LevelEditor = function(level, sceneParent) {
    this.level = level;
    this.sceneParent = sceneParent;
    this.chosenY = 0;
    
    this.buildingCursor = new BuildingCursor({
        level: this.level,
        sceneParent: this.sceneParent,
        color: 0xff0000,
        y: this.chosenY + 0.7,
        arrows: false
    });
    
    this.buildingCursor.addToScene();
};

LevelEditor.prototype.zPress = function() {
    if (this.chosenY > 0) {
        --this.chosenY;
    }
};

LevelEditor.prototype.aPress = function() {
    if (this.chosenY < MAX_BLOCKS - 2) {
        ++this.chosenY;
    }
};

LevelEditor.prototype.getChosenBlock = function() {
    if (this.chosenBuilding) {
        var atLevel = this.chosenBuilding.getBlockAtLevel(this.chosenY + 0.5);
        if (atLevel === null && this.chosenBuilding && this.chosenBuilding.blocks.length < MAX_BLOCKS && this.chosenBuilding.topYTarget > this.chosenY - 0.5) {
            this.chosenBuilding.addBlockToTop({blockConstructor: StopBlock});
            ++this.chosenBuilding.topYTarget;
            this.chosenBuilding.topY = this.chosenBuilding.topYTarget;
            atLevel = this.chosenBuilding.getBlockAtLevel(this.chosenY + 0.5);
        }
        return atLevel;
    } else {
        return null;
    }
};

LevelEditor.prototype.oPress = function() {
    var block = this.getChosenBlock();
    if (block !== null) {
        var dir = true;
        if (block instanceof HoleBlock) {
            dir = !block.holeDirection;
        }
        this.chosenBuilding.replaceBlockSpec(block, {blockConstructor: HoleBlock, holeDirection: dir});
    }
};

LevelEditor.prototype.mPress = function() {
    var block = this.getChosenBlock();
    if (block !== null) {
        var dir = true;
        if (block instanceof MirrorBlock) {
            dir = !block.mirrorDirection;
        }
        this.chosenBuilding.replaceBlockSpec(block, {blockConstructor: MirrorBlock, mirrorDirection: dir});
    }
};

LevelEditor.prototype.kPress = function() {
    var block = this.getChosenBlock();
    if (block !== null) {
        this.chosenBuilding.replaceBlockSpec(block, {blockConstructor: StopBlock});
    }
};

LevelEditor.prototype.pPress = function() {
    var block = this.getChosenBlock();
    if (block !== null) {
        var dir = Laser.Direction.POSITIVE_X;
        if (block instanceof PeriscopeBlock) {
            dir = Laser.cycleHorizontalDirection(block.periscopeDirection);
        }
        var blockSpec = {
            blockConstructor: PeriscopeBlock,
            periscopeDirection: dir,
            isUpperBlock: block.topY === this.chosenBuilding.topY
        };
        this.chosenBuilding.replaceBlockSpec(block, blockSpec);
    }
};

LevelEditor.prototype.xPress = function() {
    if (this.chosenBuilding && this.chosenBuilding.blocks.length > 1) {
        this.chosenBuilding.removeBlock(this.chosenBuilding.blocks[this.chosenBuilding.blocks.length - 2]);
        this.chosenBuilding.clampY();
    }
};

LevelEditor.prototype.cPress = function() {
    if (this.chosenBuilding && this.chosenBuilding.blocks.length < MAX_BLOCKS) {
        this.chosenBuilding.addBlock({blockConstructor: StopBlock});
        this.chosenBuilding.topYTarget++;
    }
};

LevelEditor.prototype.qPress = function() {
    if (this.chosenBuilding && this.chosenBuilding.blocks.length > 1) {
        this.chosenBuilding.setStationary(!this.chosenBuilding.stationary);
    }
};

LevelEditor.prototype.lPress = function() {
    var block = this.getChosenBlock();
    if (block !== null) {
        var top = block.topY === this.chosenBuilding.topY;
        var goalConstructor = top ? GoalBlock : GoalPostBlock;
        var dir = true;
        if (block instanceof goalConstructor) {
            dir = !block.goalDirection;
        }
        this.chosenBuilding.replaceBlockSpec(block, {blockConstructor: goalConstructor, goalDirection: dir});
    }
};

LevelEditor.prototype.ctrlsPress = function() {
    var blob = new Blob([this.level.getSpec()], {type: 'text/plain'});
    saveAs(blob, 'level.txt');
};

LevelEditor.prototype.updateBuildingCursor = function() {
    this.buildingCursor.y = this.chosenY + 0.4;
    this.chosenBuilding = this.level.chosenBuilding;
    if (this.chosenBuilding) {
        this.buildingCursor.gridX = this.chosenBuilding.gridX;
        this.buildingCursor.gridZ = this.chosenBuilding.gridZ;
    }
};

LevelEditor.prototype.update = function(deltaTime) {
    this.updateBuildingCursor();
    this.buildingCursor.update(deltaTime);
};

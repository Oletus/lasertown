'use strict';

var LevelEditor = function(level, scene) {
    this.level = level;
    this.scene = scene;
    this.chosenY = 0;
    
    this.buildingCursor = new BuildingCursor({
        level: this.level,
        scene: this.scene,
        color: 0xff0000,
        y: this.chosenY + 0.5
    });
    
    this.buildingCursor.addToScene();
};

LevelEditor.prototype.zPress = function() {
    if (this.chosenY > 0) {
        --this.chosenY;
    }
};

LevelEditor.prototype.aPress = function() {
    if (this.chosenY < 4) {
        ++this.chosenY;
    }
};

LevelEditor.prototype.getChosenBlock = function() {
    if (this.chosenBuilding) {
        return this.chosenBuilding.getBlockAtLevel(this.chosenY + 0.5);
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
            dir = Laser.cycleDirection(block.periscopeDirection);
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
    if (this.chosenBuilding && this.chosenBuilding.blocks.length < 5) {
        this.chosenBuilding.addBlock({blockConstructor: StopBlock});
        this.chosenBuilding.topYTarget++;
    }
};

LevelEditor.prototype.updateBuildingCursor = function() {
    this.buildingCursor.y = this.chosenY + 0.7;
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

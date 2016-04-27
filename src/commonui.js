'use strict';

if (typeof GJS === "undefined") {
    var GJS = {};
}

// UI elements that are common to multiple games, like fullscreen / social media buttons.
GJS.commonUI = {};

GJS.commonUI.twitterLogoSrc = 'data:image/png;base64,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';

GJS.commonUI.createUI = function(options) {
    var buttonWidth = Math.floor(document.body.getBoundingClientRect().width * options.scale * 0.05);
    var originalButtonWidth = buttonWidth;
    
    var uiParent = document.createElement('div');
    uiParent.style.position = 'absolute';
    uiParent.style.right = 0;
    uiParent.style.top = 0;
    options.parent.appendChild(uiParent);
    
    var buttonIndex = 0;
    var addButton = function(button) {
        button.style.position = 'absolute';
        button.style.right = '10px';
        button.style.top = (10 + buttonIndex * (buttonWidth + 20)) + 'px';
        button.style.opacity = options.opacity;
        uiParent.appendChild(button);
        ++buttonIndex;
    };
    
    var followTwitterButton = GJS.commonUI.createFollowOnTwitterButton({
        twitterAccount: options.twitterAccount,
        fillStyle: options.fillStyle,
        width: buttonWidth
    });
    addButton(followTwitterButton);
    
    var fsButton = GJS.commonUI.createFullscreenButton({
        fullscreenElement: options.fullscreenElement,
        fillStyle: options.fillStyle,
        width: buttonWidth
    });
    addButton(fsButton);

    var resize = function() {
        buttonWidth = Math.floor(document.body.getBoundingClientRect().width * options.scale * 0.05);
        if (Math.abs(buttonWidth / originalButtonWidth - 1.0) > 0.1) {
            uiParent.style.transform = 'scale(' + buttonWidth / originalButtonWidth + ')';
        } else {
            // Stay sharp if it's reasonable
            uiParent.style.transform = 'scale(1.0)';
        }
    };
    window.addEventListener('resize', resize, false);
    
    resize();
};

GJS.commonUI.createFullscreenButton = function(options) {
    var button = document.createElement('canvas');
    button.width = options.width;
    button.height = options.width;
    var ctx = button.getContext('2d');
    var w = ctx.canvas.width * 0.26;
    for (var i = 0; i < 4; ++i) {
        ctx.save();
        ctx.translate(ctx.canvas.width * 0.5, ctx.canvas.height * 0.5);
        ctx.rotate(i * Math.PI * 0.5);
        ctx.translate(-ctx.canvas.width * 0.5, -ctx.canvas.height * 0.5);
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w * 0.7, w * 0.3);
        ctx.lineTo(w * 1.6, w * 1.2);
        ctx.lineTo(w * 1.2, w * 1.6);
        ctx.lineTo(w * 0.3, w * 0.7);
        ctx.lineTo(0, w);
        ctx.lineTo(0, 0);
        ctx.restore();
    }
    ctx.fillStyle = options.fillStyle;
    ctx.fill();
    button.addEventListener('click', function() {
        GJS.requestFullscreen(options.fullscreenElement);
    });
    GJS.addFullscreenChangeListener(function() {
        button.style.display = GJS.isFullscreen() ? 'none' : 'block';
    });
    return button;
};

GJS.commonUI.createFollowOnTwitterButton = function(options) {
    var link = document.createElement('a');
    var gfx = document.createElement('canvas');
    gfx.width = options.width;
    gfx.height = options.width;
    var ctx = gfx.getContext('2d');
    var scale = ctx.canvas.width / 256;
    var sprite = new GJS.Sprite(GJS.commonUI.twitterLogoSrc, GJS.Sprite.turnSolidColored(options.fillStyle));
    var drawSprite = function() {
        if (sprite.loaded) {
            ctx.save();
            sprite.drawRotated(ctx, ctx.canvas.width * 0.5, ctx.canvas.height * 0.5, 0, scale);
            ctx.restore();
        } else {
            setTimeout(drawSprite, 10);
        }
    };
    setTimeout(drawSprite, 10);
    link.href = 'https://twitter.com/' + options.twitterAccount.toLowerCase();
    link.target = '_blank';
    link.appendChild(gfx);
    return link;
};

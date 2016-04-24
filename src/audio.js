'use strict';

if (typeof GJS === "undefined") {
    var GJS = {};
}

/**
 * An object representing one audio sample. Uses Howler.js under the hood if it is available.
 * @param {string} filename Name of the audio file without a file extension. Assumes that the audio file is located
 * in GJS.Audio.audioPath.
 * @param {Array.<string>} fileExtensions Array of extensions. Defaults to ogg and mp3, which should be enough for
 * cross-browser compatibility. The default file extensions are configurable through GJS.Audio.defaultExtensions.
 * @constructor
 */
GJS.Audio = function(filename, fileExtensions) {
    if (fileExtensions === undefined) {
        fileExtensions = GJS.Audio.defaultExtensions;
    }
    var that = this;
    GJS.Audio.allAudio.push(this);
    this.loaded = false; // Used purely for purposes of marking the audio loaded.
    var markLoaded = function() {
        that._markLoaded();
    }

    this.filenames = [];
    var canDetermineLoaded = false;
    for (var i = 0; i < fileExtensions.length; ++i) {
        this.filenames.push(GJS.Audio.audioPath + filename + '.' + fileExtensions[i]);
    }
    // Don't use howler when using the file protocol, since it requires CORS requests
    if (typeof Howl !== 'undefined' && window.location.origin.substring(0, 4) != 'file') {
        // Use howler.js to implement GJS.Audio
        this._howl = new Howl({
            src: this.filenames,
            onload: markLoaded,
            onloaderror: markLoaded
        });
        return;
    } else {
        this._howl = null;
    }

    this.audio = document.createElement('audio');
    for (var i = 0; i < fileExtensions.length; ++i) {
        if (fileExtensions[i] === 'ogg' && !canDetermineLoaded) {
            canDetermineLoaded = this.audio.canPlayType('audio/ogg;codecs="vorbis"') == 'probably';
        }
        if (fileExtensions[i] === 'mp3' && !canDetermineLoaded) {
            canDetermineLoaded = this.audio.canPlayType('audio/mpeg') == 'probably';
        }
    }

    this.playWhenReady = null; // Event listener to start playing when audio is ready.
    if (canDetermineLoaded) {
        this.audio.addEventListener('canplay', markLoaded);
        // Can never be sure that the audio will load. Fake loaded after 10 seconds to unblock loading bar.
        setTimeout(markLoaded, 10000);
    } else {
        this._markLoaded();
    }
    this.addSourcesTo(this.audio);
    this.clones = [];
    this.ensureOneClone();
};

/**
 * Path for audio files. Set this before creating any GJS.Audio objects.
 */
GJS.Audio.audioPath = 'assets/audio/';

/**
 * Default file extensions. Set this before creating any GJS.Audio objects. Ogg and mp3 are enough for cross-browser
 * compatibility.
 */
GJS.Audio.defaultExtensions = ['ogg', 'mp3'];

/**
 * True when all audio is muted. Set this by calling muteAll.
 */
GJS.Audio.allMuted = false;

/**
 * @param {boolean} mute Set to true to mute all audio.
 */
GJS.Audio.muteAll = function(mute) {
    if (GJS.Audio.allMuted !== mute) {
        GJS.Audio.allMuted = mute;
        if (typeof Howler !== 'undefined') {
            if (mute) {
                Howler.mute(true);
            } else {
                Howler.mute(false);
            }
        } else {
            for (var i = 0; i < GJS.Audio.allAudio.length; ++i) {
                var audio = GJS.Audio.allAudio[i];
                audio.audio.muted = mute;
                for (var j = 0; j < audio.clones.length; ++j) {
                    audio.clones[j].muted = mute;
                }
            }
        }
    }
};

/**
 * All audio objects that have been created.
 */
GJS.Audio.allAudio = [];

/**
 * How many GJS.Audio objects have been fully loaded.
 */
GJS.Audio.loadedCount = 0;

/**
 * @return {number} Amount of GJS.Audio objects that have been fully loaded per amount that has been created.
 * Name specified as string to support Closure compiler together with loadingbar.js.
 */
GJS.Audio['loadedFraction'] = function() {
    if (GJS.Audio.allAudio.length === 0) {
        return 1.0;
    }
    return GJS.Audio.loadedCount / GJS.Audio.allAudio.length;
};

/**
 * @param {HTMLAudioElement} audioElement Element to add audio sources to.
 * @protected
 */
GJS.Audio.prototype.addSourcesTo = function(audioElement) {
    for (var i = 0; i < this.filenames.length; ++i) {
        var source = document.createElement('source');
        source.src = this.filenames[i];
        audioElement.appendChild(source);
    }
};

/**
 * Play a clone of this sample. Will not affect other clones. Playback will not loop and playback can not be stopped.
 */
GJS.Audio.prototype.play = function () {
    if (this._howl) {
        this._howl.play();
        return;
    }
    // If readyState was compared against 4, Firefox wouldn't play audio at all sometimes. That's why using 2 here.
    if (this.audio.readyState < 2) {
        return;
    }
    var clone = this.ensureOneClone();
    clone.play();
    this.ensureOneClone(); // Make another clone ready ahead of time.
};

/**
 * Play this sample when it is ready. Use only if only one copy of this sample is going to play simultaneously.
 * Playback can be stopped by calling stop().
 * @param {boolean=} loop Whether the sample should loop when played. Defaults to false.
 */
GJS.Audio.prototype.playSingular = function (loop) {
    if (loop === undefined) {
        loop = false;
    }
    if (this._howl) {
        if (this._howl.playing(0)) {
            return;
        }
        this._howl.play();
        this._howl.loop(loop);
        return;
    }
    this.audio.loop = loop;
    if (this.audio.readyState >= 2) {
        if (this.playWhenReady !== null) {
            this.audio.removeEventListener('canplay', this.playWhenReady);
            this.playWhenReady = null;
        }
        this.audio.play();
        this._markLoaded();
    } else if (this.playWhenReady === null) {
        var that = this;
        this.playWhenReady = function() {
            that.audio.play();
            that._markLoaded();
        }
        this.audio.addEventListener('canplay', this.playWhenReady);
    }
};

/**
 * Stop playing this sample.
 */
GJS.Audio.prototype.stop = function () {
    if (this._howl) {
        this._howl.stop();
        return;
    }
    if (this.playWhenReady !== null) {
        this.audio.removeEventListener('canplay', this.playWhenReady);
        this.playWhenReady = null;
    }
    this.audio.pause();
    this.audio.currentTime = 0;
};

/**
 * Ensure that there is one clone available for playback and return it.
 * @protected
 * @return {HTMLAudioElement} Clone that is ready for playback.
 */
GJS.Audio.prototype.ensureOneClone = function() {
    for (var i = 0; i < this.clones.length; ++i) {
        if (this.clones[i].ended || (this.clones[i].readyState == 4 && this.clones[i].paused)) {
            this.clones[i].currentTime = 0;
            return this.clones[i];
        }
    }
    var clone = document.createElement('audio');
    if (GJS.Audio.allMuted) {
        clone.muted = true;
    }
    this.addSourcesTo(clone);
    this.clones.push(clone);
    return clone;
};

/**
 * Mark this audio sample loaded.
 * @protected
 */
GJS.Audio.prototype._markLoaded = function() {
    if (this.loaded) {
        return;
    }
    this.loaded = true;
    GJS.Audio.loadedCount++;
};

'use strict';

if (typeof GJS === "undefined") {
    var GJS = {};
}

var arrayUtil = {}; // Utilities for working with JS arrays
var stringUtil = {}; // Utilities for working with JS strings
var objectUtil = {}; // Utilities for working with JS objects

/**
 * Random function. Prefers using mathUtil.random() if available, falls back to Math.random().
 * @return {number} Random value between 0 and 1 (not including 1).
 */
arrayUtil._random = function() {
    if (window.mathUtil && mathUtil.random) {
        return mathUtil.random();
    } else {
        return Math.random();
    }
};

/**
 * Count the number of matches in an array.
 * @param {Array} array Array to check.
 * @param {function} matchFunc Function that takes one array item and returns true if it should be counted.
 * @return {number} The number of matching entries.
 */
arrayUtil.count = function(array, matchFunc) {
    return array.filter(matchFunc).length;
};

/**
 * Filter an array by removing elements that are found in the other array.
 * @param {Array} array Array to filter.
 * @param {Array} arrayToRemove Values to remove from the first array.
 * @return {Array} A new array with the filtered elements.
 */
arrayUtil.filterArray = function(array, arrayToRemove) {
    return array.filter(function(value) {
        return arrayToRemove.indexOf(value) < 0;
    });
};

/**
 * @param {Array} array Array to shuffle.
 * @return {Array} A shuffled copy of the array.
 */
arrayUtil.shuffle = function(array) {
    array = array.slice(0);
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(arrayUtil._random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
};

/**
 * @param {Array} array Array to edit in place.
 * @param {number} indexA Index of one element to swap.
 * @param {number} indexB Index of another element to swap.
 */
arrayUtil.swap = function(array, indexA, indexB) {
    if (indexA !== indexB) {
        var temporaryValue = array[indexA];
        array[indexA] = array[indexB];
        array[indexB] = temporaryValue;
    }
};

/**
 * @param {Array} array Array to shuffle.
 * @param {number} maxSubsetLength Maximum subset to return.
 * @return {Array} A random subset of the array containing at most maxSubsetLength elements.
 */
arrayUtil.randomSubset = function(array, maxSubsetLength) {
    var shuffled = arrayUtil.shuffle(array);
    return shuffled.splice(0, maxSubsetLength);
};

/**
 * @param {Array} array Array to shuffle.
 * @return {Object} A random item from the array.
 */
arrayUtil.randomItem = function(array) {
    var index = Math.floor(arrayUtil._random() * array.length);
    return array[index];
};

/**
 * Set a property in all elements in an array to a certain value.
 * @param {Array} array Array to edit.
 * @param {string} key Property to set in all elements.
 * @param {Object} value A value to set to the property in all elements.
 */
arrayUtil.setPropertyInAll = function(array, key, value) {
    for (var i = 0; i < array.length; ++i) {
        array[i][key] = value;
    }
};

/**
 * Stable sort an array in place.
 * @param {Array} array Array to sort.
 * @param {function} compareFunction Function as in Array.prototype.sort.
 * @return {Array} The sorted array.
 */
arrayUtil.stableSort = function(array, compareFunction) {
    if (array.length < 2) {
        return array;
    }
    var merge = function(left, right) {
        var result  = [];
        var l = 0;
        var r = 0;

        while (l < left.length && r < right.length) {
            if (compareFunction(left[l], right[r]) <= 0) {
                result.push(left[l]);
                ++l;
            } else {
                result.push(right[r]);
                ++r;
            }
        }
        result = result.concat(left.slice(l));
        result = result.concat(right.slice(r));
        return result;
    };
    
    var middle = Math.floor(array.length / 2);
    var left = array.slice(0, middle);
    var right = array.slice(middle);
    arrayUtil.stableSort(left, compareFunction);
    arrayUtil.stableSort(right, compareFunction);
    var spliceParams = [0, array.length]; // First two parameters of splice()
    var merged = merge(left, right);
    spliceParams = spliceParams.concat(merged);
    array.splice.apply(array, spliceParams);
    return array;
};

/**
 * @param {Array} array An array to permute.
 * @param {number} n Index of the permutation to generate.
 * @return {Array} A new array that is the nth permutation of the input array.
 */
arrayUtil.nthPermutation = function(array, n) {
    var copy = array.slice(0);
    // Generate indices used to permute.
    var indices = [];
    var remainingIndices = [];
    for (var i = 0; i < array.length; ++i) {
        remainingIndices.push(i);
    }
    var x = n;
    for (var i = 0; i < array.length; ++i) {
        var permutationsOfOneSmaller = mathUtil.factorial(array.length - i - 1);
        var remainingIndicesIndex = Math.floor(x / permutationsOfOneSmaller);
        // TODO: This could probably be more efficient.
        indices.push(remainingIndices[remainingIndicesIndex]);
        remainingIndices.splice(remainingIndicesIndex, 1);
        x = x % permutationsOfOneSmaller;
    }
    // Reorder copy according to indices.
    for (var i = 0; i < array.length; ++i) {
        copy[i] = array[(indices[i])];
    }
    return copy;
};

/**
 * @param {Array} a An array.
 * @param {Array} b An array with the same elements as a, but possibly in a different permutation.
 * @return {number} How much elements are offset between the two arrays.
 */
arrayUtil.permutationDistance = function(a, b) {
    var distance = 0;
    for (var i = 0; i < a.length; ++i) {
        distance += Math.abs(b.indexOf(a[i]) - i);
    }
    return distance;
};

/**
 * @param {string} string Input string.
 * @return {string} String with the first letter capitalized.
 */
stringUtil.capitalizeFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * Initialize an object with default values.
 * @param {Object} obj Object to set properties on.
 * @param {Object} defaults Default properties. Every property needs to have a default value here.
 * @param {Object} options Options to override the default properties.
 */
objectUtil.initWithDefaults = function(obj, defaults, options) {
    for(var key in defaults) {
        if (!options.hasOwnProperty(key)) {
            obj[key] = defaults[key];
        } else {
            obj[key] = options[key];
        }
    }
};

/**
 * Create a wrapper for an object that forwards method calls and set/get on properties.
 * @param {Object} toWrap Object to wrap.
 * @param {function()=} excludeFromForwarding Function that takes a key string and returns true if it should be
 *                      excluded from forwarding. Defaults to not excluding anything.
 * @return {Object} Wrapped object.
 */
objectUtil.wrap = function(toWrap, excludeFromForwarding) {
    if (excludeFromForwarding === undefined) {
        excludeFromForwarding = function() { return false; };
    }
    var wrapper = {};
    for (var prop in toWrap) {
        (function(p) {
            if (!excludeFromForwarding(p)) {
                if (typeof toWrap[p] == 'function') {
                    wrapper[p] = function() {
                        toWrap[p].apply(toWrap, arguments); 
                    };
                } else  {
                    Object.defineProperty(wrapper, p, {
                        get: function() { return toWrap[p]; },
                        set: function(v) { toWrap[p] = v; }
                    });
                }
            }
        })(prop);
    }
    return wrapper;
};



/**
 * Request fullscreen on a given element.
 * @param {HTMLElement} elem Element to make fullscreen.
 */
GJS.requestFullscreen = function(elem) {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    }
};

/**
 * Exit fullscreen.
 */
GJS.exitFullscreen = function() {
    if(document.exitFullscreen) {
        document.exitFullscreen();
    } else if(document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if(document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    }
};

/**
 * @param {function} listener Listener to call when fullscreen state changes.
 */
GJS.addFullscreenChangeListener = function(listener) {
    document.addEventListener('fullscreenchange', listener);
    document.addEventListener('mozfullscreenchange', listener);
    document.addEventListener('webkitfullscreenchange', listener);
};

/**
 * @return {boolean} True if document is currently fullscreen.
 */
GJS.isFullscreen = function() {
    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitCurrentFullScreenElement)
    {
        return true;
    }
    return false;
};

/**
 * Change a value towards zero by a certain delta value.
 * @param {number} value Value to change.
 * @param {number} delta How much to change the value.
 * @return {number} Changed value.
 */
GJS.towardsZero = function(value, delta) {
    return towardsValue(value, 0, delta);
};

/**
 * Change a value closer to a target value by a certain delta value.
 * @param {number} value Value to change.
 * @param {number} targetValue Value to approach.
 * @param {number} delta How much to change the value.
 * @return {number} Changed value.
 */
GJS.towardsValue = function(value, targetValue, delta) {
    if (value > targetValue) {
        value -= delta;
        if (value < targetValue)
            value = targetValue;
    }
    if (value < targetValue) {
        value += delta;
        if (value > targetValue)
            value = targetValue;
    }
    return value;
};

GJS.debugLog = function(output) {
    if ( window.console && console.log ) {
        console.log(output);
    }
};


/*-----------*/
/* Polyfills */
/*-----------*/

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

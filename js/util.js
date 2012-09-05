/**
 * Utilities
 *
 * Utility function
 */

'use strict';

var Util = psd.Util = (function UtilClosure() {
  function Util() {}

  Util.pad2 = function(num) {
    return (num % 2 == 0) ? num : num + 1;
  }

  Util.pad4 = function(num) {
    // This is going to be required for the Pascal string of the layer name.
  }

  return Util;
})();

/**
 * Utilities
 *
 * Utility function
 */

'use strict';

var Util = psd.Util = (function UtilClosure() {
  function Util() {}

  Util.pad2 = function(num) {
    // TODO: This fails if the number == 0 since it should be padded to 2 in
    // case.
    return (num % 2 == 0) ? num : num + 1;
  }

  Util.pad4 = function(num) {
    // TODO: This is needed for the Pascal string on the layer name. But I'm
    // skipping that section for now.
  }

  Util.rleDecode = function(data) {
  }

  return Util;
})();

/**
 * PSD Header Section.
 *
 * The header contains the basic properties of the PSD file.
 *
 * See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_19840
 *
 * @param  {psdJs} The psdJs object.
 * @return {psdJsHeader} The psdJsHeader object.
 */

"use strict"

var psdJsHeader = (function psdJsHeaderClosure() {
  function psdJsHeader(psd) {
    this.signature = psd.ds.readString(4);

    // Move the position because readstring doesn't.
    psd.ds.seek(4);

    this.version = psd.ds.readUint16();

    // Skip 6 bytes as reserved.
    psd.ds.seek(psd.ds.position + 6);
    this.channels = psd.ds.readUint16();
    this.height = psd.ds.readUint32()
    this.width = psd.ds.readUint32();
    this.depth = psd.ds.readUint16();
    this.color = psd.ds.readUint16();
    this.colorMode = this.getColorMode();
  }

  psdJsHeader.prototype = {
    // Returns the name of the supported color mode.
    getColorMode: function () {
      // Supported values are:
      // Bitmap = 0; Grayscale = 1; Indexed = 2; RGB = 3; CMYK = 4; Multichannel = 7; Duotone = 8; Lab = 9.
      var modes = {
        0: 'Bitmap', 1: 'Grayscale', 2: 'Indexed', 3: 'RGB', 4: 'CMYK',
        7: 'Multichannel', 8: 'Duotone', 9: 'Lab'
      };
      return modes[this.color];
    }
  }
  return psdJsHeader;
})();

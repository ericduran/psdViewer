/** psd */
psd = function(data) {
  this.dv = new jDataView(data);
  this.header = new psdHeader(this.dv);
}

psd.prototype = {}

/**
 * PSD Header Section.
 * The header contains the basic properties of the image
 * See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_19840
 * @param  {jDataView} dv The jDataView object.
 * @return {psdHeader}    The psdHeader object.
 */
psdHeader = function(dv) {
  this.signature = dv.getString(4, dv.tell());
  this.version = dv.getUint16(4);
  // Skip 6 bytes as reserved.
  this.channels = dv.getUint16(12);
  this.height = dv.getUint32(14);
  this.width = dv.getUint32(18);
  this.depth = dv.getUint16(22);
  this.color = dv.getUint16(24);
  this.colorMode = this.getColorMode();
}

psdHeader.prototype = {
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

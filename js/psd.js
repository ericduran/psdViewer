/**
 * psd.js
 *
 * Reads PSD (layers, mask, info).
 *
 * @param {ArrayBuffer} arrayBuffer ArrayBuffer to read from.
 */
psd = function(data) {
  this.ds = new DataStream(data, 0, false);
  this.header = new psdHeader(this);
  this.colorModeData = new psdColorModeData(this);
  this.imageResources = new psdImageResources(this);
  this.layerMask = new psdLayerMask(this);
  // this.imageData = new psdImageData(this);
}

psd.prototype = {}

/**
 * PSD Header Section. // Offset: 0, Length: 26 Bytes
 * The header contains the basic properties of the image
 *
 * See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_19840
 * @param  {psd} psd The psd object.
 * @return {psdHeader} The psdHeader object.
 */
psdHeader = function(psd) {
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

/**
 * PSD Color Mode Data Section. // Offset: 26, Length: Variable.
 * Only 'Indexed' and 'Duotone' have color mode data.
 *
 * See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_71638
 * @param  {psd} psd The psd object.
 * @return {psdColorModeData} The psdColorModeData object.
 */
psdColorModeData = function(psd) {
  this.size = psd.ds.readUint32();
  if (psd.header.colorMode == 'Indexed' || psd.header.colorMode == 'Duotone') {
    // TODO: Set the proper data for indexed and Duotone color modes.
  }
  else {
    if (this.size != 0) {
      // "For all other modes, this section is just the 4-byte length field, which is set to zero."
      this.data = psd.ds.readUint32();
    }
  }
}

/**
 * PSD Image Resources Section. // Offset: 34, Length: Variable.
 * "Image resources are used to store non-pixel data associated with images, such as pen tool paths"
 *
 * See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_69883
 * @param  {psd} psd The psd object.
 * @return {psdImageResources} The psdImageResources object.
 */
psdImageResources = function(psd) {
  var lenMissing;
  this.resources = [];

  // Lets also set the missing len to the size.
  // We'll subtract every resource byte until we get to 0.
  // Then we'll know when the Image Resources are over.
  this.size = lenMissing = psd.ds.readUint32();

  // Process Image Resources.
  var x = 0;
  while (lenMissing > 0) {
    resourceSize = this.processResourceBlock(psd);
    lenMissing -= resourceSize;
  }
  if (lenMissing < 0) {
    // TODO: Trow error if we go over the expected lenght (if lenMissing != 0)
    console.log('Image Resources failed (psdImageResources) Over: ' + lenMissing);
  }
}

psdImageResources.prototype = {

  // Return the resource block lenght;
  processResourceBlock: function(psd) {
    var resource = new psdImageResourceBlock(psd);
    this.resources.push(resource);
    return resource.totalSize;
  }
}

psdImageResourceBlock = function(psd) {
  var start = psd.ds.position;
  var dataBuffer, bufferElementSize = 0;
  this.totalSize = 0;
  this.len = 0;
  this.signature = psd.ds.readString(4);
  this.id = psd.ds.readUint16();

  // "Pascal string, padded to make the size even".
  // The 1st byte tells us how long the name is.
  this.namelen = Util.pad2(psd.ds.readUint8());
  if (this.namelen == 0) {
    //skip the extra byte.
    this.name = psd.ds.readUint8();
  }
  else {
    // TODO: Trow error if actually get a len larger than 0
    console.log('Image Resource block failed namelen: ' + this.namelen);
  }

  this.len = Util.pad2(psd.ds.readUint32());
  this.totalSize = (psd.ds.position + this.len) - start;

  // Set up an Uint8Array to store our data.
  var elementSize = this.len * Uint8Array.BYTES_PER_ELEMENT;
  var buffer = new ArrayBuffer(elementSize);
  this.data = new Uint8Array(buffer);
  for (var i = this.data.length - 1; i >= 0; i--) {
    this.data[i] = psd.ds.readUint8();
  };
}

/**
 * Fourth section of a Photoshop file. Contains information about layers and masks.
 *
 * See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_75067
 * @param  {[type]} psd [description]
 * @return {[type]}     [description]
 */
psdLayerMask = function (psd) {
  this.len = psd.ds.readUint32();
  this.info = new psdLayerMaskInfo(psd);

}

psdLayerMask.prototype = {

}

/**
 *
 * See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_16000
 * @param  {[type]} psd [description]
 * @return {[type]}     [description]
 */
psdLayerMaskInfo = function(psd) {
  this.imageDataRecords = [];

  this.len = Util.pad2(psd.ds.readUint32());
  this.layerCount = psd.ds.readUint16();
  this.layerRecords = this.parseLayerRecords(psd);

  // Add this this.channelImageData.
  //  Seperate this out into new psdChannelImageData()
  //  See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_26431
}

psdLayerMaskInfo.prototype = {

  parseLayerRecords: function (psd) {
    var records = [], layerRecord;
    for (var i = 1; i < this.layerCount; i++) {
      layerRecord = new psdLayerRecord(psd);
      records.push(layerRecord);
    };
    records.push(layerRecord);

    return records;
  }
}

/**
 *
 * See http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_13084
 * @param  {[type]} psd [description]
 * @return {[type]}     [description]
 */
psdLayerRecord = function(psd) {
  this.top = psd.ds.readUint32();
  this.left = psd.ds.readUint32();
  this.right = psd.ds.readUint32();
  this.bottom = psd.ds.readUint32();
  this.channels = psd.ds.readUint16();
  this.channelsInfo = [];
  if (this.channels > 0) {
    for (var i = 0; i < this.channels; i++) {
      this.channelsInfo[i] = {};
      this.channelsInfo[i].id = psd.ds.readUint16();
      this.channelsInfo[i].len = psd.ds.readUint32();
      this.channelsInfo[i].rgbakey = this.getRGBAType(this.channelsInfo[i].id);
    };
  }
  this.blendModeSignature = psd.ds.readString(4);
  this.blendModeKey = psd.ds.readString(4);
  this.blendModeName = this.getBlendModeName();
  this.opacity = psd.ds.readUint8();
  this.clipping = psd.ds.readUint8();

  // TODO: Fix me. This needs to be actual bits
  // Skiping the Flags
  this.flags = psd.ds.readUint8();

  this.filler = psd.ds.readUint8();
  this.lenDataBlendingName = psd.ds.readUint32();
  this.startLen = psd.ds.position;
  this.layerMask = new psdLayerMaskAdjustmentData(psd);
  this.layerBlendingRanges = new psdLayerBlendingRangesData(psd);

  // "Pascal string, padded to make the size even".
  // The 1st byte tells us how long the name is.
  this.namelen = Util.pad2(psd.ds.readUint8());
  if (this.namelen == 0) {
    // skip the extra byte.
    // this.name = psd.ds.readUint8();
  }
  else {
    this.layername = psd.ds.readString(this.namelen);

    // TODO: WHAT THE HELL IS IN THIS EMPTY SPACE.
    // We have to pad it to the end in order to move on the the next layer.
    psd.ds.position = this.startLen + this.lenDataBlendingName;
  }
}

psdLayerRecord.prototype = {
  getRGBAType: function(type) {
    if (type == 65535) {
      return "A";
    }
    return "RGB".substring(type, type + 1);
  },

  getBlendModeName: function() {
    var key = this.blendModeKey;
    // Note: The names are padded to always be 4 characters.
    var names = {
      'pass': 'pass through',
      'norm': 'normal',
      'diss': 'dissolve',
      'dark': 'darken',
      'mul ': 'multiply',
      'idiv': 'color burn',
      'lbrn': 'linear burn',
      'dkCl': 'darker color',
      'lite': 'lighten',
      'scrn': 'screen',
      'div ': 'color dodge',
      'lddg': 'linear dodge',
      'lgCl': 'lighter color',
      'over': 'overlay',
      'sLit': 'soft light',
      'hLit': 'hard light',
      'vLit': 'vivid light',
      'lLit': 'linear light',
      'pLit': 'pin light',
      'hMix': 'hard mix',
      'diff': 'difference',
      'smud': 'exclusion',
      'fsub': 'subtract',
      'fdiv': 'divide',
      'hue ': 'hue',
      'sat ': 'saturation',
      'colr': 'color',
      'lum ': 'luminosity',
    }
    return names[key];
  }
}

psdLayerMaskAdjustmentData = function(psd) {
  this.size = psd.ds.readUint32();
  if (this.size == 0) {
    // We'll skip the other processing.
    return;
  }
}

psdLayerBlendingRangesData = function(psd) {
  this.size = psd.ds.readUint32();
  // Seek and skip this for now.
  // TODO: Fix me.
  psd.ds.position = psd.ds.position + this.size;
}

psdImageData = function (psd) {
  psd.ds.seek(psd.ds.position + psd.layerMask.len - 4);
  this.compression = psd.ds.readUint16();
  this.data = psd.ds.readUint8Array(psd.ds._byteLength - psd.ds.position);
}

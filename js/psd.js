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
  // TODO: Trow error if we go over the expected lenght (if lenMissing != 0)

  return;

  // TODO: Fix Me. Right now processResourceBlock just reads the expected lenght
  // and seeks forward to that point. It doesn't actually read it. We will need
  // to read that, The below code is what I used to get pass the 1st 3 resource
  // block. I should abstract most of that out into the actual processResourceBlocks.

  // this.signature = psd.ds.readString(4);
  // this.id = psd.ds.readUint16();
  // this.namelen = psd.ds.readUint8();
  // this.namesize = psd.ds.readUint8();
  // this.len = psd.pad2(psd.ds.readUint32());
  // this.data = psd.ds.readUint32();
  // this.data2 = psd.ds.readUint32();
  // this.signature2 = psd.ds.readString(4);
  // this.id2 = psd.ds.readUint16();
  // this.namelen2 = psd.pad2(psd.ds.readUint8());
  // this.namesize2 = psd.ds.readUint8();
  // this.len2 = psd.ds.readUint32();
  // // We need to build a buffer big enough to contain the len. Len is always going
  // // to be even, if not, we pad it to make it even. Ex len = 7 we make it 8.
  // var elementSize = 4 * Uint32Array.BYTES_PER_ELEMENT;
  // var buffer = new ArrayBuffer(4 * elementSize);
  // var test = new Uint32Array(buffer, 0);
  // for (var i = test.length - 1; i >= 0; i--) {
  //   test[i] = psd.ds.readUint8();
  // };
  // this.data3 = test;
  // this.signature3 = psd.ds.readString(4);
  // this.id3 = psd.ds.readUint16();
  // this.namelen3 = psd.ds.readUint8();
  // this.namesize3 = psd.ds.readUint8();
  // this.len3 = psd.ds.readUint32();

  // // len = this.size;
  // // while (len > 0) {
  // //   len -= this.processResourceBlocks(psd);
  // // }
  // // if (len != 0) {
  // //   console.log("Image resource overran the expected size");
  // // }
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
  var dataBuffer, bufferElementSize = 0, bytesOfData = 0;
  this.totalSize = 0;
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
    // Todo: cross this when we get here.
  }

  bytesOfData = this.len = Util.pad2(psd.ds.readUint32());
  this.totalSize = (psd.ds.position + this.len) - start;
  // For now we're just going to skip through all the resources.
  // TODO: Come back for me.
  psd.ds.seek(psd.ds.position + this.len);
  // var elementSize = 4 * Uint8Array.BYTES_PER_ELEMENT;
  // var buffer = new ArrayBuffer(4 * elementSize);
  // this.data = new Uint8Array(buffer, 0);
  // for (var i = this.data.length - 1; i >= 0; i--) {
  //   this.data[i] = psd.ds.readUint8();
  // };

  //   size = (bytesOfData / 4) * Uint32Array.BYTES_PER_ELEMENT;
  //   console.log(size);
  //   bytesOfData -= size;
  //   bufferElementSize  += size;
  //   console.log(size);
  //   var x = 0
  //   while (size > 0) {
  //     x++;
  //     console.log('x');
  //     this.data = psd.ds.readUint32();
  //     size -= 4;
  //     if (x == 7) {
  //       break;
  //     }
  //   }
  // }
  // if (bytesOfData >= 2) {

  // }
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
  this.len = Util.pad2(psd.ds.readUint32());
  this.layerCount = psd.ds.readUint16();
  this.layerRecords = this.parseLayerRecords(psd);
  this.imageDataRecords = [];
}

psdLayerMaskInfo.prototype = {

  parseLayerRecords: function (psd) {
    var records = [], layerRecord;
    layerRecord = new psdLayerRecord(psd);
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
  this.channelsInfo = psd.ds
}

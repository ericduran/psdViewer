(function(window, undefined) {

  window.ondragover = function () {
    return false;
  };

  window.ondragend = function () {
    return false;
  };

  window.ondrop = function (e) {
    e.stopPropagation();
    e.preventDefault();
    var f = e.dataTransfer.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      console.log(new psd(this.result));
    };
    reader.readAsArrayBuffer(f);
  };
})(window);

"use strict";

require("app/static/vendor/gif");
var camera = require("app/static/vendor/camera");

var DURATION = 1;
var Booth;

var Recorder = {
  duration: 1,
  fps: 20,

  init: function() {
    this.booth.setState('no-camera');
    camera.init({
      width: 320,
      height: 240,
      fps: this.fps,
      mirror: true,

      onFrame: $.proxy(this, 'onFrame'),
      onSuccess: $.proxy(this, 'onCameraSuccess'),
      onError: $.proxy(this, 'onCameraError'),
      onNotSupported: $.proxy(this, 'onCameraNotSupported')
    });
  },

  set_booth: function(booth) {
    this.booth = booth;
  },

  onCameraSuccess: function() {
    this.booth.setState('camera-ready');
  },

  onCameraError: function() {},

  onCameraNotSupported: function() {},

  record: function() {
    console.log('recording');
    this.booth.setState('recording', 0);

    setTimeout($.proxy(function() {
      this.gif = new GIF({
        workerScript: 'vendor/gif.worker.js',
        workers: 2,
        quality: 10
      });

      this.gif.on('finished', $.proxy(this, 'onGIF'));
    }, this), 1.5 * 1000);
  },

  onFrame: function(canvas) {
    this.booth.setCanvas(canvas)
    if (this.gif) {
      var curFrame = this.gif.frames.length
      var endFrame = this.duration * this.fps
      if (curFrame > endFrame) {
        this.booth.setState('processing')
        this.gif.render()
        camera.pause()
      } else {
        this.booth.setState('recording', curFrame / endFrame)
        console.log('recording frame', this.gif.frames.length)
        this.gif.addFrame(canvas, {
          copy: true,
          delay: Math.round(1000 / this.fps)
        })
      }
    }
  },

  onGIF: function(blob) {
    this.booth.setState('gif-ready')
    this.booth.showPreview(URL.createObjectURL(blob))
    this.blob = blob
  },

  upload: function() {
    this.booth.setState('uploading')

    var formData = new FormData()
    formData.append('moves', this.blob)

    $.ajax({
        url: '/danceparty/upload',
        type: 'POST',
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        success: $.proxy(this, 'onUploaded')
    })
  },

  _reset: function() {
    this.gif = this.blob = null
  },

  onUploaded: function() {
    this.booth.addDance(URL.createObjectURL(this.blob))
    this._reset()
    camera.stop()
    this.booth.hide()
  },

  redo: function() {
    this._reset()
    camera.start()
    this.booth.setState('camera-ready')
  }
};

var Booth = {
  events: {
    "click #hide-booth" : "hide",
    "click #start-camera" : "start_camera",
    "click #record" : "record",
    "click #upload-gif" : "upload",
    "click #redo-gif" : "redo"
  },
  init: function() {
    this.state = null;

    this.$preview = this.$page.find("#preview");
    this.$photobooth = this.$page.find("#photobooth");
    this.$photobooth_wrapper = this.$page.find(".photobooth_wrapper");

    // Why we gotta copy this?
    this.show();
    this.setState('no-camera');
    Recorder.set_booth(this);
  },
  start_camera: function() {
    Recorder.init();
  },
  record: function() {
    Recorder.record();
  },
  upload: function() {
    Recorder.upload();
  },
  redo: function() {
    Recorder.redo();
  },

  show: function() {
    this.$photobooth.addClass('active');
    this.$photobooth_wrapper.show();
  },

  hide: function(el) {
    this.$photobooth.removeClass('active');
    this.$photobooth_wrapper.hide();
  },

  setState: function(state, progress) {
    console.log(this.$el);
    this.$photobooth.removeClass('state-' + this.state)
    this.state = state
    this.$photobooth.addClass('state-' + state)

    if (state == 'recording' && progress != null) {
      this.$el.find('#record').css('width', 100 * progress + '%')
    }
  },

  setCanvas: function(canvas) {
    this.$preview.append(canvas)
  },

  showPreview: function(preview) {
    this.$preview.find('.gif').prop('src', preview)
  },

  addDance: function(dance) {
    $('#dances').prepend(
        $('#dances :first-child')
          .clone()
          .prop('src', dance)
    );
  }
};
// todo: confirm before uploading

module.exports = Booth;

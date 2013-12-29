"use strict";

require("app/static/vendor/gif");
var camera = require("app/static/vendor/camera");

var DURATION = 1;
var Booth;
var boothText = {
  "no-camera": "Activate your camera!",
  "camera-ready": "Show us your moves!",
  "recording": [
    "Victory boogie woogie!",
    "Pretend you're a dinosaur",
    "Oh snap! Zombies!",
    "You're in an 80s John Hughes film",
    "Give us your most swashbuckling stance",
    "Your archenemy is a wizard",
    "Something really really really really really stinky happened"
  ],
  "gif-ready": "Upload?",
  "processing": "One moment please..."
};

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
    //console.log('recording');
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
        //console.log('recording frame', this.gif.frames.length)
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

    var url;
    if (Booth.path === '/') {
      url = '/upload';
    } else {
      url = Booth.path + '/upload';
    }

    $.ajax({
        url: url,
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
    this._reset()
    //camera.stop()
    this.booth.hideBooth()
    this.booth.setState('camera-ready')
    this.redo();
  },

  redo: function() {
    this._reset()
    camera.start()
    this.booth.setState('camera-ready')
  }
};

var Booth = {
  events: {
    "click #show-hide-booth" : "showOrHide",
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
    this.$show_hide_btn = this.$page.find("#show-hide-booth");

    // Why we gotta copy this?
    this.showBooth();
    this.setState('no-camera');
    Recorder.set_booth(this);

    var readyContainer = this.$page.find('#ready-container');
    readyContainer.fadeOut();
    Recorder.init();

  },
  set_controller_path: function(path) {
    Booth.path = path;
  },
  start_camera: function() {
    Recorder.init();
  },
  record: function() {
    Recorder.record();
    this.$page.find('#dances').fadeOut();
  },
  upload: function() {
    Recorder.upload();
    this.$page.find('#dances').fadeIn();
  },
  redo: function() {
    Recorder.redo();
  },

  showBooth: function() {
    this.$photobooth.addClass('active');
    this.$photobooth_wrapper.show();
    this.$show_hide_btn.text('hide booth').removeClass('show');
  },

  hideBooth: function(el) {
    this.$photobooth.removeClass('active');
    this.$photobooth_wrapper.hide();
    this.$show_hide_btn.text('show booth').addClass('show');
  },
  showOrHide: function(el){
    if (this.$photobooth.is(':visible')){
      if(!$('#dances').is(':visible')){
        $('#dances').fadeIn();
      }
      this.hideBooth();
    } else {
      this.showBooth();
    }
  },

  setState: function(state, progress) {
    this.$photobooth.removeClass('state-' + this.state)
    if (this.state != state) {
      this.$photobooth.children('h1').text(SetBoothMessage(state, progress));
    }
    this.state = state
    this.$photobooth.addClass('state-' + state)
    
    if (state == 'recording' && progress != null) {
      this.$el.find('#record').css('width', 100 * progress + '%')

    }
    function SetBoothMessage(state, progress){
      var message = boothText[state];
      if (state == 'recording' && progress === 0){
        var numMsg = boothText[state].length;
        var randNum = Math.floor((Math.random()*numMsg));
        var randMsg = boothText[state][randNum];
        message = randMsg;
      }
      return message;
    }
  },

  setCanvas: function(canvas) {
    this.$preview.append(canvas)
  },

  showPreview: function(preview) {
    this.$preview.find('.gif').prop('src', preview)
  },

  addDance: function(dance) {
    console.log("ADDING DANCE", dance, this);
    var dance_url;
    if (Booth.path === "/") {
      dance_url = "/" + dance + ".gif";
    } else {
      dance_url = Booth.path + "/" + dance + ".gif";
    }
    var newDanceEl = $('<div class="dance"><img class="dancer" title="" /></div>');

    newDanceEl.find("img").prop('src', dance_url);
    $('#dances').prepend(newDanceEl);
  },
  socket: function(socket) {
    socket.on('new_gif', function(data) {
      Booth.addDance(data);
    });
  }
};



window.Booth = Booth;
module.exports = Booth;

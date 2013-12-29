"use strict";

var imagemagick = require("imagemagick");
var fs = require("fs");

var controller = require_core("server/controller");
var config = require_core("server/config");
var page = require_core("server/page");
var context = require_core("server/context");
var template = require_core("server/template");
var quick_hash = require_core("server/hash");

var formidable = require('formidable');

// Helpers for serialized form elements
var value_of = controller.value_of,
    array_of = controller.array_of;


// TODO: make this upload_dir configurable
var upload_dir = "app/static/uploads/";
fs.mkdir(upload_dir, function() {});

module.exports = {
  is_package: true,
  routes: {
    "" : "index",
    "/:id" : "get_dance"
  },
  post_routes: {
    "/upload" : "upload"
  },

  upload: function(ctx, api) {
    var req = ctx.req;
    var res = ctx.res;

    var socket = this.get_socket();
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      var gif_file = files.moves;
      console.log("RECEIVED A NEW GIF!", gif_file.path);
      if (gif_file.type.toLowerCase() !== "image/gif") {
        res.end();
        return;
      }

      fs.readFile(gif_file.path, context.wrap(function(err, data) {
        if (!err) {
          var body = data.toString();
          var hash = quick_hash(body);
          console.log("HASHED TO", hash);
          var is = fs.createReadStream(gif_file.path);
          var os = fs.createWriteStream(upload_dir + hash + ".gif");

          is.pipe(os);
          is.on('end', context.wrap(function() {
            fs.unlinkSync(gif_file.path);
            res.write(hash + ".gif");
            res.end();
            socket.emit("new_gif", hash);
          }));
        } else {
          res.end();
        }
      }));

    });


  },

  index: function(ctx, api) {
    this.set_title("DanceParty!");
    template.add_stylesheet("danceparty/dance");
    fs.readdir(upload_dir, context.wrap(function(err, files) {
      var dancers = _.filter(files, function(f) { return f.match("gif$"); });
      dancers = _.shuffle(dancers);
      dancers = _.first(dancers, 50);
      var template_str = template.render("danceparty/danceparty.html.erb", { dancers: dancers });

      api.bridge.controller("danceparty", "set_controller_path", ctx.controller_path);
      page.render({ content: template_str, socket: true});
    }));

  },

  get_dance: function() {
    var req = context("req");
    var res = context("res");
    var dance_id = req.params.id;
    fs.stat(upload_dir + dance_id, context.wrap(function(err, stat) {
      if (!err) {
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Content-Length', stat.size);
        var maxAge = 60 * 60 * 1000 * 24 * 365;
        res.setHeader('Cache-Control', 'public, max-age=' + (maxAge / 1000));
        fs.createReadStream(upload_dir + dance_id).pipe(res);
      } else {
        res.end();
      }


    }));
  },

  socket: function() {}
};

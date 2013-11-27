"use strict";

var controller = require_core("server/controller");
var page = require_core("server/page");
var context = require_core("server/context");
var template = require_core("server/template");

// Helpers for serialized form elements
var value_of = controller.value_of,
    array_of = controller.array_of;
    

module.exports = {
  routes: {
    "" : "index",
  },
  post_routes: {
    "/upload" : "upload"
  },

  upload: function() {
    var req = context("req");
    var res = context("res");

    var results = req.body.data || "";

    console.log("RECEIVED A NEW GIF!");

  },

  index: function() {
    template.add_stylesheet("dance.css");
    var template_str = template.render("controllers/danceparty.html.erb");
    page.render({ content: template_str, socket: true});
  },

  socket: function() {}
};

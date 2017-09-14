var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  // this.state = {
  //   username: '',
  //   isLoggedIn: false
  // }


});

module.exports = User;

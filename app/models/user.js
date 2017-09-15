var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var pHash = Promise.promisify(bcrypt.hash);

var User = db.Model.extend({
  tableName: 'users',

  initialize: function(){
    this.on('creating', this.hashHandler, this);
  },

  hashHandler: function(model){
    return pHash( model.get('password'), null, null )
      .then( function( hashedPassword ){
        model.set('password', hashedPassword);
      })
  }

});

module.exports = User;

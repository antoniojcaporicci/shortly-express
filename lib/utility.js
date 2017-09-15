var request = require('request');
var User = require('../app/models/user');
var Link = require('../app/models/link');
var Promise = require('bluebird');
var pHash = Promise.promisify(require('bcrypt-nodejs').hash);

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/

exports.isLoggedIn = function(req, res, next) {
  if(req.session.loggedIn){
    next();
  } else {
    res.redirect('/login');
  }
}

exports.findUser = function(req, res, next) {
  pHash( req.body.password, null, null)
    .then( function(hashedPassword){
      console.log(`PASSWORD NON HASHED!: ${req.body.password}`);
      console.log(`PASSWORD HASHED!: ${hashedPassword}`);
      new User({username: req.body.username, password: hashedPassword})
      .fetch().then( function(foundUser){
        if(foundUser && req.path === '/login' || !foundUser && req.path === '/signup'){
          console.log(`FOUND USERNAME OR NEW USERNAME CREATED!`)
          next();
        } else {
          // req.path = '/login' or '/signup'
          res.redirect(req.path);
        }
      });
  })
}

exports.findLink = function(req, res, next){

  let option;
  if(req.method.toLowerCase() === 'post'){

    if (!exports.isValidUrl(req.body.url)) {
      console.log('Not a valid url: ', req.body.url);
      return res.sendStatus(404);
    }

    option = {url: req.url};
  } else if (req.method.toLowerCase() === 'get'){
    option = {code: req.params[0]};
  }

  new Link(option).fetch().then( function(queryLink) {
    //if post /links && queryLink not found -> next()
    //if get /* && queryLink found -> next()
    //if post /links && queryLink found -> res.status(200).send(queryLink.attributes)
    //if get /* && queryLink not found -> res.redirect('/')
    if(req.url === '/links' && !queryLink || req.url !== '/links' && queryLink){
      req.queryLink = queryLink;
      next();
    } else if (req.url === '/links' && queryLink){
      res.status(200).send(queryLink.attributes);
    } else { //req.url === '/*'
      res.redirect('/');
    }
  });
}

var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var request = require('request');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var isLoggedIn = util.isLoggedIn;
var findUser = util.findUser;
var findLink = util.findLink;

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({secret: 'cats', resave: false, saveUninitialized: true}))


app.get('/', isLoggedIn, function(req, res) {
  res.render('index');
});

app.get('/create', isLoggedIn, function(req, res) {
  res.render('index');
});

app.get('/login', function(req, res) {
  res.render('index');
});

app.get('/links', isLoggedIn, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});


app.post('/login', findUser, function (req, res) {

  req.session.regenerate( function (err) {
    if (!err) {
      req.session.loggedIn = true;
      res.redirect('/');
    } else {
      res.send('ERROR SESSION GENERATE FAIL');
    }
  });

});

app.post('/signup', findUser, function(req, res) {

  Users.create(req.body).then(function(newUser) {
    res.redirect('/');
  });

});

app.post('/links', findLink, function(req, res) {
  var uri = req.body.url;

  util.getUrlTitle(uri, function(err, title) {
    if (err) {
      console.log('Error reading URL heading: ', err);
      return res.sendStatus(404);
    }

    Links.create({
      url: uri,
      title: title,
      baseUrl: req.headers.origin
    })
    .then(function(newLink) {
      res.status(200).send(newLink);
    });
  });

});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', findLink, function(req, res) {

  var click = new Click({
    linkId: req.queryLink.get('id')
  });

  click.save().then(function() {
    req.queryLink.set('visits', req.queryLink.get('visits') + 1);
    req.queryLink.save().then(function() {
      return res.redirect(req.queryLink.get('url'));
    });
  });

});

module.exports = app;

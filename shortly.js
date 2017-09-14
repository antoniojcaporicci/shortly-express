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

// var requestWithSession = request.defaults({jar:true});
var isLoggedIn = function(req, res, next) {
  if(req.session.loggedIn){
    next();
  } else {
    res.redirect('/login');
  }
}


app.get('/', isLoggedIn, function(req, res) {
  // if(req.session.loggedIn){
  res.render('index');
  // } else {
    // res.redirect('/login');
  // }
});

app.get('/create', function(req, res) {
  res.redirect('/login');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
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
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/login', function(req, res) {


  // db.knex.insert({username:'kenny'}).into('users').then( function(table) {
  //     res.send(table);
  // });

  // db.knex.schema.dropTable('users').then(function(){
  //   res.send('TABLE HAS BEEN DROPPED... TO THE GROUND');
  // });

  db.knex.select('*')
    .from('users')
    .where('username',req.body.username)
    .then( function(queryResult){
      if(queryResult.length){
        req.session.regenerate( function(err) {
          if(!err) {
            req.session.loggedIn = true;
            res.send(req.session);
          }
        });

      }
    });

  // url, baseUrl, originalUrl, query, route
  // res.send(req.url);

  //logging in user:
  //if logged in succesfully



})


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;

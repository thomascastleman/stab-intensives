var express 			= require('express');
var app 				= express();
var mustacheExpress 	= require('mustache-express');
var bodyParser 			= require('body-parser');
var cookieParser 		= require('cookie-parser');
var session 			= require('cookie-session');
var passport 			= require('passport');
var creds				= require('./credentials.js');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('html', mustacheExpress());
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/views'));

// configure session
app.use(session({ 
	secret: creds.SESSION_SECRET,
	name: 'session',
	resave: true,
	saveUninitialized: true
}));

var auth = require('./auth.js').init(app, passport);	// include auth file
var admin = require('./admin.js').init(app);

app.get('/', function(req, res) {
	res.end();
});

// start server
var server = app.listen(8080, function() {
	console.log('Intensives server listening on port %d', server.address().port);
});

// fallback redirection to landing page
app.get('*', function(req, res) {
	res.redirect('/');
});
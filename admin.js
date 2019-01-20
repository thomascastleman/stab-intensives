
var con = require('./database.js').connection;
var auth = require('./auth.js');

module.exports = {
	// set up admin routes
	init: function(app) {

		// add a new intensive to database
		app.post('/createIntensive', auth.isAdmin, function(req, res) {

		});

		// delete an intensive from system
		app.post('/deleteIntensive', auth.isAdmin, function(req, res) {

		});
	}
}

var con = require('./database.js').connection;
var auth = require('./auth.js');
var creds = require('./credentials.js');

module.exports = {
	init: function(app) {
		// allow authenticated students to access signup page
		app.get('/signup', auth.restrictAuth, function(req, res) {
			var render = {};

			// check system vars to see if sign ups are open
			con.query('SELECT value FROM system WHERE name = ?;', ['signUpsAvailable'], function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					if (rows[0].value == 1) {
						// get info of all intensives from db
						con.query('SELECT uid, name, IF(minGrade = 9, 0, minGrade) AS minGrade, minAge FROM intensives;', function(err, rows) {
							if (!err && rows !== undefined && rows.length > 0) {
								render.intensives = rows;
							}

							// render page with all intensives
							res.render('signup.html', render);
						});
					} else {
						// notify user that signups are not available
						res.render('signupNotAvailable.html');
					}
				} else {
					res.render('error.html', { message: "Failed to determine if sign-up is open." });
				}
			});
		});

		// allow authenticated student to post their preferences
		app.post('/signup', auth.isAuthenticated, function(req, res) {

			if (req.body.choices) {
				

			}

		});

		// allow student to confirm which choices they last selected
		app.get('/signupConfirm', auth.isAuthenticated, function(req, res) {

		});
	}
}
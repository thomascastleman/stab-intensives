
var con = require('./database.js').connection;
var auth = require('./auth.js');
var creds = require('./credentials.js');
var system = require('./system.js');

module.exports = {
	init: function(app) {
		// allow authenticated students to access signup page
		app.get('/signup', auth.restrictAuth, function(req, res) {
			var render = {};

			// check system vars to see if sign ups are open
			con.query('SELECT value FROM system WHERE name = ?;', ['signUpsAvailable'], function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					if (rows[0].value == 1) {
						// register that sign up is available
						render.available = true;

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
						res.render('signup.html', { available: false });
					}
				} else {
					res.render('error.html', { message: "Failed to determine if sign-up is open." });
				}
			});
		});

		// allow authenticated student to post their preferences
		app.post('/signup', auth.isAuthenticated, function(req, res) {
			// check if field is null
			if (req.body.choices) {
				// get number of choices allotted to students
				system.getOneSystemVar('numChoices', function(err, value) {
					if (!err) {
						var studentUID = req.user.local.uid;
						var insertChoices = [];
						var choices = req.body.choices.slice(0, parseInt(value, 10));

						// parse to integer UID's, add to array to insert
						var c = 0;
						for (var i = 0; i < choices.length; i++) {
							choices[i] = parseInt(choices[i], 10);
							if (choices[i] != NaN)
								insertChoices.push([studentUID, choices[i], c++]);
						}

						// insert preferences into preference table
						con.query('INSERT INTO preferences (studentUID, intensiveUID, choice) VALUES ?;', [insertChoices], function(err) {
							res.send(err);
						});
					} else {
						res.send(err)
					}
				});
			} else {
				res.send("No choices specified in request.");
			}
		});

		// allow student to confirm which choices they last selected
		app.get('/signupConfirm', auth.isAuthenticated, function(req, res) {
			// select intensives this user has signed up for
			con.query('SELECT choice + 1 AS choice, intensives.name FROM preferences JOIN intensives ON preferences.intensiveUID = intensives.uid WHERE preferences.studentUID = ? ORDER BY preferences.choice ASC;', [req.user.local.uid], function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					res.render('signupConfirm.html', { intensives: rows, intensivesExist: true });
				} else if (rows.length == 0) {
					res.render('signupConfirm.html');
				}
			});
		});
	}
}
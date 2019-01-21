
var con = require('./database.js').connection;
var auth = require('./auth.js');
var creds = require('./credentials.js');
var system = require('./system.js');

module.exports = {
	init: function(app) {
		// allow authenticated students to access signup page
		app.get('/signup', auth.restrictAuth, function(req, res) {
			var render = {};

			// get all system vars
			system.getAllSystemVars(function(err, vars) {
					// register sign up portal if sign ups are available
					if (vars['signUpsAvailable'] == 1) {
						// register that sign up is available
						render.available = true;
						render.numChoices = vars['numChoices'];

						// get info of all intensives from db
						con.query('SELECT uid, name, IF(minGrade = 9, 0, minGrade) AS minGrade, minAge FROM intensives;', function(err, rows) {
							if (!err && rows !== undefined && rows.length > 0) {
								render.intensives = rows;
								render.numIntensives = rows.length;
							}

							// get the existing preferences for this user, if they exist
							module.exports.getChosenIntensives(req.user.local.uid, function(err, intensives) {
								// transfer choices to render object
								render.choices = [];
								for (var i = 0; i < intensives.length; i++) {
									render.choices.push(intensives[i].uid);
								}

								// render page with all intensives
								res.render('signup.html', render);
							});
						});
					} else {
						// notify user that signups are not available
						res.render('signup.html', { available: false });
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
							// convert to integer
							choices[i] = parseInt(choices[i], 10);

							// if valid choice ID, add to insert batch
							if (choices[i] != NaN)
								insertChoices.push([studentUID, choices[i], c++]);
						}

						// make sure previous preference data is flushed
						con.query('DELETE FROM preferences WHERE studentUID = ?;', [studentUID], function(err) {
							if (!err) {
								// insert preferences into preference table
								con.query('INSERT INTO preferences (studentUID, intensiveUID, choice) VALUES ?;', [insertChoices], function(err) {
									res.send(err);
								});
							} else {
								res.send(err);
							}
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
			var render = {};

			// get the sign up availability status
			system.getOneSystemVar('signUpsAvailable', function(err, value) {
				// if value fetched properly
				if (!err) {
					// register sign ups status in render object
					render.signUpsAvailable = value == "1" ? true : false;
				}

				// get the choices for this user
				module.exports.getChosenIntensives(req.user.local.uid, function(err, intensives) {
					// register that intensive choices exist
					render.intensivesExist = (intensives !== undefined && intensives.length > 0);
					render.intensives = intensives;

					// check if number of chosen intensives satisfies required number of choices
					system.getOneSystemVar('numChoices', function(err, value) {
						if (!err) {
							render.numChoices = parseInt(value, 10);
							render.satisfies = intensives.length == render.numChoices;
						}

						// render confirmation page with choices
						res.render('signupConfirm.html', render);
					});
				});
			});
		});
	},

	// get the intensives chosen by a given user 
	getChosenIntensives: function(userUID, callback) {
		// select intensives this user has signed up for
		con.query('SELECT choice + 1 AS choice, intensives.name, intensives.uid FROM preferences JOIN intensives ON preferences.intensiveUID = intensives.uid WHERE preferences.studentUID = ? ORDER BY preferences.choice ASC;', [userUID], function(err, rows) {
			callback(err, rows);
		});
	}
}
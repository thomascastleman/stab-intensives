
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

					// get all intensives, with this user's choice info
					con.query('SELECT i.uid, i.name, IF(i.minGrade = 9, 0, i.minGrade) AS minGrade, i.minAge, p.choice FROM intensives i LEFT JOIN preferences p ON i.uid = p.intensiveUID AND p.studentUID = ?;', [req.user.local.uid], function(err, rows) {
						if (!err && rows !== undefined && rows.length > 0) {
							render.intensives = rows;
							render.intensiveUIDs = [];
							render.choices = [];

							// collect more specific data about intensives to send
							for (var i = 0; i < rows.length; i++) {
								// add intensive UID to array
								render.intensiveUIDs.push(rows[i].uid);

								// if this intensive was chosen, insert its ID into array of choices at correct position
								if (rows[i].choice != null)
									render.choices.splice(rows[i].choice,0, rows[i].uid);
							}
						}

						// render page with all intensives
						res.render('signup.html', render);
					});
				} else {
					// notify user that signups are not available
					res.render('signup.html', { available: false });
				}
			});
		});

		// allow authenticated student to post their preferences
		app.post('/signup', auth.isAuthenticated, function(req, res) {
			// ensure field is not null
			if (req.body.choices) {
				// ensure an admin isn't trying to sign up
				if (!req.user.local.isAdmin) {
					// get number of choices allotted to students
					system.getOneSystemVar('numChoices', function(err, value) {
						if (!err) {
							var studentUID = req.user.local.uid;
							var insertChoices = [];
							var choices = req.body.choices.slice(0, parseInt(value, 10));	// take only the prescribed number of choices

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
										res.send({ error: err != null });
									});
								} else {
									res.send({ error: err != null });
								}
							});
						} else {
							res.send({ error: err != null });
						}
					});
				} else {
					res.send({ error: true, admin: true });
				}
			} else {
				res.send("No choices specified in request.");
			}
		});

		// allow student to confirm which choices they last selected
		app.get('/confirm', auth.isAuthenticated, function(req, res) {
			var render = {};

			// get system variables (determine signup availability, number of choices)
			system.getAllSystemVars(function(err, vars) {
				if (!err) {
					render.signUpsAvailable = vars['signUpsAvailable'];	// register sign ups status in render object
					render.numChoices = vars['numChoices'];	// register number of intensive choices
				}

				// get the choices for this user
				module.exports.getChosenIntensives(req.user.local.uid, function(err, intensives) {
					// register that intensive choices exist
					render.intensivesExist = (intensives !== undefined && intensives.length > 0);
					render.intensives = intensives == undefined ? [] : intensives;

					// register whether or not registration has satisfied number of choices requirement
					render.satisfies = intensives.length == render.numChoices;

					// render confirmation page with choices
					res.render('confirm.html', render);
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
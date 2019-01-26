
var system = require('./system.js');
var con = require('./database.js').connection;
var auth = require('./auth.js');
const hr = require('hospitals-and-residents');
const ordinal = require('ordinal');
const moment = require('moment');

var NUMCHOICES;	// number of intensive choices allotted to students
var PRIORITIZE_GRADE;	// whether or not grade priority is being factored into matching

// intensive object
function Intensive(dbUID, minGrade, minAge) {
	this.dbUID = dbUID;
	this.minGrade = minGrade;
	this.minAge = minAge;
}

// student object
function Student(dbUID, age, grade, rank) {
	this.dbUID = dbUID;
	this.age = age;
	this.grade = grade;
	this.rank = rank;

	// metric for grade priority
	this.gradeP = ([12, 11, 10, 9].indexOf(this.grade) + 1) / 4.0
}

// determine the legality of a student / intensive pair
hr.checkLegality = function(int, stu) {
	// check for violation of grade and age restrictions
	return stu.grade >= int.minGrade && stu.age >= int.minAge;
}

// define soft cost of student / intensive pair
hr.softCost = function(int, stu) {
	// calculate cost of pair due to student preference
	var rankP = stu.rank.indexOf(int.dbUID) == -1 ? 1 : (stu.rank.indexOf(int.dbUID) + 1) / (NUMCHOICES + 1);

	// return cost, summed with grade priority if being used
	return rankP + (PRIORITIZE_GRADE ? stu.gradeP : 0);
}

module.exports = {

	// set up routes for matching functionality
	init: function(app) {
		// show matching portal
		app.get('/match', auth.restrictAdmin, function(req, res) {
			// get system variables to check if signups are out
			system.getAllSystemVars(function(err, vars) {
				// if signups are closed, proceed
				if (!vars['signUpsAvailable']) {
					var render = vars;

					// check if any matching data exists
					con.query('SELECT COUNT(*) AS count FROM matching;', function(err, rows) {
						if (!err && rows !== undefined && rows.length > 0) {
							// if matching exists
							if (rows[0].count > 0) {
								// get matching info from matching table
								con.query('SELECT i.name AS intensiveName, i.uid AS intensiveUID, s.name AS studentName, s.uid AS studentUID, p.choice + 1 AS choice FROM intensives i LEFT JOIN matching m ON m.intensiveUID = i.uid LEFT JOIN students s ON m.studentUID = s.uid LEFT JOIN preferences p ON m.intensiveUID = p.intensiveUID AND m.studentUID = p.studentUID;', function(err, rows) {
									if (!err && rows !== undefined) {

										var intensiveIDToObject = {};

										// for each row returned
										for (var i = 0; i < rows.length; i++) {
											var intUID = rows[i].intensiveUID;

											// if no existing object for this intensive yet
											if (intensiveIDToObject[intUID] == null) {
												// create an object to store this intensive's data
												intensiveIDToObject[intUID] = {
													intensiveUID: intUID,
													intensiveName: rows[i].intensiveName,
													students: []
												};
											}

											// if this row represents an assignment between student and intensive
											if (rows[i].studentUID != null) {
												// format choice
												if (rows[i].choice == null) {
													rows[i].choice = 'Arbitrary';
												} else {
													rows[i].choice = ordinal(rows[i].choice);
												}

												// construct student object
												var stu = {
													studentUID: rows[i].studentUID, 
													studentName: rows[i].studentName, 
													choice: rows[i].choice
												}

												// add student object to intensive object
												intensiveIDToObject[intUID].students.push(stu);
											}
										}

										// convert association to list of intensive objects
										render.intensives = [];
										for (var id in intensiveIDToObject) {
											if (intensiveIDToObject.hasOwnProperty(id)) {
												render.intensives.push(intensiveIDToObject[id]);
											}
										}

										res.render('match.html', render);
									} else {
										res.render('error.html', { message: "Unable to load matching." });
									}
								});
							} else {
								render.noMatching = true;
								res.render('match.html', render);
							}
						} else {
							res.render('error.html', { message: "Unable to retrieve matching data." });
						}
					});
				} else {
					res.render('error.html', { message: "Sign-ups must be closed before a matching can be generated." });
				}
			});
		});

		// generate a new matching, re-render /match page
		app.post('/newMatching', auth.isAdmin, function(req, res) {
			// check if intensives exist
			con.query('SELECT COUNT(*) AS count FROM intensives;', function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					// if intensives exist in db
					if (rows[0].count > 0) {
						// check if students exist
						con.query('SELECT COUNT(*) AS count FROM students;', function(err, rows) {
							if (!err && rows !== undefined && rows.length > 0) {
								// if students exist as well
								if (rows[0].count > 0) {
									// generate new matching and write to matching table
									module.exports.match(function(err) {
										if (!err) {
											// get and format the current time
											var now = moment().format('MMMM Do YYYY, h:mm a');

											// update time of last matching
											con.query('UPDATE system SET value = ? WHERE name = ?;', [now, 'lastMatching'], function(err) {
												if (!err) {
													// show admin matching page with new match
													res.redirect('/match');
												} else {
													res.render('error.html', { message: "Failed to update time of last matching." });
												}
											});
										} else {
											res.render('error.html', { message: "Failed to generate new matching." });
										}
									});
								} else {
									res.render('error.html', { message: "You must upload student data before constructing a matching." });
								}
							} else {
								res.render('error.html', { message: "An error occurred attempting to construct a new matching." });
							}
						});
					} else {
						res.render('error.html', { message: "You must upload intensive data before constructing a matching." });
					}
				} else {
					res.render('error.html', { message: "An error occurred attempting to construct a new matching." });
				}
			});
		});

		// reassign a student to a different intensive
		app.post('/reassign', auth.isAdmin, function(req, res) {
			// if required fields exist
			if (req.body.studentUID !== null && req.body.intensiveUID !== null) {
				// apply update to matching
				con.query('UPDATE matching SET intensiveUID = ? WHERE studentUID = ?;', [req.body.intensiveUID, req.body.studentUID], function(err) {
					res.send(err);
				});
			}
		});
	},

	// compute a full matching using student / intensive data in db, write to matching table
	match: function(callback) {
		// update NUMCHOICES and PRIORITIZE_GRADE
		module.exports.updateMatchingParameters(function(err) {
			if (!err) {
				// construct student objects from db
				module.exports.constructStudentObjects(function(err, students) {
					if (!err) {
						// construct intensive objects from db
						module.exports.constructIntensiveObjects(function(err, intensives) {
							if (!err) {
								// generate a matching
								hr.findMatching(intensives, students, function(err) {
									if (!err) {
										// write matching assignments to matching table in db
										module.exports.writeMatchingToDatabase(intensives, students, function(err) {
											callback(err);
										});
									} else {
										callback(err);	
									}
								});
							} else {
								callback(err);
							}
						});
					} else {
						callback(err);
					}
				});
			} else {
				callback(err);
			}
		});
	},

	// retrieve system variables related to matching
	updateMatchingParameters: function(callback) {
		// get system variables from db
		system.getAllSystemVars(function(err, vars) {
			if (!err) {
				// update local matching variables
				NUMCHOICES = vars['numChoices'];
				PRIORITIZE_GRADE = vars['prioritizeByGrade'];
			}

			callback(err);
		});
	},

	// construct js student objects from data in db
	constructStudentObjects: function(callback) {
		var students = {};
		var objects = [];

		// get all students, joined with preference info
		con.query('SELECT s.uid, s.age, s.grade, p.intensiveUID, p.choice FROM students s LEFT JOIN preferences p ON s.uid = p.studentUID;', function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				// populate a hashmap of student objects, with student UID as key, object as value
				for (var i = 0; i < rows.length; i++) {

					// if haven't seen this student before
					if (students[rows[i].uid] == null) {
						// construct new student object
						students[rows[i].uid] = hr.initResident(1, new Student(rows[i].uid, rows[i].age, rows[i].grade, []));
					}

					// if preference data exists in this row
					if (rows[i].choice != null) {
						// add intensive UID choice in proper position
						students[rows[i].uid].rank.splice(rows[i].choice, 0, rows[i].intensiveUID);
					}
				}

				// convert to list of student objects
				for (id in students) {
					if (students.hasOwnProperty(id)) {
						var stu = students[id];

						// if student has signed up for anything less than the prescribed number of choices, render them a nonrespondent
						if (stu.rank.length < NUMCHOICES)
							stu.rank = [];

						// add student to list
						objects.push(students[id]);
					}
				}

				// callback on student objects
				callback(err, objects);
			} else {
				callback(err);
			}
		});
	},

	// construct js intensive objects from data in db
	constructIntensiveObjects: function(callback) {
		// get all intensive info
		con.query('SELECT * FROM intensives;', function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				var objects = [];

				// for each intensive
				for (var i = 0; i < rows.length; i++) {
					objects.push(hr.initHospital(rows[i].maxCapacity, new Intensive(rows[i].uid, rows[i].minGrade, rows[i].minAge)));
				}

				// callback on js objects
				callback(err, objects);
			} else {
				callback(err);
			}
		});
	},

	// write a matching into the matching table in the database
	writeMatchingToDatabase: function(intensives, students, callback) {
		// gather a mapping from intensive matching id's to database id's
		var idToDBuid = {};
		for (var i = 0; i < intensives.length; i++) {
			idToDBuid[intensives[i].id] = intensives[i].dbUID;
		}

		// construct list of student ID, intensive ID pairs for insertion into database
		var studentIntensivePairs = [];
		for (var i = 0; i < students.length; i++) {
			studentIntensivePairs.push([students[i].dbUID, idToDBuid[students[i].assigned_id]]);
		}

		// clear existing matching, if any
		con.query('DELETE FROM matching;', function(err) {
			if (!err) {
				// insert pairs into database
				con.query('INSERT INTO matching (studentUID, intensiveUID) VALUES ?;', [studentIntensivePairs], function(err) {
					callback(err);
				});
			} else {
				callback(err);
			}
		});
	}

}

// debug: testing function to generate random preference data for all students in students table
function generateRandomPreferencesForTestData(callback) {
	// get system variables to determine number of choices to make for each student
	system.getAllSystemVars(function(err, vars) {
		if (!err) {
			var numChoices = vars['numChoices'];
			var intensiveUIDs = [];
			var preferences = [];

			// get intensive UID's 
			con.query('SELECT uid FROM intensives;', function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					for (var i = 0; i < rows.length; i++) {
						intensiveUIDs.push(rows[i].uid);
					}

					// get student UIDs
					con.query('SELECT uid FROM students;', function(err, rows) {
						if (!err && rows !== undefined && rows.length > 0) {
							// for each student
							for (var i = 0; i < rows.length; i++) {
								// copy the intensive UID's array
								var copy = intensiveUIDs.slice();

								// for each choice 
								for (var n = 0; n < numChoices; n++) {
									// choose random intensive, add to preferences
									var rand = Math.floor(Math.random() * copy.length);
									preferences.push([rows[i].uid, copy[rand], n]);
									copy.splice(rand, 1);
								}
							}

							// flush the existing preference data
							con.query('DELETE FROM preferences;', function(err) {
								if (!err) {
									// insert preference data
									con.query('INSERT INTO preferences (studentUID, intensiveUID, choice) VALUES ?;', [preferences], function(err) {
										callback(err);
									});
								} else {
									callback(err);
								}
							});
						} else {
							callback(err);
						}
					});
				} else {
					callback(err);
				}
			});
		} else {
			callback(err);
		}
	});
}
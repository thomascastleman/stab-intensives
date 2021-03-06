
var con = require('./database.js').connection;
var auth = require('./auth.js');
var creds = require('./credentials.js');
var system = require('./system.js');
var moment = require('moment');
const http = require('http');
const fs = require('fs');
const multer = require('multer');
const csv = require('fast-csv');
const upload = multer({ dest: 'tmp/csv/' });

module.exports = {
	// set up admin routes
	init: function(app) {
		// on upload of a student CSV file
		app.post('/uploadStudentCSV', upload.single('file'), auth.isAdmin, function(req, res) { // auth.isAdmin, function (req, res) {
		  	const fileRows = [];

			// check that user uploaded file
			if (req.file) {
			  	// check that uploaded file is CSV
				if (!req.file.originalname.includes(".csv")) {
		        	res.render('error.html', { message: "The file you uploaded is not a CSV file. Please try again with a CSV file." });
		   		} else {
					// open uploaded file
					csv.fromPath(req.file.path)
					    .on("data", function (data) {
					    	// push each row
							fileRows.push(data);
					    })
					    .on("end", function () {
					    	// remove temp file
							fs.unlinkSync(req.file.path);

							if (!req.file.originalname.match(/\.(csv)$/)) {
		        				res.render('error.html', { message: "Not a CSV!" });
		   					}

							// remove the header of the CSV file
							fileRows.shift();

							// ensure students table is clear
							con.query('DELETE FROM students;', function(err) {
								if (!err) {
									var match; 
									// parse the fourth column for numeric grade value ("Grade N")
									for (var i = 0; i < fileRows.length; i ++){
										match = fileRows[i][3].match(/\d+/);

										// ensure match was found
										if (match) {
											fileRows[i][3] = match[0];
										}
									}

									// batch insert student data into students table
									con.query('INSERT INTO students (name, email, age, grade) VALUES ?;', [fileRows], function(err) {
										if (!err) {
											// record current time
											var now = moment().format('MMMM Do YYYY, h:mm a');

											// set last update on student CSV to current time
											con.query('UPDATE system SET value = ? WHERE name = ?;', [now, 'studentCSVLastUpdate'], function(err) {
												if (!err) {
													res.redirect('/students');
												} else {
													res.render('error.html', { message: "Failed to register time of last update." });
												}
											});
										} else {
											//console.log(err);
											res.render('error.html', { message: "Failed to upload students to database." });
										}
									});
								} else {
									res.render('error.html', { message: "Failed to clear existing record of students." });
								}
							});
					    });
				}
			} else {
				res.render('error.html', { message: "You must post an actual file to be uploaded." });
			}
		});

		// on upload of an intensives CSV file
		app.post('/uploadIntensiveCSV', upload.single('file'), auth.isAdmin, function (req, res) {
			const fileRows = [];

			// check if user uploaded a file
			if (req.file) {
				// check that uploaded file is a CSV
				if (!req.file.originalname.includes(".csv")) {
					res.render('error.html', { message: "The file you uploaded is not a CSV file. Please try again with a CSV file." });
				} else {
					// open uploaded file
					csv.fromPath(req.file.path)
					    .on("data", function (data) {
					    	// push each row
							fileRows.push(data);
					    })
					    .on("end", function () {
					    	// remove temp file
							fs.unlinkSync(req.file.path);

							// remove the header of the CSV file
							fileRows.shift();

							for (var i = 0; i < fileRows.length; i ++){
								fileRows[i].shift()
								fileRows[i][2] = fileRows[i][2].match(/\d+/)[0];
							}

							// ensure intensives table is clear
							con.query('DELETE FROM intensives;', function(err) {
								if (!err) {
									// batch insert intensive data into intensives table
									con.query('INSERT INTO intensives (name, maxCapacity, minGrade, minAge) VALUES ?;', [fileRows], function(err) {
										if (!err) {
											res.redirect('/intensives');
										} else {
											res.render('error.html', { message: "Failed to upload intensives to database." });
										}
									});
								} else {
									res.render('error.html', { message: "Failed to clear existing record of intensives." });
								}
							});
					    });
				}
			} else {
				res.render('error.html', { message: "You must post an actual file to be uploaded." });
			}
		});

		// show main tab of admin portal
		app.get('/admin', auth.restrictAdmin, function(req, res) {
			res.render('admin.html', { adminName: req.user.name.givenName });
		});

		// show tab for managing intensive data in admin portal
		app.get('/intensives', auth.restrictAdmin, function(req, res) {
			var render = {};

			// get all intensives recorded in db
			con.query('SELECT uid, name, maxCapacity, IF(minGrade = 9, "None", minGrade) AS minGrade, IF(minAge = 0, "None", minAge) AS minAge FROM intensives;', function(err, rows) {
				if (!err && rows !== undefined) {
					// add intensives info to render object
					render.intensives = rows;
					render.numIntensives = rows.length;
					render.intensivesExist = rows.length > 0;

					// get the system variables
					system.getAllSystemVars(function(err, vars) {
						if (!err) {
							// add system variables to render object
							render.variables = vars;

							// render page
							res.render('adminIntensives.html', render);
						} else {
							res.render('error.html', { message: "Unable to retrieve system parameters." });
						}
					});
				} else {
					res.render('error.html', { message: "Unable to gather intensives info." });
				}
			});
		});

		// show tab for managing student data in admin portal
		app.get('/students', auth.restrictAdmin, function(req, res) {
			var render = { domain: creds.domain };

			// get all intensives recorded in db
			con.query('SELECT COUNT(*) AS count FROM intensives;', function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					// register if intensives exist
					render.intensivesExist = rows[0].count > 0;

					// get the system variables
					system.getAllSystemVars(function(err, vars) {
						if (!err) {
							// add system variables to render object
							render.variables = vars;

							// get list of possible states for numChoices variable
							render.choiceNumbers = [];
							for (var i = 1; i <= rows[0].count; i++) {
								render.choiceNumbers.push({ n: i, selected: i == render.variables.numChoices });
							}

							// get all info of every registered student
							con.query('SELECT name, email, age, grade, DATE_FORMAT(lastSignUp, "%M %D %Y, %l:%i %p") AS lastSignUp, lastSignUp IS NOT NULL AS signUpStatus FROM students;', function(err, rows) {
								if (!err && rows !== undefined && rows.length > 0) {
									render.students = rows;
									render.studentsExist = true;
								}

								// render admin portal
								res.render('adminStudents.html', render);
							});
						} else {
							res.render('error.html', { message: "Unable to retrieve system parameters." });
						}
					});
				} else {
					res.render('error.html', { message: "Unable to gather intensives info." });
				}
			});
		});

		// show tab for managing data in admin portal
		app.get('/manageData', auth.restrictAdmin, function(req, res) {
			// get the system variables
			system.getAllSystemVars(function(err, vars) {
				if (!err) {
					// add system variables to render object
					var render = {
						variables: vars
					};

					// render data management tab
					res.render('adminManageData.html', render);
				} else {
					res.render('error.html', { message: "Unable to retrieve system parameters." });
				}
			});
		});

		// add a new intensive to database
		app.post('/createIntensive', auth.isAdmin, function(req, res) {
			// if fields all exist
			if (req.body.name !== '' && req.body.maxCapacity !== '' && req.body.minGrade !== '' && req.body.minAge !== '') {

				var capacity = parseInt(req.body.maxCapacity, 10);

				// check that admin has entered legitimate capacity
				if (capacity != NaN && capacity > 0) {
					// insert intensive into database
					con.query('INSERT INTO intensives (name, maxCapacity, minGrade, minAge) VALUES (?, ?, ?, ?);', [req.body.name, req.body.maxCapacity, req.body.minGrade, req.body.minAge], function(err) {
						if (!err) {
							res.redirect('/intensives');
						} else {
							res.render('error.html', { message: "There was an error adding the intensive to the database." });
						}
					});
				} else {
					res.render('error.html', { message: "Invalid maximum capacity: " + req.body.maxCapacity });
				}
			} else {
				res.render('error.html', { message: "All fields must be filled in to create an intensive." });
			}
		});

		// delete an intensive from system
		app.post('/deleteIntensive', auth.isAdmin, function(req, res) {
			// if UID exists
			if (req.body.uid !== null) {
				// attempt to delete intensive with this UID
				con.query('DELETE FROM intensives WHERE uid = ?;', [req.body.uid], function(err) {
					if (!err) {
						// update numChoices sys variable if necessary
						system.updateNumChoicesSystemVar(function(numChoices, err) {
							// callback with new number of choices, and error if thrown
							res.send({ numChoices: numChoices, err: err });
						});
					} else {
						res.send({ err: err });
					}
				});
			} else {
				res.send({ err: err });
			}
		});

		// wipe tables in database that pertain to a specific matching
		app.get('/wipeAllData', auth.restrictAdmin, function(req, res) {
			// ensure that sign ups are closed before wiping data
			system.getOneSystemVar('signUpsAvailable', function(err, value) {
				if (!err && value == '0') {
					// remove matching info
					con.query("DELETE FROM matching;", function(suc) {
						// remove gathered student preferences
						con.query("DELETE FROM preferences;", function(succ) {
							// remove all student data
							con.query("DELETE FROM students;", function(succc) {
								// remove all intensives data
								con.query("DELETE FROM intensives;", function(succcc) {
									// check if numChoices variable needs to be updated (it likely does now that everything's gone)
									system.updateNumChoicesSystemVar(function(numChoices, err1) {
										// update time of last update, set to null
										con.query('UPDATE system SET value = NULL WHERE name = ? OR name = ?;', ['studentCSVLastUpdate', 'lastMatching'], function(err2) {
											// if an error occurred, render an error message
											if (suc || succ || succc || succcc || err1 || err2) {
												res.render("error.html", {message: "Failed to remove all data."});
											} else {
												res.redirect('/admin');
											}
										});
									});
								});		
							});	
						});
					});
				} else {
					res.render('error.html', { message: "The student sign-ups must be closed before you can erase all data." });
				}
			});
		});

		// edit the number of choices students are allowed to rank
		app.post('/changeNumChoices', auth.isAdmin, function(req, res) {
			// if field is not null
			if (req.body.numChoices !== null) {
				// update system variable
				con.query('UPDATE system SET value = ? WHERE name = ?;', [req.body.numChoices, "numChoices"], function(err) {
					if (!err) {
						res.redirect('/students');
					} else {
						res.render('error.html', { message: "Unable to update number of student choices." });
					}
				});
			} else {
				res.render('error.html', { message: "Unable to set number of student choices due to null field."})
			}
		});

		// change whether or not grade is factored into matching
		app.post('/prioritizeGrade', auth.isAdmin, function(req, res) {
			// if field is not null
			if (req.body.prioritizeGrade !== null) {
				// update system variable
				con.query('UPDATE system SET value = ? WHERE name = ?;', [req.body.prioritizeGrade, "prioritizeByGrade"], function(err) {
					if (!err) {
						res.redirect('/match');
					} else {
						res.render('error.html', { message: "Unable to update use of grade priority." });
					}
				});
			} else {
				res.render('error.html', { message: "Unable to use of grade priority due to null field."})
			}
		});

		// change whether sign ups are open or closed
		app.post('/changeSignUpRelease', auth.isAdmin, function(req, res) {
			// if field is not null
			if (req.body.signUpsAvailable !== '') {
				// update system variable
				con.query('UPDATE system SET value = ? WHERE name = ?;', [req.body.signUpsAvailable, "signUpsAvailable"], function(err) {
					if (!err) {
						res.redirect('/students');
					} else {
						res.render('error.html', { message: "Unable to update status of sign-ups." });
					}
				});
			} else {
				res.render('error.html', { message: "Unable to update status of sign-ups due to null field."})
			}
		});

	}

}
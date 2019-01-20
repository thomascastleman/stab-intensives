
var con = require('./database.js').connection;
var auth = require('./auth.js');
const http = require('http');
const fs = require('fs');
const multer = require('multer');
const csv = require('fast-csv');
const upload = multer({ dest: 'tmp/csv/' });

module.exports = {
	// set up admin routes
	init: function(app) {
		// on upload of a student CSV file
		app.post('/uploadStudentCSV', upload.single('file'), auth.isAdmin, function (req, res) {
		  const fileRows = [];

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

				// ensure students table is clear
				con.query('DELETE FROM students;', function(err) {
					if (!err) {
						// batch insert student data into students table
						con.query('INSERT INTO students (name, email, age, grade) VALUES ?;', [fileRows], function(err) {
							if (!err) {
								res.redirect('/admin');
							} else {
								res.render('error.html', { message: "Failed to upload students to database." });
							}
						});
					} else {
						res.render('error.html', { message: "Failed to clear existing record of students." });
					}
				});
		    });
		});

		// render admin portal
		app.get('/admin', auth.restrictAdmin, function(req, res) {
			var render = {};

			// get all intensives recorded in db
			con.query('SELECT * FROM intensives;', function(err, rows) {
				if (!err && rows !== undefined) {
					// add intensives info to render object
					render.intensives = rows;
					render.intensivesExist = rows.length > 0;

					// get the system variables
					module.exports.getSystemVariables(function(err, vars) {
						if (!err) {
							// add system variables to render object
							render.variables = vars;

							// get list of possible states for numChoices variable
							render.choiceNumbers = [];
							for (var i = 1; i <= render.intensives.length; i++) {
								render.choiceNumbers.push({ n: i, selected: i == render.variables.numChoices });
							}

							// render admin portal
							res.render('admin.html', render);
						} else {
							res.render('error.html', { message: "Unable to retrieve system parameters." });
						}
					});
				} else {
					res.render('error.html', { message: "Unable to gather intensives info." });
				}
			});
		});

		// add a new intensive to database
		app.post('/createIntensive', auth.isAdmin, function(req, res) {
			// if fields all exist
			if (req.body.name !== null && req.body.maxCapacity !== null && req.body.minGrade !== null && req.body.minAge !== null) {
				// insert intensive into database
				con.query('INSERT INTO intensives (name, maxCapacity, minGrade, minAge) VALUES (?, ?, ?, ?);', [req.body.name, req.body.maxCapacity, req.body.minGrade, req.body.minAge], function(err) {
					if (!err) {
						res.redirect('/admin');
					} else {
						res.render('error.html', { message: "There was an error adding the intensive to the database." });
					}
				});
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
						res.redirect('/admin');
					} else {
						res.render('error.html', { message: "There was an error deleting this intensive." });
					}
				});
			} else {
				res.render('error.html', { message: "Unable to delete intensive due to a null field." });
			}
		});

		// wipe tables in database that pertain to a specific matching
		app.get('/wipeAllData', auth.restrictAdmin, function(req, res){
			con.query("DELETE FROM matching;", function(suc){
				con.query("DELETE FROM preferences;", function(succ){
					con.query("DELETE FROM students;", function(succc){
						con.query("DELETE FROM intensives;", function(succcc){
							// if an error occurred, render an error message
							if (suc || succ || succc || succcc) {
								res.render("error.html", {message: "Failure to delete something :("});
							} else {
								res.redirect('/admin');
							}
						});		
					});	
				});
			});
		});

		// edit the number of choices students are allowed to rank
		app.post('/changeNumChoices', auth.isAdmin, function(req, res) {
			// if field is not null
			if (req.body.numChoices !== null) {
				// update system variable
				con.query('UPDATE system SET value = ? WHERE name = ?;', [req.body.numChoices, "numChoices"], function(err) {
					if (!err) {
						res.redirect('/admin');
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
				con.query('UPDATE system SET value = ? WHERE name = ?;', [req.body.prioritizeGrade, "prioritizeGrade"], function(err) {
					if (!err) {
						res.redirect('/admin');
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
			if (req.body.signUpsAvailable !== null) {
				// update system variable
				con.query('UPDATE system SET value = ? WHERE name = ?;', [req.body.signUpsAvailable, "signUpsAvailable"], function(err) {
					if (!err) {
						res.redirect('/admin');
					} else {
						res.render('error.html', { message: "Unable to update status of sign ups." });
					}
				});
			} else {
				res.render('error.html', { message: "Unable to update status of sign ups due to null field."})
			}
		});

	},

	// pull system variables from db and convert them into their proper format (int, boolean, date, etc)
	getSystemVariables: function(callback) {
		var variables = {};
		// get system variables from db
		con.query('SELECT * FROM system;', function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				// for each system variable
				for (var i = 0; i < rows.length; i++) {
					if (rows[i].type == 'BOOL')
						// cast to boolean
						variables[rows[i].name] = rows[i].value == '1' ? true : false;
					else if (rows[i].type == 'INT')
						// cast to integer
						variables[rows[i].name] = parseInt(rows[i].value, 10);
				}
			}

			// callback on retrieved data
			callback(err, variables);
		});
	}
}
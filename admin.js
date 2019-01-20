
var con = require('./database.js').connection;
var auth = require('./auth.js');

module.exports = {
	// set up admin routes
	init: function(app) {
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

		});

		// change whether sign ups are open or closed
		app.post('/changeSignUpRelease', auth.isAdmin, function(req, res) {

		});

	}
}


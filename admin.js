
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
	}
}
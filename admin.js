
var con = require('./database.js').connection;
var auth = require('./auth.js');

module.exports = {
	// set up admin routes
	init: function(app) {

		app.get('/wipeAllData', function(req, res){
			con.query("DELETE FROM matching;", function(suc){
				con.query("DELETE FROM preferences;", function(succ){
					con.query("DELETE FROM students;", function(succc){
						con.query("DELETE FROM intensives;", function(succcc){
							res.render("error.html", {message: "failure to delete somthing :( "});
						
						});			
					});	
				});
			});

		});

	}
}


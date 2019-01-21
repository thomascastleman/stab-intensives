
var con = require('./database.js').connection;

module.exports = {
	// change the numChoices variable to reflect a change in the number of intensives available
	updateNumChoicesSystemVar: function(callback) {
		// look at numChoices system variable
		con.query('SELECT * FROM system WHERE name = ?;', ['numChoices'], function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				// convert to integer
				var numChoices = parseInt(rows[0].value);

				// count the number of intensives
				con.query('SELECT COUNT(*) AS numIntensives FROM intensives;', function(err, rows) {
					if (!err && rows !== undefined && rows.length > 0) {
						// if the number of choices is more than the number of intensives available
						if (numChoices > rows[0].numIntensives || numChoices == 0) {
							// update numChoices to be number of intensives
							con.query('UPDATE system SET value = ? WHERE name = ?;', [rows[0].numIntensives, 'numChoices'], function(err) {
								if (err)
									callback(numChoices, err);	// callback with same numChoices and the error thrown
								else
									callback(rows[0].numIntensives, err);	// callback with new numChoices, no error
							});
						} else {
							// callback with same numChoices, no error
							callback(numChoices, null);
						}
					} else {
						// callback with same numChoices, and whatever error was thrown
						callback(numChoices, err);
					}
				});
			} else {
				// callback without numChoices, and whatever error was thrown
				callback(null, err);
			}
		});
	},

	// pull system variables from db and convert them into their proper format (int, boolean, date, etc)
	getAllSystemVars: function(callback) {
		var variables = {};
		// get system variables from db
		con.query('SELECT * FROM system;', function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				// for each system variable
				for (var i = 0; i < rows.length; i++) {
					if (rows[i].type == 'BOOL') {
						// cast to boolean
						variables[rows[i].name] = rows[i].value == '1' ? true : false;
					} else if (rows[i].type == 'INT') {
						// cast to integer
						variables[rows[i].name] = parseInt(rows[i].value, 10);
					} else {
						// use default string value
						variables[rows[i].name] = rows[i].value;
					}
				}
			}

			// callback on retrieved data
			callback(err, variables);
		});
	},

	// get the string value of a system variable, given its name
	getOneSystemVar: function(name, callback) {
		// get everything under this system variable name
		con.query('SELECT * FROM system WHERE name = ?;', [name], function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				// callback on the value
				callback(err, rows[0].value);
			} else {
				callback(err, null);
			}
		});
	}
}
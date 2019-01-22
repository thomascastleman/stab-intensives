
var system = require('./system.js');
var con = require('./database.js').connection;
var hr = require('hospitals-and-residents');

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

var hr = require('hospitals-and-residents');

// intensive object
function Intensive() {
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

}

// define soft cost of student / intensive pair
hr.softCost = function(int, stu) {

}

module.exports = {



}
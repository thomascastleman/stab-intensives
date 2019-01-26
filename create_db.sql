
DROP DATABASE IF EXISTS intensives_db;
CREATE DATABASE intensives_db;

USE intensives_db;

-- intensive info
CREATE TABLE intensives (
	uid INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(256),
	maxCapacity INT,
	minGrade INT DEFAULT 9,
	minAge INT DEFAULT 0,
	PRIMARY KEY (uid)
);

-- student info
CREATE TABLE students (
	uid INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(32),
	email VARCHAR(45),
	age INT,
	grade INT,
	lastSignUp DATETIME,
	PRIMARY KEY (uid)
);

-- administrator info
CREATE TABLE admins (
	uid INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(32),
	email VARCHAR(45),
	PRIMARY KEY (uid)
);

-- relation between students and intensives encoding matching
CREATE TABLE matching (
	uid INT NOT NULL AUTO_INCREMENT,
	studentUID INT,
	intensiveUID INT,
	FOREIGN KEY (studentUID) REFERENCES students(uid) ON DELETE CASCADE,
	FOREIGN KEY (intensiveUID) REFERENCES intensives(uid) ON DELETE CASCADE,
	PRIMARY KEY (uid)
);

-- student choices of intensive
CREATE TABLE preferences (
	uid INT NOT NULL AUTO_INCREMENT,
	studentUID INT,
	intensiveUID INT,
	choice INT,
	FOREIGN KEY (studentUID) REFERENCES students(uid) ON DELETE CASCADE,
	FOREIGN KEY (intensiveUID) REFERENCES intensives(uid) ON DELETE CASCADE,
	PRIMARY KEY (uid)
);

-- system variables like how many choices students rank, whether to prioritize by grade
CREATE TABLE system (
	uid INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(32),
	value VARCHAR(64),
	type VARCHAR(16),
	PRIMARY KEY (uid)
);

-- insert defaults for system variables
INSERT INTO system (name, value, type) VALUES 
	("numChoices", "3", "INT"), 
	("prioritizeByGrade", "0", "BOOL"), 
	("signUpsAvailable", "0", "BOOL"), 
	("studentCSVLastUpdate", NULL, "DATE"),
	("lastMatching", NULL, "DATE");
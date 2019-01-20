
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
	FOREIGN KEY (studentUID) REFERENCES students(uid),
	FOREIGN KEY (intensiveUID) REFERENCES intensives(uid),
	PRIMARY KEY (uid)
);

-- student choices of intensive
CREATE TABLE preferences (
	uid INT NOT NULL AUTO_INCREMENT,
	studentUID INT,
	intensiveUID INT,
	choice INT,
	FOREIGN KEY (studentUID) REFERENCES students(uid),
	FOREIGN KEY (intensiveUID) REFERENCES intensives(uid),
	PRIMARY KEY (uid)
);

-- system variables like how many choices students rank, whether to prioritize by grade
CREATE TABLE system (
	uid INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(32),
	value VARCHAR(16),
	PRIMARY KEY (uid)
);

-- insert defaults for system: 5 choices and no grade priority
INSERT INTO system (name, value) VALUES ("numChoices", "5"), ("prioritizeByGrade", "0");





-- DEBUG -----------------------------
INSERT INTO intensives (name, maxCapacity) VALUES ("Art of Argument", 25);
INSERT INTO students (name, email, age, grade) VALUES ("Thomas C", "thomas@gmail.com", 10, 12);
INSERT INTO admins (name, email) VALUES ("Mr. Quagliaroli", "pquagliarolipoli@stab.org");
INSERT INTO matching (studentUID, intensiveUID) VALUES (1, 1);
INSERT INTO preferences (studentUID, intensiveUID, choice) VALUES (1, 1, 3);

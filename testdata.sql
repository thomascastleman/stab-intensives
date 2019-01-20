
SOURCE create_db.sql;

INSERT INTO intensives (name, maxCapacity, minGrade, minAge) VALUES 
	("Art of Argument", 25, 9, 0),
	("Race & Gender", 15, 10, 0),
	("Finding A Way", 35, 9, 0),
	("Movers and Makers", 20, 9, 0), 
	("Francophone Culture", 25, 9, 0),
	("Habitat for Humanity", 15, 9, 18);

INSERT INTO students (name, email, age, grade) VALUES 
	("Thomas Castleman", "thomas@gmail.com", 18, 12),
	("Johnny Lindbergh", "johnny@gmail.com", 19, 12),
	("Test Freshman", "freshman@gmail.com", 15, 9),
	("Test Sophomore", "sophomore@gmail.com", 16, 10),
	("Test Junior", "junior@gmail.com", 17, 11),
	("Test Senior", "senior@gmail.com", 18, 12);

INSERT INTO admins (name, email) VALUES ("Mr. Quagliaroli", "pqemail@stab.org");
CREATE TABLE pockyusers (
	userid varchar(255) NOT NULL,
	username varchar(255) NULL,
	PRIMARY KEY (userid)
);

CREATE TABLE pegs (
	id SERIAL NOT NULL,
	sender varchar(255) REFERENCES pockyusers(userid),
	receiver varchar(255) REFERENCES pockyusers(userid),
	comment varchar(255) NULL,
	PRIMARY KEY (id)
);

CREATE TABLE generalconfig (
	name varchar(255) NOT NULL,
	value integer NOT NULL,
	PRIMARY KEY (name)
);

CREATE TYPE role AS ENUM ('ADMIN', 'UNMETERED', 'RESULTS', 'FINISH', 'RESET', 'UPDATE', 'WINNERS');

CREATE TABLE roles (
	userid varchar(255) REFERENCES pockyusers(userid),
	role role,
	PRIMARY KEY (userid, role)
);

CREATE TABLE stringconfig (
	name varchar(255) NOT NULL,
	value varchar(255) NOT NULL,
	PRIMARY KEY (name, value)
);

// index.js:

"use strict";

/**
 * Central export for all DAO classes.
 * -------------------------------------------------------------
 * Users can import the DAO they need, e.g.:
 *
 * import { DAO, MongoDBDAO, SqliteDAO } from "./index.js";
 */

import DAO from "./lib/dao.js";
import SQLDAO from "./lib/sql-dao.js";
import SqliteDAO from "./lib/sqlite-dao.js";
import MySQLDAO from "./lib/mysql-dao.js";
import PostgresDAO from "./lib/postgres-dao.js";
import MongoDBDAO from "./lib/mongodb-dao.js";

export { DAO, SQLDAO, MongoDBDAO, SqliteDAO, MySQLDAO, PostgresDAO };

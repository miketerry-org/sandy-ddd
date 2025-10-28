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
import SQLDAO from "./lib/daoSQL.js";
import SqliteDAO from "./lib/daosqlite.js";
import MySQLDAO from "./lib/daomysql.js";
import PostgresDAO from "./lib/daopostgres.js";
import MongoDBDAO from "./lib/daomongodb.js";
import DomainModel from "./lib/domainModel.js";
import DomainSchema from "./lib/domainSchema.js";

export {
  DAO,
  SQLDAO,
  MongoDBDAO,
  SqliteDAO,
  MySQLDAO,
  PostgresDAO,
  DomainModel,
  DomainSchema,
};

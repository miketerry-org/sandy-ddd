// index.js:

/**
 * Central export for all DAO classes.
 * -------------------------------------------------------------
 * Users can import the DAO they need, e.g.:
 *
 * import { DAO, MongoDBDAO, SqliteDAO } from "./index.js";
 */
import BaseDriver from "./lib/drivers/baseDriver.js";
import SQLDriver from "./lib/drivers/SQLDriver.js";
import SqliteDriver from "./lib/drivers/driver-sqlite.js";
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

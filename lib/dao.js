// dao.js:

"use strict";

// load all necessary modules
import { Base } from "milwaukee-foundation";

export default class DAO extends Base {
  constructor(config = undefined) {
    super(config);
  }

  async connect() {
    this.requireOverride("connect");
  }

  async disconnect() {
    this.requireOverride("disconnect");
  }

  async insert(target, entity) {
    this.requireOverride("insert");
  }

  async update(target, entity) {
    this.requireOverride("update");
  }

  async delete(target, entity) {
    this.requireOverride("delete");
  }

  async findOne(target, criteria) {
    this.requireOverride("findOne");
  }

  async findAll(target, criteria) {
    this.requireOverride("findAll");
  }

  async transaction(callback) {
    await this.startTransaction();
    try {
      await callback();
      await this.commitTransaction();
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async startTransaction() {
    this.requireOverride("startTransaction");
  }

  async commitTransaction() {
    this.requireOverride("commitTransaction");
  }

  async rollbackTransaction() {
    this.requireOverride("rollbackTransaction");
  }
}

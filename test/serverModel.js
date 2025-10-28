// serverModel.js:

"use strict";

// load all necessary modules
import DomainSchema from "../lib/domainSchema.js";
import DomainModel from "../lib/domainModel.js";

class ServerSchema extends DomainSchema {
  constructor() {
    this.addString("_id", true, 12, 12);
    this.addInteger("http_port", true, 1, 65000, 80);
    this.addString("db_uri", true, 1, 255);
    this.addString("log_name", true, 1, 255);
    this.addInteger("log_expiration_days", true, 1, 365);
    this.addBoolean("log_capped", true, false);
    this.addInteger("log_max_mb", true, 10, 1000, 10);
    this.addInteger("log_max_entries", true, 1, 10000, 1000);
    this.addInteger("rate_limit_minutes", true, 1, 60, 10);
    this.addInteger("rate_limit_requests", true, 1, 1000, 200);
    this.addInteger("body_limit_kb", true, 10, 1000, 10);
    this.addString("session_secret", true, 32, 255);
    this.addString("static_path", 1, 255);
    this.addString("views_path", true, 1, 255);
    this.addString("views_default_layout", true, 1, 255);
    this.addString("views_layouts_path", true, 1, 255);
    this.addString("views_partials_path", true, 1, 255);
    this.addString("emails_templates_path", true, 1, 255);
  }
}

export default class ServerModel extends DomainModel {
  constructor(dao) {
    super("server", ServerSchema, dao);
  }
}

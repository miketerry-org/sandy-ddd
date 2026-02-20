// test/parseIniFile.test.js

import path from "path";
import fs from "fs";
import assert from "node:assert";
import test from "node:test";
import parseIniFile from "../lib/parseIniFile.js";

const driverNames = ["mariadb", "mongodb", "mysql", "postgres", "sqlite"];

driverNames.forEach(driverName => {
  const filename = path.resolve(`test/_inifiles/${driverName}.ini`);

  test(`INI file exists: ${driverName}`, () => {
    const exists = fs.existsSync(filename);
    assert.ok(exists, `INI file ${filename} should exist`);
  });

  test(`INI file parses correctly: ${driverName}`, () => {
    const config = parseIniFile(filename);
    assert.strictEqual(
      typeof config,
      "object",
      "Parsed INI should be an object"
    );
  });
});

// iniFiles.test.js:

import path from "path";
import parseIniFile from "../lib/parseIniFile.js";

function testDriverIni(db_driver) {
  // create full namename based ondatabase driver name
  let filename = path.resolve(`./test/_inifiles/${db_driver}.ini`);

  // load and parse the specified ini file
  let data = parseIniFile(filename);

  expect(data).not.toBe(undefined);
  expect(data).toHaveProperty("db_driver");
  expect(data).toHaveProperty("db_port");
  expect(data).toHaveProperty("db_name");
  expect(data).toHaveProperty("db_username");
  expect(data).toHaveProperty("db_password");
}

describe("iniFiles.js", () => {
  const drivers = ["mongodb", "mysql", "postgres", "sqlite"];

  drivers.forEach(driver => {
    it(`should parse the "${driver}.ini" file`, () => {
      testDriverIni("mongodb");
    });
  });
});

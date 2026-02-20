//

import path from "path";
import fs from "fs";
import parseIniFile from "../lib/parseIniFile.js";

const driverNames = ["mariadb", "mongodb", "mysql", "postgres", "sqlite"];

describe("parse ini files", () => {
  let exists;
  let config;

  driverNames.forEach(driverName => {
    const filename = path.resolve(`test/_inifiles/${driverName}.ini`);
    it(`should ensure the ${driverName} ini file exists`, () => {
      exists = fs.existsSync(filename);
      expect(exists).toEqual(true);
    });

    it(`should parse the ${driverName} ini file`, () => {
      config = parseIniFile(filename);
      const type = typeof config;
      expect(typeof config).toEqual("object");
    });
  });
});

// parseIniFile.js

import path from "path";
import fs from "fs";

export default function parseIniFile(filename) {
  // fully expand the filename
  filename = path.resolve(filename);

  // ensure the file exists
  if (!fs.existsSync(filename)) {
    throw new Error(`File not found! (${filename})`);
  }

  // set return value to empty object
  let data = {};

  // read the ini file into a buffer to be parsed
  let buffer = fs.readFileSync(filename, "utf8");

  // split into lines
  const lines = buffer.split(/\r?\n/);

  let currentSection = null;

  for (let rawLine of lines) {
    let line = rawLine.trim();

    // skip empty lines
    if (!line) {
      continue;
    }

    // skip comments
    if (line.startsWith(";") || line.startsWith("#")) {
      continue;
    }

    // section header
    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).trim();

      if (!data[currentSection]) {
        data[currentSection] = {};
      }

      continue;
    }

    // key=value pair
    const separatorIndex = line.indexOf("=");

    if (separatorIndex !== -1) {
      let key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      // remove optional surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // simple type coercion
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (!isNaN(value) && value !== "") value = Number(value);

      if (currentSection) {
        data[currentSection][key] = value;
      } else {
        data[key] = value;
      }
    }
  }

  // return the parsed data object
  return data;
}

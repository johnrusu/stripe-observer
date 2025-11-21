const fs = require("fs");

// utils
const { isNilOrEmpty, validateJson } = require("./utils");

const DEFAULT_PATH = "./data/";
const DEFAULT_EXTENSION = ".json";
const DEFAULT_FILE_NAME = "output";
const DEFAULT_FILE = `${DEFAULT_PATH}/${DEFAULT_FILE_NAME}${DEFAULT_EXTENSION}`;

const parseDataToFile = (filename = DEFAULT_FILE, data = {}) => {
  if (isNilOrEmpty(data)) {
    console.error("❌ No data provided to write to file.");
    return;
  }
  if (validateJson(data) === false) {
    console.error("❌ Invalid JSON data provided.");
    return;
  }
  if (isNilOrEmpty(filename)) {
    filename = DEFAULT_FILE;
  }
  // create a json with data
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✅ Data written to file: ${filename}`);

  const fileData = fs.readFileSync(filename, "utf8");
  return validateJson(fileData);
};

const getDataFromFile = (filename = DEFAULT_FILE) => {
  if (isNilOrEmpty(filename)) {
    filename = DEFAULT_FILE;
  }
  if (!fs.existsSync(filename)) {
    console.error(`❌ File does not exist: ${filename}`);
    return null;
  }
  const fileData = fs.readFileSync(filename, "utf8");
  return validateJson(fileData);
};

module.exports = { parseDataToFile, getDataFromFile };

/**
 * Returns `true` if the given value is its type's empty value, `null` or `undefined`.
 *
 * @func isNilOrEmpty
 * @memberOf Validator
 * @category Validator
 * @sig * -> Boolean
 * @param {*} val The value to test
 * @return {Boolean}
 * @example
 *
 * isNilOrEmpty([1, 2, 3]); //=> false
 * isNilOrEmpty([]); //=> true
 * isNilOrEmpty(''); //=> true
 * isNilOrEmpty(null); //=> true
 * isNilOrEmpty(undefined): //=> true
 * isNilOrEmpty({}); //=> true
 * isNilOrEmpty({length: 0}); //=> false
 */
const isNil = (val) => val == null;

const isEmpty = (val) => {
  if (isNil(val)) return true;
  if (typeof val === "string") return val.length === 0;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  return false;
};

const isNilOrEmpty = (val) => isNil(val) || isEmpty(val);

const basename = (path = "") =>
  !isNilOrEmpty(path)
    ? path
        .split("/")
        .reverse()
        .filter((q) => q.length > 0)[0]
    : path;

const fileExtension = (file = "") =>
  !isNilOrEmpty(file) ? file.split(".").pop() : file;

const isArrayNotEmpty = (arr) => Array.isArray(arr) && arr.length > 0;

const isObject = (data) => typeof data === "object" && data !== null;

/**
 * Check if a string is valid JSON
 *
 * @func isValidJson
 * @memberOf Validator
 * @category Validator
 * @sig String -> Boolean
 * @param jsonString
 * @returns
 */
const validateJson = (json) => {
  if (isObject(json)) {
    return json;
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error("Invalid JSON string:", e);
    return false;
  }
};

module.exports = {
  validateJson,
  basename,
  fileExtension,
  isArrayNotEmpty,
  isObject,
  isNilOrEmpty,
  isNil,
  isEmpty,
};

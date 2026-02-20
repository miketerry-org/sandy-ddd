// lib/compileObjectSchema.js

import bcrypt from "bcryptjs";
import zxcvbn from "zxcvbn";

/**
 * Built-in common password blacklist
 */
const DEFAULT_PASSWORD_BLACKLIST = [
  "123456",
  "password",
  "123456789",
  "12345678",
  "12345",
  "qwerty",
  "abc123",
  "football",
  "monkey",
  "letmein",
  "shadow",
  "master",
  "696969",
  "123123",
  "password1",
];

/**
 * Compile a schema into an async validator function.
 * @param {Object} schema - Validation schema for object
 * @returns {Function} validate(obj) - Async function that validates object
 */
export function compileObjectSchema(schema) {
  const strictMode = schema.strict === true;

  const fieldValidators = [];

  for (const key in schema) {
    if (key === "strict") continue;

    const rules = schema[key];

    let nestedValidator = null;
    if (rules.type === "object" && rules.schema) {
      nestedValidator = compileObjectSchema(rules.schema);
    }

    let arrayItemValidator = null;
    if (rules.type === "array" && rules.items) {
      arrayItemValidator = compileObjectSchema({ item: rules.items });
    }

    fieldValidators.push(async function validateField(obj, path, errors) {
      const fullPath = path ? `${path}.${key}` : key;
      let value = obj[key];

      // Conditional required
      if (typeof rules.requiredIf === "function") {
        rules.required = rules.requiredIf(obj) === true;
      }

      // String normalization
      if (typeof value === "string") {
        if (rules.trim) value = value.trim();
        if (rules.lowercase) value = value.toLowerCase();
        if (rules.uppercase) value = value.toUpperCase();
        obj[key] = value;
      }

      // Transform
      if (typeof rules.transform === "function") {
        value = await rules.transform(value, obj, key, fullPath);
        obj[key] = value;
      }

      // Default
      if (
        Object.prototype.hasOwnProperty.call(rules, "default") &&
        (value === undefined || value === null)
      ) {
        obj[key] = rules.default;
        value = rules.default;
      }

      // Required
      if (rules.required && (value === undefined || value === null)) {
        errors.push({
          path: fullPath,
          type: rules.type,
          message: "Field is required",
        });
        return;
      }
      if (value === undefined) return;

      // Type checks
      switch (rules.type) {
        case "string":
          if (typeof value !== "string") {
            errors.push({
              path: fullPath,
              type: "string",
              message: "Expected string",
            });
            return;
          }
          if (rules.allowEmpty === false && value === "") {
            errors.push({
              path: fullPath,
              type: "string",
              message: "Empty string not allowed",
            });
          }
          break;

        case "number":
          if (typeof value === "string") value = Number(value);
          if (typeof value !== "number" || Number.isNaN(value)) {
            errors.push({
              path: fullPath,
              type: "number",
              message: "Expected number",
            });
            return;
          }
          if (typeof rules.minValue === "number" && value < rules.minValue)
            errors.push({
              path: fullPath,
              type: "number",
              message: `Must be >= ${rules.minValue}`,
            });
          if (typeof rules.maxValue === "number" && value > rules.maxValue)
            errors.push({
              path: fullPath,
              type: "number",
              message: `Must be <= ${rules.maxValue}`,
            });
          obj[key] = value;
          break;

        case "integer":
          if (typeof value === "string") value = Number(value);
          if (
            typeof value !== "number" ||
            Number.isNaN(value) ||
            !Number.isInteger(value)
          ) {
            errors.push({
              path: fullPath,
              type: "integer",
              message: "Expected integer",
            });
            return;
          }
          if (typeof rules.minValue === "number" && value < rules.minValue)
            errors.push({
              path: fullPath,
              type: "integer",
              message: `Must be >= ${rules.minValue}`,
            });
          if (typeof rules.maxValue === "number" && value > rules.maxValue)
            errors.push({
              path: fullPath,
              type: "integer",
              message: `Must be <= ${rules.maxValue}`,
            });
          obj[key] = value;
          break;

        case "boolean":
          if (typeof value === "string" && rules.coerce === true) {
            value = value === "true" || value === "1";
            obj[key] = value;
          }
          if (typeof value !== "boolean") {
            errors.push({
              path: fullPath,
              type: "boolean",
              message: "Expected boolean",
            });
            return;
          }
          break;

        case "object":
          if (
            typeof value !== "object" ||
            value === null ||
            Array.isArray(value)
          ) {
            errors.push({
              path: fullPath,
              type: "object",
              message: "Expected object",
            });
            return;
          }
          break;

        case "array":
          if (!Array.isArray(value)) {
            errors.push({
              path: fullPath,
              type: "array",
              message: "Expected array",
            });
            return;
          }
          break;

        case "password":
          if (typeof value !== "string") {
            errors.push({
              path: fullPath,
              type: "password",
              message: "Expected password string",
            });
            return;
          }
          const pw = value;
          const count = pattern => (pw.match(pattern) || []).length;
          if (rules.minLength && pw.length < rules.minLength)
            errors.push({
              path: fullPath,
              type: "password",
              message: `Min length ${rules.minLength}`,
            });
          if (rules.maxLength && pw.length > rules.maxLength)
            errors.push({
              path: fullPath,
              type: "password",
              message: `Max length ${rules.maxLength}`,
            });
          if (rules.minUpper && count(/[A-Z]/g) < rules.minUpper)
            errors.push({
              path: fullPath,
              type: "password",
              message: `Min uppercase ${rules.minUpper}`,
            });
          if (rules.minLower && count(/[a-z]/g) < rules.minLower)
            errors.push({
              path: fullPath,
              type: "password",
              message: `Min lowercase ${rules.minLower}`,
            });
          if (rules.minDigits && count(/[0-9]/g) < rules.minDigits)
            errors.push({
              path: fullPath,
              type: "password",
              message: `Min digits ${rules.minDigits}`,
            });
          if (rules.minSymbols && count(/[^A-Za-z0-9]/g) < rules.minSymbols)
            errors.push({
              path: fullPath,
              type: "password",
              message: `Min symbols ${rules.minSymbols}`,
            });

          if (rules.minStrength !== undefined) {
            const result = zxcvbn(pw);
            if (result.score < rules.minStrength) {
              errors.push({
                path: fullPath,
                type: "password",
                message: `Password too weak (score ${result.score}). Required ${rules.minStrength}+`,
              });
            }
          }

          if (DEFAULT_PASSWORD_BLACKLIST.includes(pw)) {
            errors.push({
              path: fullPath,
              type: "password",
              message: "Password is too common",
            });
          }

          if (rules.blacklist) {
            if (
              Array.isArray(rules.blacklist) &&
              rules.blacklist.includes(pw)
            ) {
              errors.push({
                path: fullPath,
                type: "password",
                message: "Password is blacklisted",
              });
            }
            if (typeof rules.blacklist === "function") {
              const isBlacklisted = await rules.blacklist(pw, obj);
              if (isBlacklisted) {
                errors.push({
                  path: fullPath,
                  type: "password",
                  message: "Password is blacklisted",
                });
              }
            }
          }

          if (rules.hash === true) {
            const saltRounds = Math.max(
              typeof rules.saltRounds === "number" ? rules.saltRounds : 12,
              12
            );
            obj[key] = await bcrypt.hash(pw, saltRounds);
          }
          break;

        case "enum":
          if (!Array.isArray(rules.values)) {
            errors.push({
              path: fullPath,
              type: "enum",
              message: "Enum values array required",
            });
            return;
          }
          if (rules.required && !rules.values.includes(value)) {
            errors.push({
              path: fullPath,
              type: "enum",
              message: `Value must be one of: ${rules.values.join(", ")}`,
            });
            return;
          }
          break;

        case "date":
        case "timestamp":
          let d = value instanceof Date ? value : new Date(value);
          if (isNaN(d)) {
            errors.push({
              path: fullPath,
              type: rules.type,
              message: "Invalid date/timestamp",
            });
            return;
          }
          obj[key] = d;
          break;

        case "time":
          if (
            typeof value === "string" &&
            !/^\d{2}:\d{2}(:\d{2})?$/.test(value)
          ) {
            errors.push({
              path: fullPath,
              type: "time",
              message: "Invalid time format HH:mm[:ss]",
            });
            return;
          }
          break;

        default:
          break;
      }

      // Nested object
      if (nestedValidator) {
        try {
          await nestedValidator(value, fullPath);
        } catch (err) {
          errors.push({ path: fullPath, type: "nested", message: err.message });
        }
      }

      // Array items
      if (arrayItemValidator && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          try {
            await arrayItemValidator({ item: value[i] }, `${fullPath}[${i}]`);
          } catch (err) {
            errors.push({
              path: `${fullPath}[${i}]`,
              type: "arrayItem",
              message: err.message,
            });
          }
        }
      }

      // Custom validator
      if (typeof rules.validate === "function") {
        const result = await rules.validate(value, obj);
        if (result !== true) {
          errors.push({
            path: fullPath,
            type: rules.type,
            message:
              typeof result === "string" ? result : "Custom validation failed",
          });
        }
      }
    });
  }

  return async function validate(obj, path = "") {
    const errors = [];

    // Strict mode unknown keys
    if (strictMode && path === "") {
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(schema, key)) {
          errors.push({ path: key, type: "unknown", message: "Unknown key" });
        }
      }
    }

    for (const validator of fieldValidators) {
      await validator(obj, path, errors);
    }

    if (errors.length > 0) {
      const err = new Error("Validation failed");
      err.errors = errors;
      throw err;
    }

    return obj;
  };
}

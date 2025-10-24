// operation.test.js

"use strict";

import Operation, {
  REQUIRED,
  UNIQUE,
  PRIMARY,
  NO_CHANGE,
  UPPERCASE,
  LOWERCASE,
  SENTENCE_CASE,
  TITLE_CASE,
  UNDERSCORE_SPACES,
  DASH_SPACES,
} from "./operation.js";

describe("Operation class", () => {
  let op;

  beforeEach(() => {
    op = Operation.createTable("test_table");
  });

  test("addInteger with primary automatically sets required, unique, and index", () => {
    op.addInteger("id", { primary: true });
    const col = op.params.columns[0];
    expect(col.type).toBe("INTEGER");
    expect(col.primary).toBe(true);
    expect(col.required).toBe(true);

    expect(op.params.indexes).toHaveLength(1);
    const idx = op.params.indexes[0];
    expect(idx.name).toBe("test_table_id_pk");
    expect(idx.columns[0].name).toBe("id");
    expect(idx.primary).toBe(true);
    expect(idx.unique).toBe(true);
  });

  test("addPrimary sets autoIncrement, primary, required, unique, and index", () => {
    op.addPrimary("id");
    const col = op.params.columns[0];
    expect(col.autoIncrement).toBe(true);
    expect(col.primary).toBe(true);
    expect(col.required).toBe(true);
    expect(col.unique).toBe(true);

    const idx = op.params.indexes[0];
    expect(idx.primary).toBe(true);
    expect(idx.unique).toBe(true);
    expect(idx.columns[0].name).toBe("id");
  });

  test("addNumber column", () => {
    op.addNumber("amount");
    const col = op.params.columns[0];
    expect(col.type).toBe("NUMERIC");
  });

  test("addBoolean column", () => {
    op.addBoolean("isActive");
    const col = op.params.columns[0];
    expect(col.type).toBe("BOOLEAN");
  });

  test("addDate column", () => {
    op.addDate("birthdate");
    const col = op.params.columns[0];
    expect(col.type).toBe("DATE");
  });

  test("addTime column", () => {
    op.addTime("start_time");
    const col = op.params.columns[0];
    expect(col.type).toBe("TIME");
  });

  test("addTimestamp single column", () => {
    op.addTimestamp("created_at");
    const col = op.params.columns[0];
    expect(col.type).toBe("TIMESTAMP");
  });

  test("addVarChar column with length and options", () => {
    op.addVarChar("username", 50, { ...REQUIRED, case: LOWERCASE });
    const col = op.params.columns[0];
    expect(col.type).toBe("VARCHAR");
    expect(col.length).toBe(50);
    expect(col.required).toBe(true);
    expect(col.case).toBe(LOWERCASE);
  });

  test("addString is alias for addVarChar", () => {
    op.addString("nickname", 30);
    const col = op.params.columns[0];
    expect(col.type).toBe("VARCHAR");
    expect(col.length).toBe(30);
  });

  test("addTimestamps creates created_at and updated_at correctly", () => {
    op.addTimestamps();
    const [created, updated] = op.params.columns;
    expect(created.name).toBe("created_at");
    expect(created.required).toBe(true);
    expect(created.default).toBe("NOW()");
    expect(updated.name).toBe("updated_at");
    expect(updated.required).toBe(false);
    expect(updated.default).toBe(null);
  });

  test("addIndex supports multiple columns and DESC", () => {
    op.addInteger("a");
    op.addInteger("b");
    op.addIndex("multi_idx", ["a", "b DESC"]);
    const idx = op.params.indexes[0];
    expect(idx.name).toBe("multi_idx");
    expect(idx.columns).toEqual([
      { name: "a", order: "ASC" },
      { name: "b", order: "DESC" },
    ]);
  });

  test("using PRIMARY, REQUIRED, UNIQUE constants", () => {
    op.addVarChar("email", 100, { ...REQUIRED, ...UNIQUE });
    const col = op.params.columns[0];
    expect(col.required).toBe(true);
    expect(col.unique).toBe(true);
  });

  test("finalize returns the operation object", () => {
    const finalized = op.addInteger("x").finalize();
    expect(finalized).toBe(op);
  });
});

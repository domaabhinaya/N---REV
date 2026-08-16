import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CUISINE,
  SUPPORTED_CUISINES,
  normalizeCuisine,
  isSupportedCuisine,
  resolveCuisine,
  cuisineStatement,
} from "./cuisine";

// Regression protection for the PERMANENT Indian default.
test("Indian is the permanent default cuisine (missing values)", () => {
  assert.equal(DEFAULT_CUISINE, "Indian");
  assert.equal(resolveCuisine(undefined), "Indian");
  assert.equal(resolveCuisine(null), "Indian");
});

test("empty / whitespace cuisine resolves to Indian", () => {
  assert.equal(resolveCuisine(""), "Indian");
  assert.equal(resolveCuisine("    "), "Indian");
  assert.equal(resolveCuisine(" \t\n  "), "Indian");
});

test("invalid / arbitrary cuisine resolves to Indian", () => {
  assert.equal(resolveCuisine("pizza"), "Indian");
  assert.equal(resolveCuisine("north-african fusion"), "Indian");
  assert.equal(resolveCuisine(42), "Indian");
  assert.equal(resolveCuisine({}), "Indian");
  assert.equal(resolveCuisine(["Indian"]), "Indian");
});

test("a valid selected cuisine is NEVER silently replaced with Indian", () => {
  assert.equal(resolveCuisine("Asian"), "Asian");
  assert.equal(resolveCuisine("North Indian"), "North Indian");
  assert.equal(resolveCuisine("South Indian"), "South Indian");
  assert.equal(resolveCuisine("Western"), "Western");
  assert.equal(resolveCuisine("Global"), "Global");
  assert.equal(resolveCuisine("Mediterranean"), "Mediterranean");
  assert.equal(resolveCuisine("Mexican"), "Mexican");
});

test("resolution is case-insensitive and separator-normalised", () => {
  assert.equal(resolveCuisine("indian"), "Indian");
  assert.equal(resolveCuisine("INDIAN"), "Indian");
  assert.equal(resolveCuisine(" asian "), "Asian");
  assert.equal(resolveCuisine("north_indian"), "North Indian");
  assert.equal(resolveCuisine("SOUTH INDIAN"), "South Indian");
});

test("all supported cuisines round-trip; unrecognised values are rejected", () => {
  for (const cuisine of SUPPORTED_CUISINES) {
    assert.equal(resolveCuisine(cuisine), cuisine);
    assert.equal(isSupportedCuisine(cuisine), true);
  }
  assert.equal(isSupportedCuisine("nope"), false);
  assert.equal(isSupportedCuisine(""), false);
  assert.equal(isSupportedCuisine(null), false);
});

test("normalizeCuisine handles non-strings and trims", () => {
  assert.equal(normalizeCuisine(null), "");
  assert.equal(normalizeCuisine(undefined), "");
  assert.equal(normalizeCuisine(123), "");
  assert.equal(normalizeCuisine("  Indian  "), "indian");
});

// Requirements 5/11: the AI generator is handed the RESOLVED cuisine and the
// statement clearly says recommendations must follow it.
test("cuisineStatement embeds the resolved cuisine (AI requirement)", () => {
  assert.ok(cuisineStatement("Asian").includes("Resolved cuisine: Asian"));
  assert.ok(cuisineStatement(resolveCuisine(undefined)).includes("Resolved cuisine: Indian"));
  assert.match(cuisineStatement("Indian"), /must follow this cuisine/);
});
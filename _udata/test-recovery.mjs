// artifacts/api-server/src/lib/recovery-engine.ts
var NUTRIENTS = ["protein", "iron", "calcium", "vitamin_d", "magnesium", "vitamin_a", "vitamin_c", "vitamin_b7", "vitamin_e", "vitamin_k", "vitamin_b1", "vitamin_b2", "vitamin_b3", "vitamin_b6", "vitamin_b12"];
var NUTRIENT_UNITS = {
  protein: "g",
  iron: "mg",
  calcium: "mg",
  vitamin_d: "IU",
  magnesium: "mg",
  vitamin_a: "mcg",
  vitamin_c: "mg",
  vitamin_b7: "mcg",
  vitamin_e: "mg",
  vitamin_k: "mcg",
  vitamin_b1: "mg",
  vitamin_b2: "mg",
  vitamin_b3: "mg",
  vitamin_b6: "mg",
  vitamin_b12: "mcg"
};
var NUTRIENT_LABELS = {
  protein: "Protein",
  iron: "Iron",
  calcium: "Calcium",
  vitamin_d: "Vitamin D",
  magnesium: "Magnesium",
  vitamin_a: "Vitamin A",
  vitamin_c: "Vitamin C",
  vitamin_b7: "Vitamin B7",
  vitamin_e: "Vitamin E",
  vitamin_k: "Vitamin K",
  vitamin_b1: "Vitamin B1",
  vitamin_b2: "Vitamin B2",
  vitamin_b3: "Vitamin B3",
  vitamin_b6: "Vitamin B6",
  vitamin_b12: "Vitamin B12"
};
var SYMPTOM_WEIGHTS = {
  fatigue: { iron: 2, protein: 1, vitamin_b12: 1 },
  weakness: { protein: 2, iron: 1 },
  hair_fall: { iron: 2, protein: 1 },
  pale_skin: { iron: 3 },
  dizziness: { iron: 2 },
  muscle_cramps: { calcium: 2, vitamin_d: 1 },
  bone_pain: { calcium: 3, vitamin_d: 3 },
  poor_immunity: { protein: 1, vitamin_d: 1, iron: 1 },
  tingling_numbness: { vitamin_b12: 3 },
  brain_fog: { iron: 1 },
  poor_appetite: { protein: 2, iron: 1 },
  brittle_nails: { iron: 2, protein: 1 },
  slow_recovery: { protein: 2, vitamin_d: 1 },
  low_energy: { iron: 2, protein: 1 }
};
var SYMPTOM_REASON_TEXT = {
  fatigue: "Reported fatigue is commonly linked to low iron, protein, or vitamin B12 intake",
  weakness: "Reported weakness can reflect insufficient protein or iron for muscle recovery",
  hair_fall: "Hair fall is often associated with iron or protein shortfalls",
  pale_skin: "Pale skin tone is a classic marker people watch alongside possible iron gaps",
  dizziness: "Dizziness episodes are frequently reported alongside low iron status",
  muscle_cramps: "Muscle cramps often accompany low calcium or vitamin D intake",
  bone_pain: "Bone or joint discomfort points toward calcium and vitamin D recovery support",
  poor_immunity: "Frequent illness can reflect lower protein, vitamin D, or iron status",
  tingling_numbness: "Tingling or numbness sensations can reflect vitamin B12 needs; tracking meals may help identify patterns",
  brain_fog: "Brain fog is commonly reported with low iron status",
  poor_appetite: "Reduced appetite can make it harder to meet protein or iron needs",
  brittle_nails: "Brittle nails are a commonly reported sign linked to iron and protein gaps",
  slow_recovery: "Slow recovery from illness or injury often benefits from extra protein or vitamin D",
  low_energy: "Low energy levels are frequently tied to iron or protein status"
};
function addScore(scores, reasons, nutrient, amount, reason) {
  scores[nutrient] += amount;
  reasons[nutrient].add(reason);
}
function computeBmi(heightCm, weightKg) {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return isFinite(bmi) ? bmi : 0;
}
function computeNutrientPriorities(profile2) {
  const scores = { protein: 0, iron: 0, calcium: 0, vitamin_d: 0, magnesium: 0, vitamin_a: 0, vitamin_c: 0, vitamin_b7: 0, vitamin_e: 0, vitamin_k: 0, vitamin_b1: 0, vitamin_b2: 0, vitamin_b3: 0, vitamin_b6: 0, vitamin_b12: 0 };
  const reasons = {
    protein: /* @__PURE__ */ new Set(),
    iron: /* @__PURE__ */ new Set(),
    calcium: /* @__PURE__ */ new Set(),
    vitamin_d: /* @__PURE__ */ new Set(),
    magnesium: /* @__PURE__ */ new Set(),
    vitamin_a: /* @__PURE__ */ new Set(),
    vitamin_c: /* @__PURE__ */ new Set(),
    vitamin_b7: /* @__PURE__ */ new Set(),
    vitamin_e: /* @__PURE__ */ new Set(),
    vitamin_k: /* @__PURE__ */ new Set(),
    vitamin_b1: /* @__PURE__ */ new Set(),
    vitamin_b2: /* @__PURE__ */ new Set(),
    vitamin_b3: /* @__PURE__ */ new Set(),
    vitamin_b6: /* @__PURE__ */ new Set(),
    vitamin_b12: /* @__PURE__ */ new Set()
  };
  for (const symptom of profile2.symptoms) {
    const weights = SYMPTOM_WEIGHTS[symptom];
    if (!weights) continue;
    for (const [nutrient, amount] of Object.entries(weights)) {
      addScore(scores, reasons, nutrient, amount, SYMPTOM_REASON_TEXT[symptom] ?? `Reported symptom: ${symptom}`);
    }
  }
  const isFemale = profile2.gender?.toLowerCase().startsWith("f");
  if (profile2.hemoglobin != null) {
    const threshold = isFemale ? 12 : 13;
    if (profile2.hemoglobin < threshold - 2) {
      addScore(scores, reasons, "iron", 6, "Lab hemoglobin value is notably below the typical reference range, suggesting a possible iron gap");
    } else if (profile2.hemoglobin < threshold) {
      addScore(scores, reasons, "iron", 4, "Lab hemoglobin value is slightly below the typical reference range");
    }
  }
  if (profile2.ferritin != null && profile2.ferritin < 30) {
    addScore(scores, reasons, "iron", profile2.ferritin < 15 ? 5 : 3, "Lab ferritin value suggests low iron stores");
  }
  if (profile2.vitaminB12Level != null) {
    if (profile2.vitaminB12Level < 200) {
      addScore(scores, reasons, "vitamin_b12", 5, "Lab vitamin B12 value is below the typical reference range");
    } else if (profile2.vitaminB12Level < 300) {
      addScore(scores, reasons, "vitamin_b12", 3, "Lab vitamin B12 value is on the lower end of the typical reference range");
    }
  }
  if (profile2.vitaminDLevel != null) {
    if (profile2.vitaminDLevel < 20) {
      addScore(scores, reasons, "vitamin_d", 5, "Lab vitamin D value is below the typical reference range");
    } else if (profile2.vitaminDLevel < 30) {
      addScore(scores, reasons, "vitamin_d", 3, "Lab vitamin D value is on the lower end of the typical reference range");
    }
  }
  if (profile2.serumCalcium != null && profile2.serumCalcium < 8.8) {
    addScore(scores, reasons, "calcium", profile2.serumCalcium < 8 ? 5 : 3, "Lab serum calcium value is on the lower end of the typical reference range");
  }
  if (profile2.totalProtein != null && profile2.totalProtein < 6.4) {
    addScore(scores, reasons, "protein", profile2.totalProtein < 6 ? 5 : 3, "Lab total protein value is on the lower end of the typical reference range");
  }
  const dietType = profile2.dietType?.toLowerCase();
  if (dietType === "vegan") {
    addScore(scores, reasons, "calcium", 1, "Vegan diets can need extra attention to reach calcium targets");
    addScore(scores, reasons, "vitamin_d", 1, "Vegan diets often need fortified or sunlight-based vitamin D sources");
    addScore(scores, reasons, "vitamin_b12", 2, "Vegan diets need reliable vitamin B12 sources since it is mainly found in animal foods");
  } else if (dietType === "vegetarian") {
    addScore(scores, reasons, "iron", 1, "Plant-based iron is absorbed less efficiently than iron from meat sources");
  }
  const bmi = computeBmi(profile2.heightCm, profile2.weightKg);
  if (bmi < 18.5) {
    addScore(scores, reasons, "protein", 3, "A lower body weight for height suggests extra protein can support recovery");
  }
  const results = NUTRIENTS.map((nutrient) => {
    const score = scores[nutrient];
    const priority = score >= 6 ? "high" : score >= 3 ? "medium" : "low";
    return {
      nutrient,
      score,
      priority,
      dailyTarget: computeDailyTarget(nutrient, profile2, priority),
      unit: NUTRIENT_UNITS[nutrient],
      reasons: reasons[nutrient].size > 0 ? Array.from(reasons[nutrient]) : [`No strong signals for ${NUTRIENT_LABELS[nutrient].toLowerCase()} gaps were found, so a standard recovery-support target is used`],
      foodSources: []
    };
  });
  return results.sort((a, b) => b.score - a.score);
}
function computeDailyTarget(nutrient, profile2, priority) {
  const multiplier = priority === "high" ? 1.35 : priority === "medium" ? 1.15 : 1;
  let base;
  switch (nutrient) {
    case "protein":
      base = Math.max(50, profile2.weightKg * 1.1);
      break;
    case "iron":
      base = profile2.gender?.toLowerCase().startsWith("f") ? 18 : 10;
      break;
    case "calcium":
      base = 1e3;
      break;
    case "vitamin_d":
      base = 600;
      break;
    case "magnesium":
      base = 400;
      break;
    case "vitamin_a":
      base = 900;
      break;
    case "vitamin_c":
      base = 90;
      break;
    case "vitamin_b7":
      base = 30;
      break;
    case "vitamin_e":
      base = 15;
      break;
    case "vitamin_k":
      base = 120;
      break;
    case "vitamin_b1":
      base = 1.2;
      break;
    case "vitamin_b2":
      base = 1.3;
      break;
    case "vitamin_b3":
      base = 16;
      break;
    case "vitamin_b6":
      base = 1.3;
      break;
    case "vitamin_b12":
      base = 2.4;
      break;
  }
  return Math.round(base * multiplier * 10) / 10;
}

// artifacts/api-server/src/lib/nutrition-calculator.ts
var FIELD_MAP = {
  protein: "protein",
  iron: "iron",
  calcium: "calcium",
  vitamin_d: "vitaminD",
  magnesium: "magnesium",
  vitamin_a: "vitaminA",
  vitamin_c: "vitaminC",
  vitamin_b7: "vitaminB7",
  vitamin_e: "vitaminE",
  vitamin_k: "vitaminK",
  vitamin_b1: "vitaminB1",
  vitamin_b2: "vitaminB2",
  vitamin_b3: "vitaminB3",
  vitamin_b6: "vitaminB6",
  vitamin_b12: "vitaminB12"
};
var VITAMIN_D_UG_TO_IU = 40;
function convertVitaminDUgToIU(ug) {
  return ug * VITAMIN_D_UG_TO_IU;
}
function sumNutrients(items) {
  const totals = {
    protein: 0,
    iron: 0,
    calcium: 0,
    vitaminD: 0,
    magnesium: 0,
    vitaminA: 0,
    vitaminC: 0,
    vitaminB7: 0,
    vitaminE: 0,
    vitaminK: 0,
    vitaminB1: 0,
    vitaminB2: 0,
    vitaminB3: 0,
    vitaminB6: 0,
    vitaminB12: 0
  };
  for (const { food, servings } of items) {
    totals.protein += (food.protein || 0) * servings;
    totals.iron += (food.iron || 0) * servings;
    totals.calcium += (food.calcium || 0) * servings;
    totals.vitaminD += convertVitaminDUgToIU((food.vitaminD || 0) * servings);
    totals.magnesium += (food.magnesium || 0) * servings;
    totals.vitaminA += (food.vitaminA || 0) * servings;
    totals.vitaminC += (food.vitaminC || 0) * servings;
    totals.vitaminB7 += (food.vitaminB7 || 0) * servings;
    totals.vitaminE += (food.vitaminE || 0) * servings;
    totals.vitaminK += (food.vitaminK || 0) * servings;
    totals.vitaminB1 += (food.vitaminB1 || 0) * servings;
    totals.vitaminB2 += (food.vitaminB2 || 0) * servings;
    totals.vitaminB3 += (food.vitaminB3 || 0) * servings;
    totals.vitaminB6 += (food.vitaminB6 || 0) * servings;
    totals.vitaminB12 += (food.vitaminB12 || 0) * servings;
  }
  return totals;
}
function buildNutrientLines(consumed, targets2) {
  return NUTRIENTS.map((nutrient) => {
    const target = targets2[nutrient] || 1;
    const consumedValue = Math.round((consumed[FIELD_MAP[nutrient]] || 0) * 10) / 10;
    const percent = Math.round(consumedValue / target * 100);
    return {
      nutrient,
      label: NUTRIENT_LABELS[nutrient],
      unit: NUTRIENT_UNITS[nutrient],
      consumed: consumedValue,
      target,
      percent,
      status: percent >= 90 ? "on_target" : "needs_improvement"
    };
  });
}

// artifacts/api-server/src/lib/meal-planner.ts
function eligibleFoods(foods, dietType, mealTag, allergies) {
  const banned = (allergies ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return foods.filter(
    (f) => (f.dietTags.length === 0 || f.dietTags.includes(dietType)) && (f.mealTags.length === 0 || f.mealTags.includes(mealTag)) && !banned.some((b) => f.name.toLowerCase().includes(b))
  );
}
function pickRotating(items, seed, count) {
  if (items.length === 0) return [];
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(items[(seed + i) % items.length]);
  }
  return picked;
}
function rankByPriority(foods, priorities2) {
  const weightByNutrient = {
    protein: 0,
    iron: 0,
    calcium: 0,
    vitamin_d: 0,
    magnesium: 0,
    vitamin_a: 0,
    vitamin_c: 0,
    vitamin_b7: 0,
    vitamin_e: 0,
    vitamin_k: 0,
    vitamin_b1: 0,
    vitamin_b2: 0,
    vitamin_b3: 0,
    vitamin_b6: 0,
    vitamin_b12: 0
  };
  for (const p of priorities2) {
    weightByNutrient[p.nutrient] = p.priority === "high" ? 3 : p.priority === "medium" ? 1.5 : 1;
  }
  const fieldMap = {
    protein: "protein",
    iron: "iron",
    calcium: "calcium",
    vitamin_d: "vitaminD",
    magnesium: "magnesium",
    vitamin_a: "vitaminA",
    vitamin_c: "vitaminC",
    vitamin_b7: "vitaminB7",
    vitamin_e: "vitaminE",
    vitamin_k: "vitaminK",
    vitamin_b12: "vitaminB12",
    vitamin_b1: "vitaminB1",
    vitamin_b2: "vitaminB2",
    vitamin_b3: "vitaminB3",
    vitamin_b6: "vitaminB6"
  };
  return [...foods].sort((a, b) => {
    const scoreA = Object.keys(weightByNutrient).reduce(
      (sum, n) => sum + ((n === "vitamin_d" ? convertVitaminDUgToIU(a[fieldMap[n]]) : a[fieldMap[n]]) || 0) * weightByNutrient[n],
      0
    );
    const scoreB = Object.keys(weightByNutrient).reduce(
      (sum, n) => sum + ((n === "vitamin_d" ? convertVitaminDUgToIU(b[fieldMap[n]]) : b[fieldMap[n]]) || 0) * weightByNutrient[n],
      0
    );
    const tieA = a.tier === "primary" ? 1e-3 : -1e-3;
    const tieB = b.tier === "primary" ? 1e-3 : -1e-3;
    return scoreB + tieB - (scoreA + tieA);
  });
}
function generateRecoveryPlan(foods, dietType, allergies, priorities2, targets2, durationDays = 30) {
  const breakfastPool = rankByPriority(eligibleFoods(foods, dietType, "breakfast", allergies), priorities2);
  const lunchPool = rankByPriority(eligibleFoods(foods, dietType, "lunch", allergies), priorities2);
  const dinnerPool = rankByPriority(eligibleFoods(foods, dietType, "dinner", allergies), priorities2);
  const snackPool = rankByPriority(eligibleFoods(foods, dietType, "snack", allergies), priorities2);
  const days = [];
  for (let day = 1; day <= durationDays; day++) {
    const breakfastItems = pickRotating(breakfastPool, day, 2);
    const lunchItems = pickRotating(lunchPool, day + 1, 3);
    const dinnerItems = pickRotating(dinnerPool, day + 2, 3);
    const snackItems = pickRotating(snackPool, day + 3, 2);
    const allItems = [...breakfastItems, ...lunchItems, ...dinnerItems, ...snackItems];
    const totals = sumNutrients(allItems.map((food) => ({ food, servings: 1 })));
    const nutrientLines = buildNutrientLines(totals, targets2);
    days.push({
      dayNumber: day,
      breakfast: breakfastItems.map(toPlanItem),
      lunch: lunchItems.map(toPlanItem),
      dinner: dinnerItems.map(toPlanItem),
      snacks: snackItems.map(toPlanItem),
      totals,
      nutrientLines
    });
  }
  return { durationDays, days };
}
function toPlanItem(food) {
  return { foodId: food.id, name: food.name, servingSize: food.servingSize };
}

// _udata/test-recovery.ts
var mockFoods = [
  { id: 1, name: "Moong dal (cooked)", servingSize: "1 cup (200g)", protein: 14, iron: 3.2, calcium: 55, vitaminD: 0, magnesium: 50, vitaminA: 100, vitaminC: 5, vitaminB7: 10, vitaminE: 0.5, vitaminK: 20, vitaminB1: 0.2, vitaminB2: 0.1, vitaminB3: 0.8, vitaminB6: 0.2, vitaminB12: 0, dietTags: ["vegan", "vegetarian", "eggetarian", "non_vegetarian"], mealTags: ["lunch", "dinner"], cuisineTags: [], tier: "primary", source: null },
  { id: 2, name: "Egg (boiled, whole)", servingSize: "1 large egg", protein: 6, iron: 0.9, calcium: 28, vitaminD: 44, magnesium: 10, vitaminA: 100, vitaminC: 0, vitaminB7: 20, vitaminE: 1, vitaminK: 0, vitaminB1: 0.03, vitaminB2: 0.26, vitaminB3: 0.06, vitaminB6: 0.12, vitaminB12: 1.1, dietTags: ["eggetarian", "non_vegetarian"], mealTags: ["breakfast", "snack"], cuisineTags: [], tier: "primary", source: null },
  { id: 3, name: "Fortified cereal", servingSize: "1 bowl", protein: 6, iron: 4.5, calcium: 120, vitaminD: 120, magnesium: 30, vitaminA: 50, vitaminC: 10, vitaminB7: 5, vitaminE: 2, vitaminK: 5, vitaminB1: 0.4, vitaminB2: 0.5, vitaminB3: 5, vitaminB6: 0.6, vitaminB12: 0.7, dietTags: ["vegetarian", "eggetarian", "non_vegetarian"], mealTags: ["breakfast"], cuisineTags: [], tier: "primary", source: null },
  { id: 4, name: "Paneer (cooked)", servingSize: "100g", protein: 18, iron: 0.5, calcium: 480, vitaminD: 8, magnesium: 10, vitaminA: 100, vitaminC: 0, vitaminB7: 10, vitaminE: 1, vitaminK: 2, vitaminB1: 0.05, vitaminB2: 0.3, vitaminB3: 0.1, vitaminB6: 0.06, vitaminB12: 0.5, dietTags: ["vegetarian", "eggetarian", "non_vegetarian"], mealTags: ["lunch", "dinner"], cuisineTags: [], tier: "primary", source: null }
];
var profile = { age: 30, gender: "female", heightCm: 165, weightKg: 60, dietType: "vegetarian", symptoms: ["fatigue"], hemoglobin: 11, ferritin: 10, vitaminB12Level: 200, vitaminDLevel: 15, serumCalcium: 8.5, totalProtein: 5.5 };
var priorities = computeNutrientPriorities(profile);
console.log("NUTRIENTS count:", NUTRIENTS.length, "(", NUTRIENTS.join(","), ")");
console.log(
  "B-vitamin priorities present:",
  ["vitamin_b1", "vitamin_b2", "vitamin_b3", "vitamin_b6", "vitamin_b12"].every((k) => priorities.some((p) => p.nutrient === k))
);
var targets = {};
for (const p of priorities) targets[p.nutrient] = p.dailyTarget;
var plan = generateRecoveryPlan(mockFoods, "vegetarian", "", priorities, targets, 5);
console.log("Plan days:", plan.days.length);
var d0 = plan.days[0];
console.log(
  "Day1 totals B1/B2/B3/B6/B12:",
  d0.totals.vitaminB1,
  d0.totals.vitaminB2,
  d0.totals.vitaminB3,
  d0.totals.vitaminB6,
  d0.totals.vitaminB12
);
var lines = buildNutrientLines(d0.totals, targets);
console.log("Lines count:", lines.length);
for (const b of ["vitamin_b1", "vitamin_b2", "vitamin_b3", "vitamin_b6", "vitamin_b12"]) {
  const l = lines.find((x) => x.nutrient === b);
  if (!l) {
    console.log("!! MISSING line for", b);
    continue;
  }
  console.log(`  ${b}: label=${l.label} unit=${l.unit} consumed=${l.consumed} target=${l.target} status=${l.status}`);
}
console.log("RUNTIME-OK");

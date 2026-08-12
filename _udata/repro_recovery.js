// Reproduction script for recovery-plan generation
// Directly inlined logic to avoid TS import issues

const NUTRIENTS = ['protein','iron','calcium','vitamin_d','magnesium','vitamin_a','vitamin_c','vitamin_b7','vitamin_e','vitamin_k'];
const NUTRIENT_UNITS = { protein:'g', iron:'mg', calcium:'mg', vitamin_d:'IU', magnesium:'mg', vitamin_a:'µg', vitamin_c:'mg', vitamin_b7:'µg', vitamin_e:'mg', vitamin_k:'µg' };
const VITAMIN_D_UG_TO_IU = 40;
function convertVitaminDUgToIU(ug) { return ug * VITAMIN_D_UG_TO_IU; }

function computeDailyTarget(nutrient, profile, priority) {
  const multiplier = priority === 'high' ? 1.35 : priority === 'medium' ? 1.15 : 1.0;
  let base;
  switch (nutrient) {
    case 'protein': base = Math.max(50, profile.weightKg * 1.1); break;
    case 'iron': base = profile.gender?.toLowerCase().startsWith('f') ? 18 : 10; break;
    case 'calcium': base = 1000; break;
    case 'vitamin_d': base = 600; break;
    case 'magnesium': base = 400; break;
    case 'vitamin_a': base = 900; break;
    case 'vitamin_c': base = 90; break;
    case 'vitamin_b7': base = 30; break;
    case 'vitamin_e': base = 15; break;
    case 'vitamin_k': base = 120; break;
  }
  return Math.round(base * multiplier * 10) / 10;
}

function computeNutrientPriorities(profile) {
  const scores = { protein:0, iron:0, calcium:0, vitamin_d:0, magnesium:0, vitamin_a:0, vitamin_c:0, vitamin_b7:0, vitamin_e:0, vitamin_k:0 };
  const reasons = { protein:new Set(), iron:new Set(), calcium:new Set(), vitamin_d:new Set(), magnesium:new Set(), vitamin_a:new Set(), vitamin_c:new Set(), vitamin_b7:new Set(), vitamin_e:new Set(), vitamin_k:new Set() };

  for (const symptom of profile.symptoms || []) {
    if (symptom === 'fatigue') { scores.iron += 2; scores.protein += 1; reasons.iron.add('Reported fatigue is commonly linked to low iron or protein intake'); reasons.protein.add('Reported fatigue is commonly linked to low iron or protein intake'); }
    if (symptom === 'bone_pain') { scores.calcium += 3; scores.vitamin_d += 3; reasons.calcium.add('Bone or joint discomfort points toward calcium and vitamin D recovery support'); reasons.vitamin_d.add('Bone or joint discomfort points toward calcium and vitamin D recovery support'); }
  }

  if (profile.hemoglobin != null) {
    const threshold = profile.gender?.toLowerCase().startsWith('f') ? 12 : 13;
    if (profile.hemoglobin < threshold - 2) { scores.iron += 6; reasons.iron.add('Lab hemoglobin value is notably below the typical reference range, suggesting a possible iron gap'); }
    else if (profile.hemoglobin < threshold) { scores.iron += 4; reasons.iron.add('Lab hemoglobin value is slightly below the typical reference range'); }
  }
  if (profile.ferritin != null && profile.ferritin < 30) { scores.iron += profile.ferritin < 15 ? 5 : 3; reasons.iron.add('Lab ferritin value suggests low iron stores'); }
  if (profile.vitaminDLevel != null) {
    if (profile.vitaminDLevel < 20) { scores.vitamin_d += 5; reasons.vitamin_d.add('Lab vitamin D value is below the typical reference range'); }
    else if (profile.vitaminDLevel < 30) { scores.vitamin_d += 3; reasons.vitamin_d.add('Lab vitamin D value is on the lower end of the typical reference range'); }
  }
  if (profile.serumCalcium != null && profile.serumCalcium < 8.8) { scores.calcium += profile.serumCalcium < 8.0 ? 5 : 3; reasons.calcium.add('Lab serum calcium value is on the lower end of the typical reference range'); }
  if (profile.totalProtein != null && profile.totalProtein < 6.4) { scores.protein += profile.totalProtein < 6.0 ? 5 : 3; reasons.protein.add('Lab total protein value is on the lower end of the typical reference range'); }

  const results = NUTRIENTS.map(nutrient => {
    const score = scores[nutrient];
    const priority = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
    return {
      nutrient,
      score,
      priority,
      dailyTarget: computeDailyTarget(nutrient, profile, priority),
      unit: NUTRIENT_UNITS[nutrient],
      reasons: reasons[nutrient].size > 0 ? Array.from(reasons[nutrient]) : ['No strong signals for gaps were found, so a standard recovery-support target is used'],
      foodSources: [],
    };
  });
  return results.sort((a, b) => b.score - a.score);
}

function sumNutrients(items) {
  const totals = { protein:0, iron:0, calcium:0, vitaminD:0, magnesium:0, vitaminA:0, vitaminC:0, vitaminB7:0, vitaminE:0, vitaminK:0 };
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
  }
  return totals;
}

function buildNutrientLines(consumed, targets) {
  const FIELD_MAP = { protein:'protein', iron:'iron', calcium:'calcium', vitamin_d:'vitaminD', magnesium:'magnesium', vitamin_a:'vitaminA', vitamin_c:'vitaminC', vitamin_b7:'vitaminB7', vitamin_e:'vitaminE', vitamin_k:'vitaminK' };
  return NUTRIENTS.map(nutrient => {
    const target = targets[nutrient] || 1;
    const consumedValue = Math.round((consumed[FIELD_MAP[nutrient]] || 0) * 10) / 10;
    const percent = Math.round((consumedValue / target) * 100);
    return { nutrient, label: nutrient, unit: NUTRIENT_UNITS[nutrient], consumed: consumedValue, target, percent, status: percent >= 90 ? 'on_target' : 'needs_improvement' };
  });
}

function eligibleFoods(foods, dietType, mealTag, allergies) {
  const banned = (allergies || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  return foods.filter(f =>
    (f.dietTags.length === 0 || f.dietTags.includes(dietType)) &&
    (f.mealTags.length === 0 || f.mealTags.includes(mealTag)) &&
    !banned.some(b => f.name.toLowerCase().includes(b))
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

function rankByPriority(foods, priorities) {
  const weightByNutrient = { protein:0, iron:0, calcium:0, vitamin_d:0, magnesium:0, vitamin_a:0, vitamin_c:0, vitamin_b7:0, vitamin_e:0, vitamin_k:0 };
  for (const p of priorities) {
    weightByNutrient[p.nutrient] = p.priority === 'high' ? 3 : p.priority === 'medium' ? 1.5 : 1;
  }
  const fieldMap = { protein:'protein', iron:'iron', calcium:'calcium', vitamin_d:'vitaminD', magnesium:'magnesium', vitamin_a:'vitaminA', vitamin_c:'vitaminC', vitamin_b7:'vitaminB7', vitamin_e:'vitaminE', vitamin_k:'vitaminK' };
  return [...foods].sort((a, b) => {
    const scoreA = Object.keys(weightByNutrient).reduce((sum, n) => {
      const val = n === 'vitamin_d' ? convertVitaminDUgToIU(a[fieldMap[n]] || 0) : (a[fieldMap[n]] || 0);
      return sum + val * weightByNutrient[n];
    }, 0);
    const scoreB = Object.keys(weightByNutrient).reduce((sum, n) => {
      const val = n === 'vitamin_d' ? convertVitaminDUgToIU(b[fieldMap[n]] || 0) : (b[fieldMap[n]] || 0);
      return sum + val * weightByNutrient[n];
    }, 0);
    const tieA = a.tier === 'primary' ? 0.001 : -0.001;
    const tieB = b.tier === 'primary' ? 0.001 : -0.001;
    return (scoreB + tieB) - (scoreA + tieA);
  });
}

function generateRecoveryPlan(foods, dietType, allergies, priorities, targets, durationDays = 30) {
  const breakfastPool = rankByPriority(eligibleFoods(foods, dietType, 'breakfast', allergies), priorities);
  const lunchPool = rankByPriority(eligibleFoods(foods, dietType, 'lunch', allergies), priorities);
  const dinnerPool = rankByPriority(eligibleFoods(foods, dietType, 'dinner', allergies), priorities);
  const snackPool = rankByPriority(eligibleFoods(foods, dietType, 'snack', allergies), priorities);

  const days = [];
  for (let day = 1; day <= durationDays; day++) {
    const breakfastItems = pickRotating(breakfastPool, day, 2);
    const lunchItems = pickRotating(lunchPool, day + 1, 3);
    const dinnerItems = pickRotating(dinnerPool, day + 2, 3);
    const snackItems = pickRotating(snackPool, day + 3, 2);

    const allItems = [...breakfastItems, ...lunchItems, ...dinnerItems, ...snackItems];
    const totals = sumNutrients(allItems.map((food) => ({ food, servings: 1 })));
    const nutrientLines = buildNutrientLines(totals, targets);

    days.push({
      dayNumber: day,
      breakfast: breakfastItems.map(f => ({ foodId: f.id, name: f.name, servingSize: f.servingSize })),
      lunch: lunchItems.map(f => ({ foodId: f.id, name: f.name, servingSize: f.servingSize })),
      dinner: dinnerItems.map(f => ({ foodId: f.id, name: f.name, servingSize: f.servingSize })),
      snacks: snackItems.map(f => ({ foodId: f.id, name: f.name, servingSize: f.servingSize })),
      totals,
      nutrientLines,
    });
  }
  return { durationDays, days };
}

const mockFoods = [
  { id: 1, name: 'Moong dal (cooked)', servingSize: '1 cup (200g)', protein: 14, iron: 3.2, calcium: 55, vitaminD: 0, magnesium: 50, vitaminA: 100, vitaminC: 5, vitaminB7: 10, vitaminE: 0.5, vitaminK: 20, dietTags: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian'], mealTags: ['lunch', 'dinner'], cuisineTags: ['north_indian', 'general'], tier: 'primary', source: null },
  { id: 2, name: 'Egg (boiled, whole)', servingSize: '1 large egg', protein: 6, iron: 0.9, calcium: 28, vitaminD: 44, magnesium: 10, vitaminA: 100, vitaminC: 0, vitaminB7: 20, vitaminE: 1, vitaminK: 0, dietTags: ['eggetarian', 'non_vegetarian'], mealTags: ['breakfast', 'snack'], cuisineTags: ['general'], tier: 'primary', source: null },
  { id: 3, name: 'Mushroom sabzi (sun-exposed)', servingSize: '1 cup (100g)', protein: 3, iron: 0.5, calcium: 3, vitaminD: 380, magnesium: 20, vitaminA: 0, vitaminC: 2, vitaminB7: 5, vitaminE: 0.2, vitaminK: 0, dietTags: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian'], mealTags: ['lunch', 'dinner'], cuisineTags: ['general'], tier: 'primary', source: null },
  { id: 4, name: 'Extended Food Example', servingSize: '1 serving', protein: 10, iron: 2, calcium: 100, vitaminD: 100, magnesium: null, vitaminA: null, vitaminC: 10, vitaminB7: null, vitaminE: null, vitaminK: null, dietTags: [], mealTags: ['breakfast', 'lunch', 'dinner', 'snack'], cuisineTags: ['general'], tier: 'extended', source: null },
];

const mockProfile = {
  id: 1,
  age: 30,
  gender: 'female',
  heightCm: 165,
  weightKg: 60,
  dietType: 'vegetarian',
  allergies: '',
  symptoms: ['fatigue', 'bone_pain'],
  hemoglobin: 11,
  ferritin: 10,
  vitaminB12Level: 200,
  vitaminDLevel: 15,
  serumCalcium: 8.5,
  totalProtein: 5.5,
  recoveryDuration: 30,
};

try {
  console.log('=== Step 1: computeNutrientPriorities ===');
  const priorities = computeNutrientPriorities(mockProfile);
  console.log('Priorities count:', priorities.length);
  console.log('High priorities:', priorities.filter(p => p.priority === 'high').map(p => p.nutrient));

  console.log('\n=== Step 2: generateRecoveryPlan ===');
  const plan = generateRecoveryPlan(mockFoods, mockProfile.dietType, mockProfile.allergies, priorities, Object.fromEntries(priorities.map(p => [p.nutrient, p.dailyTarget])), mockProfile.recoveryDuration);
  console.log('Plan duration:', plan.durationDays);
  console.log('First day totals vitaminD:', plan.days[0].totals.vitaminD);
  console.log('First day nutrient lines:', plan.days[0].nutrientLines.map(l => ({ nutrient: l.nutrient, consumed: l.consumed, target: l.target, percent: l.percent })));

  console.log('\n=== SUCCESS ===');
} catch (err) {
  console.error('\n=== FAILURE ===');
  console.error(err);
  process.exit(1);
}

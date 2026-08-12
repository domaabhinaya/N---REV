// Reproduction script for recovery-plan generation
try {
  const { generateRecoveryPlan, rankByPriority, eligibleFoods, topFoodSourcesForNutrient } = await import('../artifacts/api-server/src/lib/meal-planner.ts');
  const { computeNutrientPriorities, computeDailyTarget, NUTRIENTS, generatePlanExplanation } = await import('../artifacts/api-server/src/lib/recovery-engine.ts');
  const { sumNutrients, buildNutrientLines, convertVitaminDUgToIU } = await import('../artifacts/api-server/src/lib/nutrition-calculator.ts');
  const { buildRoutineInsights } = await import('../artifacts/api-server/src/lib/dataset-routine-helpers.ts');
  const { getPrioritiesWithFoodSources, targetsMap, toProfileInput } = await import('../artifacts/api-server/src/lib/profile-service.ts');

  // Mock food data simulating two-tier database
  const mockFoods = [
    {
      id: 1,
      name: 'Moong dal (cooked)',
      servingSize: '1 cup (200g)',
      protein: 14,
      iron: 3.2,
      calcium: 55,
      vitaminD: 0,
      magnesium: 50,
      vitaminA: 100,
      vitaminC: 5,
      vitaminB7: 10,
      vitaminE: 0.5,
      vitaminK: 20,
      dietTags: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian'],
      mealTags: ['lunch', 'dinner'],
      cuisineTags: ['north_indian', 'general'],
      tier: 'primary',
      source: null,
    },
    {
      id: 2,
      name: 'Egg (boiled, whole)',
      servingSize: '1 large egg',
      protein: 6,
      iron: 0.9,
      calcium: 28,
      vitaminD: 44,
      magnesium: 10,
      vitaminA: 100,
      vitaminC: 0,
      vitaminB7: 20,
      vitaminE: 1,
      vitaminK: 0,
      dietTags: ['eggetarian', 'non_vegetarian'],
      mealTags: ['breakfast', 'snack'],
      cuisineTags: ['general'],
      tier: 'primary',
      source: null,
    },
    {
      id: 3,
      name: 'Mushroom sabzi (sun-exposed)',
      servingSize: '1 cup (100g)',
      protein: 3,
      iron: 0.5,
      calcium: 3,
      vitaminD: 380,
      magnesium: 20,
      vitaminA: 0,
      vitaminC: 2,
      vitaminB7: 5,
      vitaminE: 0.2,
      vitaminK: 0,
      dietTags: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian'],
      mealTags: ['lunch', 'dinner'],
      cuisineTags: ['general'],
      tier: 'primary',
      source: null,
    },
    {
      id: 4,
      name: 'Extended Food Example',
      servingSize: '1 serving',
      protein: 10,
      iron: 2,
      calcium: 100,
      vitaminD: 100,
      magnesium: null,
      vitaminA: null,
      vitaminC: 10,
      vitaminB7: null,
      vitaminE: null,
      vitaminK: null,
      dietTags: [],
      mealTags: ['breakfast', 'lunch', 'dinner', 'snack'],
      cuisineTags: ['general'],
      tier: 'extended',
      source: null,
    },
  ];

  // Mock profile
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log('=== Step 1: getPrioritiesWithFoodSources ===');
  const priorities = getPrioritiesWithFoodSources(mockProfile, mockFoods);
  console.log('Priorities count:', priorities.length);
  console.log('First priority:', priorities[0]);

  console.log('\n=== Step 2: targetsMap ===');
  const targets = targetsMap(priorities);
  console.log('Targets:', targets);

  console.log('\n=== Step 3: generateRecoveryPlan ===');
  const plan = generateRecoveryPlan(mockFoods, mockProfile.dietType, mockProfile.allergies, priorities, targets, mockProfile.recoveryDuration);
  console.log('Plan duration:', plan.durationDays);
  console.log('First day:', plan.days[0]);

  console.log('\n=== Step 4: generatePlanExplanation ===');
  const profileInput = toProfileInput(mockProfile);
  const routineInsights = buildRoutineInsights({ normalized: [], raw: '', parseErrors: [] }, priorities);
  const explanation = generatePlanExplanation(profileInput, priorities, routineInsights);
  console.log('Explanation count:', explanation.length);

  console.log('\n=== SUCCESS ===');
} catch (err) {
  console.error('\n=== FAILURE ===');
  console.error(err);
  process.exit(1);
}

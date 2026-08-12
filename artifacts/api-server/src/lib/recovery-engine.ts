export type NutrientKey = "protein" | "iron" | "calcium" | "vitamin_d" | "magnesium" | "vitamin_a" | "vitamin_c" | "vitamin_b7" | "vitamin_e" | "vitamin_k" | "vitamin_b1" | "vitamin_b2" | "vitamin_b3" | "vitamin_b6" | "vitamin_b12";

export const NUTRIENTS: NutrientKey[] = ["protein", "iron", "calcium", "vitamin_d", "magnesium", "vitamin_a", "vitamin_c", "vitamin_b7", "vitamin_e", "vitamin_k", "vitamin_b1", "vitamin_b2", "vitamin_b3", "vitamin_b6", "vitamin_b12"];

export const NUTRIENT_UNITS: Record<NutrientKey, string> = {
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
  vitamin_b12: "mcg",
};

export const NUTRIENT_LABELS: Record<NutrientKey, string> = {
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
  vitamin_b12: "Vitamin B12",
};

export interface ProfileInput {
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  dietType: string;
  symptoms: string[];
  hemoglobin?: number | null;
  ferritin?: number | null;
  vitaminB12Level?: number | null;
  vitaminDLevel?: number | null;
  serumCalcium?: number | null;
  totalProtein?: number | null;
}

type NutrientScores = Record<NutrientKey, number>;
type ReasonMap = Record<NutrientKey, Set<string>>;

const SYMPTOM_WEIGHTS: Record<string, Partial<NutrientScores>> = {
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
  low_energy: { iron: 2, protein: 1 },
};

const SYMPTOM_REASON_TEXT: Record<string, string> = {
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
  low_energy: "Low energy levels are frequently tied to iron or protein status",
};

function addScore(scores: NutrientScores, reasons: ReasonMap, nutrient: NutrientKey, amount: number, reason: string) {
  scores[nutrient] += amount;
  reasons[nutrient].add(reason);
}

export interface NutrientPriorityResult {
  nutrient: NutrientKey;
  score: number;
  priority: "high" | "medium" | "low";
  dailyTarget: number;
  unit: string;
  reasons: string[];
  foodSources: string[];
}

export function computeBmi(heightCm: number, weightKg: number): number {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return isFinite(bmi) ? bmi : 0;
}

export function computeNutrientPriorities(profile: ProfileInput): NutrientPriorityResult[] {
  const scores: NutrientScores = { protein: 0, iron: 0, calcium: 0, vitamin_d: 0, magnesium: 0, vitamin_a: 0, vitamin_c: 0, vitamin_b7: 0, vitamin_e: 0, vitamin_k: 0, vitamin_b1: 0, vitamin_b2: 0, vitamin_b3: 0, vitamin_b6: 0, vitamin_b12: 0 };
  const reasons: ReasonMap = {
    protein: new Set(),
    iron: new Set(),
    calcium: new Set(),
    vitamin_d: new Set(),
    magnesium: new Set(),
    vitamin_a: new Set(),
    vitamin_c: new Set(),
    vitamin_b7: new Set(),
    vitamin_e: new Set(),
    vitamin_k: new Set(),
    vitamin_b1: new Set(),
    vitamin_b2: new Set(),
    vitamin_b3: new Set(),
    vitamin_b6: new Set(),
    vitamin_b12: new Set(),
  };

  for (const symptom of profile.symptoms) {
    const weights = SYMPTOM_WEIGHTS[symptom];
    if (!weights) continue;
    for (const [nutrient, amount] of Object.entries(weights) as [NutrientKey, number][]) {
      addScore(scores, reasons, nutrient, amount, SYMPTOM_REASON_TEXT[symptom] ?? `Reported symptom: ${symptom}`);
    }
  }

  const isFemale = profile.gender?.toLowerCase().startsWith("f");

  if (profile.hemoglobin != null) {
    const threshold = isFemale ? 12 : 13;
    if (profile.hemoglobin < threshold - 2) {
      addScore(scores, reasons, "iron", 6, "Lab hemoglobin value is notably below the typical reference range, suggesting a possible iron gap");
    } else if (profile.hemoglobin < threshold) {
      addScore(scores, reasons, "iron", 4, "Lab hemoglobin value is slightly below the typical reference range");
    }
  }
  if (profile.ferritin != null && profile.ferritin < 30) {
    addScore(scores, reasons, "iron", profile.ferritin < 15 ? 5 : 3, "Lab ferritin value suggests low iron stores");
  }
  if (profile.vitaminB12Level != null) {
    if (profile.vitaminB12Level < 200) {
      addScore(scores, reasons, "vitamin_b12", 5, "Lab vitamin B12 value is below the typical reference range");
    } else if (profile.vitaminB12Level < 300) {
      addScore(scores, reasons, "vitamin_b12", 3, "Lab vitamin B12 value is on the lower end of the typical reference range");
    }
  }
  if (profile.vitaminDLevel != null) {
    if (profile.vitaminDLevel < 20) {
      addScore(scores, reasons, "vitamin_d", 5, "Lab vitamin D value is below the typical reference range");
    } else if (profile.vitaminDLevel < 30) {
      addScore(scores, reasons, "vitamin_d", 3, "Lab vitamin D value is on the lower end of the typical reference range");
    }
  }
  if (profile.serumCalcium != null && profile.serumCalcium < 8.8) {
    addScore(scores, reasons, "calcium", profile.serumCalcium < 8.0 ? 5 : 3, "Lab serum calcium value is on the lower end of the typical reference range");
  }
  if (profile.totalProtein != null && profile.totalProtein < 6.4) {
    addScore(scores, reasons, "protein", profile.totalProtein < 6.0 ? 5 : 3, "Lab total protein value is on the lower end of the typical reference range");
  }

  const dietType = profile.dietType?.toLowerCase();
  if (dietType === "vegan") {
    addScore(scores, reasons, "calcium", 1, "Vegan diets can need extra attention to reach calcium targets");
    addScore(scores, reasons, "vitamin_d", 1, "Vegan diets often need fortified or sunlight-based vitamin D sources");
    addScore(scores, reasons, "vitamin_b12", 2, "Vegan diets need reliable vitamin B12 sources since it is mainly found in animal foods");
  } else if (dietType === "vegetarian") {
    addScore(scores, reasons, "iron", 1, "Plant-based iron is absorbed less efficiently than iron from meat sources");
  }

  const bmi = computeBmi(profile.heightCm, profile.weightKg);
  if (bmi < 18.5) {
    addScore(scores, reasons, "protein", 3, "A lower body weight for height suggests extra protein can support recovery");
  }

  const results: NutrientPriorityResult[] = NUTRIENTS.map((nutrient) => {
    const score = scores[nutrient];
    const priority: "high" | "medium" | "low" = score >= 6 ? "high" : score >= 3 ? "medium" : "low";
    return {
      nutrient,
      score,
      priority,
      dailyTarget: computeDailyTarget(nutrient, profile, priority),
      unit: NUTRIENT_UNITS[nutrient],
      reasons: reasons[nutrient].size > 0
        ? Array.from(reasons[nutrient])
        : [`No strong signals for ${NUTRIENT_LABELS[nutrient].toLowerCase()} gaps were found, so a standard recovery-support target is used`],
      foodSources: [],
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

export function computeDailyTarget(nutrient: NutrientKey, profile: ProfileInput, priority: "high" | "medium" | "low"): number {
  const multiplier = priority === "high" ? 1.35 : priority === "medium" ? 1.15 : 1.0;
  let base: number;
  switch (nutrient) {
    case "protein":
      base = Math.max(50, profile.weightKg * 1.1);
      break;
    case "iron":
      base = profile.gender?.toLowerCase().startsWith("f") ? 18 : 10;
      break;
    case "calcium":
      base = 1000;
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

export function generatePlanExplanation(profile: ProfileInput, priorities: NutrientPriorityResult[], routineInsights?: string[]): string[] {
  const explanations: string[] = [];

  for (const p of priorities) {
    if (p.priority === "low") continue;

    const nutrientLabel = NUTRIENT_LABELS[p.nutrient];
    const reasons = p.reasons;

    if (reasons.length === 0) {
      explanations.push(`${nutrientLabel} is included as a standard recovery-support target.`);
      continue;
    }

    const labReasons = reasons.filter((r) => r.includes("Lab"));
    const symptomReasons = reasons.filter(
      (r) =>
        r.includes("Reported") ||
        r.includes("muscle") ||
        r.includes("bone") ||
        r.includes("frequent") ||
        r.includes("tired") ||
        r.includes("pale") ||
        r.includes("dizziness") ||
        r.includes("cramps") ||
        r.includes("hair") ||
        r.includes("nails") ||
        r.includes("appetite") ||
        r.includes("energy") ||
        r.includes("immunity") ||
        r.includes("tingling") ||
        r.includes("brain"),
    );
    const dietReasons = reasons.filter((r) => r.includes("Vegan") || r.includes("vegetarian") || r.includes("plant-based") || r.includes("diet"));
    const bmiReasons = reasons.filter((r) => r.includes("body weight") || r.includes("BMI"));

    if (labReasons.length > 0) {
      explanations.push(`${nutrientLabel} was prioritized because ${labReasons[0].toLowerCase()}.`);
    } else if (symptomReasons.length > 0) {
      const symptomList = symptomReasons
        .map((r) => {
          if (r.includes("fatigue") || r.includes("weakness") || r.includes("muscle recovery")) return "fatigue/weakness";
          if (r.includes("hair") || r.includes("nails")) return "hair/nail concerns";
          if (r.includes("pale")) return "pale skin";
          if (r.includes("dizziness")) return "dizziness";
          if (r.includes("cramps") || r.includes("calcium")) return "muscle cramps";
          if (r.includes("bone") || r.includes("joint")) return "bone/joint discomfort";
          if (r.includes("immunity") || r.includes("illness")) return "poor immunity";
          if (r.includes("tingling") || r.includes("numbness")) return "tingling sensations";
          if (r.includes("brain")) return "brain fog";
          if (r.includes("appetite")) return "poor appetite";
          if (r.includes("recovery")) return "slow recovery";
          if (r.includes("energy")) return "low energy";
          return "reported symptoms";
        })
        .join(", ");
      explanations.push(`${nutrientLabel} was prioritized because ${symptomList} were selected and indicate a need for recovery support.`);
    } else if (dietReasons.length > 0) {
      explanations.push(`${nutrientLabel} was prioritized because your ${profile.dietType} diet may need extra attention for this nutrient.`);
    } else if (bmiReasons.length > 0) {
      explanations.push(`${nutrientLabel} was prioritized because your BMI suggests additional nutritional support may be beneficial.`);
    }
  }

  if (routineInsights && routineInsights.length > 0) {
    explanations.unshift(...routineInsights.slice(0, 3));
  }

  if (explanations.length === 0) {
    explanations.push("Your recovery plan focuses on balanced nutrition to support overall well-being and energy levels.");
  }

  return explanations;
}

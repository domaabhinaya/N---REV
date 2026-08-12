import { NUTRIENT_LABELS, type NutrientKey } from "./recovery-engine";
import type { NutrientLine } from "./nutrition-calculator";
import type { PlannerFood } from "./meal-planner";
import { topFoodSourcesForNutrient } from "./meal-planner";

export interface LabContribution {
  field: string;
  value: number | null;
  contribution: number;
  explanation: string;
}

export interface SymptomContribution {
  symptom: string;
  contribution: number;
  explanation: string;
}

export interface Suggestion {
  nutrient: NutrientKey;
  reason: string;
  additions: string[];
  expectedImprovement: string;
  confidence: number;
  labContributions: LabContribution[];
  symptomContributions: SymptomContribution[];
  reasons: string[];
}

const MISS_REASONS: Record<NutrientKey, string> = {
  protein: "Yesterday's logged meals did not include enough protein-rich foods to reach your recovery target",
  iron: "Yesterday's logged meals were light on iron-rich foods, which can slow recovery from low iron stores",
  calcium: "Yesterday's logged meals fell short on calcium-rich foods",
  vitamin_d: "Yesterday's logged meals had few vitamin D sources, and sunlight exposure may also help",
  magnesium: "Yesterday's logged meals were low in magnesium-rich foods, which supports muscle and nerve function",
  vitamin_a: "Yesterday's logged meals had fewer vitamin A sources, which plays a role in immune health",
  vitamin_c: "Yesterday's logged meals were light on vitamin C sources, which helps with iron absorption and immunity",
  vitamin_b7: "Yesterday's logged meals may not have included enough vitamin B7 sources for hair and nail health",
  vitamin_e: "Yesterday's logged meals could benefit from more vitamin E-rich foods for antioxidant support",
  vitamin_k: "Yesterday's logged meals may need more vitamin K sources, which supports bone health",
  vitamin_b1: "Yesterday's logged meals may not have included enough vitamin B1 sources for energy metabolism",
  vitamin_b2: "Yesterday's logged meals may need more vitamin B2 sources, which supports energy production",
  vitamin_b3: "Yesterday's logged meals may benefit from more vitamin B3 sources for overall metabolic support",
  vitamin_b6: "Yesterday's logged meals may need more vitamin B6 sources, which supports protein metabolism and brain function",
  vitamin_b12: "Yesterday's logged meals did not include enough vitamin B12 sources, which supports nerve health and red blood cell formation",
};

const NUTRIENT_LAB_EXPLANATIONS: Record<string, string> = {
  hemoglobin: "Hemoglobin is a protein in your red blood cells that carries oxygen. Low levels can mean your body needs more iron.",
  ferritin: "Ferritin shows how much iron your body has stored. Low levels suggest your iron stores are running low.",
  vitaminDLevel: "Vitamin D helps your body absorb calcium and supports immune function. Low levels can affect bone health and energy.",
  vitaminB12Level: "Vitamin B12 is important for nerve health and making red blood cells.",
  serumCalcium: "Calcium is essential for strong bones, muscle function, and nerve signaling.",
  totalProtein: "Protein is the building block for muscles, tissues, and immune cells. Low levels can slow recovery.",
};

const LAB_FIELD_LABELS: Record<string, string> = {
  hemoglobin: "Hemoglobin",
  ferritin: "Ferritin (Iron Stores)",
  vitaminDLevel: "Vitamin D",
  vitaminB12Level: "Vitamin B12",
  serumCalcium: "Serum Calcium",
  totalProtein: "Total Protein",
};

const LAB_TO_NUTRIENT: Record<string, NutrientKey> = {
  hemoglobin: "iron",
  ferritin: "iron",
  vitaminDLevel: "vitamin_d",
  vitaminB12Level: "vitamin_b12",
  serumCalcium: "calcium",
  totalProtein: "protein",
};

const SYMPTOM_LABEL_MAP: Record<string, string> = {
  fatigue: "Fatigue or tiredness",
  weakness: "Muscle weakness or low strength",
  hair_fall: "Hair fall or thinning",
  pale_skin: "Pale skin tone",
  dizziness: "Dizziness or lightheadedness",
  muscle_cramps: "Muscle cramps or spasms",
  bone_pain: "Bone pain or joint discomfort",
  poor_immunity: "Frequent illness or poor immunity",
  tingling_numbness: "Tingling or numbness in hands/feet",
  brain_fog: "Brain fog or trouble concentrating",
  poor_appetite: "Poor appetite or reduced food intake",
  brittle_nails: "Brittle or weak nails",
  slow_recovery: "Slow recovery from illness or injury",
  low_energy: "Low energy levels throughout the day",
  weight_loss: "Unintended weight loss",
  weight_gain: "Weight gain",
  fever: "Fever",
  night_sweats: "Night sweats",
  poor_sleep: "Poor sleep quality",
  mood_changes: "Mood changes",
  shortness_of_breath: "Shortness of breath",
  cold_hands_feet: "Cold hands or feet",
  rapid_heartbeat: "Rapid heartbeat",
  easy_bruising: "Easy bruising",
  poor_concentration: "Poor concentration",
  memory_problems: "Memory problems",
  frequent_headache: "Frequent headaches",
  tingling_hands: "Tingling in hands",
  tingling_feet: "Tingling in feet",
  muscle_weakness: "Muscle weakness",
  joint_pain: "Joint pain",
  difficulty_walking: "Difficulty walking",
  dry_skin: "Dry skin",
  mouth_ulcers: "Mouth ulcers",
  slow_wound_healing: "Slow wound healing",
  constipation: "Constipation",
  diarrhea: "Diarrhea",
  bloating: "Bloating",
  nausea: "Nausea",
  vomiting: "Vomiting",
};

const SYMPTOM_NUTRIENT_MAP: Record<string, NutrientKey> = {
  fatigue: "iron",
  weakness: "protein",
  hair_fall: "iron",
  pale_skin: "iron",
  dizziness: "iron",
  muscle_cramps: "calcium",
  bone_pain: "calcium",
  poor_immunity: "vitamin_d",
  poor_appetite: "protein",
  brittle_nails: "iron",
  slow_recovery: "protein",
  low_energy: "iron",
};

export function generateSuggestions(
  nutrientLines: NutrientLine[],
  foods: PlannerFood[],
  dietType: string,
  loggedFoodNames: Set<string>,
  profile?: {
    symptoms: string[];
    hemoglobin?: number | null;
    ferritin?: number | null;
    vitaminDLevel?: number | null;
    vitaminB12Level?: number | null;
    serumCalcium?: number | null;
    totalProtein?: number | null;
  },
  cuisinePreference?: string | null,
): Suggestion[] {
  const missed = nutrientLines.filter((line) => line.status === "needs_improvement");
  return missed.map((line) => {
    const candidates = topFoodSourcesForNutrient(foods, line.nutrient, dietType, 10, cuisinePreference).filter(
      (name) => !loggedFoodNames.has(name),
    );
    const additions = candidates.slice(0, 5);
    const gap = Math.max(0, line.target - line.consumed);

    // Compute confidence based on how far below target and available data
    const gapPercent = line.target > 0 ? Math.min(100, Math.round((gap / line.target) * 100)) : 0;
    const confidence = Math.min(95, Math.max(40, 60 + Math.round(gapPercent / 3)));

    // Build lab contributions for this nutrient
    const labContributions: LabContribution[] = [];
    if (profile) {
      const labFields = ["hemoglobin", "ferritin", "vitaminDLevel", "vitaminB12Level", "serumCalcium", "totalProtein"] as const;
      for (const field of labFields) {
        const mappedNutrient = LAB_TO_NUTRIENT[field];
        if (mappedNutrient === line.nutrient && profile[field] != null && profile[field] !== 0) {
          const value = profile[field] as number;
          labContributions.push({
            field: LAB_FIELD_LABELS[field] || field,
            value,
            contribution: value < getLabThreshold(field) ? 2 : 0,
            explanation: NUTRIENT_LAB_EXPLANATIONS[field] || `${field} lab value is ${value}`,
          });
        }
      }
    }

    // Build symptom contributions for this nutrient
    const symptomContributions: SymptomContribution[] = [];
    if (profile?.symptoms) {
      for (const symptom of profile.symptoms) {
        const mappedNutrient = SYMPTOM_NUTRIENT_MAP[symptom];
        if (mappedNutrient === line.nutrient) {
          const label = SYMPTOM_LABEL_MAP[symptom] || symptom;
          symptomContributions.push({
            symptom: label,
            contribution: 1,
            explanation: `${label} can be related to low ${NUTRIENT_LABELS[line.nutrient].toLowerCase()} levels`,
          });
        }
      }
    }

    // Build plain-language reasons array
    const reasons: string[] = [];
    if (labContributions.length > 0) {
      for (const lc of labContributions) {
        reasons.push(`Your ${lc.field} level (${lc.value}) is on the lower side, which suggests your body may need more ${NUTRIENT_LABELS[line.nutrient].toLowerCase()}.`);
      }
    }
    if (symptomContributions.length > 0) {
      for (const sc of symptomContributions) {
        reasons.push(`${sc.explanation} — you selected this concern during your assessment.`);
      }
    }
    if (reasons.length === 0) {
      if (gapPercent > 30) {
        reasons.push(`You're getting only ${100 - gapPercent}% of your daily ${NUTRIENT_LABELS[line.nutrient].toLowerCase()} target from today's meals. Adding more can help you recover faster.`);
      } else {
        reasons.push(`Your meals today didn't quite meet the ${NUTRIENT_LABELS[line.nutrient].toLowerCase()} target for your recovery plan.`);
      }
    }

    return {
      nutrient: line.nutrient,
      reason: MISS_REASONS[line.nutrient] ?? `Yesterday's logged meals may not have met the target for ${NUTRIENT_LABELS[line.nutrient].toLowerCase()}`,
      additions: additions.length > 0 ? additions : topFoodSourcesForNutrient(foods, line.nutrient, dietType, 5, cuisinePreference),
      expectedImprovement: `Adding these can close roughly ${Math.round(gap * 10) / 10} ${line.unit} of your ${NUTRIENT_LABELS[line.nutrient].toLowerCase()} gap today`,
      confidence,
      labContributions,
      symptomContributions,
      reasons,
    };
  });
}

function getLabThreshold(field: string): number {
  switch (field) {
    case "hemoglobin": return 12;
    case "ferritin": return 30;
    case "vitaminDLevel": return 30;
    case "vitaminB12Level": return 200;
    case "serumCalcium": return 8.8;
    case "totalProtein": return 6.4;
    default: return 0;
  }
}

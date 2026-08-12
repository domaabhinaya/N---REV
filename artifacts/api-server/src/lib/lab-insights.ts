export interface LabValues {
  hemoglobin?: number | null;
  ferritin?: number | null;
  vitaminB12Level?: number | null;
  vitaminDLevel?: number | null;
  serumCalcium?: number | null;
  totalProtein?: number | null;
}

const LAB_LABELS: Record<keyof LabValues, string> = {
  hemoglobin: "Hemoglobin",
  ferritin: "Ferritin",
  vitaminB12Level: "Vitamin B12",
  vitaminDLevel: "Vitamin D",
  serumCalcium: "Serum calcium",
  totalProtein: "Total protein",
};

export function compareLabValues(baseline: LabValues | null, current: LabValues): string[] {
  const insights: string[] = [];
  const keys = Object.keys(LAB_LABELS) as (keyof LabValues)[];

  if (!baseline) {
    for (const key of keys) {
      const value = current[key];
      if (value != null) {
        insights.push(`${LAB_LABELS[key]} recorded at ${value}. This will serve as your baseline for tracking dietary recovery progress.`);
      }
    }
    if (insights.length === 0) {
      insights.push("No lab values were recorded yet. Add values whenever you have them to track recovery-support progress over time.");
    }
    return insights;
  }

  for (const key of keys) {
    const before = baseline[key];
    const after = current[key];
    if (before == null || after == null) continue;
    const label = LAB_LABELS[key];
    const change = after - before;
    const pctChange = before !== 0 ? (change / Math.abs(before)) * 100 : 0;
    if (Math.abs(pctChange) < 3) {
      insights.push(`${label} is largely unchanged (${before} to ${after}). Keep up consistent food-based recovery support.`);
    } else if (change > 0) {
      insights.push(`${label} improved from ${before} to ${after} — a promising sign that your recovery nutrition support is helping.`);
    } else {
      insights.push(`${label} moved from ${before} to ${after}, suggesting this nutrient still needs continued dietary focus.`);
    }
  }

  if (insights.length === 0) {
    insights.push("Not enough matching lab values between the two records to compare yet.");
  }

  return insights;
}

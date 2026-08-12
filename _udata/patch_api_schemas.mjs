import fs from "fs";

const p = "C:\\Users\\Abhinaya Doma\\OneDrive\\Desktop\\N-REV-main\\lib\\api-client-react\\src\\generated\\api.schemas.ts";
let s = fs.readFileSync(p, "utf8");

const pairs = [
  // NutrientKey const
  [
    "  vitamin_k: 'vitamin_k',\n} as const;",
    "  vitamin_k: 'vitamin_k',\n  vitamin_b12: 'vitamin_b12',\n  folate: 'folate',\n  zinc: 'zinc',\n  iodine: 'iodine',\n  potassium: 'potassium',\n} as const;"
  ],
  // RecoveryPlanDayStatus
  [
    "  vitaminE?: NutrientStatus;\n  vitaminK?: NutrientStatus;\n};",
    "  vitaminE?: NutrientStatus;\n  vitaminK?: NutrientStatus;\n  vitaminB12?: NutrientStatus;\n  folate?: NutrientStatus;\n  zinc?: NutrientStatus;\n  iodine?: NutrientStatus;\n  potassium?: NutrientStatus;\n};"
  ],
  // NutrientTotals + WeeklyNutrientPoint (both end with this)
  [
    "  vitaminK: number;\n}",
    "  vitaminK: number;\n  vitaminB12: number;\n  folate: number;\n  zinc: number;\n  iodine: number;\n  potassium: number;\n}"
  ],
  // Food interface
  [
    "  /** @nullable */\n  vitaminK?: number | null;\n  dietTags: DietType[];",
    "  /** @nullable */\n  vitaminK?: number | null;\n  /** @nullable */\n  vitaminB12?: number | null;\n  /** @nullable */\n  folate?: number | null;\n  /** @nullable */\n  zinc?: number | null;\n  /** @nullable */\n  iodine?: number | null;\n  /** @nullable */\n  potassium?: number | null;\n  dietTags: DietType[];"
  ],
];

let changed = 0;
for (const [oldText, newText] of pairs) {
  const count = s.split(oldText).length - 1;
  if (count === 0) {
    console.log("NOT FOUND:", JSON.stringify(oldText.slice(0, 60)));
    continue;
  }
  s = s.split(oldText).join(newText);
  changed += count;
  console.log(`applied ${count}x`);
}
fs.writeFileSync(p, s);
console.log("total replacements:", changed);

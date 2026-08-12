import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboard,
  useGetProfile,
  useGetDailySummary,
  useGetRecoveryPlan,
  useGetNutrientTargets,
  getGetDashboardQueryKey,
  getGetProfileQueryKey,
  getGetDailySummaryQueryKey,
  getGetRecoveryPlanQueryKey,
  getGetNutrientTargetsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, ArrowLeft } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const NUTRIENT_LABELS: Record<string, string> = {
  protein: "Protein", iron: "Iron", calcium: "Calcium", vitamin_d: "Vitamin D",
  magnesium: "Magnesium", vitamin_a: "Vitamin A", vitamin_c: "Vitamin C",
  vitamin_b7: "Vitamin B7", vitamin_e: "Vitamin E", vitamin_k: "Vitamin K",
  vitamin_b1: "Vitamin B1", vitamin_b2: "Vitamin B2", vitamin_b3: "Vitamin B3", vitamin_b6: "Vitamin B6", vitamin_b12: "Vitamin B12",
};

const NUTRIENT_UNITS: Record<string, string> = {
  protein: "g", iron: "mg", calcium: "mg", vitamin_d: "IU",
  magnesium: "mg", vitamin_a: "mcg", vitamin_c: "mg",
  vitamin_b7: "mcg", vitamin_e: "mg", vitamin_k: "mcg",
  vitamin_b1: "mg", vitamin_b2: "mg", vitamin_b3: "mg", vitamin_b6: "mg", vitamin_b12: "mcg",
};

const SYMPTOM_REASONS: Record<string, string> = {
  fatigue: "Fatigue is commonly associated with low iron, vitamin D, or protein levels — all of which your assessment tracks.",
  weakness: "Weakness can indicate insufficient protein, iron, or vitamin D — your recovery plan targets these.",
  hair_fall: "Hair fall is often linked to iron or protein gaps — your meal plan includes sources for these.",
  pale_skin: "Pale skin is a classic sign watched for possible iron deficiency.",
  dizziness: "Dizziness is frequently reported alongside low iron or B12 levels.",
  muscle_cramps: "Muscle cramps often accompany low calcium, magnesium, or vitamin D.",
  bone_pain: "Bone pain strongly suggests calcium or vitamin D needs.",
  poor_immunity: "Poor immunity can reflect vitamin C, D, or protein gaps.",
  slow_recovery: "Slow recovery suggests protein or vitamin C needs.",
  brain_fog: "Brain fog is commonly reported with low B12 or iron.",
  tingling_numbness: "Tingling or numbness is a classic B12 deficiency symptom.",
};

const FOOD_INTERACTIONS: Record<string, { synergy: string[]; antagonist: string[]; note: string }> = {
  tea: {
    synergy: [],
    antagonist: ["iron"],
    note: "Tannins in tea reduce non-heme iron absorption by 60-80%. If you have iron deficiency, avoid tea within 1 hour of iron-rich meals. Instead, have it between meals or with vitamin C sources like lemon.",
  },
  coffee: {
    synergy: [],
    antagonist: ["iron"],
    note: "Coffee polyphenols bind to iron and reduce absorption by 30-50%. Avoid coffee with iron-rich meals if you have iron deficiency.",
  },
  milk: {
    synergy: ["vitamin_d"],
    antagonist: ["iron"],
    note: "Calcium in milk competes with iron for absorption. If you have iron deficiency, space milk and iron-rich foods at least 2 hours apart. Milk is excellent with Vitamin D sources.",
  },
  spinach: {
    synergy: ["iron", "vitamin_c", "vitamin_a"],
    antagonist: [],
    note: "Spinach is rich in iron, vitamin A, and calcium. Pair with vitamin C sources (lemon, orange) to boost iron absorption.",
  },
  eggs: {
    synergy: ["protein", "vitamin_d", "vitamin_b12"],
    antagonist: [],
    note: "Eggs are an excellent source of protein, vitamin D, and B12. Suitable for your recovery if you're eggetarian or non-vegetarian.",
  },
  orange: {
    synergy: ["vitamin_c", "iron"],
    antagonist: [],
    note: "Oranges are rich in vitamin C, which significantly improves iron absorption when consumed with iron-rich foods.",
  },
  chicken: {
    synergy: ["protein", "iron", "vitamin_b12"],
    antagonist: [],
    note: "Chicken provides high-quality protein and heme iron, which is absorbed more efficiently than plant-based iron.",
  },
  banana: {
    synergy: ["magnesium"],
    antagonist: [],
    note: "Bananas are rich in magnesium and vitamin B6, which support muscle function and nerve health.",
  },
  broccoli: {
    synergy: ["vitamin_c", "calcium"],
    antagonist: [],
    note: "Broccoli provides vitamin C, calcium, and vitamin K. Great for bone health and immunity.",
  },
  carrot: {
    synergy: ["vitamin_a"],
    antagonist: [],
    note: "Carrots are rich in vitamin A (beta-carotene), which supports eye health and immunity.",
  },
  almonds: {
    synergy: ["vitamin_e", "magnesium"],
    antagonist: [],
    note: "Almonds are rich in vitamin E, magnesium, and calcium. They make an excellent recovery snack.",
  },
  pumpkin: {
    synergy: ["iron", "magnesium"],
    antagonist: [],
    note: "Pumpkin seeds are rich in iron and magnesium — both important for recovery.",
  },
};

function buildAssessmentContext(
  profile: any,
  dashboard: any,
  dailySummary: any,
  recoveryPlan: any,
  targets: any[],
): string {
  const parts: string[] = [];

  if (profile) {
    parts.push(`Patient: ${profile.name || "Unknown"}, ${profile.age || "?"} yrs, ${profile.gender || "?"}, Diet: ${(profile.dietType || "").replace(/_/g, " ")}, Allergies: ${profile.allergies || "None"}`);
  }

  if (profile?.symptoms?.length) {
    parts.push(`Symptoms: ${profile.symptoms.map((s: string) => s.replace(/_/g, " ")).join(", ")}`);
  }

  const labs: string[] = [];
  const labFields = [
    { key: "hemoglobin", label: "Hemoglobin", unit: "g/dL" },
    { key: "ferritin", label: "Ferritin", unit: "ng/mL" },
    { key: "vitaminB12Level", label: "Vitamin B12", unit: "pg/mL" },
    { key: "vitaminDLevel", label: "Vitamin D", unit: "ng/mL" },
    { key: "serumCalcium", label: "Serum Calcium", unit: "mg/dL" },
    { key: "totalProtein", label: "Total Protein", unit: "g/dL" },
  ];
  for (const lab of labFields) {
    const val = (profile as any)?.[lab.key];
    if (val != null && val > 0) {
      labs.push(`${lab.label}: ${val} ${lab.unit}`);
    }
  }
  if (labs.length) parts.push(`Lab Values: ${labs.join(", ")}`);

  if (targets?.length) {
    const deficiencies = targets.filter((n: any) => n.priority === "high" || n.priority === "medium");
    if (deficiencies.length) {
      parts.push(`Predicted Deficiencies: ${deficiencies.map((n: any) => `${NUTRIENT_LABELS[n.nutrient] || n.nutrient} (${n.priority}, target: ${n.dailyTarget}${n.unit})`).join("; ")}`);
    }
  }

  if (recoveryPlan?.durationDays) {
    parts.push(`Recovery Plan: ${recoveryPlan.durationDays} days, Days tracked: ${dashboard?.daysTracked || 0}`);
  }

  if (recoveryPlan?.days?.length) {
    const day1 = recoveryPlan.days[0];
    const meals = [
      `Breakfast: ${day1.breakfast?.map((i: any) => typeof i === "string" ? i : i.name).join(", ") || "—"}`,
      `Lunch: ${day1.lunch?.map((i: any) => typeof i === "string" ? i : i.name).join(", ") || "—"}`,
      `Dinner: ${day1.dinner?.map((i: any) => typeof i === "string" ? i : i.name).join(", ") || "—"}`,
      `Snacks: ${day1.snacks?.map((i: any) => typeof i === "string" ? i : i.name).join(", ") || "—"}`,
    ];
    parts.push(`Meal Plan Day 1: ${meals.join(" | ")}`);
  }

  if (dailySummary?.nutrients?.length) {
    const intake = dailySummary.nutrients
      .filter((n: any) => n.consumed > 0)
      .map((n: any) => `${NUTRIENT_LABELS[n.nutrient] || n.nutrient}: ${n.consumed.toFixed(1)}/${n.target}${n.unit || NUTRIENT_UNITS[n.nutrient] || ""} (${n.target > 0 ? Math.round((n.consumed / n.target) * 100) : 0}%)`);
    if (intake.length) parts.push(`Today's Intake: ${intake.join(", ")}`);
  }

  if (dashboard?.recoveryScore != null) {
    parts.push(`Recovery Score: ${dashboard.recoveryScore}/100, Adherence: ${dashboard.weeklyAdherenceScore || 0}%, Streak: ${dashboard.streak || 0} days`);
  }

  return parts.join("\n");
}

function generateAnswer(
  question: string,
  context: string,
  profile: any,
  dashboard: any,
  dailySummary: any,
  recoveryPlan: any,
  targets: any[],
): string {
  const q = question.toLowerCase().trim();

  const deficiencies = (targets || []).filter((n: any) => n.priority === "high" || n.priority === "medium") || [];
  const deficiencyNames = deficiencies.map((n: any) => (NUTRIENT_LABELS[n.nutrient] || n.nutrient).toLowerCase());
  const hasIronDeficiency = deficiencyNames.includes("iron");
  const hasCalciumDeficiency = deficiencyNames.includes("calcium");
  const hasVitaminDDeficiency = deficiencyNames.includes("vitamin d");
  const hasProteinDeficiency = deficiencyNames.includes("protein");
  const dietType = profile?.dietType || "non_vegetarian";
  const symptoms = profile?.symptoms?.map((s: string) => s.replace(/_/g, " ").toLowerCase()) || [];

  // "Can I drink tea?" / "Can I have tea?"
  if (q.includes("tea") || q.includes("chai") || q.includes("drink tea")) {
    return FOOD_INTERACTIONS.tea.note + (hasIronDeficiency
      ? " **Since you have an iron deficiency**, it's especially important to avoid tea within 1 hour of iron-rich meals. Consider having it 2 hours after meals."
      : " However, your assessment does not indicate iron deficiency, so moderate tea consumption is generally fine. Avoid drinking it with meals for best absorption.");
  }

  // "Why do I have Iron deficiency?"
  if ((q.includes("iron") || q.includes("deficiency")) && (q.includes("why") || q.includes("cause") || q.includes("reason"))) {
    if (hasIronDeficiency) {
      const ironItem = deficiencies.find((n: any) => n.nutrient === "iron");
      const reasons = ironItem?.reasons || [];
      const symptomReasons = symptoms.filter((s: string) =>
        ["fatigue", "weakness", "hair fall", "pale skin", "dizziness", "low energy"].includes(s)
      );
      let answer = "Based on your assessment, here are the likely contributors to your iron deficiency:\n\n";
      if (reasons.length) {
        answer += reasons.map((r: string) => `• ${r}`).join("\n") + "\n\n";
      }
      if (symptomReasons.length) {
        answer += `Your reported symptoms (${symptomReasons.join(", ")}) are consistent with low iron levels.\n\n`;
      }
      const labFields = [
        { key: "hemoglobin", label: "Hemoglobin", unit: "g/dL", normal: "13.5-17.5" },
        { key: "ferritin", label: "Ferritin", unit: "ng/mL", normal: "30-400" },
      ];
      for (const lab of labFields) {
        const val = (profile as any)?.[lab.key];
        if (val != null && val > 0 && val < parseFloat(lab.normal.split("-")[0])) {
          answer += `Your ${lab.label} (${val} ${lab.unit}) is below the normal range (${lab.normal}), which confirms iron deficiency.\n\n`;
        }
      }
      answer += "Your recovery plan includes iron-rich foods like spinach, legumes, and fortified cereals. Pair them with vitamin C sources (lemon, orange) to improve absorption.";
      return answer;
    }
    return "Your assessment does not indicate iron deficiency. Your iron levels appear to be within normal range. If you have concerns, please consult your healthcare provider.";
  }

  // "Suggest an alternative to eggs"
  if (q.includes("alternative") || q.includes("replace") || q.includes("substitute") || q.includes("instead of")) {
    const foodKeywords: Record<string, string[]> = {
      eggs: ["eggs", "egg", "omelette", "egg bhurji"],
      milk: ["milk", "dairy", "curd", "yogurt", "paneer"],
      chicken: ["chicken", "meat", "mutton", "fish"],
      spinach: ["spinach", "palak", "leafy greens"],
    };
    let targetFood = "";
    for (const [food, keywords] of Object.entries(foodKeywords)) {
      if (keywords.some((k: string) => q.includes(k))) {
        targetFood = food;
        break;
      }
    }
    if (targetFood === "eggs") {
      const isVeg = dietType === "vegan" || dietType === "vegetarian";
      if (isVeg) {
        return "For a vegan/vegetarian diet, great alternatives to eggs include:\n\n• **Soya chunks** (26g protein per cup) — excellent protein source\n• **Paneer** (18g protein per 100g) — if you consume dairy\n• **Tofu** (12g protein per 100g) — versatile in curries\n• **Moong dal** (14g protein per cup) — light and easy to digest\n• **Sprouted moong salad** — good for breakfast\n\nThese are included in your meal plan and align with your diet type.";
      }
      return "Alternatives to eggs that are rich in protein and nutrients:\n\n• **Chicken** (27g protein per 100g) — heme iron source\n• **Fish** (22g protein per 100g) — also rich in vitamin D\n• **Paneer** (18g protein per 100g) — calcium-rich\n• **Soya chunks** (26g protein per cup) — plant-based option\n• **Curd** (8g protein per cup) — gut-friendly\n\nYour meal plan includes several of these options.";
    }
    if (targetFood === "milk") {
      if (hasIronDeficiency) {
        return "Since you have iron deficiency, replacing milk is a good idea because calcium competes with iron absorption. Alternatives:\n\n• **Fortified soy milk** (300mg calcium, 100 IU vitamin D) — closest match\n• **Tofu** (200mg calcium per 100g) — versatile\n• **Ragi** (190mg calcium per roti) — traditional grain option\n• **Sesame seeds / til laddu** (220mg calcium per serving)\n\nSpace any calcium-rich foods 2 hours apart from iron-rich meals.";
      }
      return "Good alternatives to milk:\n\n• **Fortified soy milk** — similar calcium and vitamin D content\n• **Curd/Dahi** (300mg calcium per cup) — probiotic benefits\n• **Paneer** (480mg calcium per 100g) — protein-rich\n• **Cheese** (150mg calcium per slice)\n\nYour diet type allows these options.";
    }
    if (targetFood === "chicken") {
      const isNonVeg = dietType === "non_vegetarian" || dietType === "eggetarian";
      if (!isNonVeg) {
        return "Since you follow a vegetarian/vegan diet, your meal plan already uses plant-based protein sources:\n\n• **Soya chunks** (26g protein) — highest plant protein\n• **Paneer** (18g protein) — if dairy is allowed\n• **Tofu** (12g protein) — versatile option\n• **Chana dal** (15g protein) — legume source\n• **Sprouts** (9g protein) — light option\n\nThese are included in your recovery plan.";
      }
      return "Alternatives to chicken:\n\n• **Fish** (22g protein, 220 IU vitamin D) — excellent for vitamin D\n• **Eggs** (6g protein per egg) — quick protein source\n• **Mutton** (25g protein) — rich in iron\n• **Soya chunks** (26g protein) — plant-based option\n\nYour meal plan rotates between these protein sources.";
    }
    return "Based on your recovery plan, here are some food alternatives:\n\n• Replace **eggs** with paneer, tofu, or soya chunks\n• Replace **milk** with fortified soy milk or curd\n• Replace **chicken** with fish, eggs, or legumes\n• Replace **spinach** with methi (fenugreek) or other leafy greens\n\nWould you like me to suggest an alternative for a specific food?";
  }

  // "Why was spinach recommended?" / "Why was [food] recommended?"
  if (q.includes("why") && (q.includes("recommended") || q.includes("suggested") || q.includes("included"))) {
    for (const [food, info] of Object.entries(FOOD_INTERACTIONS)) {
      if (q.includes(food)) {
        const synergyLabels = info.synergy.map((s) => NUTRIENT_LABELS[s] || s);
        let answer = `${food.charAt(0).toUpperCase() + food.slice(1)} was recommended because:\n\n`;
        if (synergyLabels.length) {
          answer += `• Rich in ${synergyLabels.join(", ")} — nutrients that are important for your recovery.\n`;
        }
        if (deficiencyNames.some((d: string) => info.synergy.some((s: string) => (NUTRIENT_LABELS[s] || s).toLowerCase().includes(d) || s.includes(d.replace(" ", "_"))))) {
          answer += `• Your assessment shows deficiency in nutrients that ${food} provides.\n`;
        }
        answer += `\n${info.note}`;
        return answer;
      }
    }
    const allFoods = recoveryPlan?.days?.flatMap((d: any) =>
      [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snacks || [])]
        .map((i: any) => (typeof i === "string" ? i : i.name).toLowerCase())
    ) || [];
    const matchedFood = allFoods.find((f: string) => q.includes(f));
    if (matchedFood) {
      return `${matchedFood.charAt(0).toUpperCase() + matchedFood.slice(1)} is included in your recovery meal plan because it provides nutrients that support your recovery goals. Based on your assessment, foods rich in protein, iron, calcium, and vitamins are prioritized to address your specific deficiencies.`;
    }
    return "Foods in your recovery plan are selected based on your assessment — they target your specific nutrient deficiencies, fit your diet type, and avoid your allergens. Each food is chosen to maximize nutrient density for your recovery needs.";
  }

  // "Which foods should I avoid?"
  if (q.includes("avoid") || q.includes("not eat") || q.includes("should not")) {
    let answer = "Based on your assessment, here are foods to be mindful of:\n\n";
    if (hasIronDeficiency) {
      answer += "**Since you have iron deficiency:**\n";
      answer += "• Avoid **tea/coffee** within 1 hour of iron-rich meals (tannins reduce absorption)\n";
      answer += "• Avoid **milk/calcium-rich foods** with iron-rich meals (calcium competes for absorption)\n";
      answer += "• Space calcium sources 2 hours apart from iron sources\n\n";
    }
    if (profile?.allergies) {
      answer += `**Your allergies (${profile.allergies}):** Avoid any foods containing these ingredients.\n\n`;
    }
    if (profile?.dietType) {
      answer += `**Your diet type (${profile.dietType.replace(/_/g, " ")}):** Your meal plan excludes non-compatible foods.\n\n`;
    }
    answer += "**General advice:**\n";
    answer += "• Limit processed foods high in sugar (interferes with vitamin C absorption)\n";
    answer += "• Avoid alcohol (impairs B12 and magnesium absorption)\n";
    answer += "• Reduce high-sodium foods (increases calcium excretion)\n";
    return answer;
  }

  // "Can I replace milk?"
  if (q.includes("replace") || q.includes("substitute")) {
    for (const [, keywords] of Object.entries({
      milk: ["milk", "dairy", "curd"],
      eggs: ["eggs", "egg"],
      chicken: ["chicken", "meat"],
    })) {
      if (keywords.some((k) => q.includes(k))) {
        const foodKeywords: Record<string, string[]> = {
          milk: ["milk", "dairy", "curd", "yogurt", "paneer"],
          eggs: ["eggs", "egg", "omelette"],
          chicken: ["chicken", "meat", "mutton", "fish"],
        };
        for (const [f, kws] of Object.entries(foodKeywords)) {
          if (kws.some((k) => q.includes(k))) {
            return generateAnswer(`suggest an alternative to ${f}`, context, profile, dashboard, dailySummary, recoveryPlan, targets);
          }
        }
      }
    }
  }

  // "Can I eat [food]?"
  if (q.startsWith("can i") || q.startsWith("should i")) {
    for (const [food, info] of Object.entries(FOOD_INTERACTIONS)) {
      if (q.includes(food)) {
        const isVeg = dietType === "vegan" || dietType === "vegetarian";
        const dietOk = !(food === "chicken" && isVeg) && !(food === "eggs" && dietType === "vegan");
        let answer = dietOk
          ? `Yes, **${food}** is suitable for your diet type (${dietType.replace(/_/g, " ")}).\n\n`
          : `**${food.charAt(0).toUpperCase() + food.slice(1)}** may not be suitable for your diet type (${dietType.replace(/_/g, " ")}). Consider alternatives.\n\n`;
        answer += info.note;
        if (info.antagonist.includes("iron") && hasIronDeficiency) {
          answer += "\n\n⚠️ Since you have iron deficiency, be mindful of timing when consuming this.";
        }
        return answer;
      }
    }
    const allFoods = recoveryPlan?.days?.flatMap((d: any) =>
      [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snacks || [])]
        .map((i: any) => (typeof i === "string" ? i : i.name).toLowerCase())
    ) || [];
    const matched = allFoods.find((f: string) => q.includes(f));
    if (matched) {
      return `Yes, **${matched}** is included in your recovery meal plan. It has been selected to support your nutrient needs based on your assessment.`;
    }
    return "To give you a personalized answer, I need to check if that food is in your recovery plan. Based on your diet type and assessment, most whole foods that align with your dietary preferences are generally fine. Would you like me to check a specific food from your meal plan?";
  }

  // Default: answer based on context
  const contextParts = context.split("\n").filter(Boolean);
  if (contextParts.length > 0) {
    if (q.includes("diet") || q.includes("diet type") || q.includes("eat")) {
      return `Based on your assessment, you follow a **${dietType.replace(/_/g, " ")}** diet. ${profile?.allergies ? `Your allergies include: ${profile.allergies}. ` : ""}Your recovery plan is tailored to these preferences. The meal plan includes foods rich in nutrients you need most, and avoids foods that don't align with your diet or that contain allergens.`;
    }
    if (q.includes("symptom") || q.includes("feeling") || q.includes("experience")) {
      if (symptoms.length) {
        let answer = "Based on your reported symptoms:\n\n";
        for (const symptom of symptoms) {
          const reason = SYMPTOM_REASONS[symptom.replace(/ /g, "_")];
          if (reason) {
            answer += `• **${symptom}**: ${reason}\n`;
          }
        }
        answer += "\nYour recovery plan is designed to address these symptoms by targeting the underlying nutrient gaps.";
        return answer;
      }
      return "You haven't reported any symptoms in your assessment. If you're experiencing any symptoms, please update your assessment.";
    }
    if (q.includes("progress") || q.includes("how am i") || q.includes("recovery")) {
      return `Here's your recovery progress summary:\n\n• **Recovery Score**: ${dashboard?.recoveryScore || 0}/100\n• **Weekly Adherence**: ${dashboard?.weeklyAdherenceScore || 0}%\n• **Days Tracked**: ${dashboard?.daysTracked || 0} days\n• **Current Streak**: ${dashboard?.streak || 0} days\n• **Expected Recovery**: ${profile?.recoveryDuration || 30} days total\n\n${dashboard?.insights?.length ? `**Insights:**\n${dashboard.insights.map((i: string) => `• ${i}`).join("\n")}` : "Keep logging your meals to get personalized insights!"}`;
    }
  }

  return "I can answer questions about your assessment, diet, and recovery plan. Try asking:\n\n• \"Can I drink tea?\"\n• \"Why do I have iron deficiency?\"\n• \"Suggest an alternative to eggs\"\n• \"Why was spinach recommended?\"\n• \"Can I replace milk?\"\n• \"Which foods should I avoid?\"\n• \"How is my recovery progress?\"";
}

export function AiAssistant() {
  const [, setLocation] = useLocation();
  const profileIdStr = localStorage.getItem("nutrirecover_profile_id");
  const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI Nutrition Assistant. I can answer questions about your assessment, diet, and recovery plan. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileId) setLocation("/");
  }, [profileId, setLocation]);

const { data: dashboard, isLoading: dashLoading } = useGetDashboard(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetDashboardQueryKey(profileId as number) },
  } as any);
  const { data: profile, isLoading: profileLoading } = useGetProfile(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetProfileQueryKey(profileId as number) },
  });
  const { data: dailySummary, isLoading: dailyLoading } = useGetDailySummary(profileId as number, undefined, {
    query: { enabled: !!profileId, queryKey: getGetDailySummaryQueryKey(profileId as number) },
  } as any);
  const { data: recoveryPlan, isLoading: planLoading } = useGetRecoveryPlan(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetRecoveryPlanQueryKey(profileId as number) },
  });
  const { data: targets, isLoading: targetsLoading } = useGetNutrientTargets(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetNutrientTargetsQueryKey(profileId as number) },
  });

  const isLoading = dashLoading || profileLoading || dailyLoading || planLoading || targetsLoading;

  const context = useMemo(() => {
    if (!profile || !dashboard) return "";
    return buildAssessmentContext(profile, dashboard, dailySummary, recoveryPlan, targets || []);
  }, [profile, dashboard, dailySummary, recoveryPlan, targets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || isProcessing) return;

    setInput("");
    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", content: q }]);

    // Prefer the dataset-grounded backend assistant; fall back to the local
    // heuristic only if the backend is unreachable or returns no answer.
    let answer: string;
    try {
      const res = await fetch(`/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, question: q }),
      });
      const data = await res.json();
      answer =
        res.ok && typeof data?.answer === "string" && data.answer.length > 0
          ? data.answer
          : generateAnswer(q, context, profile, dashboard, dailySummary, recoveryPlan, targets || []);
    } catch {
      answer = generateAnswer(q, context, profile, dashboard, dailySummary, recoveryPlan, targets || []);
    }
    setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    setIsProcessing(false);
  };

  if (!profileId) return null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-primary mb-2">AI Nutrition Assistant</h1>
            <p className="text-muted-foreground">
              Ask questions about your assessment, diet, and recovery plan.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <>
            {/* Context Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>
                    I understand your assessment: {profile?.name || "Patient"}, {profile?.age || "?"} yrs,{" "}
                    {profile?.dietType?.replace(/_/g, " ") || "?"} diet.
                    {(targets || []).filter((n: any) => n.priority === "high" || n.priority === "medium").length
                      ? ` Key deficiencies identified.`
                      : ""}
                    {dashboard?.daysTracked ? ` ${dashboard.daysTracked} days tracked.` : ""}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Chat Messages */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 border border-border"
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-bold text-primary">
                            {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about your diet or recovery..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isProcessing}>
                <Send className="h-4 w-4 mr-1" />
                Ask
              </Button>
            </div>

            {/* Suggested Questions */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">Try asking:</span>
              {[
                "Can I drink tea?",
                "Why do I have iron deficiency?",
                "Suggest an alternative to eggs",
                "Which foods should I avoid?",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="text-xs bg-muted/30 hover:bg-muted/50 border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

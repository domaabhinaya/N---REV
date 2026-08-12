import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboard,
  useGetProfile,
  useGetDailySummary,
  useGetRecoveryPlan,
  useGetNutrientTargets,
  useListFoods,
  getGetDashboardQueryKey,
  getGetProfileQueryKey,
  getGetDailySummaryQueryKey,
  getGetRecoveryPlanQueryKey,
  getGetNutrientTargetsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ArrowLeft,
  FileText,
  AlertCircle,
  CheckCircle2,
  Utensils,
  AlertTriangle,
  Info,
  Activity,
  Heart,
  Brain,
  Bone,
  Droplets,
  Sun,
  Zap,
  Shield,
  TrendingUp,
  ClipboardList,
  ShoppingCart,
  Calendar,
  Apple,
  Beef,
  Thermometer,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Stethoscope,
  User,
  Scale,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const NUTRIENT_LABELS: Record<string, string> = {
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

const NUTRIENT_UNITS: Record<string, string> = {
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

const NUTRIENT_COLORS: Record<string, string> = {
  protein: "#2563eb",
  iron: "#dc2626",
  calcium: "#059669",
  vitamin_d: "#d97706",
  magnesium: "#7c3aed",
  vitamin_a: "#db2777",
  vitamin_c: "#0d9488",
  vitamin_b7: "#4f46e5",
  vitamin_e: "#ea580c",
  vitamin_k: "#65a30d",
  vitamin_b1: "#f59e0b",
  vitamin_b2: "#10b981",
  vitamin_b3: "#3b82f6",
  vitamin_b6: "#8b5cf6",
  vitamin_b12: "#0ea5e9",
};

const LAB_REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string; label: string }> = {
  hemoglobin: { min: 12, max: 15.5, unit: "g/dL", label: "Hemoglobin" },
  ferritin: { min: 15, max: 150, unit: "ng/mL", label: "Ferritin" },
  vitaminB12Level: { min: 200, max: 900, unit: "pg/mL", label: "Vitamin B12" },
  vitaminDLevel: { min: 20, max: 50, unit: "ng/mL", label: "Vitamin D" },
  serumCalcium: { min: 8.5, max: 10.5, unit: "mg/dL", label: "Serum Calcium" },
  totalProtein: { min: 6, max: 8.3, unit: "g/dL", label: "Total Protein" },
};

const SYNERGY_PAIRS: { id: string; combination: string; reason: string }[] = [
  { id: "iron-vitamin-c", combination: "Iron + Vitamin C", reason: "Vitamin C improves non-heme iron absorption by 2-6 times when consumed together." },
  { id: "calcium-vitamin-d", combination: "Calcium + Vitamin D", reason: "Vitamin D is essential for intestinal calcium absorption and bone mineralization." },
  { id: "magnesium-vitamin-d", combination: "Magnesium + Vitamin D", reason: "Magnesium activates vitamin D in the liver and kidneys for optimal utilization." },
  { id: "turmeric-black-pepper", combination: "Turmeric + Black Pepper", reason: "Piperine in black pepper increases curcumin bioavailability by up to 2000%." },
  { id: "vitamin-c-protein", combination: "Vitamin C + Protein", reason: "Vitamin C is a required cofactor for collagen synthesis and connective tissue repair." },
  { id: "b12-b6", combination: "Vitamin B12 + Vitamin B6", reason: "B12 and B6 work together in homocysteine metabolism and red blood cell formation." },
  { id: "selenium-vitamin-a", combination: "Selenium + Vitamin A", reason: "Selenium supports vitamin A metabolism and antioxidant protection in the retina." },
  { id: "vitamin-e-selenium", combination: "Vitamin E + Selenium", reason: "Selenium and vitamin E function synergistically as antioxidants protecting cell membranes." },
  { id: "vitamin-d-k2", combination: "Vitamin D + Vitamin K2", reason: "Vitamin K2 directs calcium to bones and teeth rather than depositing in arteries." },
  { id: "rice-dal", combination: "Rice + Dal (Grains + Legumes)", reason: "Grains and legumes complement each other's limiting amino acids for complete protein." },
  { id: "iron-vitamin-a", combination: "Iron + Vitamin A", reason: "Vitamin A helps mobilize stored iron for incorporation into red blood cells." },
  { id: "calcium-magnesium", combination: "Calcium + Magnesium", reason: "Calcium and magnesium work together for muscle contraction, nerve transmission, and bone health." },
  { id: "vitamin-c-collagen", combination: "Vitamin C + Protein", reason: "Vitamin C is essential for collagen synthesis, wound healing, and immune function." },
  { id: "b-vitamin-complex", combination: "B-Complex Vitamins", reason: "B vitamins work as a team in energy metabolism and red blood cell production." },
  { id: "vitamin-c-collagen", combination: "Vitamin C + Collagen-Rich Foods", reason: "Vitamin C is essential for collagen cross-linking and tissue integrity." },
  { id: "iron-meat-fish", combination: "Heme Iron (Meat/Fish) + Non-Heme Iron (Plants)", reason: "Heme iron enhances the absorption of non-heme iron from plant sources." },
  { id: "spinach-lemon", combination: "Spinach + Lemon Juice", reason: "Vitamin C from lemon enhances iron absorption from spinach significantly." },
  { id: "turmeric-ghee", combination: "Turmeric + Ghee", reason: "Fat in ghee significantly improves curcumin absorption and bioavailability." },
  { id: "greens-citrus", combination: "Leafy Greens + Citrus Fruits", reason: "Vitamin C from citrus improves iron absorption from leafy greens." },
  { id: "beans-grains", combination: "Beans + Whole Grains", reason: "Creates a complete protein profile with all essential amino acids." },
];

const ANTAGONISTIC_PAIRS: { id: string; combination: string; reason: string }[] = [
  { id: "tea-iron", combination: "Tea + Iron-rich Meals", reason: "Tannins in tea bind to non-heme iron, reducing absorption by 60-80% when consumed within 1 hour." },
  { id: "coffee-iron", combination: "Coffee + Iron-rich Meals", reason: "Coffee polyphenols bind to iron and reduce its absorption by 30-50%." },
  { id: "calcium-iron", combination: "Calcium + Iron (Same Meal)", reason: "Calcium competes with iron for absorption sites and can reduce iron uptake by 20-50%." },
  { id: "milk-iron", combination: "Milk + Iron-rich Meals", reason: "Calcium in milk inhibits non-heme iron absorption." },
  { id: "tea-iron-supplements", combination: "Tea + Iron Supplements", reason: "Tannins in tea can decrease iron supplement effectiveness by up to 80%." },
  { id: "caffeine-calcium", combination: "Caffeine + Calcium", reason: "Caffeine increases urinary calcium excretion." },
  { id: "alcohol-calcium", combination: "Alcohol + Calcium", reason: "Alcohol impairs calcium absorption and increases excretion." },
  { id: "high-sodium-calcium", combination: "High Sodium + Calcium", reason: "Excess sodium increases urinary calcium excretion, depleting calcium stores." },
  { id: "alcohol-vitamin-d", combination: "Alcohol + Vitamin D", reason: "Alcohol impairs Vitamin D activation in the liver." },
  { id: "high-sugar-vitamin-d", combination: "High Sugar + Vitamin D", reason: "Chronic high sugar intake impairs Vitamin D receptor function." },
  { id: "alcohol-b12", combination: "Alcohol + Vitamin B12", reason: "Alcohol damages the stomach lining and reduces B12 absorption." },
  { id: "high-fiber-minerals", combination: "High Fiber + Mineral Supplements", reason: "Fiber binds to minerals and reduces their absorption." },
  { id: "smoking-vitamin-c", combination: "Smoking + Vitamin C", reason: "Smoking increases oxidative stress and depletes Vitamin C levels." },
  { id: "alcohol-magnesium", combination: "Alcohol + Magnesium", reason: "Alcohol increases urinary magnesium excretion and impairs absorption." },
  { id: "high-sugar-magnesium", combination: "High Sugar + Magnesium", reason: "Excess sugar increases urinary magnesium excretion." },
  { id: "spinach-oxalate", combination: "Spinach + Calcium Supplements", reason: "Oxalates in spinach bind calcium and prevent absorption." },
  { id: "soy-iron", combination: "Soy Products + Iron Supplements", reason: "Soy protein and isoflavones reduce non-heme iron absorption." },
  { id: "phytate-iron", combination: "Phytate-rich Foods + Iron Supplements", reason: "Phytates in whole grains and legumes inhibit iron absorption." },
];

const GROCERY_CATEGORIES: Record<string, { icon: string; items: string[] }> = {
  Grains: { icon: "\u{1F33E}", items: ["rice", "wheat", "roti", "bread", "oats", "quinoa", "millet", "bajra", "ragi", "jowar", "pasta", "noodles", "cereal", "flour"] },
  Pulses: { icon: "\u{1FAD8}", items: ["dal", "lentil", "chana", "rajma", "chole", "soy", "tofu", "tempeh", "bean", "pea", "chickpea", "sprout"] },
  Vegetables: { icon: "\u{1F96C}", items: ["spinach", "palak", "broccoli", "carrot", "tomato", "onion", "potato", "sweet potato", "pumpkin", "bell pepper", "cabbage", "cauliflower", "brinjal", "ladyfinger", "bottle gourd", "bitter gourd", "ridge gourd", "capsicum", "green bean", "mushroom", "cucumber", "beetroot", "radish", "turnip", "corn", "peas"] },
  Fruits: { icon: "\u{1F34E}", items: ["apple", "banana", "orange", "mango", "pomegranate", "grape", "guava", "papaya", "watermelon", "muskmelon", "kiwi", "strawberry", "blueberry", "avocado", "coconut", "date", "fig", "raisin", "prune", "amla", "lemon", "lime"] },
  Dairy: { icon: "\u{1F95B}", items: ["milk", "curd", "yogurt", "paneer", "cheese", "buttermilk", "chaas", "ghee", "butter", "cream", "lassi", "khoya"] },
  "Meat & Eggs": { icon: "\u{1F969}", items: ["chicken", "egg", "fish", "mutton", "pork", "liver", "sardine", "mackerel", "salmon", "tuna", "prawn", "shrimp", "crab"] },
  Nuts: { icon: "\u{1F95C}", items: ["almond", "cashew", "walnut", "peanut", "pistachio", "raisin", "seed", "flaxseed", "chia", "pumpkin seed", "sunflower seed", "sesame", "til"] },
  Spices: { icon: "\u{1F33F}", items: ["turmeric", "cumin", "coriander", "black pepper", "ginger", "garlic", "cinnamon", "cardamom", "clove", "nutmeg", "fenugreek", "fennel", "mustard", "asafoetida", "curry leaf", "mint", "coriander leaf"] },
  Oils: { icon: "\u{1F3ED}", items: ["oil", "olive oil", "coconut oil", "mustard oil", "ghee", "butter"] },
  Other: { icon: "\u{1F4E6}", items: [] },
};

// Recovery timeline milestones
const RECOVERY_MILESTONES = [
  { day: 0, label: "Baseline", description: "Initial assessment complete", progress: 0 },
  { day: 7, label: "Week 1", description: "Early nutrient adjustment phase", progress: 15 },
  { day: 14, label: "Week 2", description: "Nutrient levels begin to stabilize", progress: 30 },
  { day: 21, label: "Week 3", description: "Noticeable improvement in symptoms", progress: 45 },
  { day: 30, label: "Week 4", description: "Significant biomarker improvement", progress: 60 },
  { day: 45, label: "Week 6", description: "Continued progress toward targets", progress: 75 },
  { day: 60, label: "Week 8", description: "Optimal range approaching", progress: 85 },
  { day: 90, label: "Week 12", description: "Full recovery expected", progress: 100 },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function computeBMI(heightCm: number, weightKg: number): { bmi: number; category: string; color: string } {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (bmi < 18.5) return { bmi, category: "Underweight", color: "#f59e0b" };
  if (bmi < 25) return { bmi, category: "Normal", color: "#10b981" };
  if (bmi < 30) return { bmi, category: "Overweight", color: "#f97316" };
  return { bmi, category: "Obese", color: "#ef4444" };
}

function getLabStatus(value: number | null | undefined, range: { min: number; max: number }): { status: "low" | "normal" | "high"; color: string } {
  if (value == null) return { status: "normal", color: "#9ca3af" };
  if (value < range.min) return { status: "low", color: "#ef4444" };
  if (value > range.max) return { status: "high", color: "#f59e0b" };
  return { status: "normal", color: "#10b981" };
}

function categorizeFood(foodName: string): string {
  const lower = foodName.toLowerCase();
  for (const [category, info] of Object.entries(GROCERY_CATEGORIES)) {
    if (category === "Other" || category === "Spices" || category === "Oils") continue;
    if (info.items.some((item) => lower.includes(item))) return category;
  }
  for (const item of GROCERY_CATEGORIES.Spices.items) {
    if (lower.includes(item)) return "Spices";
  }
  for (const item of GROCERY_CATEGORIES.Oils.items) {
    if (lower.includes(item)) return "Oils";
  }
  return "Other";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function ReportPageContent() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setLocation] = useLocation();
  const profileIdStr = localStorage.getItem("nutrirecover_profile_id");
  const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

  useEffect(() => {
    if (!profileId) setLocation("/");
  }, [profileId, setLocation]);

  const { data: dashboard, isLoading: dashLoading } = useGetDashboard(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetDashboardQueryKey(profileId as number) },
  });
  const { data: profile, isLoading: profileLoading } = useGetProfile(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetProfileQueryKey(profileId as number) },
  });
  const { data: dailySummary, isLoading: dailyLoading } = useGetDailySummary(profileId as number, {}, {
    query: { enabled: !!profileId, queryKey: getGetDailySummaryQueryKey(profileId as number, {}) },
  });
  const { data: recoveryPlan, isLoading: planLoading } = useGetRecoveryPlan(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetRecoveryPlanQueryKey(profileId as number) },
  });
  const { data: targets, isLoading: targetsLoading } = useGetNutrientTargets(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetNutrientTargetsQueryKey(profileId as number) },
  });
  const { data: _allFoods } = useListFoods({}, {
    query: { enabled: !!profileId, queryKey: ["listFoods", profileId] },
  });

  const isLoading = dashLoading || profileLoading || dailyLoading || planLoading || targetsLoading;

  // ── Derived data ──

  const deficiencies = useMemo(() => {
    if (!targets) return [];
    return targets.filter((n: any) => n.priority === "high" || n.priority === "medium");
  }, [targets]);

  const todayNutrientData = useMemo(() => {
    if (!dailySummary?.nutrients) return [];
    return dailySummary.nutrients.map((n: any) => ({
      nutrient: NUTRIENT_LABELS[n.nutrient] || n.nutrient,
      key: n.nutrient,
      consumed: n.consumed,
      target: n.target,
      percentage: n.target > 0 ? Math.round((n.consumed / n.target) * 100) : 0,
      unit: n.unit || NUTRIENT_UNITS[n.nutrient] || "",
      color: NUTRIENT_COLORS[n.nutrient] || "#6b7280",
      status: n.status,
    }));
  }, [dailySummary]);

  const expectedRecoveryDays = profile?.recoveryDuration || 30;
  const daysTracked = dashboard?.daysTracked || 0;
  const recoveryProgress = Math.min(100, Math.round((daysTracked / expectedRecoveryDays) * 100));

  const mealDays = useMemo(() => {
    if (!recoveryPlan?.days) return [];
    return recoveryPlan.days.slice(0, 3);
  }, [recoveryPlan]);

  const bmiInfo = useMemo(() => {
    if (profile?.heightCm && profile?.weightKg) {
      return computeBMI(profile.heightCm, profile.weightKg);
    }
    return null;
  }, [profile]);

  // Lab chart data
  const labChartData = useMemo(() => {
    return [
      { name: "Hemoglobin", value: profile?.hemoglobin || 0, min: 12, max: 15.5, unit: "g/dL" },
      { name: "Ferritin", value: profile?.ferritin || 0, min: 15, max: 150, unit: "ng/mL" },
      { name: "Vitamin B12", value: profile?.vitaminB12Level || 0, min: 200, max: 900, unit: "pg/mL" },
      { name: "Vitamin D", value: profile?.vitaminDLevel || 0, min: 20, max: 50, unit: "ng/mL" },
      { name: "Calcium", value: profile?.serumCalcium || 0, min: 8.5, max: 10.5, unit: "mg/dL" },
      { name: "Protein", value: profile?.totalProtein || 0, min: 6, max: 8.3, unit: "g/dL" },
    ].filter(d => d.value > 0);
  }, [profile]);

  // Radar chart data for AI findings
  const radarData = useMemo(() => {
    return deficiencies.map((d: any) => ({
      nutrient: NUTRIENT_LABELS[d.nutrient] || d.nutrient.replace("_", " "),
      score: d.score || 0,
      confidence: d.priority === "high" ? 85 : d.priority === "medium" ? 65 : 45,
      fullMark: 10,
    }));
  }, [deficiencies]);

  // Food plate data (all meals combined)
  const foodPlateData = useMemo(() => {
    if (!mealDays || mealDays.length === 0) return [];
    const day = mealDays[0];
    return [
      { name: "Breakfast", items: day.breakfast.length, color: "#f59e0b" },
      { name: "Lunch", items: day.lunch.length, color: "#10b981" },
      { name: "Dinner", items: day.dinner.length, color: "#3b82f6" },
      { name: "Snacks", items: day.snacks.length, color: "#8b5cf6" },
    ];
  }, [mealDays]);

  // Grocery list from meal plan
  const groceryList = useMemo(() => {
    const allMealItems = new Set<string>();
    if (mealDays) {
      for (const day of mealDays) {
        for (const meal of [day.breakfast, day.lunch, day.dinner, day.snacks]) {
          for (const item of meal) {
            allMealItems.add(item);
          }
        }
      }
    }
    const categorized: Record<string, string[]> = {};
    for (const item of allMealItems) {
      const cat = categorizeFood(item);
      if (!categorized[cat]) categorized[cat] = [];
      if (!categorized[cat].includes(item)) categorized[cat].push(item);
    }
    return categorized;
  }, [mealDays]);

  // Recovery timeline data for chart
  const timelineData = useMemo(() => {
    return RECOVERY_MILESTONES.map((m) => ({
      day: m.day,
      progress: m.progress,
      label: m.label,
    }));
  }, []);

  // Nutrient progress chart data (consumed vs target)
  const nutrientChartData = useMemo(() => {
    return todayNutrientData.map((n: any) => ({
      name: n.nutrient.length > 10 ? n.nutrient.substring(0, 8) + "..." : n.nutrient,
      key: n.key,
      Consumed: Math.round(n.consumed * 10) / 10,
      Target: n.target,
      unit: n.unit,
    }));
  }, [todayNutrientData]);

  // Personalized synergies based on deficiencies
  const personalizedSynergies = useMemo(() => {
    if (!deficiencies || deficiencies.length === 0) return SYNERGY_PAIRS.slice(0, 6);
    const nutrientSet = new Set(deficiencies.map((d: any) => d.nutrient));
    const relevant: typeof SYNERGY_PAIRS = [];
    const other: typeof SYNERGY_PAIRS = [];

    for (const pair of SYNERGY_PAIRS) {
      let isRelevant = false;
      if (nutrientSet.has("iron") && (pair.id.includes("iron") || pair.id.includes("spinach") || pair.id.includes("greens"))) isRelevant = true;
      if (nutrientSet.has("calcium") && (pair.id.includes("calcium") || pair.id.includes("milk") || pair.id.includes("dairy"))) isRelevant = true;
      if (nutrientSet.has("vitamin_d") && (pair.id.includes("vitamin-d") || pair.id.includes("d-k2") || pair.id.includes("magnesium-vitamin-d"))) isRelevant = true;
      if (nutrientSet.has("protein") && (pair.id.includes("protein") || pair.id.includes("rice-dal") || pair.id.includes("beans") || pair.id.includes("greens"))) isRelevant = true;
      if (nutrientSet.has("vitamin_c") && (pair.id.includes("vitamin-c") || pair.id.includes("vitamin-c-collagen") || pair.id.includes("spinach"))) isRelevant = true;
      if (nutrientSet.has("magnesium") && pair.id.includes("magnesium")) isRelevant = true;

      if (isRelevant) relevant.push(pair);
      else other.push(pair);
    }

    return [...relevant.slice(0, 6), ...other.slice(0, 4)];
  }, [deficiencies]);

  // Personalized antagonists based on deficiencies
  const personalizedAntagonists = useMemo(() => {
    if (!deficiencies || deficiencies.length === 0) return ANTAGONISTIC_PAIRS.slice(0, 6);
    const nutrientSet = new Set(deficiencies.map((d: any) => d.nutrient));
    const relevant: typeof ANTAGONISTIC_PAIRS = [];
    const other: typeof ANTAGONISTIC_PAIRS = [];

    for (const pair of ANTAGONISTIC_PAIRS) {
      let isRelevant = false;
      if (nutrientSet.has("iron") && (pair.id.includes("iron") || pair.id.includes("tea") || pair.id.includes("coffee") || pair.id.includes("calcium"))) isRelevant = true;
      if (nutrientSet.has("calcium") && (pair.id.includes("calcium") || pair.id.includes("sodium") || pair.id.includes("caffeine") || pair.id.includes("spinach"))) isRelevant = true;
      if (nutrientSet.has("vitamin_d") && (pair.id.includes("vitamin-d") || pair.id.includes("alcohol") || pair.id.includes("sugar"))) isRelevant = true;
      if (nutrientSet.has("magnesium") && (pair.id.includes("magnesium") || pair.id.includes("alcohol") || pair.id.includes("sugar"))) isRelevant = true;
      if (pair.id === "high-fiber-minerals") isRelevant = true;

      if (isRelevant) relevant.push(pair);
      else other.push(pair);
    }

    return [...relevant.slice(0, 7), ...other.slice(0, 3)];
  }, [deficiencies]);

  // Generate PDF
  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: `n-rev-medical-report-${profile?.name?.replace(/\s+/g, "-") || "patient"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
          compress: true,
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"] as any,
        },
      };

      await html2pdf().set(opt).from(reportRef.current).save();
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!profileId) return null;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const reportDate = formatDate(new Date());

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm print-hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
            <span className="text-lg font-serif text-[#1a4a5a]">N-REV</span>
          </div>
          <Button onClick={generatePDF} disabled={isGenerating} className="gap-2 bg-[#1a4a5a] hover:bg-[#0d3340]">
            <Download className="h-4 w-4" />
            {isGenerating ? "Generating PDF..." : "Download PDF Report"}
          </Button>
        </div>
      </div>

      {/* ── Report Content ── */}
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div
          ref={reportRef}
          className="bg-white shadow-xl"
          style={{ fontFamily: "'Inter', 'Georgia', 'Times New Roman', serif" }}
        >
          {/* ════════════════════════════════════════════════════════════════
              COVER PAGE
              ════════════════════════════════════════════════════════════════ */}
          <div className="page-break-before relative min-h-[1050px] flex flex-col">
            <div className="absolute inset-0 border-[12px] border-[#1a4a5a]/10 pointer-events-none" />
            <div className="absolute inset-[18px] border-[1px] border-[#1a4a5a]/20 pointer-events-none" />

            <div className="bg-gradient-to-r from-[#1a4a5a] via-[#2d6a7a] to-[#1a4a5a] text-white px-12 py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>N-REV</h1>
                  <p className="text-[#8fc5d4] text-sm tracking-widest uppercase mt-1">Nutritional Recovery & Evaluation Report</p>
                </div>
                <FileText className="h-14 w-14 text-white/30" />
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-[#1a4a5a]/10 flex items-center justify-center mb-6">
                <Stethoscope className="h-10 w-10 text-[#1a4a5a]" />
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-3" style={{ fontFamily: "'Georgia', serif" }}>
                Comprehensive Nutritional Assessment Report
              </h2>
              <div className="w-24 h-1 bg-[#1a4a5a] mx-auto mb-6" />

              <div className="text-gray-600 text-lg mb-8 max-w-lg">
                Prepared for
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-6" style={{ fontFamily: "'Georgia', serif" }}>
                {profile?.name || "Patient"}
              </h3>

              <div className="grid grid-cols-2 gap-x-16 gap-y-3 text-left max-w-md mx-auto mb-10">
                <div className="text-gray-500 text-sm">Report Date</div>
                <div className="text-gray-800 font-medium text-right">{reportDate}</div>
                <div className="text-gray-500 text-sm">Report ID</div>
                <div className="text-gray-800 font-medium text-right">NREV-{profile?.id || 0}-{Date.now().toString(36).toUpperCase()}</div>
                <div className="text-gray-500 text-sm">Age / Gender</div>
                <div className="text-gray-800 font-medium text-right">{profile?.age || "--"} yrs &middot; {profile?.gender || "--"}</div>
                <div className="text-gray-500 text-sm">Recovery Duration</div>
                <div className="text-gray-800 font-medium text-right">{expectedRecoveryDays} days</div>
              </div>

              <div className="bg-gray-50 rounded-lg px-8 py-4 border border-gray-200 max-w-sm mx-auto">
                <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Overall Recovery Score</p>
                <p className="text-4xl font-bold text-[#1a4a5a]">{dashboard?.recoveryScore || 0}/100</p>
              </div>
            </div>

            <div className="px-12 py-6 border-t border-gray-200">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>CONFIDENTIAL</span>
                <span>N-REV Nutritional Report &middot; {reportDate}</span>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              MAIN CONTENT
              ════════════════════════════════════════════════════════════════ */}
          <div className="px-10 py-8 space-y-10">

            {/* ─── 1. PATIENT INFORMATION ─── */}
            <section className="page-inside-avoid">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <User className="h-5 w-5" />
                Patient Information
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                  <p className="font-semibold text-gray-800">{profile?.name || "—"}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Age / Gender</p>
                  <p className="font-semibold text-gray-800">{profile?.age || "—"} yrs &middot; {profile?.gender || "—"}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Height / Weight</p>
                  <p className="font-semibold text-gray-800">{profile?.heightCm || "—"} cm &middot; {profile?.weightKg || "—"} kg</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Diet Type</p>
                  <p className="font-semibold text-gray-800 capitalize">{profile?.dietType?.replace("_", " ") || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {bmiInfo && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      <Scale className="h-3 w-3 inline mr-1" />
                      BMI
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{bmiInfo.bmi.toFixed(1)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: bmiInfo.color }}>
                        {bmiInfo.category}
                      </span>
                    </div>
                  </div>
                )}
                {profile?.allergies && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Allergies / Restrictions
                    </p>
                    <p className="font-semibold text-gray-800">{profile.allergies}</p>
                  </div>
                )}
                {profile?.cuisinePreference && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cuisine Preference</p>
                    <p className="font-semibold text-gray-800">{profile.cuisinePreference}</p>
                  </div>
                )}
                {profile?.budget && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Budget Level</p>
                    <p className="font-semibold text-gray-800 capitalize">{profile.budget}</p>
                  </div>
                )}
              </div>
            </section>

            {/* ─── 2. REPORTED SYMPTOMS ─── */}
            {profile?.symptoms && profile.symptoms.length > 0 && (
              <section className="page-inside-avoid">
                <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                  <ClipboardList className="h-5 w-5" />
                  Reported Symptoms
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.symptoms.map((symptom: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-sm font-medium border border-orange-200">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {symptom.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 uppercase mb-2 flex items-center gap-1">
                      <Brain className="h-3.5 w-3.5" /> Neurological
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {["brain_fog", "dizziness", "tingling_numbness", "poor_concentration", "memory_problems", "frequent_headache", "poor_sleep", "mood_changes"].filter(s => (profile.symptoms as string[]).includes(s)).map((s, i) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{s.replace(/_/g, " ")}</span>
                      ))}
                      {["brain_fog", "dizziness", "tingling_numbness", "poor_concentration", "memory_problems", "frequent_headache", "poor_sleep", "mood_changes"].filter(s => (profile.symptoms as string[]).includes(s)).length === 0 && (
                        <span className="text-xs text-gray-400 italic">None reported</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-red-50/50 border border-red-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-700 uppercase mb-2 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" /> Physical
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {["fatigue", "weakness", "low_energy", "muscle_cramps", "muscle_weakness", "bone_pain", "joint_pain", "cold_hands_feet", "rapid_heartbeat"].filter(s => (profile.symptoms as string[]).includes(s)).map((s, i) => (
                        <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{s.replace(/_/g, " ")}</span>
                      ))}
                      {["fatigue", "weakness", "low_energy", "muscle_cramps", "muscle_weakness", "bone_pain", "joint_pain", "cold_hands_feet", "rapid_heartbeat"].filter(s => (profile.symptoms as string[]).includes(s)).length === 0 && (
                        <span className="text-xs text-gray-400 italic">None reported</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-green-50/50 border border-green-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 uppercase mb-2 flex items-center gap-1">
                      <Utensils className="h-3.5 w-3.5" /> Digestive / Other
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {["poor_appetite", "constipation", "diarrhea", "bloating", "nausea", "vomiting", "weight_loss", "weight_gain", "hair_fall", "pale_skin", "brittle_nails", "dry_skin", "mouth_ulcers", "slow_wound_healing", "poor_immunity", "slow_recovery"].filter(s => (profile.symptoms as string[]).includes(s)).map((s, i) => (
                        <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{s.replace(/_/g, " ")}</span>
                      ))}
                      {["poor_appetite", "constipation", "diarrhea", "bloating", "nausea", "vomiting", "weight_loss", "weight_gain", "hair_fall", "pale_skin", "brittle_nails", "dry_skin", "mouth_ulcers", "slow_wound_healing", "poor_immunity", "slow_recovery"].filter(s => (profile.symptoms as string[]).includes(s)).length === 0 && (
                        <span className="text-xs text-gray-400 italic">None reported</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ─── 3. LABORATORY VALUES ─── */}
            <section className="page-inside-avoid">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <Thermometer className="h-5 w-5" />
                Laboratory Values
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {Object.entries(LAB_REFERENCE_RANGES).map(([key, range]) => {
                  const value = profile?.[key as keyof typeof profile] as number | null | undefined;
                  const status = getLabStatus(value, range);
                  return (
                    <div key={key} className={`border rounded-lg p-4 ${status.status === "low" ? "bg-red-50 border-red-200" : status.status === "high" ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-100"}`}>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{range.label}</p>
                      <div className="flex items-center justify-between">
                        <p className={`text-lg font-bold ${value != null && value > 0 ? "text-gray-800" : "text-gray-400"}`}>
                          {value != null && value > 0 ? `${value} ${range.unit}` : "Not tested"}
                        </p>
                        {value != null && value > 0 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            status.status === "low" ? "bg-red-100 text-red-700" :
                            status.status === "high" ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {status.status === "low" ? "\u2B07 Low" : status.status === "high" ? "\u2B06 High" : "\u2713 Normal"}
                          </span>
                        )}
                      </div>
                      {value != null && value > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Ref: {range.min} &ndash; {range.max} {range.unit}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {labChartData.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={labChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <Bar dataKey="value" fill="#1a4a5a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* ─── 4. AI PREDICTED DEFICIENCIES + CONFIDENCE ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <BarChart3 className="h-5 w-5" />
                AI Predicted Nutrient Deficiencies
              </h2>
              {deficiencies.length > 0 ? (
                <>
                  {radarData.length > 0 && (
                    <div className="h-72 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="nutrient" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
                          <Radar name="Deficiency Score" dataKey="score" stroke="#1a4a5a" fill="#1a4a5a" fillOpacity={0.3} />
                          <Radar name="Confidence" dataKey="confidence" stroke="#2d6a7a" fill="#2d6a7a" fillOpacity={0.15} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="space-y-3">
                    {deficiencies.map((nutrient: any, i: number) => {
                      const label = NUTRIENT_LABELS[nutrient.nutrient] || nutrient.nutrient.replace("_", " ");
                      const confidenceScore = nutrient.priority === "high" ? 85 : nutrient.priority === "medium" ? 65 : 45;
                      return (
                        <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NUTRIENT_COLORS[nutrient.nutrient] || "#6b7280" }} />
                              <span className="font-semibold text-gray-800">{label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={nutrient.priority === "high" ? "destructive" : "default"} className="text-xs">
                                {nutrient.priority.toUpperCase()}
                              </Badge>
                              <span className="text-sm font-bold text-gray-700">{confidenceScore}% confidence</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="h-2 rounded-full" style={{ width: `${confidenceScore}%`, backgroundColor: NUTRIENT_COLORS[nutrient.nutrient] || "#6b7280" }} />
                            </div>
                            <span className="text-xs text-gray-500 w-20 text-right">Target: {nutrient.dailyTarget}{nutrient.unit}</span>
                          </div>
                          {nutrient.reasons?.length > 0 && (
                            <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                              {nutrient.reasons.slice(0, 3).map((reason: string, ri: number) => (
                                <li key={ri}>{reason}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">No significant deficiencies detected.</p>
                  <p className="text-sm mt-1">Your nutrient levels appear to be within normal range.</p>
                </div>
              )}
            </section>

            {/* ─── 5. RECOVERY PLAN ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <Target className="h-5 w-5" />
                Recovery Plan
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                  <p className="text-2xl font-bold text-blue-700">{expectedRecoveryDays}</p>
                  <p className="text-xs text-blue-600">Total Days</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                  <p className="text-2xl font-bold text-green-700">{daysTracked}</p>
                  <p className="text-xs text-green-600">Days Completed</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
                  <p className="text-2xl font-bold text-purple-700">{dashboard?.streak || 0}</p>
                  <p className="text-xs text-purple-600">Day Streak</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Recovery Progress</span>
                  <span className="text-gray-600">{recoveryProgress}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#1a4a5a] to-[#2d6a7a]" style={{ width: `${recoveryProgress}%` }} />
                </div>
              </div>
              {recoveryPlan?.planExplanation && recoveryPlan.planExplanation.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Plan Rationale:</p>
                  {recoveryPlan.planExplanation.slice(0, 4).map((exp: string, i: number) => (
                    <p key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-[#1a4a5a] font-bold">&bull;</span>
                      <span>{exp}</span>
                    </p>
                  ))}
                </div>
              )}
            </section>

            {/* ─── 6. MEAL PLAN ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <Utensils className="h-5 w-5" />
                Meal Plan
              </h2>
              {mealDays.length > 0 ? (
                <div className="space-y-5">
                  {mealDays.map((day: any, di: number) => {
                    const dayTotals = day.totals || {};
                    const nutrientKeys = ["protein", "iron", "calcium", "vitaminD", "magnesium", "vitaminA", "vitaminC"];
                    const targets: Record<string, number> = { protein: 50, iron: 18, calcium: 1000, vitaminD: 600, magnesium: 400, vitaminA: 900, vitaminC: 90 };
                    return (
                      <div key={di} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-[#1a4a5a]/5 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                          <span className="font-semibold text-gray-800">Day {day.dayNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            {expectedRecoveryDays - daysTracked >= day.dayNumber ? "Upcoming" : "Completed"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">
                          {[
                            { label: "Breakfast", items: day.breakfast, icon: "\u{1F305}" },
                            { label: "Lunch", items: day.lunch, icon: "\u2600\uFE0F" },
                            { label: "Dinner", items: day.dinner, icon: "\u{1F319}" },
                            { label: "Snacks", items: day.snacks, icon: "\u{1F37F}" },
                          ].map((meal, i) => (
                            <div key={i} className="bg-white p-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{meal.icon} {meal.label}</p>
                              <ul className="text-xs text-gray-700 space-y-0.5">
                                {meal.items.length > 0 ? meal.items.slice(0, 4).map((item: string, j: number) => (
                                  <li key={j}>&bull; {item}</li>
                                )) : <li className="text-gray-400 italic">—</li>}
                              </ul>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">Day {day.dayNumber} Nutrient Coverage</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {nutrientKeys.map((key) => {
                              const total = (dayTotals as any)[key] || 0;
                              const t = targets[key] || 1;
                              const pct = Math.min(100, Math.round((total / t) * 100));
                              const color = NUTRIENT_COLORS[key === "vitaminD" ? "vitamin_d" : key] || "#6b7280";
                              return (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500 w-14 truncate">
                                    {NUTRIENT_LABELS[key === "vitaminD" ? "vitamin_d" : key] || key}
                                  </span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                  </div>
                                  <span className="text-[10px] text-gray-500 w-8 text-right">{pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No meal plan generated yet.</p>
              )}
            </section>

            {/* ─── 7. GROCERY LIST ─── */}
            {Object.keys(groceryList).length > 0 && (
              <section className="page-break-before">
                <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                  <ShoppingCart className="h-5 w-5" />
                  Grocery List
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Recommended groceries based on your {mealDays.length}-day meal plan.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(groceryList).map(([category, items]) => (
                    <div key={category} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {GROCERY_CATEGORIES[category]?.icon || "\u{1F4E6}"} {category}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {items.map((item: string, i: number) => (
                          <span key={i} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─── 8. FOOD PLATE ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <PieChartIcon className="h-5 w-5" />
                Food Plate Composition
              </h2>
              {foodPlateData.length > 0 && foodPlateData.some(d => d.items > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={foodPlateData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="items" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                          {foodPlateData.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} items`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center space-y-3">
                    <p className="text-sm text-gray-600">Your meal plan for Day 1 consists of the following distribution:</p>
                    {foodPlateData.map((meal: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: meal.color }} />
                        <span className="text-sm font-medium text-gray-700 w-24">{meal.name}</span>
                        <span className="text-sm text-gray-500">{meal.items} items</span>
                      </div>
                    ))}
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500">
                        <strong>Tip:</strong> Aim for a balanced plate with vegetables covering 50%, protein 25%, and grains 25% of your meal for optimal recovery.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No meal plan data available.</p>
              )}
            </section>

            {/* ─── 9. NUTRIENT PROGRESS ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <TrendingUp className="h-5 w-5" />
                Today&apos;s Nutrient Progress
              </h2>
              {nutrientChartData.length > 0 ? (
                <>
                  <div className="h-72 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={nutrientChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(value: number, name: string, props: any) => [`${value} ${props?.payload?.unit || ""}`, name]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Consumed" fill="#1a4a5a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {todayNutrientData.map((n: any) => (
                      <div key={n.nutrient} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: n.color }} />
                            <span className="text-sm font-medium text-gray-800">{n.nutrient}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-800">{n.consumed.toFixed(1)}{n.unit}</span>
                            <span className="text-xs text-gray-500">/ {n.target}{n.unit}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${n.status === "on_target" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                              {n.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${Math.min(100, n.percentage)}%`, backgroundColor: n.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Utensils className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No meals logged today.</p>
                  <p className="text-xs mt-1">Start logging meals to track your nutrient progress.</p>
                </div>
              )}
            </section>

            {/* ─── 10. RECOVERY TIMELINE ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <Calendar className="h-5 w-5" />
                Recovery Timeline
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Expected recovery journey over {expectedRecoveryDays} days based on your assessment.
              </p>
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: "Days", position: "insideBottomRight", offset: -5, style: { fontSize: 11 } }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Recovery %", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(value: number) => [`${value}%`, "Recovery Progress"]} />
                    <Line type="monotone" dataKey="progress" stroke="#1a4a5a" strokeWidth={3} dot={{ r: 5, fill: "#1a4a5a" }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {RECOVERY_MILESTONES.map((milestone, i) => {
                  const isReached = daysTracked >= milestone.day;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${isReached ? "bg-[#1a4a5a]/5 border-[#1a4a5a]/20" : "bg-gray-50 border-gray-100"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isReached ? "bg-[#1a4a5a] text-white" : "bg-gray-200 text-gray-500"}`}>
                        {isReached ? "\u2713" : milestone.day}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{milestone.label}</p>
                        <p className="text-xs text-gray-500">{milestone.description}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${isReached ? "text-green-600" : "text-gray-400"}`}>{milestone.progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ─── 11. SYNERGISTIC FOODS ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Synergistic Foods &mdash; What to Eat Together
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Certain food combinations significantly improve nutrient absorption and support faster recovery.
                {deficiencies.length > 0 && " The following are prioritized based on your detected deficiencies."}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {personalizedSynergies.map((pair) => (
                  <div key={pair.id} className="flex items-start gap-2 bg-green-50 rounded-lg p-3 border border-green-100">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{pair.combination}</p>
                      <p className="text-xs text-gray-600">{pair.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── 12. ANTAGONISTIC FOODS ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Antagonistic Foods &mdash; What to Avoid Together
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                These combinations may reduce nutrient absorption or interfere with your recovery.
                {deficiencies.length > 0 && " The following are prioritized based on your detected deficiencies."}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {personalizedAntagonists.map((pair) => (
                  <div key={pair.id} className="flex items-start gap-2 bg-red-50 rounded-lg p-3 border border-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{pair.combination}</p>
                      <p className="text-xs text-gray-600">{pair.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── 13. WEEKLY ADHERENCE ─── */}
            <section className="page-break-before">
              <h2 className="text-xl font-bold text-[#1a4a5a] border-b-2 border-[#1a4a5a]/20 pb-2 mb-5 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                <Activity className="h-5 w-5" />
                Weekly Adherence Summary
              </h2>
              <div className="text-center bg-gray-50 rounded-lg p-6 border border-gray-100">
                <p className="text-4xl font-bold text-[#1a4a5a] mb-1">{dashboard?.weeklyAdherenceScore || 0}%</p>
                <p className="text-sm text-gray-500 mb-3">Weekly Adherence Score</p>
                <div className="max-w-md mx-auto">
                  <div className="bg-gray-200 rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-[#1a4a5a] to-[#2d6a7a]" style={{ width: `${dashboard?.weeklyAdherenceScore || 0}%` }} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{dashboard?.daysTracked || 0} days tracked &middot; {dashboard?.streak || 0} day streak</p>
              </div>
              {dashboard?.insights && dashboard.insights.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Insights:</p>
                  {dashboard.insights.slice(0, 4).map((insight: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <Info className="h-4 w-4 text-[#1a4a5a] mt-0.5 shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ─── 14. MEDICAL DISCLAIMER ─── */}
            <section className="page-break-before border-t-2 border-gray-200 pt-8 mt-8">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Info className="h-6 w-6 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-bold text-amber-800 text-base uppercase tracking-wide">Medical Disclaimer</h3>
                  </div>
                </div>
                <div className="space-y-3 text-xs text-amber-800/80 leading-relaxed">
                  <p>This report is generated by <strong>N-REV</strong>, a food-based nutritional recovery support tool, using the patient&apos;s assessment data, symptoms, dietary habits, lifestyle information, and laboratory values (if available).</p>
                  <p>The recommendations, predictions, and insights presented in this report are for <strong>informational and educational purposes only</strong>. They do NOT replace professional medical advice, diagnosis, or treatment.</p>
                  <p><strong className="text-amber-900">Important:</strong> Always consult a qualified physician, registered dietitian, or healthcare provider before making any dietary changes, especially if you are:</p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li>Taking prescription medications</li>
                    <li>Undergoing medical treatment</li>
                    <li>Pregnant, planning to become pregnant, or breastfeeding</li>
                    <li>Over the age of 60</li>
                    <li>Living with chronic diseases (diabetes, kidney disease, heart disease, etc.)</li>
                    <li>Recovering from surgery or illness</li>
                  </ul>
                  <p>Deficiency predictions are based on the AI assessment engine which uses reported symptoms and laboratory markers. These predictions are <strong>estimates</strong> and should be confirmed through appropriate medical testing.</p>
                  <p>Food synergy and antagonist information is based on evidence-supported nutritional principles and should not be interpreted as universal restrictions. Individual responses may vary.</p>
                  <div className="border-t border-amber-200 pt-3 mt-3">
                    <p className="font-medium text-amber-900">N-REV is not a substitute for professional medical care. If you experience severe symptoms, please seek immediate medical attention.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-[10px] text-gray-400">Report ID: NREV-{profile?.id || 0}-{Date.now().toString(36).toUpperCase()}</span>
                </div>
                <div className="text-right text-[10px] text-gray-400">
                  <p>N-REV Nutritional Recovery &amp; Evaluation Report</p>
                  <p>Generated {reportDate}</p>
                  <p>&copy; {new Date().getFullYear()} N-REV. All rights reserved.</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

export function Report() {
  return <ReportPageContent />;
}

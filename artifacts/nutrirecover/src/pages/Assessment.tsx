import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useCreateProfile, useUpdateProfile } from "@workspace/api-client-react";
import { DietType, SymptomKey, ProfileInput } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Leaf,
  Stethoscope,
  Activity,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Info,
  Apple,
  Utensils,
  Moon,
  Droplets,
  Zap,
  Heart,
  XCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const SYMPTOM_SECTIONS: { id: string; title: string; symptoms: { id: SymptomKey; label: string }[] }[] = [
  {
    id: "general",
    title: "General Symptoms",
    symptoms: [
      { id: "fatigue" as SymptomKey, label: "Fatigue" },
      { id: "weakness" as SymptomKey, label: "Weakness" },
      { id: "weight_loss" as SymptomKey, label: "Weight Loss" },
      { id: "weight_gain" as SymptomKey, label: "Weight Gain" },
      { id: "poor_appetite" as SymptomKey, label: "Loss of Appetite" },
      { id: "fever" as SymptomKey, label: "Fever" },
      { id: "night_sweats" as SymptomKey, label: "Night Sweats" },
      { id: "poor_sleep" as SymptomKey, label: "Poor Sleep" },
      { id: "mood_changes" as SymptomKey, label: "Mood Changes" },
      { id: "low_energy" as SymptomKey, label: "Low Energy" },
    ],
  },
  {
    id: "blood-iron",
    title: "Blood & Iron Related",
    symptoms: [
      { id: "pale_skin" as SymptomKey, label: "Pale Skin" },
      { id: "dizziness" as SymptomKey, label: "Dizziness" },
      { id: "shortness_of_breath" as SymptomKey, label: "Shortness of Breath" },
      { id: "cold_hands_feet" as SymptomKey, label: "Cold Hands & Feet" },
      { id: "rapid_heartbeat" as SymptomKey, label: "Rapid Heartbeat" },
      { id: "easy_bruising" as SymptomKey, label: "Easy Bruising" },
    ],
  },
  {
    id: "neurological",
    title: "Neurological",
    symptoms: [
      { id: "brain_fog" as SymptomKey, label: "Brain Fog" },
      { id: "poor_concentration" as SymptomKey, label: "Poor Concentration" },
      { id: "memory_problems" as SymptomKey, label: "Memory Problems" },
      { id: "frequent_headache" as SymptomKey, label: "Frequent Headache" },
      { id: "tingling_hands" as SymptomKey, label: "Tingling Hands" },
      { id: "tingling_feet" as SymptomKey, label: "Tingling Feet" },
    ],
  },
  {
    id: "bone-muscle",
    title: "Bone & Muscle",
    symptoms: [
      { id: "bone_pain" as SymptomKey, label: "Bone Pain" },
      { id: "muscle_weakness" as SymptomKey, label: "Muscle Weakness" },
      { id: "muscle_cramps" as SymptomKey, label: "Muscle Cramps" },
      { id: "joint_pain" as SymptomKey, label: "Joint Pain" },
      { id: "difficulty_walking" as SymptomKey, label: "Difficulty Walking" },
    ],
  },
  {
    id: "skin-hair-nails",
    title: "Skin, Hair & Nails",
    symptoms: [
      { id: "hair_fall" as SymptomKey, label: "Hair Fall" },
      { id: "dry_skin" as SymptomKey, label: "Dry Skin" },
      { id: "brittle_nails" as SymptomKey, label: "Brittle Nails" },
      { id: "mouth_ulcers" as SymptomKey, label: "Mouth Ulcers" },
      { id: "slow_wound_healing" as SymptomKey, label: "Slow Wound Healing" },
    ],
  },
  {
    id: "digestive",
    title: "Digestive",
    symptoms: [
      { id: "constipation" as SymptomKey, label: "Constipation" },
      { id: "diarrhea" as SymptomKey, label: "Diarrhea" },
      { id: "bloating" as SymptomKey, label: "Bloating" },
      { id: "nausea" as SymptomKey, label: "Nausea" },
      { id: "vomiting" as SymptomKey, label: "Vomiting" },
    ],
  },
  {
    id: "immune",
    title: "Immune System",
    symptoms: [
      { id: "poor_immunity" as SymptomKey, label: "Frequent Infections" },
      { id: "slow_recovery" as SymptomKey, label: "Delayed Recovery" },
    ],
  },
];

const TOTAL_STEPS = 5;
const STEP_ICONS = [User, Leaf, Stethoscope, Activity, CheckCircle2];
const STEP_LABELS = ["Personal", "Lifestyle", "Medical History", "Symptoms", "Completed"];

type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";

interface FoodPlateState {
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  snacks: string[];
  customBreakfast: string;
  customLunch: string;
  customDinner: string;
  customSnacks: string;
  fruitsPerDay: string;
  vegetablesPerDay: string;
  waterIntake: string;
  fastFoodFreq: string;
  outsideFoodFreq: string;
  sugarIntake: string;
  teaCoffeeIntake: string;
}

const COMMON_BREAKFAST_ITEMS = [
  "Idli", "Dosa", "Paratha", "Bread Toast", "Oats", "Poha", "Upma",
  "Eggs", "Sandwich", "Cereal", "Smoothie", "Fruits", "Chilla", "Pancake",
];
const COMMON_LUNCH_ITEMS = [
  "Rice", "Roti/Chapati", "Dal", "Sabzi", "Salad", "Curd/Yogurt",
  "Papad", "Pickle", "Chicken Curry", "Fish Curry", "Paneer", "Sambar",
];
const COMMON_DINNER_ITEMS = [
  "Rice", "Roti/Chapati", "Dal", "Sabzi", "Salad", "Curd/Yogurt",
  "Soup", "Khichdi", "Pasta", "Noodles", "Grilled Chicken", "Fish",
];
const COMMON_SNACK_ITEMS = [
  "Fruits", "Nuts", "Biscuits", "Samosa", "Cookies", "Namkeen",
  "Tea/Coffee", "Milk", "Smoothie", "Chikki", "Sprouts", "Fruit Juice",
];

type AssessmentFormData = Partial<ProfileInput> & {
  rbcCount?: number | null;
  wbcCount?: number | null;
  plateletCount?: number | null;
  hematocrit?: number | null;
  mcv?: number | null;
  serumIron?: number | null;
  vitaminA?: number | null;
  vitaminC?: number | null;
  vitaminE?: number | null;
  magnesium?: number | null;
  phosphorus?: number | null;
  sodium?: number | null;
  fastingBloodSugar?: number | null;
  hba1c?: number | null;
  creatinine?: number | null;
  bun?: number | null;
  alt?: number | null;
  ast?: number | null;
  totalCholesterol?: number | null;
  hdl?: number | null;
  ldl?: number | null;
  triglycerides?: number | null;
  tsh?: number | null;
  foodPlate?: FoodPlateState;
  hasLabReports?: boolean;
};

const DEFAULT_FOOD_PLATE: FoodPlateState = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snacks: [],
  customBreakfast: "",
  customLunch: "",
  customDinner: "",
  customSnacks: "",
  fruitsPerDay: "",
  vegetablesPerDay: "",
  waterIntake: "",
  fastFoodFreq: "",
  outsideFoodFreq: "",
  sugarIntake: "",
  teaCoffeeIntake: "",
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

function computeBMI(heightCm: number | null | undefined, weightKg: number | null | undefined): number | null {
  if (!heightCm || !weightKg) return null;
  const hM = heightCm / 100;
  return Math.round((weightKg / (hM * hM)) * 10) / 10;
}

export function Assessment() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const { toast } = useToast();

  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();

  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);

  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const labSearchRef = useRef<HTMLDivElement>(null);
  const [labWarnings, setLabWarnings] = useState<Record<string, boolean>>({});
  const [hasLabReports, setHasLabReports] = useState(false);
  const [foodPlate, setFoodPlate] = useState<FoodPlateState>(DEFAULT_FOOD_PLATE);

  const [formData, setFormData] = useState<AssessmentFormData>({
    name: "",
    age: 30,
    gender: "male",
    heightCm: 170,
    weightKg: 70,
    dietType: DietType.vegetarian,
    allergies: "",
    cuisinePreference: "",
    budget: "",
    symptoms: [],
    hemoglobin: null,
    ferritin: null,
    recoveryDuration: 30,
    vitaminB12Level: null,
    vitaminDLevel: null,
    serumCalcium: null,
    totalProtein: null,
    rbcCount: null,
    wbcCount: null,
    plateletCount: null,
    hematocrit: null,
    mcv: null,
    serumIron: null,
    vitaminA: null,
    vitaminC: null,
    vitaminE: null,
    magnesium: null,
    phosphorus: null,
    sodium: null,
    fastingBloodSugar: null,
    hba1c: null,
    creatinine: null,
    bun: null,
    totalCholesterol: null,
    hdl: null,
    ldl: null,
    triglycerides: null,
    tsh: null,
    foodPlate: DEFAULT_FOOD_PLATE,
    hasLabReports: false,
  });

  useEffect(() => {
    const storedProfileId = localStorage.getItem("nutrirecover_profile_id");
    if (!storedProfileId) {
      setEditingProfileId(null);
      return;
    }

    const loadProfile = async () => {
      const response = await fetch(`/api/profiles/${storedProfileId}`);
      if (!response.ok) return;
      const profile = await response.json();

      setEditingProfileId(profile.id);

      setFormData({
        ...profile,
        name: profile.name ?? "",
        age: profile.age ?? 30,
        gender: profile.gender ?? "male",
        heightCm: profile.heightCm ?? 170,
        weightKg: profile.weightKg ?? 70,
        dietType: profile.dietType ?? DietType.vegetarian,
        allergies: profile.allergies ?? "",
        cuisinePreference: profile.cuisinePreference ?? "",
        budget: profile.budget ?? "",
        symptoms: profile.symptoms ?? [],
        hemoglobin: profile.hemoglobin ?? null,
        ferritin: profile.ferritin ?? null,
        recoveryDuration: profile.recoveryDuration ?? 30,
        vitaminB12Level: profile.vitaminB12Level ?? null,
        vitaminDLevel: profile.vitaminDLevel ?? null,
        serumCalcium: profile.serumCalcium ?? null,
        totalProtein: profile.totalProtein ?? null,
      });
    };

    void loadProfile();
  }, []);

  const toggleFoodItem = useCallback((slot: MealSlot, item: string) => {
    setFoodPlate((prev) => {
      const current = prev[slot];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return { ...prev, [slot]: updated };
    });
  }, []);

  const handleSubmit = () => {
    if (!formData.name || !formData.age || !formData.heightCm || !formData.weightKg || !formData.dietType) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    // Build foodHabits from foodPlate state
    const foodHabits = {
      breakfast: foodPlate.breakfast,
      lunch: foodPlate.lunch,
      dinner: foodPlate.dinner,
      snacks: foodPlate.snacks,
      customBreakfast: foodPlate.customBreakfast,
      customLunch: foodPlate.customLunch,
      customDinner: foodPlate.customDinner,
      customSnacks: foodPlate.customSnacks,
      fruitsPerDay: foodPlate.fruitsPerDay,
      vegetablesPerDay: foodPlate.vegetablesPerDay,
      waterIntake: foodPlate.waterIntake,
      fastFoodFreq: foodPlate.fastFoodFreq,
      outsideFoodFreq: foodPlate.outsideFoodFreq,
      sugarIntake: foodPlate.sugarIntake,
      teaCoffeeIntake: foodPlate.teaCoffeeIntake,
    };

    // Only send fields that the backend expects — avoid spreading extra UI-only fields
    const payload: ProfileInput = {
      name: formData.name ?? "",
      age: formData.age ?? 0,
      gender: formData.gender ?? "male",
      heightCm: formData.heightCm ?? 0,
      weightKg: formData.weightKg ?? 0,
      dietType: formData.dietType ?? DietType.vegetarian,
      allergies: formData.allergies || undefined,
      cuisinePreference: formData.cuisinePreference || undefined,
      budget: formData.budget || undefined,
      symptoms: formData.symptoms ?? [],
      hemoglobin: formData.hemoglobin ?? null,
      ferritin: formData.ferritin ?? null,
      vitaminB12Level: formData.vitaminB12Level ?? null,
      vitaminDLevel: formData.vitaminDLevel ?? null,
      serumCalcium: formData.serumCalcium ?? null,
      totalProtein: formData.totalProtein ?? null,
      rbcCount: formData.rbcCount ?? null,
      wbcCount: formData.wbcCount ?? null,
      plateletCount: formData.plateletCount ?? null,
      hematocrit: formData.hematocrit ?? null,
      mcv: formData.mcv ?? null,
      serumIron: formData.serumIron ?? null,
      vitaminA: formData.vitaminA ?? null,
      vitaminC: formData.vitaminC ?? null,
      vitaminE: formData.vitaminE ?? null,
      magnesium: formData.magnesium ?? null,
      phosphorus: formData.phosphorus ?? null,
      sodium: formData.sodium ?? null,
      fastingBloodSugar: formData.fastingBloodSugar ?? null,
      hba1c: formData.hba1c ?? null,
      creatinine: formData.creatinine ?? null,
      bun: formData.bun ?? null,
      totalCholesterol: formData.totalCholesterol ?? null,
      hdl: formData.hdl ?? null,
      ldl: formData.ldl ?? null,
      triglycerides: formData.triglycerides ?? null,
      tsh: formData.tsh ?? null,
      alt: formData.alt ?? null,
      ast: formData.ast ?? null,
      recoveryDuration: formData.recoveryDuration ?? 30,
      foodHabits,
    };

    if (editingProfileId) {
      updateProfile.mutate(
        {
          profileId: editingProfileId,
          data: payload,
        },
        {
          onSuccess: () => {
            toast({ title: "Profile updated successfully." });
            setLocation("/dashboard");
          },
          onError: () => {
            toast({ title: "Failed to update profile. Please try again.", variant: "destructive" });
          },
        }
      );
      return;
    }

    createProfile.mutate(
      {
        data: payload,
      },
      {
        onSuccess: (profile) => {
          localStorage.setItem("nutrirecover_profile_id", profile.id.toString());
          setEditingProfileId(profile.id);
          toast({ title: "Assessment complete! Generating your recovery plan." });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ title: "Failed to create profile. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const handleSymptomToggle = (symptom: SymptomKey) => {
    setFormData((prev) => {
      const current = prev.symptoms || [];
      const updated = current.includes(symptom) ? current.filter((s) => s !== symptom) : [...current, symptom];
      return { ...prev, symptoms: updated };
    });
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.name || !formData.age || !formData.heightCm || !formData.weightKg) {
        toast({ title: "Please fill all required fields", variant: "destructive" });
        return false;
      }
    }
    if (step === 2) {
      if (!formData.dietType) {
        toast({ title: "Please select a diet type", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS && step < currentStep) {
      setDirection(-1);
      setCurrentStep(step);
    }
  };

  const labSections = [
    { id: "cbc", title: "CBC (Complete Blood Count)", keywords: ["cbc", "complete blood count", "hemoglobin", "rbc", "wbc", "platelet", "hematocrit"] },
    { id: "iron-profile", title: "Iron Profile", keywords: ["iron", "ferritin", "serum iron"] },
    { id: "vitamin-profile", title: "Vitamin Profile", keywords: ["vitamin", "vitamin a", "vitamin b12", "vitamin c", "vitamin d", "vitamin e"] },
    { id: "mineral-profile", title: "Mineral Profile", keywords: ["mineral", "calcium", "magnesium", "phosphorus"] },
    { id: "electrolytes", title: "Electrolytes", keywords: ["electrolyte", "sodium"] },
    { id: "diabetes-profile", title: "Diabetes Profile", keywords: ["diabetes", "blood sugar", "fasting", "hba1c"] },
    { id: "kidney-function", title: "Kidney Function", keywords: ["kidney", "creatinine", "bun"] },
    { id: "liver-function", title: "Liver Function", keywords: ["liver", "alt", "ast"] },
    { id: "lipid-profile", title: "Lipid Profile", keywords: ["lipid", "cholesterol", "hdl", "ldl", "triglycerides"] },
    { id: "thyroid-profile", title: "Thyroid Profile", keywords: ["thyroid", "tsh"] },
  ];

  const validateLabValue = (field: string, value: number | null | undefined): boolean => {
    if (value === null || value === undefined || value === 0) return false;

    const ranges: Record<string, { min: number; max: number }> = {
      hemoglobin: { min: 2, max: 25 },
      rbcCount: { min: 1, max: 8 },
      wbcCount: { min: 500, max: 50000 },
      plateletCount: { min: 10000, max: 1000000 },
      hematocrit: { min: 5, max: 70 },
      mcv: { min: 20, max: 150 },
      serumIron: { min: 10, max: 500 },
      ferritin: { min: 1, max: 1000 },
      vitaminA: { min: 5, max: 200 },
      vitaminB12Level: { min: 50, max: 2000 },
      vitaminC: { min: 0.1, max: 10 },
      vitaminDLevel: { min: 0, max: 200 },
      vitaminE: { min: 1, max: 50 },
      magnesium: { min: 0.5, max: 5 },
      phosphorus: { min: 0.5, max: 15 },
      sodium: { min: 100, max: 180 },
      fastingBloodSugar: { min: 20, max: 500 },
      hba1c: { min: 2, max: 20 },
      creatinine: { min: 0.1, max: 15 },
      bun: { min: 2, max: 150 },
      alt: { min: 5, max: 500 },
      ast: { min: 5, max: 500 },
      totalCholesterol: { min: 50, max: 500 },
      hdl: { min: 10, max: 200 },
      ldl: { min: 10, max: 400 },
      triglycerides: { min: 10, max: 1000 },
      tsh: { min: 0.01, max: 50 },
    };

    const range = ranges[field];
    if (!range) return false;

    return value < range.min || value > range.max;
  };

  useEffect(() => {
    const warnings: Record<string, boolean> = {};

    Object.keys(formData).forEach((key) => {
      if (key in validateLabValue) {
        const value = (formData as any)[key];
        if (validateLabValue(key, value)) {
          warnings[key] = true;
        }
      }
    });

    setLabWarnings(warnings);
  }, [formData]);

  useEffect(() => {
    if (!labSearchQuery.trim()) {
      setExpandedSections([]);
      return;
    }

    const query = labSearchQuery.toLowerCase().trim();
    const matchedSections: string[] = [];

    labSections.forEach((section) => {
      const matchesTitle = section.title.toLowerCase().includes(query);
      const matchesKeywords = section.keywords.some((keyword) => keyword.includes(query));

      if (matchesTitle || matchesKeywords) {
        matchedSections.push(section.id);
      }
    });

    setExpandedSections(matchedSections);

    if (matchedSections.length > 0 && labSearchRef.current) {
      setTimeout(() => {
        const firstMatch = labSearchRef.current?.querySelector(`[value="${matchedSections[0]}"]`);
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [labSearchQuery]);

  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  const isSaving = createProfile.isPending || updateProfile.isPending;
  const showSaveChanges = Boolean(editingProfileId);

  // ===== Live Summary Calculations =====
  const bmi = useMemo(() => computeBMI(formData.heightCm, formData.weightKg), [formData.heightCm, formData.weightKg]);
  const totalSymptomsCount = formData.symptoms?.length || 0;
  const firstFewSymptoms = useMemo(() => {
    if (!formData.symptoms || formData.symptoms.length === 0) return [];
    return formData.symptoms.slice(0, 5).map((s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  }, [formData.symptoms]);
  const extraSymptomsCount = Math.max(0, totalSymptomsCount - 5);

  const allLabFields = ["hemoglobin", "ferritin", "vitaminB12Level", "vitaminDLevel", "serumCalcium", "totalProtein",
    "rbcCount", "wbcCount", "plateletCount", "hematocrit", "mcv", "serumIron", "vitaminA", "vitaminC", "vitaminE",
    "magnesium", "phosphorus", "sodium", "fastingBloodSugar", "hba1c", "creatinine", "bun", "alt", "ast",
    "totalCholesterol", "hdl", "ldl", "triglycerides", "tsh"];

  const enteredLabCount = allLabFields.filter((k) => {
    const v = (formData as any)[k];
    return v !== null && v !== undefined && v !== "";
  }).length;

  const totalLabFields = allLabFields.length;
  const blankLabCount = totalLabFields - enteredLabCount;

  // Completion percentage
  const completionPct = useMemo(() => {
    let done = 0;
    let total = 0;
    // Personal profile: name, age, gender, height, weight = 5
    total += 5;
    if (formData.name) done++;
    if (formData.age) done++;
    if (formData.gender) done++;
    if (formData.heightCm) done++;
    if (formData.weightKg) done++;
    // Diet type
    total += 1;
    if (formData.dietType) done++;
    // Symptoms
    total += 1;
    if (totalSymptomsCount > 0) done++;
    // Food plate (at least one meal has items)
    total += 1;
    const hasFood = foodPlate.breakfast.length > 0 || foodPlate.lunch.length > 0 || foodPlate.dinner.length > 0 || foodPlate.snacks.length > 0;
    if (hasFood) done++;
    // Lab reports toggle
    total += 1;
    if (hasLabReports) {
      // If ON, at least some labs entered counts as progress
      if (enteredLabCount > 0) done++;
    } else {
      // If OFF, counts as complete
      done++;
    }
    return Math.round((done / total) * 100);
  }, [formData, totalSymptomsCount, foodPlate, hasLabReports, enteredLabCount]);

  const renderStepper = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-serif text-primary">Health Assessment</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Step {currentStep} / {TOTAL_STEPS}
      </p>

      <Progress value={progressPercent} className="mb-6 h-2" />

      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isDone = currentStep > stepNum;
          const Icon = STEP_ICONS[idx];
          return (
            <button
              key={label}
              type="button"
              onClick={() => goToStep(stepNum)}
              disabled={stepNum > currentStep}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 " +
                  (isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : isDone
                      ? "bg-primary/15 text-primary border-primary/50 cursor-pointer hover:bg-primary/25"
                      : "bg-muted/50 text-muted-foreground border-border/60 cursor-default")
                }
              >
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={
                  "text-[10px] font-medium text-center leading-tight transition-colors duration-200 hidden sm:block " +
                  (isActive
                    ? "text-primary font-semibold"
                    : isDone
                      ? "text-primary/70"
                      : "text-muted-foreground")
                }
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderNavigation = () => (
    <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
      <div>
        {currentStep > 1 && (
          <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>
      <div>
        {currentStep < TOTAL_STEPS && (
          <Button type="button" onClick={nextStep} className="gap-2">
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const renderFoodChips = (slot: MealSlot, items: string[], commonItems: string[]) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {commonItems.map((item) => {
          const selected = items.includes(item);
          return (
            <button
              key={`${slot}-${item}`}
              type="button"
              onClick={() => toggleFoodItem(slot, item)}
              className={
                "px-3 py-1.5 text-xs rounded-full border transition-colors " +
                (selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50 text-muted-foreground")
              }
            >
              {item}
            </button>
          );
        })}
      </div>
      <Input
        placeholder="Custom items (comma separated)"
        value={(() => {
          if (slot === "breakfast") return foodPlate.customBreakfast;
          if (slot === "lunch") return foodPlate.customLunch;
          if (slot === "dinner") return foodPlate.customDinner;
          return foodPlate.customSnacks;
        })()}
        onChange={(e) => {
          setFoodPlate((prev) => ({ ...prev, [`custom${slot.charAt(0).toUpperCase() + slot.slice(1)}`]: e.target.value }));
        }}
        className="h-8 text-sm"
      />
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="text-xs flex items-center gap-1">
              {item}
              <button onClick={() => toggleFoodItem(slot, item)} className="hover:text-destructive">
                <XCircle className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name ?? ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Alex"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age ?? 0}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={(formData.gender ?? "male") as any} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm) *</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.heightCm ?? 0}
                    onChange={(e) => setFormData({ ...formData, heightCm: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weightKg ?? 0}
                    onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-primary" />
                  Lifestyle & Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diet Type *</Label>
                    <Select
                      value={(formData.dietType ?? DietType.vegetarian) as any}
                      onValueChange={(val) => setFormData({ ...formData, dietType: val as DietType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select diet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="eggetarian">Eggetarian</SelectItem>
                        <SelectItem value="non_vegetarian">Non-Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Weekly Budget (Optional, INR)</Label>
                    <Input
                      id="budget"
                      type="number"
                      inputMode="numeric"
                      value={(formData.budget as any) ?? ""}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine Preferences (Optional)</Label>
                  <Input
                    id="cuisine"
                    value={formData.cuisinePreference ?? ""}
                    onChange={(e) => setFormData({ ...formData, cuisinePreference: e.target.value })}
                    placeholder="e.g. Mediterranean, Asian, Mexican"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies / Restrictions (Optional)</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies ?? ""}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g. Peanut allergy, gluten intolerant"
                    className="h-20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recoveryDuration">Recovery Duration (days)</Label>
                  <Input
                    id="recoveryDuration"
                    type="number"
                    min="7"
                    max="90"
                    value={formData.recoveryDuration ?? 30}
                    onChange={(e) =>
                      setFormData({ ...formData, recoveryDuration: e.target.value ? Number(e.target.value) : 30 })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* ===== PART 1: User Food Plate ===== */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Apple className="w-5 h-5 text-primary" />
                  My Food Plate — What I Usually Eat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Select foods you commonly eat for each meal. This helps us personalize your recovery plan.
                </p>

                <div className="space-y-4">
                  <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Utensils className="w-4 h-4 text-primary" /> Breakfast
                    </h4>
                    {renderFoodChips("breakfast", foodPlate.breakfast, COMMON_BREAKFAST_ITEMS)}
                  </div>

                  <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Utensils className="w-4 h-4 text-primary" /> Lunch
                    </h4>
                    {renderFoodChips("lunch", foodPlate.lunch, COMMON_LUNCH_ITEMS)}
                  </div>

                  <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Utensils className="w-4 h-4 text-primary" /> Snacks
                    </h4>
                    {renderFoodChips("snacks", foodPlate.snacks, COMMON_SNACK_ITEMS)}
                  </div>

                  <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Utensils className="w-4 h-4 text-primary" /> Dinner
                    </h4>
                    {renderFoodChips("dinner", foodPlate.dinner, COMMON_DINNER_ITEMS)}
                  </div>
                </div>

                {/* Lifestyle food habits */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Lifestyle & Dietary Habits
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fruits per day</Label>
                      <Select
                        value={foodPlate.fruitsPerDay}
                        onValueChange={(v) => setFoodPlate((prev) => ({ ...prev, fruitsPerDay: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {["0", "1", "2", "3", "4", "5+"].map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Vegetables per day</Label>
                      <Select
                        value={foodPlate.vegetablesPerDay}
                        onValueChange={(v) => setFoodPlate((prev) => ({ ...prev, vegetablesPerDay: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {["0", "1", "2", "3", "4", "5+"].map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Water intake (daily)</Label>
                      <Select
                        value={foodPlate.waterIntake}
                        onValueChange={(v) => setFoodPlate((prev) => ({ ...prev, waterIntake: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<1L">Less than 1L</SelectItem>
                          <SelectItem value="1-2L">1–2 Liters</SelectItem>
                          <SelectItem value="2-3L">2–3 Liters</SelectItem>
                          <SelectItem value="3-4L">3–4 Liters</SelectItem>
                          <SelectItem value="4L+">More than 4L</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fast food frequency</Label>
                      <Select
                        value={foodPlate.fastFoodFreq}
                        onValueChange={(v) => setFoodPlate((prev) => ({ ...prev, fastFoodFreq: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rarely">Rarely</SelectItem>
                          <SelectItem value="1-2x/week">1–2 times a week</SelectItem>
                          <SelectItem value="3-4x/week">3–4 times a week</SelectItem>
                          <SelectItem value="Daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Outside food frequency</Label>
                      <Select
                        value={foodPlate.outsideFoodFreq}
                        onValueChange={(v) => setFoodPlate((prev) => ({ ...prev, outsideFoodFreq: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rarely">Rarely</SelectItem>
                          <SelectItem value="1-2x/week">1–2 times a week</SelectItem>
                          <SelectItem value="3-4x/week">3–4 times a week</SelectItem>
                          <SelectItem value="Daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sugar intake</Label>
                      <Select
                        value={foodPlate.sugarIntake}
                        onValueChange={(v) => setFoodPlate((prev) => ({ ...prev, sugarIntake: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tea/Coffee intake</Label>
                      <Select
                        value={foodPlate.teaCoffeeIntake}
                        onValueChange={(v) => setFoodPlate((prev) => ({ ...prev, teaCoffeeIntake: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 cups</SelectItem>
                          <SelectItem value="1-2 cups">1–2 cups</SelectItem>
                          <SelectItem value="3-4 cups">3–4 cups</SelectItem>
                          <SelectItem value="5+ cups">5+ cups</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                Medical History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* ===== PART 2: Laboratory Values Optional Toggle ===== */}
              <div className="mb-6 p-4 border border-border/60 rounded-lg bg-card/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="lab-toggle" className="font-medium cursor-pointer">
                      I have recent laboratory reports
                    </Label>
                  </div>
                  <Switch
                    id="lab-toggle"
                    checked={hasLabReports}
                    onCheckedChange={setHasLabReports}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {hasLabReports
                    ? "Toggle ON — Lab values will be used to refine your recovery targets."
                    : "Toggle OFF — Recovery plan will be generated using your profile, symptoms, lifestyle, and food plate only."}
                </p>
              </div>

              {hasLabReports ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter your lab test results for more accurate recovery nutrition support.
                  </p>
                  <TooltipProvider>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="hemoglobin">Hemoglobin (g/dL)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">Normal Adult Reference Range</p>
                                <p>Male: 13.5–17.5 g/dL</p>
                                <p>Female: 12.0–15.5 g/dL</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="hemoglobin"
                          type="number"
                          step="0.1"
                          value={(formData.hemoglobin ?? "") as any}
                          onChange={(e) =>
                            setFormData({ ...formData, hemoglobin: e.target.value ? Number(e.target.value) : null })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="ferritin">Ferritin (ng/mL)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">Normal Adult Reference Range</p>
                                <p>Male: 30–400 ng/mL</p>
                                <p>Female: 15–150 ng/mL</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="ferritin"
                          type="number"
                          step="0.1"
                          value={(formData.ferritin ?? "") as any}
                          onChange={(e) =>
                            setFormData({ ...formData, ferritin: e.target.value ? Number(e.target.value) : null })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="vitaminDLevel">Vitamin D (ng/mL)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">Normal Adult Reference Range</p>
                                <p>20–50 ng/mL</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="vitaminDLevel"
                          type="number"
                          step="0.1"
                          value={(formData.vitaminDLevel ?? "") as any}
                          onChange={(e) =>
                            setFormData({ ...formData, vitaminDLevel: e.target.value ? Number(e.target.value) : null })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="vitaminB12Level">Vitamin B12 (pg/mL)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">Normal Adult Reference Range</p>
                                <p>200–900 pg/mL</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="vitaminB12Level"
                          type="number"
                          step="0.1"
                          value={(formData.vitaminB12Level ?? "") as any}
                          onChange={(e) =>
                            setFormData({ ...formData, vitaminB12Level: e.target.value ? Number(e.target.value) : null })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="serumCalcium">Serum Calcium (mg/dL)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">Normal Adult Reference Range</p>
                                <p>8.5–10.5 mg/dL</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="serumCalcium"
                          type="number"
                          step="0.1"
                          value={(formData.serumCalcium ?? "") as any}
                          onChange={(e) =>
                            setFormData({ ...formData, serumCalcium: e.target.value ? Number(e.target.value) : null })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="totalProtein">Total Protein (g/dL)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">Normal Adult Reference Range</p>
                                <p>6.0–8.3 g/dL</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="totalProtein"
                          type="number"
                          step="0.1"
                          value={(formData.totalProtein ?? "") as any}
                          onChange={(e) =>
                            setFormData({ ...formData, totalProtein: e.target.value ? Number(e.target.value) : null })
                          }
                        />
                      </div>
                    </div>
                  </TooltipProvider>
                  <div ref={labSearchRef} className="mb-4 mt-4">
                    <Input
                      type="text"
                      placeholder="Search lab tests (e.g. Iron, Vitamin, TSH...)"
                      value={labSearchQuery}
                      onChange={(e) => setLabSearchQuery(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <Accordion type="single" collapsible className="w-full" value={expandedSections[0] || ""}>
                    <AccordionItem value="cbc" className="border border-border/60 rounded-lg px-4 bg-card/50">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">CBC (Complete Blood Count)</h3>
                          <p className="text-xs text-muted-foreground mt-1">Evaluates blood cells, oxygen carrying capacity and immunity.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="hemoglobinCbc">Hemoglobin (g/dL)</Label>
                            <Input id="hemoglobinCbc" type="number" step="0.1" value={(formData.hemoglobin ?? "") as any}
                              onChange={(e) => setFormData({ ...formData, hemoglobin: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.hemoglobin && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rbcCount">RBC Count (million/µL)</Label>
                            <Input id="rbcCount" type="number" step="0.1" value={(formData.rbcCount ?? "") as any}
                              onChange={(e) => setFormData({ ...formData, rbcCount: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.rbcCount && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wbcCount">WBC Count (/µL)</Label>
                            <Input id="wbcCount" type="number" value={(formData.wbcCount ?? "") as any}
                              onChange={(e) => setFormData({ ...formData, wbcCount: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.wbcCount && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="plateletCount">Platelet Count (/µL)</Label>
                            <Input id="plateletCount" type="number" value={(formData.plateletCount ?? "") as any}
                              onChange={(e) => setFormData({ ...formData, plateletCount: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.plateletCount && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hematocrit">Hematocrit (%)</Label>
                            <Input id="hematocrit" type="number" step="0.1" value={(formData.hematocrit ?? "") as any}
                              onChange={(e) => setFormData({ ...formData, hematocrit: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.hematocrit && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mcv">MCV (fL)</Label>
                            <Input id="mcv" type="number" step="0.1" value={(formData.mcv ?? "") as any}
                              onChange={(e) => setFormData({ ...formData, mcv: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.mcv && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="iron-profile" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Iron Profile</h3>
                          <p className="text-xs text-muted-foreground mt-1">Assesses body iron stores and iron transport.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="serumIron">Serum Iron (µg/dL)</Label>
                            <Input id="serumIron" type="number" step="0.1" value={(formData.serumIron ?? "") as any}
                              onChange={(e) => setFormData({ ...formData, serumIron: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.serumIron && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ferritinIronProfile">Ferritin (ng/mL)</Label>
                            <Input id="ferritinIronProfile" type="number" step="0.1" value={(formData.ferritin ?? "") as any}
                              onChange={(e) => setFormData({ ...formData, ferritin: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.ferritin && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="vitamin-profile" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Vitamin Profile</h3>
                          <p className="text-xs text-muted-foreground mt-1">Measures important vitamin levels affecting metabolism and immunity.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vitaminA">Vitamin A (µg/dL)</Label>
                            <Input id="vitaminA" type="number" step="0.1" value={(formData.vitaminA ?? "") as any} onChange={(e) => setFormData({ ...formData, vitaminA: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.vitaminA && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vitaminB12Profile">Vitamin B12 (pg/mL)</Label>
                            <Input id="vitaminB12Profile" type="number" step="0.1" value={(formData.vitaminB12Level ?? "") as any} onChange={(e) => setFormData({ ...formData, vitaminB12Level: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.vitaminB12Level && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vitaminC">Vitamin C (mg/dL)</Label>
                            <Input id="vitaminC" type="number" step="0.1" value={(formData.vitaminC ?? "") as any} onChange={(e) => setFormData({ ...formData, vitaminC: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.vitaminC && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vitaminDProfile">Vitamin D (ng/mL)</Label>
                            <Input id="vitaminDProfile" type="number" step="0.1" value={(formData.vitaminDLevel ?? "") as any} onChange={(e) => setFormData({ ...formData, vitaminDLevel: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.vitaminDLevel && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vitaminE">Vitamin E (mg/L)</Label>
                            <Input id="vitaminE" type="number" step="0.1" value={(formData.vitaminE ?? "") as any} onChange={(e) => setFormData({ ...formData, vitaminE: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.vitaminE && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="mineral-profile" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Mineral Profile</h3>
                          <p className="text-xs text-muted-foreground mt-1">Evaluates essential minerals involved in nerve, muscle and bone health.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="calciumMineral">Calcium (mg/dL)</Label>
                            <Input id="calciumMineral" type="number" step="0.1" value={(formData.serumCalcium ?? "") as any} onChange={(e) => setFormData({ ...formData, serumCalcium: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.serumCalcium && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="magnesium">Magnesium (mg/dL)</Label>
                            <Input id="magnesium" type="number" step="0.1" value={(formData.magnesium ?? "") as any} onChange={(e) => setFormData({ ...formData, magnesium: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.magnesium && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phosphorus">Phosphorus (mg/dL)</Label>
                            <Input id="phosphorus" type="number" step="0.1" value={(formData.phosphorus ?? "") as any} onChange={(e) => setFormData({ ...formData, phosphorus: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.phosphorus && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="electrolytes" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Electrolytes</h3>
                          <p className="text-xs text-muted-foreground mt-1">Measures body fluid and electrolyte balance.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sodium">Sodium (mmol/L)</Label>
                            <Input id="sodium" type="number" step="0.1" value={(formData.sodium ?? "") as any} onChange={(e) => setFormData({ ...formData, sodium: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.sodium && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="diabetes-profile" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Diabetes Profile</h3>
                          <p className="text-xs text-muted-foreground mt-1">Evaluates blood sugar regulation.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fastingBloodSugar">Fasting Blood Sugar (mg/dL)</Label>
                            <Input id="fastingBloodSugar" type="number" step="0.1" value={(formData.fastingBloodSugar ?? "") as any} onChange={(e) => setFormData({ ...formData, fastingBloodSugar: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.fastingBloodSugar && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hba1c">HbA1c (%)</Label>
                            <Input id="hba1c" type="number" step="0.1" value={(formData.hba1c ?? "") as any} onChange={(e) => setFormData({ ...formData, hba1c: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.hba1c && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="kidney-function" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Kidney Function</h3>
                          <p className="text-xs text-muted-foreground mt-1">Assesses kidney filtration ability.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="creatinine">Creatinine (mg/dL)</Label>
                            <Input id="creatinine" type="number" step="0.1" value={(formData.creatinine ?? "") as any} onChange={(e) => setFormData({ ...formData, creatinine: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.creatinine && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bun">Blood Urea Nitrogen - BUN (mg/dL)</Label>
                            <Input id="bun" type="number" step="0.1" value={(formData.bun ?? "") as any} onChange={(e) => setFormData({ ...formData, bun: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.bun && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="liver-function" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Liver Function</h3>
                          <p className="text-xs text-muted-foreground mt-1">Assesses liver health and enzyme activity.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="alt">ALT (SGPT) (U/L)</Label>
                            <Input id="alt" type="number" step="0.1" value={(formData.alt ?? "") as any} onChange={(e) => setFormData({ ...formData, alt: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.alt && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ast">AST (SGOT) (U/L)</Label>
                            <Input id="ast" type="number" step="0.1" value={(formData.ast ?? "") as any} onChange={(e) => setFormData({ ...formData, ast: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.ast && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="lipid-profile" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Lipid Profile</h3>
                          <p className="text-xs text-muted-foreground mt-1">Measures cardiovascular risk factors.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="totalCholesterol">Total Cholesterol (mg/dL)</Label>
                            <Input id="totalCholesterol" type="number" step="0.1" value={(formData.totalCholesterol ?? "") as any} onChange={(e) => setFormData({ ...formData, totalCholesterol: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.totalCholesterol && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hdl">HDL (mg/dL)</Label>
                            <Input id="hdl" type="number" step="0.1" value={(formData.hdl ?? "") as any} onChange={(e) => setFormData({ ...formData, hdl: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.hdl && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ldl">LDL (mg/dL)</Label>
                            <Input id="ldl" type="number" step="0.1" value={(formData.ldl ?? "") as any} onChange={(e) => setFormData({ ...formData, ldl: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.ldl && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="triglycerides">Triglycerides (mg/dL)</Label>
                            <Input id="triglycerides" type="number" step="0.1" value={(formData.triglycerides ?? "") as any} onChange={(e) => setFormData({ ...formData, triglycerides: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.triglycerides && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="thyroid-profile" className="border border-border/60 rounded-lg px-4 bg-card/50 mt-2">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="text-left">
                          <h3 className="text-sm font-semibold">Thyroid Profile</h3>
                          <p className="text-xs text-muted-foreground mt-1">Evaluates thyroid gland function.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="tsh">TSH (µIU/mL)</Label>
                            <Input id="tsh" type="number" step="0.1" value={(formData.tsh ?? "") as any} onChange={(e) => setFormData({ ...formData, tsh: e.target.value ? Number(e.target.value) : null })} />
                            {labWarnings.tsh && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please verify the entered laboratory value.</p>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Laboratory values are hidden.</p>
                  <p className="text-xs mt-1">Toggle ON above to enter lab results for a more precise recovery plan.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Symptoms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select any symptoms you are currently experiencing. This helps us identify possible nutrient gaps for
                your dietary recovery target.
              </p>
              <Accordion type="single" collapsible className="w-full space-y-2">
                {SYMPTOM_SECTIONS.map((section) => (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="border border-border/60 rounded-lg px-4 bg-card/50"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <h3 className="text-sm font-semibold text-left">{section.title}</h3>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {section.symptoms.map((symptom) => (
                          <div
                            key={symptom.id}
                            className="flex items-center space-x-3 p-3 border border-border/60 rounded-lg hover:bg-card transition-colors"
                          >
                            <Checkbox
                              id={`sym-${symptom.id}`}
                              checked={(formData.symptoms || []).includes(symptom.id)}
                              onCheckedChange={() => handleSymptomToggle(symptom.id)}
                            />
                            <Label
                              htmlFor={`sym-${symptom.id}`}
                              className="text-sm font-normal leading-none cursor-pointer"
                            >
                              {symptom.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        );

      case 5: {
        return (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Assessment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Information */}
              <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> {formData.name || "—"}</div>
                  <div><span className="text-muted-foreground">Age:</span> {formData.age || "—"}</div>
                  <div><span className="text-muted-foreground">Gender:</span> {formData.gender ? formData.gender.replace(/_/g, " ") : "—"}</div>
                  <div><span className="text-muted-foreground">Height:</span> {formData.heightCm ? `${formData.heightCm} cm` : "—"}</div>
                  <div><span className="text-muted-foreground">Weight:</span> {formData.weightKg ? `${formData.weightKg} kg` : "—"}</div>
                  <div><span className="text-muted-foreground">BMI:</span> {bmi ?? "—"}</div>
                </div>
              </div>

              {/* Symptoms */}
              <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Symptoms
                </h3>
                {totalSymptomsCount > 0 ? (
                  <div>
                    <p className="text-sm">
                      <span className="font-bold text-primary">{totalSymptomsCount}</span> symptom{totalSymptomsCount !== 1 ? "s" : ""} selected
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {firstFewSymptoms.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                      {extraSymptomsCount > 0 && (
                        <Badge variant="secondary" className="text-xs">+{extraSymptomsCount} more</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No symptoms selected</p>
                )}
              </div>

              {/* Lifestyle */}
              <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Leaf className="w-4 h-4 text-primary" />
                  Lifestyle
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Diet:</span> {formData.dietType ? formData.dietType.replace(/_/g, " ") : "—"}</div>
                  <div><span className="text-muted-foreground">Recovery:</span> {formData.recoveryDuration ? `${formData.recoveryDuration} days` : "—"}</div>
                </div>
              </div>

              {/* Food Plate */}
              <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Apple className="w-4 h-4 text-primary" />
                  Food Plate
                </h3>
                {foodPlate.breakfast.length > 0 || foodPlate.lunch.length > 0 || foodPlate.dinner.length > 0 || foodPlate.snacks.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {foodPlate.breakfast.length > 0 && (
                      <div><span className="text-muted-foreground font-medium">Breakfast:</span> {foodPlate.breakfast.join(", ")}</div>
                    )}
                    {foodPlate.lunch.length > 0 && (
                      <div><span className="text-muted-foreground font-medium">Lunch:</span> {foodPlate.lunch.join(", ")}</div>
                    )}
                    {foodPlate.dinner.length > 0 && (
                      <div><span className="text-muted-foreground font-medium">Dinner:</span> {foodPlate.dinner.join(", ")}</div>
                    )}
                    {foodPlate.snacks.length > 0 && (
                      <div><span className="text-muted-foreground font-medium">Snacks:</span> {foodPlate.snacks.join(", ")}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No food items added</p>
                )}
              </div>

              {/* Laboratory Values */}
              <div className="p-4 border border-border/60 rounded-lg bg-card/50">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  Laboratory Values
                </h3>
                {hasLabReports ? (
                  <div className="text-sm">
                    <p><span className="text-muted-foreground">Entered:</span> {enteredLabCount} / {totalLabFields}</p>
                    <p><span className="text-muted-foreground">Blank:</span> {blankLabCount}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No laboratory reports provided.</p>
                )}
              </div>

              {/* Assessment Completion */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h3 className="font-semibold text-sm mb-3">Assessment Completion</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {formData.name && formData.age && formData.gender && formData.heightCm && formData.weightKg ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span>Personal Profile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalSymptomsCount > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span>Symptoms {totalSymptomsCount > 0 ? `(${totalSymptomsCount} selected)` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.dietType ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span>Lifestyle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {foodPlate.breakfast.length > 0 || foodPlate.lunch.length > 0 || foodPlate.dinner.length > 0 || foodPlate.snacks.length > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span>Food Plate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasLabReports ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    <span>Laboratory Values {hasLabReports ? `(${enteredLabCount} entered)` : "(Optional — skipped)"}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={completionPct} className="flex-1 h-2" />
                  <span className="text-sm font-bold text-primary">{completionPct}%</span>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Your assessment is complete. Click <strong>Continue</strong> to generate your personalized recovery plan based on the information provided.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={isSaving} className="gap-2 px-8">
                  {isSaving ? (showSaveChanges ? "Saving..." : "Generating...") : "Continue"}
                  {!isSaving && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {renderStepper()}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {currentStep < TOTAL_STEPS && renderNavigation()}
      </div>
    </Layout>
  );
}


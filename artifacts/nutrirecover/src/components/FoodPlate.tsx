import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Apple, Beef, Wheat, Droplets, Flame, Microscope } from "lucide-react";
import type { Food } from "@workspace/api-client-react";

export interface PlateFoodItem {
  food: string;
  servingSize: string;
  quantity: number;
  protein: number;
  iron: number;
  calcium: number;
  vitaminD: number;
  vitaminB12: number;
  vitaminB7: number;
  vitaminK: number;
  magnesium: number;
  vitaminA: number;
  vitaminC: number;
  vitaminE: number;
  vitaminB1: number;
  vitaminB2: number;
  vitaminB3: number;
  vitaminB6: number;
  calories: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

export interface FoodPlateProps {
  foods: Food[];
  onAddFood?: (food: Food) => void;
  onRemoveFood?: (index: number) => void;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  plateItems: PlateFoodItem[];
  className?: string;
}

// Estimated macronutrient values based on common Indian food composition
// These are approximations for calories, carbs, fat and fiber; micronutrients come from the dataset
const ESTIMATED_MACROS: Record<string, { calories: number; carbs: number; fat: number; fiber: number }> = {
  default: { calories: 100, carbs: 15, fat: 3, fiber: 2 },
};

function estimateMacros(food: Food): { calories: number; carbs: number; fat: number; fiber: number } {
  const name = food.name.toLowerCase();
  
  // Dal / legumes
  if (name.includes("dal") || name.includes("lentil") || name.includes("chana") || name.includes("rajma") || name.includes("chole") || name.includes("sambar") || name.includes("khichdi")) {
    return { calories: 120, carbs: 18, fat: 3, fiber: 6 };
  }
  // Leafy greens
  if (name.includes("palak") || name.includes("spinach") || name.includes("methi") || name.includes("green leafy")) {
    return { calories: 30, carbs: 4, fat: 0.5, fiber: 3 };
  }
  // Roti / bread
  if (name.includes("roti") || name.includes("bread") || name.includes("toast") || name.includes("chilla") || name.includes("besan")) {
    return { calories: 100, carbs: 18, fat: 2, fiber: 3 };
  }
  // Rice / grains
  if (name.includes("rice") || name.includes("pulao") || name.includes("idli") || name.includes("dosa") || name.includes("poha") || name.includes("upma") || name.includes("ragi") || name.includes("bajra") || name.includes("oat")) {
    return { calories: 150, carbs: 30, fat: 2, fiber: 3 };
  }
  // Paneer / cheese / milk / curd
  if (name.includes("paneer") || name.includes("cheese") || name.includes("milk") || name.includes("curd") || name.includes("dahi") || name.includes("yogurt") || name.includes("buttermilk") || name.includes("chaas") || name.includes("ghee")) {
    return { calories: 150, carbs: 6, fat: 10, fiber: 0 };
  }
  // Eggs
  if (name.includes("egg") || name.includes("omelette") || name.includes("bhurji")) {
    return { calories: 140, carbs: 1, fat: 10, fiber: 0 };
  }
  // Chicken / meat
  if (name.includes("chicken") || name.includes("mutton") || name.includes("meat") || name.includes("liver")) {
    return { calories: 180, carbs: 0, fat: 8, fiber: 0 };
  }
  // Fish / seafood
  if (name.includes("fish") || name.includes("sardine") || name.includes("mackerel") || name.includes("prawn") || name.includes("rohu") || name.includes("bangda")) {
    return { calories: 160, carbs: 0, fat: 7, fiber: 0 };
  }
  // Tofu / soya
  if (name.includes("tofu") || name.includes("soya") || name.includes("soy") || name.includes("tempeh")) {
    return { calories: 120, carbs: 5, fat: 6, fiber: 2 };
  }
  // Nuts / seeds
  if (name.includes("almond") || name.includes("nut") || name.includes("seed") || name.includes("peanut") || name.includes("til") || name.includes("chikki")) {
    return { calories: 180, carbs: 8, fat: 15, fiber: 3 };
  }
  // Fruits
  if (name.includes("orange") || name.includes("banana") || name.includes("apple") || name.includes("guava") || name.includes("pomegranate") || name.includes("date") || name.includes("amla") || name.includes("mango") || name.includes("fruit")) {
    return { calories: 80, carbs: 18, fat: 0.5, fiber: 3 };
  }
  // Vegetables / salads
  if (name.includes("salad") || name.includes("vegetable") || name.includes("beetroot") || name.includes("carrot") || name.includes("broccoli") || name.includes("mushroom") || name.includes("bell pepper") || name.includes("sweet potato")) {
    return { calories: 50, carbs: 10, fat: 0.5, fiber: 3 };
  }
  // Snacks
  if (name.includes("snack") || name.includes("chikki") || name.includes("laddu") || name.includes("trail mix") || name.includes("sattu")) {
    return { calories: 120, carbs: 15, fat: 5, fiber: 2 };
  }
  // Fortified / cereal
  if (name.includes("fortified") || name.includes("cereal")) {
    return { calories: 130, carbs: 22, fat: 2, fiber: 2 };
  }
  
  return { calories: 100, carbs: 15, fat: 3, fiber: 2 };
}

// Priority nutrients for deficiency tracking – ordered as requested
const DEFICIENCY_NUTRIENTS: { key: string; label: string; unit: string; color: string; dailyValue: number }[] = [
  { key: "iron", label: "Iron", unit: "mg", color: "bg-red-500", dailyValue: 18 },
  { key: "vitaminD", label: "Vitamin D", unit: "IU", color: "bg-yellow-500", dailyValue: 600 },
  { key: "vitaminB12", label: "Vitamin B12", unit: "mcg", color: "bg-emerald-500", dailyValue: 2.4 },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", color: "bg-teal-500", dailyValue: 90 },
  { key: "calcium", label: "Calcium", unit: "mg", color: "bg-green-500", dailyValue: 1000 },
  { key: "magnesium", label: "Magnesium", unit: "mg", color: "bg-purple-500", dailyValue: 400 },
  { key: "protein", label: "Protein", unit: "g", color: "bg-blue-500", dailyValue: 50 },
  { key: "vitaminB1", label: "Vitamin B1", unit: "mg", color: "bg-amber-500", dailyValue: 1.2 },
  { key: "vitaminB2", label: "Vitamin B2", unit: "mg", color: "bg-emerald-500", dailyValue: 1.3 },
  { key: "vitaminB3", label: "Vitamin B3", unit: "mg", color: "bg-blue-600", dailyValue: 16 },
  { key: "vitaminB6", label: "Vitamin B6", unit: "mg", color: "bg-purple-500", dailyValue: 1.3 },
  { key: "vitaminB7", label: "Vitamin B7", unit: "mcg", color: "bg-indigo-500", dailyValue: 30 },
  { key: "vitaminK", label: "Vitamin K", unit: "mcg", color: "bg-lime-500", dailyValue: 120 },
];

const DAILY_VALUES: Record<string, number> = {
  protein: 50,
  iron: 18,
  calcium: 1000,
  vitaminD: 600,
  magnesium: 400,
  vitaminA: 900,
  vitaminC: 90,
  vitaminE: 15,
  vitaminB7: 30,
  vitaminK: 120,
  vitaminB1: 1.2,
  vitaminB2: 1.3,
  vitaminB3: 16,
  vitaminB6: 1.3,
  vitaminB12: 2.4,
  calories: 2000,
  carbohydrates: 300,
  fat: 65,
  fiber: 25,
};

export function FoodPlate({ foods, onAddFood, onRemoveFood, onUpdateQuantity, plateItems, className = "" }: FoodPlateProps) {
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Filter foods based on search text
  const suggestions = useMemo(() => {
    if (!searchText.trim()) return [];
    const q = searchText.toLowerCase();
    return foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [foods, searchText]);

  // Calculate total nutrition
  const totals = useMemo(() => {
    const t: Record<string, number> = {
      calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0,
      iron: 0, calcium: 0, vitaminD: 0, vitaminB12: 0,
      vitaminB7: 0, vitaminK: 0, magnesium: 0, vitaminA: 0, vitaminC: 0, vitaminE: 0,
      vitaminB1: 0, vitaminB2: 0, vitaminB3: 0, vitaminB6: 0,
    };
    for (const item of plateItems) {
      const q = item.quantity || 1;
      t.calories += item.calories * q;
      t.protein += item.protein * q;
      t.carbohydrates += item.carbohydrates * q;
      t.fat += item.fat * q;
      t.fiber += item.fiber * q;
      t.iron += item.iron * q;
      t.calcium += item.calcium * q;
      t.vitaminD += item.vitaminD * q;
      t.vitaminB12 += item.vitaminB12 * q;
      t.vitaminB7 += item.vitaminB7 * q;
      t.vitaminK += item.vitaminK * q;
      t.magnesium += item.magnesium * q;
      t.vitaminA += item.vitaminA * q;
      t.vitaminC += item.vitaminC * q;
      t.vitaminE += item.vitaminE * q;
      t.vitaminB1 += item.vitaminB1 * q;
      t.vitaminB2 += item.vitaminB2 * q;
      t.vitaminB3 += item.vitaminB3 * q;
      t.vitaminB6 += item.vitaminB6 * q;
    }
    return t;
  }, [plateItems]);

  const handleSelectFood = useCallback((food: Food) => {
    const macros = estimateMacros(food);
    if (onAddFood) {
      onAddFood(food);
    }
    setSearchText("");
    setShowSuggestions(false);
    setHighlightIndex(-1);
  }, [onAddFood]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && highlightIndex >= 0 && suggestions[highlightIndex]) {
      e.preventDefault();
      handleSelectFood(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  }, [suggestions, highlightIndex, handleSelectFood]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Apple className="h-5 w-5 text-primary" />
          My Food Plate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Add Food */}
        <div className="relative">
          <Label htmlFor="food-search">Add Food to Plate</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                id="food-search"
                placeholder="Search foods..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setShowSuggestions(true);
                  setHighlightIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={handleKeyDown}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                  {suggestions.map((food, i) => (
                    <button
                      key={food.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                        i === highlightIndex ? "bg-accent" : ""
                      }`}
                      onMouseDown={() => handleSelectFood(food)}
                    >
                      <div className="font-medium">{food.name}</div>
                      <div className="text-xs text-muted-foreground">{food.servingSize}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plate Items */}
        {plateItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Apple className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Your plate is empty. Search and add foods above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plateItems.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.food}</div>
                  <div className="text-xs text-muted-foreground">{item.servingSize}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity?.(index, Math.max(0.5, (item.quantity || 1) - 0.5))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity || 1}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity?.(index, (item.quantity || 1) + 0.5)}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onRemoveFood?.(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Macronutrient Summary */}
        {plateItems.length > 0 && (
          <>
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Macronutrients
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(totals.calories)}
                  </div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                  <div className="text-xs text-muted-foreground">
                    / {DAILY_VALUES.calories}
                  </div>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {totals.protein.toFixed(1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                  <div className="text-xs text-muted-foreground">
                    / {DAILY_VALUES.protein}g
                  </div>
                </div>
                <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {totals.carbohydrates.toFixed(1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                  <div className="text-xs text-muted-foreground">
                    / {DAILY_VALUES.carbohydrates}g
                  </div>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    {totals.fat.toFixed(1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">Fat</div>
                  <div className="text-xs text-muted-foreground">
                    / {DAILY_VALUES.fat}g
                  </div>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {totals.fiber.toFixed(1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">Fiber</div>
                  <div className="text-xs text-muted-foreground">
                    / {DAILY_VALUES.fiber}g
                  </div>
                </div>
              </div>
            </div>

            {/* Micronutrient Summary */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Microscope className="h-4 w-4" />
                Micronutrients
              </h4>
              <div className="space-y-2">
                {DEFICIENCY_NUTRIENTS.map(({ key, label, unit, color, dailyValue }) => {
                  const value = (totals as any)[key] || 0;
                  const dv = dailyValue || 1;
                  const percent = Math.min(100, Math.round((value / dv) * 100));
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-muted-foreground">{label}</div>
                      <div className="flex-1">
                        <Progress value={percent} className={`h-2 ${color}`} />
                      </div>
                      <div className="w-24 text-right text-sm font-medium">
                        {value.toFixed(1)}{unit}
                      </div>
                      <div className="w-12 text-right text-xs text-muted-foreground">
                        {percent}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Convert a Food from the dataset into a PlateFoodItem with estimated macros.
 */
export function foodRowToPlateItem(food: Food, quantity: number = 1): PlateFoodItem {
  const macros = estimateMacros(food);
  return {
    food: food.name,
    servingSize: food.servingSize,
    quantity,
    protein: food.protein ?? 0,
    iron: food.iron ?? 0,
    calcium: food.calcium ?? 0,
    vitaminD: food.vitaminD ?? 0,
    vitaminB12: food.vitaminB12 ?? 0,
    vitaminB7: food.vitaminB7 ?? 0,
    vitaminK: food.vitaminK ?? 0,
    magnesium: food.magnesium ?? 0,
    vitaminA: food.vitaminA ?? 0,
    vitaminC: food.vitaminC ?? 0,
    vitaminE: food.vitaminE ?? 0,
    vitaminB1: food.vitaminB1 ?? 0,
    vitaminB2: food.vitaminB2 ?? 0,
    vitaminB3: food.vitaminB3 ?? 0,
    vitaminB6: food.vitaminB6 ?? 0,
    calories: macros.calories,
    carbohydrates: macros.carbs,
    fat: macros.fat,
    fiber: macros.fiber,
  };
}

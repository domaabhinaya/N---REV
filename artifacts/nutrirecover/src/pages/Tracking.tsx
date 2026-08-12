import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useGetDailySummary,
  useListFoods,
  useCreateMealLog,
  useDeleteMealLog,
  useGetSuggestions,
  getGetDailySummaryQueryKey,
  getGetSuggestionsQueryKey,
  listFoods,
  type ListFoods200,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { NutrientLine, Suggestion, Food } from "@workspace/api-client-react";

type MealSectionKey = "breakfast" | "lunch" | "dinner" | "snack";

interface MealInputRow {
  foodText: string;
  quantityText: string;
  servings: number;
  suggestions: Food[];
  showSuggestions: boolean;
  highlightIndex: number;
}

const MEAL_SECTIONS: { key: MealSectionKey; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
];

const NUTRIENT_LABELS: Record<string, string> = {
  protein: "Protein",
  iron: "Iron",
  calcium: "Calcium",
  vitamin_d: "Vitamin D",
  vitamin_b12: "Vitamin B12",
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
};

function createInputRow(): MealInputRow {
  return {
    foodText: "",
    quantityText: "",
    servings: 1,
    suggestions: [],
    showSuggestions: false,
    highlightIndex: -1,
  };
}

function createInitialInputs(): Record<MealSectionKey, MealInputRow> {
  return {
    breakfast: createInputRow(),
    lunch: createInputRow(),
    dinner: createInputRow(),
    snack: createInputRow(),
  };
}

export function Tracking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const profileIdStr = localStorage.getItem("nutrirecover_profile_id");
  const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

  // Single source of truth: selected date
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [inputs, setInputs] = useState<Record<MealSectionKey, MealInputRow>>(createInitialInputs);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!profileId) {
      setLocation("/");
    }
  }, [profileId, setLocation]);

  // Food dataset for autocomplete - load primary foods first for exact-match map
  const { data: foodsResponse } = useListFoods({ limit: 200 });
  const foods = foodsResponse?.items ?? [];

  // Daily summary - single source of truth for persisted data
  const {
    data: summary,
    refetch: refetchSummary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetDailySummary(
    profileId as number,
    { date },
    { 
      query: { 
        enabled: !!profileId && !!date, 
        queryKey: getGetDailySummaryQueryKey(profileId as number, { date }) 
      } 
    }
  );

  // Suggestions - depends on summary data
  const {
    data: suggestions,
    refetch: refetchSuggestions,
    isLoading: suggestionsLoading,
    isError: suggestionsError,
  } = useGetSuggestions(
    profileId as number,
    { date },
    { 
      query: { 
        enabled: !!profileId && !!date, 
        queryKey: getGetSuggestionsQueryKey(profileId as number, { date }) 
      } 
    }
  );

  const createLog = useCreateMealLog();
  const deleteLog = useDeleteMealLog();

  // Food name → Food lookup map (exact match)
  const foodMap = useMemo(() => {
    const map = new Map<string, Food>();
    if (!foods) return map;
    for (const f of foods) {
      map.set(f.name.toLowerCase(), f);
    }
    return map;
  }, [foods]);

  // Derived state from backend
  const mealLogs = summary?.mealLogs ?? [];
  const nutrientLines: NutrientLine[] = summary?.nutrients ?? [];
  const hasPersistedItems = mealLogs.length > 0;
  const hasPendingItems = Object.values(inputs).some((i) => i.foodText.trim().length > 0);
  const hasAnyItems = hasPersistedItems || hasPendingItems;

  // Deficits and met nutrients
  const deficits = nutrientLines.filter((n) => n.status === "needs_improvement");
  const met = nutrientLines.filter((n) => n.status === "on_target");

  const updateInput = (key: MealSectionKey, patch: Partial<MealInputRow>) => {
    setInputs((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const handleFoodInputChange = async (key: MealSectionKey, value: string) => {
    const lower = value.toLowerCase().trim();
    let matches: Food[] = [];
    if (lower.length > 0) {
      try {
        const response = await listFoods({ search: lower, limit: 8 });
        matches = response.items;
      } catch {
        // Fallback to base dataset on error
        matches = foods.filter((f) => f.name.toLowerCase().includes(lower)).slice(0, 8);
      }
    }
    updateInput(key, {
      foodText: value,
      suggestions: matches,
      showSuggestions: matches.length > 0 && value.trim().length > 0,
      highlightIndex: -1,
    });
  };

  const selectSuggestion = (key: MealSectionKey, food: Food) => {
    updateInput(key, {
      foodText: food.name,
      suggestions: [],
      showSuggestions: false,
      highlightIndex: -1,
    });
    const qtyInput = inputRefs.current[`qty-${key}`];
    if (qtyInput) qtyInput.focus();
  };

  /** Persist a single meal item to the backend */
  const persistItem = async (key: MealSectionKey, foodText: string, quantityText: string, servings: number): Promise<void> => {
    if (!profileId) return;

    const lower = foodText.toLowerCase();
    const matchedFood = foodMap.get(lower);

    const payload: any = {
      date,
      mealType: key === "snack" ? "snack" : key,
      servings,
    };
    if (matchedFood) {
      payload.foodId = matchedFood.id;
    } else {
      payload.customFoodName = foodText;
      payload.customLabel = quantityText || undefined;
    }

    return new Promise((resolve, reject) => {
      createLog.mutate({ profileId, data: payload }, {
        onSuccess: () => resolve(),
        onError: (error: any) => reject(error),
      });
    });
  };

  const handleKeyDown = (key: MealSectionKey, e: React.KeyboardEvent) => {
    const input = inputs[key];
    if (!input.showSuggestions || input.suggestions.length === 0) {
      if (e.key === "Enter" && input.foodText.trim()) {
        e.preventDefault();
        handleAddItemClick(key);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      updateInput(key, { highlightIndex: Math.min(input.highlightIndex + 1, input.suggestions.length - 1) });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateInput(key, { highlightIndex: Math.max(input.highlightIndex - 1, -1) });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (input.highlightIndex >= 0 && input.suggestions[input.highlightIndex]) {
        selectSuggestion(key, input.suggestions[input.highlightIndex]);
      } else if (input.foodText.trim()) {
        handleAddItemClick(key);
      }
    } else if (e.key === "Escape") {
      updateInput(key, { showSuggestions: false, suggestions: [] });
    }
  };

  const handleAddItemClick = (key: MealSectionKey) => {
    const input = inputs[key];
    if (!input.foodText.trim()) return;
    
    const lower = input.foodText.toLowerCase();
    const matchedFood = foodMap.get(lower);

    const payload: any = {
      date,
      mealType: key === "snack" ? "snack" : key,
      servings: input.servings,
    };
    if (matchedFood) {
      payload.foodId = matchedFood.id;
    } else {
      payload.customFoodName = input.foodText.trim();
      payload.customLabel = input.quantityText.trim() || undefined;
    }

    createLog.mutate({ profileId: profileId as number, data: payload }, {
      onSuccess: () => {
        toast({ title: `${MEAL_SECTIONS.find((s) => s.key === key)?.label ?? key} item added.` });
        updateInput(key, {
          foodText: "",
          quantityText: "",
          servings: 1,
          suggestions: [],
          showSuggestions: false,
        });
        // Refetch after successful add
        setTimeout(() => {
          refetchSummary();
          refetchSuggestions();
        }, 100);
        const foodInput = inputRefs.current[`food-${key}`];
        if (foodInput) foodInput.focus();
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to add item", 
          description: error?.message || "Unknown error occurred",
          variant: "destructive" 
        });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteLog.mutate(
      { mealLogId: id },
      {
        onSuccess: () => {
          toast({ title: "Log deleted" });
          refetchSummary();
          refetchSuggestions();
        },
        onError: (error: any) => {
          toast({ 
            title: "Failed to delete", 
            description: error?.message || "Unknown error occurred",
            variant: "destructive" 
          });
        },
      }
    );
  };

  /** Save & Analyze: persists all pending items, then refetches all data */
  const handleSaveAndAnalyze = async () => {
    if (!profileId) return;
    setIsSaving(true);
    setSaveError(null);

    // Collect all pending items
    const pendingItems: { key: MealSectionKey; input: MealInputRow }[] = [];
    for (const section of MEAL_SECTIONS) {
      const input = inputs[section.key];
      if (input.foodText.trim()) {
        pendingItems.push({ key: section.key, input });
      }
    }

    // If no items, show error and stop
    if (pendingItems.length === 0) {
      setSaveError("Add some foods before saving.");
      setIsSaving(false);
      return;
    }

    // Persist all pending items sequentially
    const errors: string[] = [];
    for (const { key, input } of pendingItems) {
      try {
        await persistItem(key, input.foodText.trim(), input.quantityText.trim(), input.servings);
      } catch (err: any) {
        errors.push(`${MEAL_SECTIONS.find(s => s.key === key)?.label}: ${err?.message || "Unknown error"}`);
      }
    }

    // If any errors occurred, show them and keep data
    if (errors.length > 0) {
      setSaveError(errors.join("; "));
      setIsSaving(false);
      toast({ 
        title: "Save failed", 
        description: errors.join("; "),
        variant: "destructive" 
      });
      return;
    }

    // Clear pending inputs only after all mutations succeeded
    setInputs(createInitialInputs());

    // Refetch data
    try {
      await Promise.all([refetchSummary(), refetchSuggestions()]);
      toast({ title: "Day intake saved and analyzed!" });
    } catch (err: any) {
      console.error("Refetch error:", err);
      toast({ 
        title: "Saved, but refresh failed", 
        description: err?.message || "Could not refresh data",
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!profileId) return null;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-primary mb-2">Daily Tracking</h1>
          <p className="text-muted-foreground">
            Log what you ate today. Type a food name — if it's in our dataset it will be matched automatically.
            Otherwise it's saved as a custom food. Then analyze to see your nutrient progress.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left column: Food Diary */}
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Food Diary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setInputs(createInitialInputs());
                    }}
                    required
                  />
                </div>

                <div className="grid gap-6">
                  {MEAL_SECTIONS.map((section) => {
                    const input = inputs[section.key];
                    const sectionLogs = mealLogs.filter((l) => l.mealType === section.key);

                    return (
                      <div key={section.key} className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-base">{section.label}</h3>
                          <span className="text-xs text-muted-foreground">
                            {sectionLogs.length} item{sectionLogs.length !== 1 ? "s" : ""} logged
                          </span>
                        </div>

                        {/* Unified food entry row */}
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex-1 min-w-[180px] relative">
                            <Label className="text-xs mb-1 block">Food</Label>
                            <input
                              ref={(el) => { inputRefs.current[`food-${section.key}`] = el; }}
                              type="text"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="e.g. rice, dal, paneer curry, dosa..."
                              value={input.foodText}
                              onChange={(e) => handleFoodInputChange(section.key, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(section.key, e)}
                              onBlur={() => {
                                setTimeout(() => updateInput(section.key, { showSuggestions: false }), 200);
                              }}
                              onFocus={() => {
                                if (input.suggestions.length > 0 && input.foodText.trim().length > 0) {
                                  updateInput(section.key, { showSuggestions: true });
                                }
                              }}
                              autoComplete="off"
                            />
                            {/* Autocomplete dropdown */}
                            {input.showSuggestions && input.suggestions.length > 0 && (
                              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {input.suggestions.map((food, idx) => (
                                  <button
                                    key={food.id}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                                      idx === input.highlightIndex ? "bg-accent" : ""
                                    }`}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectSuggestion(section.key, food);
                                    }}
                                  >
                                    <span className="font-medium">{food.name}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">
                                      {food.servingSize} · P:{food.protein} Fe:{food.iron} Ca:{food.calcium} D:{food.vitaminD}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="w-[120px]">
                            <Label className="text-xs mb-1 block">Quantity</Label>
                            <input
                              ref={(el) => { inputRefs.current[`qty-${section.key}`] = el; }}
                              type="text"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="e.g. 1 cup, 2 rotis"
                              value={input.quantityText}
                              onChange={(e) => updateInput(section.key, { quantityText: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddItemClick(section.key);
                                }
                              }}
                            />
                          </div>
                          <div className="w-[90px]">
                            <Label className="text-xs mb-1 block">Servings</Label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={input.servings}
                              onChange={(e) => updateInput(section.key, { servings: Number(e.target.value) })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddItemClick(section.key);
                                }
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-5"
                            onClick={() => handleAddItemClick(section.key)}
                            disabled={createLog.isPending || !input.foodText.trim()}
                          >
                            Add
                          </Button>
                        </div>

                        {/* Logged items for this meal - from backend */}
                        {sectionLogs.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {sectionLogs.map((log) => (
                              <div
                                key={log.id}
                                className="flex justify-between items-center text-sm py-1.5 border-b border-border/50 last:border-0"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-medium truncate">{log.foodName}</span>
                                  {log.customLabel && (
                                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                                      · {log.customLabel}
                                    </span>
                                  )}
                                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                                    · {log.servings} serving{log.servings !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(log.id)}
                                  className="text-destructive h-7 px-2 text-xs shrink-0 ml-2"
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Save & Analyze button */}
                <div className="pt-4 flex justify-center">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full sm:w-auto px-10"
                    onClick={handleSaveAndAnalyze}
                    disabled={isSaving || createLog.isPending || (!hasAnyItems)}
                  >
                    {isSaving ? "Saving..." : "Save & Analyze Today's Intake"}
                  </Button>
                </div>
                
                {/* Error display */}
                {saveError && (
                  <div className="text-sm text-destructive text-center">{saveError}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Nutrient Summary + Suggestions */}
          <div className="xl:col-span-1 space-y-6">
            {/* Nutrient Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Nutrient Intake</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading && !summary ? (
                  <div className="text-sm text-muted-foreground py-4">Loading...</div>
                ) : summaryError ? (
                  <div className="text-sm text-destructive py-4">Failed to load nutrient data.</div>
                ) : nutrientLines.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4">
                    Add some foods and click "Save & Analyze" to see your nutrient totals.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nutrientLines.map((nut) => {
                      const percent = Math.min(100, Math.round((nut.consumed / nut.target) * 100));
                      const label = NUTRIENT_LABELS[nut.nutrient] ?? nut.nutrient.replace("_", " ");
                      return (
                        <div key={nut.nutrient} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{label}</span>
                            <span className="text-muted-foreground">
                              {nut.consumed.toFixed(1)} / {nut.target} {nut.unit}
                            </span>
                          </div>
                          <Progress value={percent} className="h-2" />
                          <div className="text-xs text-right text-muted-foreground">{percent}% of target</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deficit / Remaining Summary */}
            {nutrientLines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>What's Still Missing Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {deficits.length === 0 ? (
                      <p className="text-green-600 font-medium">All nutrient targets met! Great job today.</p>
                    ) : (
                      deficits.map((nut) => {
                        const gap = Math.max(0, nut.target - nut.consumed);
                        const label = NUTRIENT_LABELS[nut.nutrient] ?? nut.nutrient.replace("_", " ");
                        return (
                          <div key={nut.nutrient} className="flex items-center gap-2">
                            <span className="text-destructive font-bold">•</span>
                            <span>
                              <span className="font-medium">{label}</span> still low —{" "}
                              <span className="text-muted-foreground">
                                {gap.toFixed(1)} {nut.unit} remaining
                              </span>
                            </span>
                          </div>
                        );
                      })
                    )}
                    {met.length > 0 && (
                      <div className="pt-2 border-t border-border mt-2">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Targets met:</p>
                        {met.map((nut) => {
                          const label = NUTRIENT_LABELS[nut.nutrient] ?? nut.nutrient.replace("_", " ");
                          return (
                            <div key={nut.nutrient} className="flex items-center gap-2 text-xs text-green-600">
                              <span>✓</span>
                              <span>{label} target met</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggestions - show when there are meal logs */}
            {hasPersistedItems && (
              <Card>
                <CardHeader>
                  <CardTitle>Suggestions / What to Eat Next</CardTitle>
                </CardHeader>
                <CardContent>
                  {suggestionsLoading && !suggestions ? (
                    <div className="text-sm text-muted-foreground py-4">Loading suggestions...</div>
                  ) : suggestionsError ? (
                    <div className="text-sm text-destructive py-4">Failed to load suggestions.</div>
                  ) : !suggestions || suggestions.length === 0 ? (
                    <p className="text-sm text-green-600 font-medium">
                      All nutrient targets are on track! Keep up the good work.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {suggestions.map((s: Suggestion, idx: number) => {
                        const label = NUTRIENT_LABELS[s.nutrient] ?? s.nutrient.replace("_", " ");
                        return (
                          <div key={idx} className="space-y-2 text-sm border-b border-border pb-3 last:border-0">
                            <div className="font-medium text-primary">{label}</div>
                            <p className="text-muted-foreground text-xs">{s.reason}</p>
                            {s.additions.length > 0 && (
                              <div>
                                <span className="text-xs font-medium">Try adding: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {s.additions.map((item, i) => (
                                    <span
                                      key={i}
                                      className="inline-block bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground italic">{s.expectedImprovement}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
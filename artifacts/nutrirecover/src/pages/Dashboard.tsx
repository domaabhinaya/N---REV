import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboard,
  useGetProfile,
  useGetDailySummary,
  useGetSuggestions,
  getGetDashboardQueryKey,
  getGetProfileQueryKey,
  getGetDailySummaryQueryKey,
  getGetSuggestionsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Target, Utensils, Clock, AlertCircle, CheckCircle2, FileText, ShoppingCart, Download } from "lucide-react";

const NUTRIENT_COLORS: Record<string, string> = {
  protein: "#052150",
  iron: "#ce1515",
  calcium: "#065b3f",
  vitamin_d: "rgb(221, 152, 33)",
  magnesium: "#8b5cf6",
  vitamin_a: "#ec4899",
  vitamin_c: "#14b8a0",
  vitamin_b7: "#6366f1",
  vitamin_e: "#f97316",
  vitamin_k: "#84cc16",
  vitamin_b1: "#f59e0b",
  vitamin_b2: "#10b981",
  vitamin_b3: "#3b82f6",
  vitamin_b6: "#8b5cf6",
  vitamin_b12: "#0ea5e9",
};

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

export function Dashboard() {
  const [, setLocation] = useLocation();
  const profileIdStr = localStorage.getItem("nutrirecover_profile_id");
  const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

  useEffect(() => {
    if (!profileId) {
      setLocation("/");
    }
  }, [profileId, setLocation]);

  const { data, isLoading } = useGetDashboard(profileId as number, { query: { enabled: !!profileId, queryKey: getGetDashboardQueryKey(profileId as number) } });
  const { data: profile } = useGetProfile(profileId as number, { query: { enabled: !!profileId, queryKey: getGetProfileQueryKey(profileId as number) } });
  const { data: dailySummary } = useGetDailySummary(profileId as number, undefined, { query: { enabled: !!profileId, queryKey: getGetDailySummaryQueryKey(profileId as number) } });
  const { data: suggestions } = useGetSuggestions(profileId as number, undefined, { query: { enabled: !!profileId, queryKey: getGetSuggestionsQueryKey(profileId as number) } });

  if (!profileId) return null;

  // Calculate meals completed today
  const mealsCompleted = useMemo(() => {
    if (!dailySummary) return { completed: 0, total: 4 };
    const mealTypes = new Set(dailySummary.mealLogs.map((m) => m.mealType));
    return { completed: mealTypes.size, total: 4 };
  }, [dailySummary]);

  // Today's nutrient intake data
  const todayNutrientData = useMemo(() => {
    if (!dailySummary) return [];
    return dailySummary.nutrients.map((n) => ({
      nutrient: NUTRIENT_LABELS[n.nutrient] || n.nutrient,
      consumed: n.consumed,
      target: n.target,
      percentage: n.target > 0 ? Math.round((n.consumed / n.target) * 100) : 0,
      unit: n.unit || NUTRIENT_UNITS[n.nutrient] || "",
      color: NUTRIENT_COLORS[n.nutrient] || "#6b7280",
    }));
  }, [dailySummary]);

  // Deficiencies from active nutrients
  const deficiencies = useMemo(() => {
    if (!data?.activeNutrients) return [];
    return data.activeNutrients.filter((n) => n.priority === "high" || n.priority === "medium");
  }, [data?.activeNutrients]);

  // Expected recovery time
  const expectedRecoveryDays = profile?.recoveryDuration || 30;
  const daysTracked = data?.daysTracked || 0;
  const recoveryProgress = Math.min(100, Math.round((daysTracked / expectedRecoveryDays) * 100));

  // Weekly progress summary
  const weeklyProgress = useMemo(() => {
    if (!data?.weeklyHistory || data.weeklyHistory.length === 0) return [];
    return data.weeklyHistory.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      protein: point.protein,
      iron: point.iron,
      calcium: point.calcium,
      vitaminD: point.vitaminD,
    }));
  }, [data?.weeklyHistory]);

  // Weekly adherence
  const weeklyAdherence = data?.weeklyAdherenceScore || 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif text-primary mb-2">Recovery Dashboard</h1>
          <p className="text-muted-foreground">Track your dietary recovery journey and view insights.</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : data ? (
          <>
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Recovery Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-bold text-primary mb-1">{data.recoveryScore || 0}</div>
                      <div className="text-sm font-medium text-muted-foreground">Recovery Score</div>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={data.recoveryScore || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Deficiencies */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-bold text-destructive mb-1">{deficiencies.length}</div>
                      <div className="text-sm font-medium text-muted-foreground">Key Deficiencies</div>
                    </div>
                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={Math.max(0, 100 - deficiencies.length * 20)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Meals Completed */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-bold text-green-600 mb-1">{mealsCompleted.completed}/{mealsCompleted.total}</div>
                      <div className="text-sm font-medium text-muted-foreground">Meals Completed</div>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center">
                      <Utensils className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={(mealsCompleted.completed / mealsCompleted.total) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Expected Recovery Time */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-bold text-blue-600 mb-1">{expectedRecoveryDays}d</div>
                      <div className="text-sm font-medium text-muted-foreground">Expected Recovery</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={recoveryProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Nutrient Intake */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Today's Nutrient Intake
                </CardTitle>
                <CardDescription>
                  Your nutrient consumption for today compared to daily targets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayNutrientData.length > 0 ? (
                  <div className="space-y-4">
                    {/* Nutrient List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {todayNutrientData.map((n) => (
                        <div key={n.nutrient} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: n.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <span className="text-sm font-medium truncate">{n.nutrient}</span>
                              <span className="text-sm font-bold">{n.consumed.toFixed(1)}{n.unit}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={n.percentage} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground w-12 text-right">{n.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Utensils className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No meals logged for today. Start by adding foods from the Daily Tracking page.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deficiencies & Weekly Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Deficiencies Detail */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Deficiency Status
                  </CardTitle>
                  <CardDescription>
                    Nutrients requiring attention based on your profile.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {deficiencies.length > 0 ? (
                    <div className="space-y-3">
                      {deficiencies.map((nutrient, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                          <div className="w-3 h-3 rounded-full bg-destructive flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-sm capitalize">
                              {NUTRIENT_LABELS[nutrient.nutrient] || nutrient.nutrient.replace("_", " ")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Priority: {nutrient.priority}
                            </div>
                          </div>
                          <Badge variant={nutrient.priority === "high" ? "destructive" : "default"} className="text-xs">
                            {nutrient.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p>No significant deficiencies detected.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Progress */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Weekly Nutrient Progress</CardTitle>
                  <CardDescription>
                    Track your nutrient intake trends over the past week.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyProgress} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="protein" fill="#3b82f6" name="Protein" />
                        <Bar dataKey="iron" fill="#ef4444" name="Iron" />
                        <Bar dataKey="calcium" fill="#10b981" name="Calcium" />
                        <Bar dataKey="vitaminD" fill="#f59e0b" name="Vitamin D" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Adherence & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Weekly Adherence */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Weekly Adherence
                  </CardTitle>
                  <CardDescription>
                    Your consistency with the recovery plan this week.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary mb-2">{weeklyAdherence}%</div>
                    <Progress value={weeklyAdherence} className="h-3 mb-2" />
                    <div className="text-sm text-muted-foreground">
                      {data.daysTracked} days tracked · {data.streak} day streak
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Insights */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Progress Insights</CardTitle>
                  <CardDescription>
                    Personalised insights based on your recovery journey.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {data.insights.map((insight, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-primary font-bold">•</span>
                        <span className="text-sm">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

{/* Recovery Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Recovery Timeline
                </CardTitle>
                <CardDescription>
                  Track your progress toward your expected recovery date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">Day 1</span>
                  </div>
                  <div className="relative">
                    <Progress value={recoveryProgress} className="h-4" />
                    <div
                      className="absolute top-0 w-1 h-4 bg-primary rounded-full"
                      style={{ left: `${recoveryProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Expected Recovery</span>
                    <span className="font-medium">{expectedRecoveryDays} days</span>
                  </div>

                  {/* Weekly Milestones */}
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Recovery Milestones</h4>
                    <div className="space-y-2">
                      {[
                        { week: "Week 1", label: "Appetite improves", completed: daysTracked >= 7 },
                        { week: "Week 2", label: "Fatigue reduces", completed: daysTracked >= 14 },
                        { week: "Week 3", label: "Hair fall decreases", completed: daysTracked >= 21 },
                        { week: "Week 4", label: "Hemoglobin improves", completed: daysTracked >= 28 },
                        { week: "Week 6", label: "Recovery expected", completed: daysTracked >= 42 },
                      ].map((milestone, i) => (
                        <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                          milestone.completed
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                            : "bg-muted/30 border-border"
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            milestone.completed
                              ? "bg-green-500 text-white"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          }`}>
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{milestone.week}</span>
                              <span className={`text-xs font-medium ${
                                milestone.completed ? "text-green-600" : "text-muted-foreground"
                              }`}>
                                {milestone.completed ? "Achieved" : "In progress"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{milestone.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div>
                      <div className="text-2xl font-bold text-primary">{daysTracked}</div>
                      <div className="text-xs text-muted-foreground">Days Tracked</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{data.streak}</div>
                      <div className="text-xs text-muted-foreground">Current Streak</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{expectedRecoveryDays - daysTracked}</div>
                      <div className="text-xs text-muted-foreground">Days Remaining</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

{/* Weekly Grocery List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Weekly Grocery List
                </CardTitle>
                <CardDescription>
                  Nutrient-rich foods recommended for this week based on your recovery plan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.activeNutrients && data.activeNutrients.some((n) => n.foodSources && n.foodSources.length > 0) ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {data.activeNutrients
                      .filter((n) => n.foodSources && n.foodSources.length > 0)
                      .slice(0, 5)
                      .map((n) => (
                        <div key={n.nutrient}>
                          <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {NUTRIENT_LABELS[n.nutrient] || n.nutrient.replace("_", " ")}
                          </h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {n.foodSources.map((food, i) => (
                              <li key={i}>{food}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete your assessment to see personalized food recommendations here.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Jump to key pages to continue your recovery journey.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button variant="outline" className="justify-start gap-2" onClick={() => setLocation("/tracking")}>
                    <Utensils className="h-4 w-4" />
                    Log Today's Meals
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" onClick={() => setLocation("/recovery-plan")}>
                    <Target className="h-4 w-4" />
                    View Recovery Plan
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" onClick={() => setLocation("/suggestions")}>
                    <TrendingUp className="h-4 w-4" />
                    Get Suggestions
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" onClick={() => setLocation("/assessment")}>
                    <FileText className="h-4 w-4" />
                    Edit Assessment
                  </Button>
                  <Button variant="default" className="justify-start gap-2 bg-[#5b8c5a] hover:bg-[#4a7a49]" onClick={() => setLocation("/report")}>
                    <Download className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Layout>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield,
  Upload,
  Download,
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  ArrowLeft,
} from "lucide-react";

const ADMIN_KEY_STORAGE = "nrev_admin_key";
const API_BASE = "/api";

interface Food {
  id: number;
  name: string;
  servingSize: string;
  protein: number;
  iron: number;
  calcium: number;
  vitaminD: number;
  magnesium: number | null;
  vitaminA: number | null;
  vitaminC: number | null;
  vitaminB7: number | null;
  vitaminE: number | null;
  vitaminK: number | null;
  dietTags: string[];
  mealTags: string[];
  cuisineTags: string[];
}

interface FoodFormData {
  name: string;
  servingSize: string;
  protein: string;
  iron: string;
  calcium: string;
  vitaminD: string;
  magnesium: string;
  vitaminA: string;
  vitaminC: string;
  vitaminB7: string;
  vitaminE: string;
  vitaminK: string;
  dietTags: string;
  mealTags: string;
  cuisineTags: string;
}

const EMPTY_FORM: FoodFormData = {
  name: "",
  servingSize: "1 serving",
  protein: "",
  iron: "",
  calcium: "",
  vitaminD: "",
  magnesium: "",
  vitaminA: "",
  vitaminC: "",
  vitaminB7: "",
  vitaminE: "",
  vitaminK: "",
  dietTags: "",
  mealTags: "",
  cuisineTags: "",
};

const NUTRIENT_FIELDS: { key: keyof FoodFormData; label: string; required: boolean }[] = [
  { key: "name", label: "Food Name", required: true },
  { key: "servingSize", label: "Serving Size", required: false },
  { key: "protein", label: "Protein (g)", required: true },
  { key: "iron", label: "Iron (mg)", required: true },
  { key: "calcium", label: "Calcium (mg)", required: true },
  { key: "vitaminD", label: "Vitamin D (IU)", required: true },
  { key: "magnesium", label: "Magnesium (mg)", required: false },
  { key: "vitaminA", label: "Vitamin A (mcg)", required: false },
  { key: "vitaminC", label: "Vitamin C (mg)", required: false },
  { key: "vitaminB7", label: "Vitamin B7 (mcg)", required: false },
  { key: "vitaminE", label: "Vitamin E (mg)", required: false },
  { key: "vitaminK", label: "Vitamin K (mcg)", required: false },
  { key: "dietTags", label: "Diet Tags (comma-separated)", required: false },
  { key: "mealTags", label: "Meal Tags (comma-separated)", required: false },
  { key: "cuisineTags", label: "Cuisine Tags (comma-separated)", required: false },
];

async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const adminKey = localStorage.getItem(ADMIN_KEY_STORAGE);
  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    "x-admin-key": adminKey || "",
  } as Record<string, string>;
  return fetch(`${API_BASE}${url}`, { ...options, headers });
}

export function AdminPanel() {
  const [, setLocation] = useLocation();
  const [adminKey, setAdminKey] = useState(localStorage.getItem(ADMIN_KEY_STORAGE) || "");
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem(ADMIN_KEY_STORAGE));
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [deletingFood, setDeletingFood] = useState<Food | null>(null);
  const [formData, setFormData] = useState<FoodFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setSuccess(""), 4000);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setError(""), 5000);
  }, []);

  const fetchFoods = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      params.set("limit", "200");
      const res = await adminFetch(`/admin/foods?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          setIsAuthenticated(false);
          localStorage.removeItem(ADMIN_KEY_STORAGE);
          throw new Error("Invalid admin key. Please re-authenticate.");
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setFoods(data.foods || []);
      setIsAuthenticated(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to load foods");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Auto-fetch on mount if key exists
  useEffect(() => {
    if (localStorage.getItem(ADMIN_KEY_STORAGE)) {
      fetchFoods();
    } else {
      setLoading(false);
    }
  }, [fetchFoods]);

  const handleAuthenticate = async () => {
    if (!adminKey.trim()) return;
    localStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim());
    setLoading(true);
    await fetchFoods();
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey("");
    setIsAuthenticated(false);
    setFoods([]);
  };

  const handleAddFood = async () => {
    setSaving(true);
    setError("");
    try {
      const required = ["name", "protein", "iron", "calcium", "vitaminD"] as const;
      for (const field of required) {
        if (!formData[field]?.toString().trim()) {
          throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        }
      }

      const payload = {
        name: formData.name.trim(),
        servingSize: formData.servingSize.trim() || "1 serving",
        protein: parseFloat(formData.protein) || 0,
        iron: parseFloat(formData.iron) || 0,
        calcium: parseFloat(formData.calcium) || 0,
        vitaminD: parseFloat(formData.vitaminD) || 0,
        magnesium: formData.magnesium ? parseFloat(formData.magnesium) : null,
        vitaminA: formData.vitaminA ? parseFloat(formData.vitaminA) : null,
        vitaminC: formData.vitaminC ? parseFloat(formData.vitaminC) : null,
        vitaminB7: formData.vitaminB7 ? parseFloat(formData.vitaminB7) : null,
        vitaminE: formData.vitaminE ? parseFloat(formData.vitaminE) : null,
        vitaminK: formData.vitaminK ? parseFloat(formData.vitaminK) : null,
        dietTags: formData.dietTags ? formData.dietTags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        mealTags: formData.mealTags ? formData.mealTags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        cuisineTags: formData.cuisineTags ? formData.cuisineTags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };

      const res = await adminFetch("/admin/foods", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add food");
      }

      showSuccess(`Added "${payload.name}" successfully`);
      setShowAddForm(false);
      setFormData(EMPTY_FORM);
      await fetchFoods(search);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to add food");
    } finally {
      setSaving(false);
    }
  };

  const handleEditFood = async () => {
    if (!editingFood) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {};
      if (formData.name.trim()) payload.name = formData.name.trim();
      if (formData.servingSize.trim()) payload.servingSize = formData.servingSize.trim();
      if (formData.protein) payload.protein = parseFloat(formData.protein);
      if (formData.iron) payload.iron = parseFloat(formData.iron);
      if (formData.calcium) payload.calcium = parseFloat(formData.calcium);
      if (formData.vitaminD) payload.vitaminD = parseFloat(formData.vitaminD);
      if (formData.magnesium) payload.magnesium = parseFloat(formData.magnesium);
      if (formData.vitaminA) payload.vitaminA = parseFloat(formData.vitaminA);
      if (formData.vitaminC) payload.vitaminC = parseFloat(formData.vitaminC);
      if (formData.vitaminB7) payload.vitaminB7 = parseFloat(formData.vitaminB7);
      if (formData.vitaminE) payload.vitaminE = parseFloat(formData.vitaminE);
      if (formData.vitaminK) payload.vitaminK = parseFloat(formData.vitaminK);
      if (formData.dietTags) payload.dietTags = formData.dietTags.split(",").map((s) => s.trim()).filter(Boolean);
      if (formData.mealTags) payload.mealTags = formData.mealTags.split(",").map((s) => s.trim()).filter(Boolean);
      if (formData.cuisineTags) payload.cuisineTags = formData.cuisineTags.split(",").map((s) => s.trim()).filter(Boolean);

      const res = await adminFetch(`/admin/foods/${editingFood.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update food");
      }

      showSuccess(`Updated "${payload.name || editingFood.name}" successfully`);
      setEditingFood(null);
      setFormData(EMPTY_FORM);
      await fetchFoods(search);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update food");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFood = async () => {
    if (!deletingFood) return;
    setSaving(true);
    setError("");
    try {
      const res = await adminFetch(`/admin/foods/${deletingFood.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete food");
      }

      showSuccess(`Deleted "${deletingFood.name}" successfully`);
      setDeletingFood(null);
      await fetchFoods(search);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete food");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await adminFetch("/admin/dataset/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nrev-dataset-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess("Dataset exported successfully");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // Read file as base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || result);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const res = await adminFetch("/admin/dataset/upload", {
        method: "POST",
        body: JSON.stringify({ fileData: base64 }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      showSuccess(data.message || `Dataset replaced with ${data.count} foods`);
      await fetchFoods(search);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openEditForm = (food: Food) => {
    setEditingFood(food);
    setFormData({
      name: food.name,
      servingSize: food.servingSize,
      protein: String(food.protein),
      iron: String(food.iron),
      calcium: String(food.calcium),
      vitaminD: String(food.vitaminD),
      magnesium: food.magnesium != null ? String(food.magnesium) : "",
      vitaminA: food.vitaminA != null ? String(food.vitaminA) : "",
      vitaminC: food.vitaminC != null ? String(food.vitaminC) : "",
      vitaminB7: food.vitaminB7 != null ? String(food.vitaminB7) : "",
      vitaminE: food.vitaminE != null ? String(food.vitaminE) : "",
      vitaminK: food.vitaminK != null ? String(food.vitaminK) : "",
      dietTags: food.dietTags.join(", "),
      mealTags: food.mealTags.join(", "),
      cuisineTags: food.cuisineTags.join(", "),
    });
  };

  // Unauthenticated: Access code gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Panel</CardTitle>
            <CardDescription>
              Enter the admin access key to manage the nutrition dataset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Admin access key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                />
                <Button onClick={handleAuthenticate} disabled={!adminKey.trim() || loading}>
                  <Lock className="h-4 w-4 mr-2" />
                  {loading ? "Verifying..." : "Unlock"}
                </Button>
              </div>
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-primary">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage nutrition dataset & foods</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <Lock className="h-4 w-4 mr-2" />
              Lock
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Actions Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search foods by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchFoods(search)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => fetchFoods(search)} variant="secondary">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={() => { setShowAddForm(true); setFormData(EMPTY_FORM); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Food
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUploadFile}
                  className="hidden"
                  id="dataset-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Dataset"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Food Count */}
        <div className="text-sm text-muted-foreground">
          {foods.length} food{foods.length !== 1 ? "s" : ""} in dataset
          {search.trim() && <span> matching "{search.trim()}"</span>}
        </div>

        {/* Foods Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground min-w-[180px]">Name</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Protein (g)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Iron (mg)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Calcium (mg)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Vit D (IU)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Mg (mg)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Vit A (mcg)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Vit C (mg)</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {foods.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      {search.trim() ? "No foods match your search." : "No foods in the dataset. Add your first food or upload a dataset."}
                    </td>
                  </tr>
                ) : (
                  foods.map((food) => (
                    <tr key={food.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground">{food.id}</td>
                      <td className="p-3 font-medium">{food.name}</td>
                      <td className="p-3 text-right">{food.protein}</td>
                      <td className="p-3 text-right">{food.iron}</td>
                      <td className="p-3 text-right">{food.calcium}</td>
                      <td className="p-3 text-right">{food.vitaminD}</td>
                      <td className="p-3 text-right">{food.magnesium ?? "—"}</td>
                      <td className="p-3 text-right">{food.vitaminA ?? "—"}</td>
                      <td className="p-3 text-right">{food.vitaminC ?? "—"}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditForm(food)}
                            title="Edit food"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingFood(food)}
                            title="Delete food"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add Food Dialog */}
        <Dialog open={showAddForm} onOpenChange={(open) => { if (!open) { setShowAddForm(false); setFormData(EMPTY_FORM); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Food</DialogTitle>
              <DialogDescription>
                Enter the food's nutrient values. Fields marked * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              {NUTRIENT_FIELDS.map((field) => (
                <div key={field.key} className={field.key === "name" || field.key === "servingSize" ? "col-span-2" : "col-span-1"}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </label>
                  <Input
                    value={formData[field.key]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.label}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddForm(false); setFormData(EMPTY_FORM); }}>
                Cancel
              </Button>
              <Button onClick={handleAddFood} disabled={saving}>
                {saving ? "Saving..." : "Add Food"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Food Dialog */}
        <Dialog open={!!editingFood} onOpenChange={(open) => { if (!open) { setEditingFood(null); setFormData(EMPTY_FORM); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Food</DialogTitle>
              <DialogDescription>
                Update nutrient values for "{editingFood?.name}".
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              {NUTRIENT_FIELDS.map((field) => (
                <div key={field.key} className={field.key === "name" || field.key === "servingSize" ? "col-span-2" : "col-span-1"}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {field.label}
                  </label>
                  <Input
                    value={formData[field.key]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.label}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingFood(null); setFormData(EMPTY_FORM); }}>
                Cancel
              </Button>
              <Button onClick={handleEditFood} disabled={saving}>
                {saving ? "Saving..." : "Update Food"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingFood} onOpenChange={(open) => { if (!open) setDeletingFood(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Food</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingFood?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                This will remove the food from the dataset and may affect recovery plans and tracking.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingFood(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteFood} disabled={saving}>
                {saving ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

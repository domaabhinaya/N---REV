import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateLabComparison, useListLabComparisons, getListLabComparisonsQueryKey, useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { LabComparisonInputLabType, LabComparisonInput } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type LabKey =
  | "hemoglobin" | "ferritin" | "vitaminB12Level" | "vitaminDLevel" | "serumCalcium" | "totalProtein"
  | "rbcCount" | "wbcCount" | "plateletCount" | "hematocrit" | "mcv"
  | "serumIron" | "vitaminA" | "vitaminC" | "vitaminE"
  | "magnesium" | "phosphorus" | "sodium"
  | "fastingBloodSugar" | "hba1c"
  | "creatinine" | "bun"
  | "alt" | "ast"
  | "totalCholesterol" | "hdl" | "ldl" | "triglycerides"
  | "tsh";

interface LabDef {
  key: LabKey;
  label: string;
  unit: string;
  // Reference ranges below are the same ones displayed in the Assessment page and
  // are for display/context only — they are not used for deficiency calculation
  // (that logic lives in the backend recovery engine). Only labs that the
  // Assessment shows a reference range for carry a `bounds` value.
  bounds?: (gender?: string) => [number, number];
}

interface LabSection {
  title: string;
  labs: LabDef[];
}

// Mirrors the lab sections collected in the Assessment page.
const LAB_SECTIONS: LabSection[] = [
  {
    title: "Key Lab Values",
    labs: [
      { key: "hemoglobin", label: "Hemoglobin", unit: "g/dL", bounds: (g) => g?.toLowerCase().startsWith("f") ? [12.0, 15.5] : [13.5, 17.5] },
      { key: "ferritin", label: "Ferritin (Iron Stores)", unit: "ng/mL", bounds: (g) => g?.toLowerCase().startsWith("f") ? [15, 150] : [30, 400] },
      { key: "vitaminB12Level", label: "Vitamin B12", unit: "pg/mL", bounds: () => [200, 900] },
      { key: "vitaminDLevel", label: "Vitamin D", unit: "ng/mL", bounds: () => [20, 50] },
      { key: "serumCalcium", label: "Serum Calcium", unit: "mg/dL", bounds: () => [8.5, 10.5] },
      { key: "totalProtein", label: "Total Protein", unit: "g/dL", bounds: () => [6.0, 8.3] },
    ],
  },
  {
    title: "CBC (Complete Blood Count)",
    labs: [
      { key: "rbcCount", label: "RBC Count", unit: "million/µL" },
      { key: "wbcCount", label: "WBC Count", unit: "/µL" },
      { key: "plateletCount", label: "Platelet Count", unit: "/µL" },
      { key: "hematocrit", label: "Hematocrit", unit: "%" },
      { key: "mcv", label: "MCV", unit: "fL" },
    ],
  },
  {
    title: "Iron Profile",
    labs: [
      { key: "serumIron", label: "Serum Iron", unit: "µg/dL" },
    ],
  },
  {
    title: "Vitamin Profile",
    labs: [
      { key: "vitaminA", label: "Vitamin A", unit: "µg/dL" },
      { key: "vitaminC", label: "Vitamin C", unit: "mg/dL" },
      { key: "vitaminE", label: "Vitamin E", unit: "mg/L" },
    ],
  },
  {
    title: "Mineral Profile",
    labs: [
      { key: "magnesium", label: "Magnesium", unit: "mg/dL" },
      { key: "phosphorus", label: "Phosphorus", unit: "mg/dL" },
    ],
  },
  {
    title: "Electrolytes",
    labs: [
      { key: "sodium", label: "Sodium", unit: "mmol/L" },
    ],
  },
  {
    title: "Diabetes Profile",
    labs: [
      { key: "fastingBloodSugar", label: "Fasting Blood Sugar", unit: "mg/dL" },
      { key: "hba1c", label: "HbA1c", unit: "%" },
    ],
  },
  {
    title: "Kidney Function",
    labs: [
      { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
      { key: "bun", label: "BUN", unit: "mg/dL" },
    ],
  },
  {
    title: "Liver Function",
    labs: [
      { key: "alt", label: "ALT (SGPT)", unit: "U/L" },
      { key: "ast", label: "AST (SGOT)", unit: "U/L" },
    ],
  },
  {
    title: "Lipid Profile",
    labs: [
      { key: "totalCholesterol", label: "Total Cholesterol", unit: "mg/dL" },
      { key: "hdl", label: "HDL", unit: "mg/dL" },
      { key: "ldl", label: "LDL", unit: "mg/dL" },
      { key: "triglycerides", label: "Triglycerides", unit: "mg/dL" },
    ],
  },
  {
    title: "Thyroid Profile",
    labs: [
      { key: "tsh", label: "TSH", unit: "µIU/mL" },
    ],
  },
];

const ALL_LABS: LabDef[] = LAB_SECTIONS.flatMap((section) => section.labs);

const EMPTY_FORM: LabComparisonInput = {
  labType: "followup",
  recordedAt: "",
  hemoglobin: null,
  ferritin: null,
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
  alt: null,
  ast: null,
  totalCholesterol: null,
  hdl: null,
  ldl: null,
  triglycerides: null,
  tsh: null,
};

function formatRange([min, max]: [number, number]): string {
  return `${min}–${max}`;
}

function labStatus(value: number | null | undefined, [min, max]: [number, number]): "low" | "normal" | "high" {
  if (value == null) return "normal";
  if (value < min) return "low";
  if (value > max) return "high";
  return "normal";
}

export function Labs() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const profileIdStr = localStorage.getItem("nutrirecover_profile_id");
  const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

  const [formData, setFormData] = useState<LabComparisonInput>({
    ...EMPTY_FORM,
    recordedAt: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!profileId) {
      setLocation("/");
    }
  }, [profileId, setLocation]);

  const { data: labs, refetch } = useListLabComparisons(profileId as number, { query: { enabled: !!profileId, queryKey: getListLabComparisonsQueryKey(profileId as number) } });
  const createLab = useCreateLabComparison();

  // Profile row carries the lab values captured in the Assessment.
  const { data: profile } = useGetProfile(profileId as number, {
    query: { enabled: !!profileId, queryKey: getGetProfileQueryKey(profileId as number) },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    createLab.mutate(
      { profileId, data: formData },
      {
        onSuccess: () => {
          toast({ title: "Lab results saved successfully!" });
          setFormData({
            ...EMPTY_FORM,
            recordedAt: new Date().toISOString().split('T')[0],
          });
          refetch();
        },
        onError: () => {
          toast({ title: "Failed to save lab results", variant: "destructive" });
        }
      }
    );
  };

  if (!profileId) return null;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-primary mb-2">Lab Results Tracker</h1>
          <p className="text-muted-foreground">Monitor changes in your lab values alongside your dietary recovery target.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Lab Results</CardTitle>
            <CardDescription>
              Values you entered in the Assessment. These feed your recovery nutrition targets and AI assistant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!profile ? (
              <p className="text-sm text-muted-foreground">Loading lab results…</p>
            ) : (
              <div className="space-y-6">
                {LAB_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {section.title}
                    </h3>
                    <div>
                      {section.labs.map((lab) => {
                        const value = profile[lab.key];
                        const bounds = lab.bounds ? lab.bounds(profile.gender) : null;
                        const status = bounds ? labStatus(value, bounds) : null;
                        return (
                          <div key={lab.key} className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{lab.label}</div>
                              {bounds && (
                                <div className="text-xs text-muted-foreground">
                                  Reference range: {formatRange(bounds)} {lab.unit}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {value != null ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="font-mono font-medium tabular-nums">{value} {lab.unit}</span>
                                  {status && (
                                    <Badge variant={status === "low" ? "destructive" : status === "high" ? "outline" : "secondary"}>
                                      {status === "low" ? "Below" : status === "high" ? "Above" : "Normal"}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not provided</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Add Lab Results</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={formData.recordedAt} onChange={(e) => setFormData({...formData, recordedAt: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.labType} onValueChange={(v) => setFormData({...formData, labType: v as LabComparisonInputLabType})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baseline">Baseline</SelectItem>
                        <SelectItem value="followup">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {LAB_SECTIONS.map((section) => (
                  <div key={section.title} className="pt-3 border-t space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{section.title}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {section.labs.map((lab) => (
                        <div key={lab.key} className="space-y-2">
                          <Label>{lab.label} ({lab.unit})</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={(formData[lab.key] ?? "") as any}
                            onChange={(e) => setFormData({...formData, [lab.key]: e.target.value ? Number(e.target.value) : null})}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button type="submit" className="w-full" disabled={createLab.isPending}>
                  {createLab.isPending ? "Saving..." : "Save Lab Results"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <h2 className="text-xl font-medium">History & Insights</h2>
            {labs?.length === 0 && <p className="text-muted-foreground text-sm">No lab results recorded yet.</p>}
            
            <div className="space-y-4">
              {labs?.map(lab => (
                <Card key={lab.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg capitalize">{lab.labType} Lab</CardTitle>
                      <span className="text-sm text-muted-foreground">{new Date(lab.recordedAt).toLocaleDateString()}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm mb-4">
                      {ALL_LABS.map((labDef) => (
                        lab[labDef.key] != null ? (
                          <div key={labDef.key}><span className="text-muted-foreground">{labDef.label}:</span> {lab[labDef.key]} {labDef.unit}</div>
                        ) : null
                      ))}
                    </div>
                    
                    {lab.insights && lab.insights.length > 0 && (
                      <div className="bg-primary/5 p-3 rounded-md text-sm space-y-2">
                        <div className="font-medium">Insights:</div>
                        <ul className="list-disc pl-4 space-y-1">
                          {lab.insights.map((insight, i) => <li key={i}>{insight}</li>)}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

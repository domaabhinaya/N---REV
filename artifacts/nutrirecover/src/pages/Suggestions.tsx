import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetSuggestions, getGetSuggestionsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Suggestions() {
  const [location, setLocation] = useLocation();
  const profileIdStr = localStorage.getItem("nutrirecover_profile_id");
  const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!profileId) {
      setLocation("/");
    }
  }, [profileId, setLocation]);

  const { data: suggestions, isLoading } = useGetSuggestions(profileId as number, { date }, { query: { enabled: !!profileId && !!date, queryKey: getGetSuggestionsQueryKey(profileId as number, { date }) } });

  if (!profileId) return null;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-primary mb-2">Smart Suggestions</h1>
          <p className="text-muted-foreground">Review recommendations for tomorrow based on what you missed today.</p>
        </div>

        <div className="flex items-center gap-4 max-w-sm">
          <Label>Based on log from:</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions?.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground bg-card border rounded-lg">
                You hit all your targets for this date! Great job supporting your recovery.
              </div>
            )}
            
            {suggestions?.map((sugg, i) => (
              <Card key={i} className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="capitalize text-xl">{sugg.nutrient.replace("_", " ")} Focus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{sugg.reason}</p>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block mb-2">Suggested Additions:</span>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {sugg.additions.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="bg-primary/5 p-3 rounded-md text-sm font-medium text-primary">
                    {sugg.expectedImprovement}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

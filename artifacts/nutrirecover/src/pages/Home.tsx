import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";

export function Home() {
  const [, setLocation] = useLocation();
  const storedProfileId = localStorage.getItem("nutrirecover_profile_id");
  const [hasValidProfile, setHasValidProfile] = useState(false);

  // Check if profile actually exists in the backend
  const { data: profile, isError } = useGetProfile(
    storedProfileId ? parseInt(storedProfileId, 10) : 0,
    { query: { enabled: !!storedProfileId, queryKey: getGetProfileQueryKey(storedProfileId ? parseInt(storedProfileId, 10) : 0) } }
  );

  useEffect(() => {
    if (profile) {
      setHasValidProfile(true);
    } else if (isError) {
      // Profile doesn't exist in backend, clear localStorage
      localStorage.removeItem("nutrirecover_profile_id");
      setHasValidProfile(false);
    }
  }, [profile, isError]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-serif text-primary mb-6">
          N-REV
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-6">
          N-REV helps you understand how your routine and daily meals support recovery from nutrient gaps. Build your profile, review your usual food plate, and track what you actually ate on any date.
        </p>
        <p className="text-md text-muted-foreground max-w-2xl mb-12">
          Your saved profile and food diary stay available even after refresh, so you can continue from the main panel whenever you return.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          {hasValidProfile ? (
            <button 
              onClick={() => setLocation("/dashboard")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-medium transition-colors"
            >
              Continue to Dashboard
            </button>
          ) : (
            <button 
              onClick={() => setLocation("/assessment")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-medium transition-colors"
            >
              Start Your Assessment
            </button>
          )}
        </div>
      </main>

      <footer className="py-8 px-6 text-center text-sm text-muted-foreground border-t border-border/50">
        <p className="max-w-3xl mx-auto">
          N-REV is a food-based nutritional recovery support tool and does not replace professional medical advice, diagnosis, or treatment.
        </p>
      </footer>
    </div>
  );
}

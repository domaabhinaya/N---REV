import fs from "fs";
import path from "path";

const base = "http://127.0.0.1:8099/api";
const outDir = "C:/Users/Abhinaya Doma/OneDrive/Desktop/N-REV-main/_udata";

async function call(label, method, url, body) {
  const t0 = Date.now();
  let status = null, respText = null, errText = null;
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    respText = await res.text();
  } catch (e) {
    errText = String(e && e.message ? e.message : e);
  }
  const ms = Date.now() - t0;
  console.log(`[E2E] ${label} ${method} ${url} -> ${status} (${ms}ms)`);
  return { label, method, url, status, respText, errText, ms };
}

const report = {};
report.health = await call("health", "GET", base + "/healthz");

// Step: inspect the real foods dataset through the API
const foodsRes = await call("foods(limit=500)", "GET", base + "/foods?limit=500");
report.foods = { status: foodsRes.status };
if (foodsRes.status === 200) {
  const foods = JSON.parse(foodsRes.respText);
  report.foods.total = foods.total;
  report.foods.itemsLength = foods.items.length;
  report.foods.hasMore = foods.hasMore;
  report.foods.sampleNames = foods.items.slice(0, 15).map((f) => f.name);
  report.foods.tierCounts = foods.items.reduce((a, f) => ((a[f.tier] = (a[f.tier] || 0) + 1), a), {});
  fs.writeFileSync(path.join(outDir, "_e2e_foods.json"), foodsRes.respText);
}

// Assessment Submit payload (mirrors the UI field set)
const profileBody = {
  name: "Test User",
  age: 22,
  gender: "female",
  heightCm: 165,
  weightKg: 58,
  dietType: "vegetarian",
  symptoms: [],
  allergies: "",
  cuisinePreference: null,
  budget: "5000",
  hemoglobin: 12.5,
  ferritin: 60,
  vitaminB12Level: 450,
  vitaminDLevel: 35,
  serumCalcium: 9.5,
  totalProtein: 7.2,
  recoveryDuration: 30,
  foodHabits: null,
};

// Phase 3: Submit the assessment
const submit = await call("submit assessment (POST /profiles)", "POST", base + "/profiles", profileBody);
report.submit = { status: submit.status, respText: submit.respText };

let profileId = null;
if (submit.status === 201 || submit.status === 200) {
  try {
    const parsed = JSON.parse(submit.respText);
    profileId = parsed.id;
    report.submit.profileId = profileId;
    report.submit.prioritiesCount = parsed.priorities ? parsed.priorities.length : null;
    report.submit.priorities = parsed.priorities ? parsed.priorities.map((p) => ({ nutrient: p.nutrient, priority: p.priority, dailyTarget: p.dailyTarget, foodSourcesLen: p.foodSources?.length })) : null;
    fs.writeFileSync(path.join(outDir, "_e2e_submit.json"), submit.respText);
  } catch (e) {
    report.submit.parseError = String(e);
  }
}

// Phase 4: Generate Recovery Plan
if (profileId) {
  const rp = await call("generate recovery plan (GET /profiles/:id/recovery-plan)", "GET", `${base}/profiles/${profileId}/recovery-plan`);
  report.recoveryPlan = { status: rp.status };
  if (rp.status === 200) {
    let plan;
    try {
      plan = JSON.parse(rp.respText);
    } catch (e) {
      report.recoveryPlan.parseError = String(e);
    }
    if (plan) {
      report.recoveryPlan.durationDays = plan.durationDays;
      report.recoveryPlan.daysCount = plan.days ? plan.days.length : null;
      const day0 = plan.days && plan.days[0];
      report.recoveryPlan.day0 = day0
        ? {
            dayNumber: day0.dayNumber,
            breakfast: day0.breakfast,
            lunch: day0.lunch,
            dinner: day0.dinner,
            snacks: day0.snacks,
            totals: day0.totals,
            statusKeys: day0.status ? Object.keys(day0.status) : [],
          }
        : null;
      if (day0 && day0.status) {
        report.recoveryPlan.day0status = day0.status;
        // B-vitamin status present?
        report.recoveryPlan.hasBStatus = ["vitaminB1","vitaminB2","vitaminB3","vitaminB6","vitaminB12"].every((k) => k in day0.status);
      }
      fs.writeFileSync(path.join(outDir, "_e2e_plan.json"), rp.respText);
    }
  } else {
    report.recoveryPlan.respText = rp.respText;
  }

  const tgt = await call("targets (GET /profiles/:id/targets)", "GET", `${base}/profiles/${profileId}/targets`);
  report.targets = { status: tgt.status, respText: tgt.status === 200 ? tgt.respText : tgt.respText };
}

fs.writeFileSync(path.join(outDir, "_e2e_report.json"), JSON.stringify(report, null, 2));
console.log("\n[E2E] report written. profileId=", profileId);

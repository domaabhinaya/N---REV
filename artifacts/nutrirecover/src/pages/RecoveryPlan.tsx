
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useGetNutrientTargets, useGetRecoveryPlan, getGetNutrientTargetsQueryKey, getGetRecoveryPlanQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";

const ANTAGONISTIC: { id: string; combination: string; reason: string }[] = [
  // Iron antagonists
  { id: "tea-iron-meals", combination: "Tea + Iron-rich Meals", reason: "Tea contains tannins which significantly reduce non-heme iron absorption by up to 60-80%." },
  { id: "coffee-iron-meals", combination: "Coffee + Iron-rich Meals", reason: "Coffee polyphenols bind to iron and reduce its absorption by 30-50%." },
  { id: "tea-iron-supplements", combination: "Tea + Iron Supplements", reason: "Tannins in tea can decrease iron supplement effectiveness by up to 80%." },
  { id: "coffee-iron-supplements", combination: "Coffee + Iron Supplements", reason: "Coffee polyphenols reduce iron absorption; wait at least 1 hour." },
  { id: "calcium-iron-same-meal", combination: "Calcium + Iron (Same Meal)", reason: "Calcium competes with iron for absorption sites and can reduce iron uptake by 20-50%." },
  { id: "milk-iron-meals", combination: "Milk + Iron-rich Meals", reason: "Calcium in milk inhibits non-heme iron absorption." },
  { id: "dairy-iron-supplements", combination: "Dairy Products + Iron Supplements", reason: "High-calcium dairy reduces iron supplement absorption." },
  { id: "high-fiber-iron-supplements", combination: "High-Fiber Meals + Iron Supplements", reason: "Fiber binds to iron and reduces its bioavailability." },
  { id: "phytate-iron", combination: "Phytate-rich Foods + Iron Supplements", reason: "Phytates in whole grains and legumes inhibit iron absorption." },
  { id: "spinach-iron-supplements", combination: "Spinach + Iron Supplements", reason: "Oxalates in spinach bind iron and reduce absorption." },
  { id: "tea-coffee-iron", combination: "Tea/Coffee + Iron Supplements", reason: "Polyphenols chelate iron, preventing absorption." },
  { id: "red-wine-iron", combination: "Red Wine + Iron-rich Foods", reason: "Tannins in red wine reduce iron absorption." },
  { id: "chocolate-iron", combination: "Chocolate + Iron-rich Foods", reason: "Theobromine and tannins in chocolate inhibit iron absorption." },
  { id: "soy-iron", combination: "Soy Products + Iron Supplements", reason: "Soy protein and isoflavones reduce non-heme iron absorption." },
  { id: "eggs-iron", combination: "Eggs + Iron-rich Foods", reason: "Eggs contain phosvitin which inhibits iron absorption." },
  { id: "black-tea-iron", combination: "Black Tea + Iron-rich Foods", reason: "Strong black tea has higher tannin content than green tea." },
  { id: "green-tea-iron", combination: "Green Tea + Iron-rich Foods", reason: "Green tea catechins reduce iron absorption." },
  { id: "herbal-tea-iron", combination: "Herbal Teas + Iron Supplements", reason: "Many herbal teas contain tannins that inhibit iron absorption." },
  { id: "wine-iron", combination: "Wine + Iron-rich Meals", reason: "Tannins in wine reduce non-heme iron absorption." },
  { id: "calcium-iron-supplements", combination: "Calcium Supplements + Iron Supplements", reason: "Calcium and iron compete for the same transporters; separate by at least 2 hours." },

  // Calcium antagonists
  { id: "high-sodium-calcium", combination: "High Sodium + Calcium", reason: "Excess sodium increases urinary calcium excretion, depleting calcium stores." },
  { id: "phosphorus-calcium", combination: "High Phosphorus + Calcium", reason: "Excess phosphorus from sodas shifts calcium out of bones and into blood, disrupting balance." },
  { id: "caffeine-calcium", combination: "Caffeine + Calcium", reason: "Caffeine increases urinary calcium excretion." },
  { id: "alcohol-calcium", combination: "Alcohol + Calcium", reason: "Alcohol impairs calcium absorption and increases excretion." },
  { id: "high-salt-calcium", combination: "Excess Salt + Calcium", reason: "High sodium intake increases calcium loss through urine." },
  { id: "phosphoric-soda-calcium", combination: "Cola/Phosphoric Soda + Calcium", reason: "Phosphoric acid disrupts calcium-phosphorus balance and leaches calcium from bones." },
  { id: "spinach-oxalate-calcium", combination: "Spinach + Calcium Supplements", reason: "Oxalates in spinach bind calcium and prevent absorption." },
  { id: "soy-calcium", combination: "Soy Products + Calcium Supplements", reason: "Soy isoflavones may interfere with calcium absorption." },
  { id: "high-protein-calcium", combination: "Very High Protein + Calcium", reason: "Excessive protein without adequate calcium increases calcium excretion." },
  { id: "high-oxalate-calcium", combination: "High Oxalate Foods + Calcium", reason: "Oxalates bind calcium and prevent its absorption." },

  // Vitamin D antagonists
  { id: "high-sodium-vitamin-d", combination: "High Sodium + Vitamin D", reason: "Excess sodium can interfere with Vitamin D metabolism." },
  { id: "alcohol-vitamin-d", combination: "Alcohol + Vitamin D", reason: "Alcohol impairs Vitamin D activation in the liver." },
  { id: "high-omega-6-vitamin-d", combination: "Excess Omega-6 + Vitamin D", reason: "High omega-6 intake promotes inflammation that counteracts Vitamin D benefits." },
  { id: "high-sugar-vitamin-d", combination: "High Sugar + Vitamin D", reason: "Chronic high sugar intake impairs Vitamin D receptor function." },
  { id: "phosphorus-vitamin-d", combination: "Excess Phosphorus + Vitamin D", reason: "High phosphorus disrupts the calcium-phosphorus-Vitamin D axis." },
  { id: "high-fat-vitamin-d", combination: "Excess Saturated Fat + Vitamin D", reason: "High saturated fat impairs Vitamin D metabolism." },

  // Vitamin B12 antagonists
  { id: "alcohol-b12", combination: "Alcohol + Vitamin B12", reason: "Alcohol damages the stomach lining and reduces B12 absorption." },
  { id: "proton-pump-inhibitors-b12", combination: "PPIs + Vitamin B12", reason: "Reduced stomach acid from PPIs prevents B12 release from food." },
  { id: "metformin-b12", combination: "Metformin + Vitamin B12", reason: "Metformin reduces B12 absorption by up to 30-50%." },
  { id: "tea-b12", combination: "Tea + Vitamin B12", reason: "Tannins in tea can reduce B12 absorption." },
  { id: "coffee-b12", combination: "Coffee + Vitamin B12", reason: "Coffee may interfere with B12 uptake." },
  { id: "chlorinated-water-b12", combination: "Chlorinated Water + Vitamin B12", reason: "Chlorine can degrade B12 in stored water." },
  { id: "alcohol-b12-deficiency", combination: "Alcohol + Vitamin B12 Deficiency", reason: "Chronic alcohol use leads to B12 deficiency through malabsorption." },
  { id: "age-b12", combination: "Aging + Vitamin B12", reason: "Stomach acid production declines with age, reducing B12 absorption." },
  { id: "antacids-b12", combination: "Antacids + Vitamin B12", reason: "Antacids reduce stomach acid needed to release B12 from food." },
  { id: "tea-vitamin-b", combination: "Tea + Vitamin B Complex", reason: "Tannins in tea may reduce B vitamin absorption." },

  // Vitamin C antagonists
  { id: "smoking-vitamin-c", combination: "Smoking + Vitamin C", reason: "Smoking increases oxidative stress and depletes Vitamin C levels." },
  { id: "alcohol-vitamin-c", combination: "Alcohol + Vitamin C", reason: "Alcohol increases Vitamin C turnover and depletes antioxidant stores." },
  { id: "high-sugar-vitamin-c", combination: "High Sugar + Vitamin C", reason: "Glucose competes with Vitamin C for cellular uptake via the same transporters." },
  { id: "pollution-vitamin-c", combination: "Air Pollution + Vitamin C", reason: "Pollutants increase oxidative stress, depleting Vitamin C." },
  { id: "UV-exposure-vitamin-c", combination: "Excess UV Exposure + Vitamin C", reason: "UV radiation depletes skin Vitamin C and antioxidants." },
  { id: "stress-vitamin-c", combination: "Chronic Stress + Vitamin C", reason: "Stress increases cortisol which depletes Vitamin C." },
  { id: "aspirin-vitamin-c", combination: "High-dose Aspirin + Vitamin C", reason: "Aspirin increases oxidative stress and Vitamin C turnover." },
  { id: "coffee-vitamin-b", combination: "Coffee + Vitamin B Complex", reason: "Coffee may interfere with B vitamin uptake." },

  // Magnesium antagonists
  { id: "alcohol-magnesium", combination: "Alcohol + Magnesium", reason: "Alcohol increases urinary magnesium excretion and impairs absorption." },
  { id: "caffeine-magnesium", combination: "Caffeine + Magnesium", reason: "Caffeine increases urinary magnesium loss." },
  { id: "high-sodium-magnesium", combination: "High Sodium + Magnesium", reason: "Excess sodium increases magnesium excretion through urine." },
  { id: "phosphorus-magnesium", combination: "High Phosphorus + Magnesium", reason: "Excess phosphorus interferes with magnesium absorption." },
  { id: "diuretics-magnesium", combination: "Diuretics + Magnesium", reason: "Loop and thiazide diuretics increase magnesium loss." },
  { id: "acid-reflux-magnesium", combination: "Acid Suppressors + Magnesium", reason: "PPIs and H2 blockers reduce magnesium absorption over time." },
  { id: "high-calcium-magnesium", combination: "Excess Calcium + Magnesium", reason: "Too much calcium without adequate magnesium disrupts the calcium-magnesium ratio." },
  { id: "high-sugar-magnesium", combination: "High Sugar + Magnesium", reason: "Excess sugar increases urinary magnesium excretion." },
  { id: "high-alcohol-magnesium", combination: "Chronic Alcohol + Magnesium", reason: "Alcohol causes significant magnesium depletion through multiple mechanisms." },
  { id: "kidney-disease-magnesium", combination: "Kidney Disease + Magnesium", reason: "Impaired kidney function disrupts magnesium homeostasis." },

  // Vitamin A antagonists
  { id: "high-fat-vitamin-a", combination: "Excess Dietary Fat + Vitamin A", reason: "Too much fat can lead to Vitamin A storage issues and toxicity risk." },
  { id: "smoking-vitamin-a", combination: "Smoking + Vitamin A", reason: "Smoking increases oxidative stress, depleting Vitamin A." },
  { id: "high-sugar-vitamin-a", combination: "High Sugar + Vitamin A", reason: "Chronic sugar intake impairs Vitamin A metabolism." },
  { id: "high-vitamin-e-vitamin-a", combination: "High Vitamin E + Vitamin A", reason: "Very high Vitamin E can interfere with Vitamin A metabolism." },

  // Vitamin E antagonists
  { id: "high-iron-vitamin-e", combination: "High Iron + Vitamin E", reason: "Iron can oxidise Vitamin E, reducing its antioxidant effectiveness." },
  { id: "polyunsaturated-fats-vitamin-e", combination: "PUFAs + Without Adequate Vitamin E", reason: "PUFAs require Vitamin E for protection; deficiency leads to oxidation." },
  { id: "smoking-vitamin-e", combination: "Smoking + Vitamin E", reason: "Smoking depletes Vitamin E through increased oxidative stress." },
  { id: "high-vitamin-a-vitamin-e", combination: "High Vitamin A + Vitamin E", reason: "Excess Vitamin A can interfere with Vitamin E absorption." },
  { id: "high-vitamin-c-vitamin-e", combination: "High Vitamin C + Vitamin E", reason: "Very high Vitamin C doses can reduce Vitamin E levels." },

  // Protein antagonists
  { id: "high-protein-vitamin-c", combination: "Very High Protein + Vitamin C", reason: "Excess protein increases metabolic demand for Vitamin C." },
  { id: "high-protein-b12", combination: "Very High Protein + Vitamin B12", reason: "High protein intake increases B12 requirements." },
  { id: "high-protein-iron", combination: "Very High Protein + Iron", reason: "Excess protein without adequate iron can worsen deficiency." },
  { id: "high-protein-magnesium", combination: "Very High Protein + Magnesium", reason: "Excess protein increases magnesium needs." },
  { id: "high-protein-calcium", combination: "Very High Protein + Calcium", reason: "Without adequate calcium, high protein increases bone calcium loss." },

  // General food antagonists
  { id: "alcohol-nutrient-absorption", combination: "Alcohol + Nutrient Absorption", reason: "Alcohol damages the gut lining and impairs absorption of multiple nutrients." },
  { id: "high-sugar-iron", combination: "High Sugar + Iron Absorption", reason: "Sugar competes with iron for absorption pathways." },
  { id: "high-fiber-minerals", combination: "High Fiber + Mineral Supplements", reason: "Fiber binds to minerals and reduces their absorption." },
  { id: "soy-iron-calcium", combination: "Soy + Iron/Calcium Supplements", reason: "Soy isoflavones and protein inhibit mineral absorption." },
  { id: "spinach-iron-calcium", combination: "Spinach + Iron/Calcium Supplements", reason: "Oxalates bind both iron and calcium, preventing absorption." },
  { id: "high-salt-iron", combination: "High Salt + Iron", reason: "Excess sodium can interfere with iron metabolism." },
  { id: "high-salt-magnesium", combination: "High Salt + Magnesium", reason: "Excess sodium increases magnesium loss." },
  { id: "high-sugar-magnesium", combination: "High Sugar + Magnesium", reason: "Sugar increases urinary magnesium excretion." },
  { id: "high-sugar-copper", combination: "High Sugar + Copper", reason: "Sugar increases oxidative stress, depleting copper." },
  { id: "high-sugar-selenium", combination: "High Sugar + Selenium", reason: "Sugar increases selenium turnover." },
  { id: "high-sugar-manganese", combination: "High Sugar + Manganese", reason: "Sugar interferes with manganese metabolism." },
  { id: "high-sugar-chromium", combination: "High Sugar + Chromium", reason: "Sugar increases chromium requirements." },
  { id: "high-sugar-boron", combination: "High Sugar + Boron", reason: "Sugar may increase boron excretion." },
  { id: "high-sugar-iron", combination: "High Sugar + Iron", reason: "Sugar competes with iron for absorption." },
  { id: "high-sugar-calcium", combination: "High Sugar + Calcium", reason: "Sugar may increase calcium excretion." },
  { id: "high-sugar-phosphorus", combination: "High Sugar + Phosphorus", reason: "Sugar may interfere with phosphorus metabolism." },
  { id: "high-sugar-sodium", combination: "High Sugar + Sodium", reason: "Sugar may increase sodium retention." },
  { id: "high-sugar-uric-acid", combination: "High Sugar + Uric Acid", reason: "Sugar increases uric acid production." },
  { id: "high-sugar-insulin-resistance", combination: "High Sugar + Insulin Resistance", reason: "Chronic sugar intake causes insulin resistance." },
  { id: "high-sugar-obesity", combination: "High Sugar + Obesity", reason: "Sugar promotes fat storage and weight gain." },
  { id: "high-sugar-dental-caries", combination: "High Sugar + Dental Caries", reason: "Sugar feeds harmful oral bacteria." },
  { id: "high-sugar-candida", combination: "High Sugar + Candida Overgrowth", reason: "Sugar feeds fungal overgrowth." },
  { id: "high-sugar-gut-dysbiosis", combination: "High Sugar + Gut Dysbiosis", reason: "Sugar feeds harmful gut bacteria." },
  { id: "high-sugar-fatty-liver", combination: "High Sugar + Fatty Liver", reason: "Sugar promotes liver fat accumulation." },
  { id: "high-sugar-kidney-disease", combination: "High Sugar + Kidney Disease", reason: "Sugar accelerates kidney damage." },
  { id: "high-sugar-heart-disease", combination: "High Sugar + Heart Disease", reason: "Sugar increases cardiovascular risk." },
  { id: "high-sugar-diabetes-type-2", combination: "High Sugar + Type 2 Diabetes", reason: "Sugar is a primary driver of type 2 diabetes." },
  { id: "high-sugar-arthritis", combination: "High Sugar + Arthritis", reason: "Sugar promotes joint inflammation." },
  { id: "high-sugar-depression", combination: "High Sugar + Depression", reason: "Chronic sugar intake is linked to depression." },
  { id: "high-sugar-anxiety", combination: "High Sugar + Anxiety", reason: "Sugar causes anxiety spikes and crashes." },
  { id: "high-sugar-insomnia", combination: "High Sugar + Insomnia", reason: "Sugar may disrupt sleep." },
  { id: "high-sugar-fatigue", combination: "High Sugar + Fatigue", reason: "Sugar causes energy crashes." },
  { id: "high-sugar-migraine", combination: "High Sugar + Migraine", reason: "Sugar can trigger migraine attacks." },
  { id: "high-sugar-high-blood-pressure", combination: "High Sugar + High Blood Pressure", reason: "Sugar contributes to hypertension." },
  { id: "high-sugar-stroke", combination: "High Sugar + Stroke Risk", reason: "Sugar increases stroke risk." },
  { id: "high-sugar-alzheimers", combination: "High Sugar + Alzheimer's", reason: "Sugar may increase dementia risk." },
  { id: "high-sugar-parkinsons", combination: "High Sugar + Parkinson's", reason: "Sugar may worsen Parkinson's symptoms." },
  { id: "high-sugar-ms", combination: "High Sugar + Multiple Sclerosis", reason: "Sugar may worsen MS symptoms." },
  { id: "high-sugar-epilepsy", combination: "High Sugar + Epilepsy", reason: "Sugar may trigger seizures." },
  { id: "high-sugar-candida-albicans", combination: "High Sugar + Candida Albicans", reason: "Sugar feeds Candida overgrowth." },
  { id: "high-sugar-h-pylori", combination: "High Sugar + H. Pylori", reason: "Sugar may promote H. pylori growth." },
  { id: "high-sugar-small-intestine-bacterial-overgrowth", combination: "High Sugar + SIBO", reason: "Sugar may promote bacterial overgrowth." },
  { id: "high-sugar-intestinal-permeability", combination: "High Sugar + Leaky Gut", reason: "Sugar may increase intestinal permeability." },
  { id: "high-sugar-oxidative-stress", combination: "High Sugar + Oxidative Stress", reason: "Sugar increases reactive oxygen species production." },
  { id: "high-sugar-inflammation", combination: "High Sugar + Inflammation", reason: "Sugar promotes chronic inflammation." },
  { id: "high-sugar-endothelial-dysfunction", combination: "High Sugar + Endothelial Dysfunction", reason: "Sugar damages blood vessel function." },
  { id: "high-sugar-atherosclerosis", combination: "High Sugar + Atherosclerosis", reason: "Sugar promotes arterial plaque formation." },
  { id: "high-sugar-neuropathy", combination: "High Sugar + Neuropathy", reason: "Sugar damages nerve function." },
  { id: "high-sugar-nephropathy", combination: "High Sugar + Nephropathy", reason: "Sugar damages kidney function." },
  { id: "high-sugar-retinopathy", combination: "High Sugar + Retinopathy", reason: "Sugar damages retinal function." },
  { id: "high-sugar-gout", combination: "High Sugar + Gout", reason: "Sugar increases uric acid production." },
  { id: "high-sugar-pancreatic-stress", combination: "High Sugar + Pancreatic Stress", reason: "Sugar overworks insulin-producing cells." },
  { id: "high-sugar-metabolic-syndrome", combination: "High Sugar + Metabolic Syndrome", reason: "Sugar contributes to metabolic dysfunction." },
];

const SYNERGIES: { id: string; combination: string; reason: string }[] = [
  // Iron synergies
  { id: "iron-vitamin-c", combination: "Iron-rich Foods + Vitamin C", reason: "Vitamin C significantly improves non-heme iron absorption by converting iron into a more absorbable form." },
  { id: "iron-vitamin-a", combination: "Iron + Vitamin A", reason: "Vitamin A helps mobilise iron from storage sites and improves haemoglobin synthesis." },
  { id: "iron-copper", combination: "Iron + Copper", reason: "Copper is required for iron transport and incorporation into red blood cells." },
  { id: "iron-b6", combination: "Iron + Vitamin B6", reason: "Vitamin B6 is required for heme synthesis and iron absorption into haemoglobin." },
  { id: "iron-b12", combination: "Iron + Vitamin B12", reason: "B12 and iron work together in red blood cell formation and oxygen transport." },
  { id: "iron-meat-fish", combination: "Heme Iron (Meat/Fish) + Non-Heme Iron (Plants)", reason: "Heme iron enhances the absorption of non-heme iron from plant sources." },
  { id: "iron-betacarotene", combination: "Iron + Beta-Carotene Rich Foods", reason: "Beta-carotene improves iron absorption similar to Vitamin C." },
  { id: "iron-citrus", combination: "Iron-rich Greens + Lemon Juice", reason: "Acidic environment from citrus enhances iron solubility and absorption." },
  { id: "iron-onion-garlic", combination: "Iron-rich Foods + Onion/Garlic", reason: "Sulphur compounds in onion and garlic improve non-heme iron absorption." },
  { id: "iron-bell-pepper", combination: "Iron-rich Foods + Bell Peppers", reason: "Bell peppers are rich in Vitamin C which boosts iron absorption." },

  // Vitamin D synergies
  { id: "calcium-vitamin-d", combination: "Calcium + Vitamin D", reason: "Vitamin D improves calcium absorption in the intestines by up to 30-40%." },
  { id: "magnesium-vitamin-d", combination: "Magnesium + Vitamin D", reason: "Magnesium is required to activate Vitamin D in the liver and kidneys." },
  { id: "vitamin-d-k2", combination: "Vitamin D + Vitamin K2", reason: "Vitamin K2 directs calcium to bones instead of soft tissues, working with Vitamin D." },
  { id: "vitamin-d-boron", combination: "Vitamin D + Boron", reason: "Boron improves Vitamin D utilisation and extends its half-life in the body." },
  { id: "vitamin-d-healthy-fats", combination: "Vitamin D + Healthy Fats", reason: "Vitamin D is fat-soluble and requires dietary fat for optimal absorption." },
  { id: "vitamin-d-sunlight", combination: "Vitamin D + Morning Sunlight", reason: "Sunlight triggers natural Vitamin D synthesis; dietary sources complement it." },
  { id: "vitamin-d-calcium-magnesium", combination: "Vitamin D + Calcium + Magnesium", reason: "All three work together for bone mineralisation and muscle function." },

  // Vitamin B12 synergies
  { id: "b12-b6", combination: "Vitamin B12 + Vitamin B6", reason: "B12 and B6 work together in homocysteine metabolism and red blood cell formation." },
  { id: "b12-intrinsic-factor", combination: "Vitamin B12 + Intrinsic Factor Foods", reason: "Intrinsic factor from the stomach lining is essential for B12 absorption." },
  { id: "b12-calcium", combination: "Vitamin B12 + Calcium", reason: "Calcium aids in the absorption of Vitamin B12 in the ileum." },
  { id: "b12-iron", combination: "Vitamin B12 + Iron", reason: "Both are essential for red blood cell maturation and preventing anaemia." },
  { id: "b12-protein", combination: "Vitamin B12 + Protein", reason: "B12 is bound to protein in food; stomach acid releases it for absorption." },

  // Vitamin C synergies
  { id: "vitamin-c-iron", combination: "Vitamin C + Iron", reason: "Vitamin C enhances non-heme iron absorption by 2-6 times." },
  { id: "vitamin-c-collagen", combination: "Vitamin C + Collagen/Protein", reason: "Vitamin C is a required cofactor for collagen synthesis and tissue repair." },
  { id: "vitamin-c-vitamin-e", combination: "Vitamin C + Vitamin E", reason: "Vitamin C regenerates oxidised Vitamin E, extending its antioxidant activity." },
  { id: "vitamin-c-selenium", combination: "Vitamin C + Selenium", reason: "Both are antioxidants that protect cells from oxidative damage synergistically." },
  { id: "vitamin-c-selenium", combination: "Vitamin C + Selenium", reason: "Vitamin C regenerates oxidised selenium, extending its antioxidant protection." },
  { id: "vitamin-c-carotenoids", combination: "Vitamin C + Carotenoid-rich Foods", reason: "Vitamin C protects carotenoids from oxidation and improves their absorption." },
  { id: "vitamin-c-flavonoids", combination: "Vitamin C + Flavonoids", reason: "Flavonoids improve Vitamin C absorption and protect it from degradation." },

  // Calcium synergies
  { id: "calcium-magnesium", combination: "Calcium + Magnesium", reason: "Magnesium helps regulate calcium transport and prevents calcium overload in cells." },
  { id: "calcium-vitamin-k2", combination: "Calcium + Vitamin K2", reason: "Vitamin K2 activates proteins that bind calcium to bone matrix." },
  { id: "calcium-phosphorus", combination: "Calcium + Phosphorus", reason: "Calcium and phosphorus together form hydroxyapatite, the main bone mineral." },
  { id: "calcium-boron", combination: "Calcium + Boron", reason: "Boron reduces urinary calcium loss and improves calcium retention." },
  { id: "calcium-lactose", combination: "Calcium + Lactose", reason: "Lactose in dairy products enhances calcium absorption in the gut." },
  { id: "calcium-vitamin-d-k2-magnesium", combination: "Calcium + Vitamin D + K2 + Magnesium", reason: "These four nutrients form the complete bone health synergy." },

  // Magnesium synergies
  { id: "magnesium-b6", combination: "Magnesium + Vitamin B6", reason: "Vitamin B6 increases magnesium absorption into cells by 20-40%." },
  { id: "magnesium-boron", combination: "Magnesium + Boron", reason: "Boron improves magnesium absorption and utilisation for bone health." },
  { id: "magnesium-taurine", combination: "Magnesium + Taurine", reason: "Taurine and magnesium together support heart rhythm and muscle function." },
  { id: "magnesium-vitamin-k2", combination: "Magnesium + Vitamin K2", reason: "Magnesium activates Vitamin K2 for proper calcium metabolism and bone health." },
  { id: "magnesium-vitamin-d", combination: "Magnesium + Vitamin D", reason: "Magnesium activates Vitamin D; without magnesium, Vitamin D remains inactive." },

  // Protein synergies
  { id: "protein-b6", combination: "Protein + Vitamin B6", reason: "Vitamin B6 is essential for amino acid metabolism and protein synthesis." },
  { id: "protein-b5", combination: "Protein + Vitamin B5", reason: "Vitamin B5 (pantothenic acid) is essential for protein metabolism and energy production." },
  { id: "protein-iron", combination: "Protein + Iron", reason: "Iron is needed for oxygen delivery to muscles for protein metabolism." },
  { id: "protein-b12", combination: "Protein + Vitamin B12", reason: "B12 supports nerve function and energy metabolism needed for protein utilisation." },
  { id: "protein-complete", combination: "Rice + Dal (Grains + Legumes)", reason: "Grains and legumes complement each other's amino acid profile to form complete protein." },
  { id: "protein-whey-vitamin-d", combination: "Whey Protein + Vitamin D", reason: "Vitamin D enhances muscle protein synthesis when combined with whey protein." },
  { id: "protein-leucine", combination: "Protein + Leucine-rich Foods", reason: "Leucine triggers muscle protein synthesis and enhances recovery." },

  // Vitamin A synergies
  { id: "vitamin-a-fat", combination: "Vitamin A + Healthy Fats", reason: "Vitamin A is fat-soluble and requires dietary fat for absorption." },
  { id: "vitamin-a-iron", combination: "Vitamin A + Iron", reason: "Vitamin A improves iron mobilisation and haemoglobin synthesis." },
  { id: "beta-carotene-fat", combination: "Beta-Carotene + Healthy Fats", reason: "Dietary fat improves beta-carotene conversion to Vitamin A by up to 60%." },

  // Vitamin E synergies
  { id: "vitamin-e-selenium", combination: "Vitamin E + Selenium", reason: "Selenium and Vitamin E work together as antioxidants to protect cell membranes." },
  { id: "vitamin-e-vitamin-c", combination: "Vitamin E + Vitamin C", reason: "Vitamin C regenerates oxidised Vitamin E, restoring its antioxidant function." },
  { id: "vitamin-e-fat", combination: "Vitamin E + Healthy Fats", reason: "Vitamin E is fat-soluble and best absorbed with dietary fat." },
  { id: "vitamin-e-selenium", combination: "Vitamin E + Selenium", reason: "Selenium and Vitamin E work together as antioxidants to protect cell membranes from oxidative damage." },

  // General food synergies
  { id: "turmeric-black-pepper", combination: "Turmeric + Black Pepper", reason: "Piperine in black pepper improves curcumin absorption by up to 2000%." },
  { id: "tomatoes-olive-oil", combination: "Tomatoes + Olive Oil", reason: "Healthy fats in olive oil improve lycopene absorption from tomatoes by 4-5 times." },
  { id: "leafy-greens-citrus", combination: "Leafy Greens + Citrus Fruits", reason: "Vitamin C from citrus improves iron absorption from leafy greens." },
  { id: "eggs-leafy-greens", combination: "Eggs + Leafy Greens", reason: "Fat in eggs improves carotenoid absorption from leafy greens." },
  { id: "nuts-fruits", combination: "Nuts + Fruits", reason: "Healthy fats in nuts improve absorption of fat-soluble vitamins from fruits." },
  { id: "sweet-potato-olive-oil", combination: "Sweet Potato + Olive Oil", reason: "Olive oil improves beta-carotene absorption from sweet potatoes." },
  { id: "fish-leafy-greens", combination: "Fish + Leafy Greens", reason: "Fish provides Vitamin D and healthy fats that enhance mineral absorption from greens." },
  { id: "banana-peanut-butter", combination: "Banana + Peanut Butter", reason: "Balanced combination of carbohydrates, protein and healthy fats for sustained energy." },
  { id: "apple-nuts", combination: "Apple + Nuts", reason: "Fiber from apple and healthy fats from nuts improve satiety and blood sugar control." },
  { id: "oats-milk", combination: "Oats + Milk", reason: "Oats provide fiber while milk adds protein and calcium for a balanced meal." },
  { id: "yogurt-oats", combination: "Yogurt + Oats", reason: "Probiotics in yogurt and prebiotic fiber in oats support gut microbiome health." },
  { id: "beans-whole-grains", combination: "Beans + Whole Grains", reason: "Creates a complete protein profile with all essential amino acids." },
  { id: "green-tea-lemon", combination: "Green Tea + Lemon", reason: "Vitamin C in lemon stabilises catechins in green tea for better antioxidant absorption." },
  { id: "spinach-lemon", combination: "Spinach + Lemon Juice", reason: "Vitamin C from lemon enhances iron absorption from spinach significantly." },
  { id: "carrot-avocado", combination: "Carrots + Avocado", reason: "Healthy fats in avocado improve beta-carotene absorption from carrots." },
  { id: "kale-almonds", combination: "Kale + Almonds", reason: "Vitamin E in almonds and Vitamin K in kale work together for heart health." },
  { id: "broccoli-mustard", combination: "Broccoli + Mustard Seeds", reason: "Myrosinase in mustard activates sulforaphane in broccoli for cancer protection." },
  { id: "cinnamon-honey", combination: "Cinnamon + Honey", reason: "Cinnamon improves insulin sensitivity while honey provides natural antimicrobial benefits." },
  { id: "ginger-turmeric", combination: "Ginger + Turmeric", reason: "Ginger enhances the anti-inflammatory effects of curcumin in turmeric." },
  { id: "coconut-iron-greens", combination: "Coconut + Iron-rich Greens", reason: "Medium-chain triglycerides in coconut improve mineral absorption from greens." },
  { id: "amla-iron", combination: "Amla (Indian Gooseberry) + Iron-rich Foods", reason: "Amla is the richest natural source of Vitamin C, dramatically boosting iron absorption." },
  { id: "jaggery-sesame", combination: "Jaggery + Sesame Seeds (Til)", reason: "Jaggery provides iron while sesame seeds provide calcium for bone health synergy." },
  { id: "curd-banana", combination: "Curd + Banana", reason: "Probiotics in curd and prebiotics in banana support digestive health." },
  { id: "ghee-spinach", combination: "Ghee + Spinach", reason: "Fat in ghee improves absorption of Vitamin A and K from spinach." },
  { id: "mango-yogurt", combination: "Mango + Yogurt", reason: "Healthy fats in yogurt improve beta-carotene absorption from mango." },
  { id: "pomegranate-almonds", combination: "Pomegranate + Almonds", reason: "Vitamin E in almonds and antioxidants in pomegranate work synergistically." },
  { id: "dates-milk", combination: "Dates + Milk", reason: "Dates provide iron and natural sugars while milk provides calcium and protein." },
  { id: "ragi-curd", combination: "Ragi (Finger Millet) + Curd", reason: "Ragi is rich in calcium and iron; curd provides probiotics and enhances mineral absorption." },
  { id: "sprouts-lemon", combination: "Sprouts + Lemon Juice", reason: "Vitamin C from lemon enhances iron absorption from protein-rich sprouts." },
  { id: "besan-chilla-vegetables", combination: "Besan Chilla + Vegetables", reason: "Besan provides protein while vegetables add vitamins and minerals for a complete meal." },
  { id: "khichdi-ghee", combination: "Khichdi + Ghee", reason: "Ghee provides healthy fats that improve absorption of fat-soluble vitamins in khichdi." },
  { id: "sambar-coconut", combination: "Sambar + Coconut", reason: "Coconut provides healthy fats that improve absorption of carotenoids from vegetables." },
  { id: "paneer-broccoli", combination: "Paneer + Broccoli", reason: "Calcium from paneer and Vitamin C from broccoli support bone health and immunity." },
  { id: "fish-lemon", combination: "Fish + Lemon", reason: "Lemon juice reduces fishy odour and provides Vitamin C that aids iron absorption." },
  { id: "chicken-garlic", combination: "Chicken + Garlic", reason: "Garlic enhances iron and selenium absorption from chicken meat." },
  { id: "egg-tomato", combination: "Eggs + Tomatoes", reason: "Fat in eggs improves lycopene absorption from tomatoes." },
  { id: "mushroom-sunlight", combination: "Mushrooms + Sunlight Exposure", reason: "Sunlight-exposed mushrooms are the only plant source of natural Vitamin D." },
  { id: "soy-rice", combination: "Soy + Rice", reason: "Soy protein and rice protein complement each other to form a complete amino acid profile." },
  { id: "peanut-butter-banana", combination: "Peanut Butter + Banana", reason: "Provides protein, healthy fats, magnesium and carbohydrates for energy recovery." },
  { id: "chia-lemon-water", combination: "Chia Seeds + Lemon Water", reason: "Chia seeds provide omega-3 and fiber; lemon water aids hydration and Vitamin C intake." },
  { id: "flaxseed-yogurt", combination: "Flaxseeds + Yogurt", reason: "Grinding flaxseeds improves omega-3 absorption; yogurt provides probiotics." },
  { id: "walnut-honey", combination: "Walnuts + Honey", reason: "Walnuts provide omega-3 fatty acids while honey provides quick energy and antioxidants." },
  { id: "beetroot-carrot", combination: "Beetroot + Carrot", reason: "Beetroot provides iron and B vitamins; carrots provide Vitamin A for blood health synergy." },
  { id: "amla-honey", combination: "Amla + Honey", reason: "Amla provides the highest natural Vitamin C content; honey enhances absorption." },
  { id: "coconut-water-lime", combination: "Coconut Water + Lime", reason: "Coconut water provides electrolytes; lime adds Vitamin C for hydration and immunity." },
  { id: "sattu-lemon", combination: "Sattu (Roasted Gram Flour) + Lemon", reason: "Sattu provides plant protein and iron; lemon provides Vitamin C for enhanced absorption." },
  { id: "pumpkin-seeds-dates", combination: "Pumpkin Seeds + Dates", reason: "Pumpkin seeds are rich in magnesium and iron; dates provide natural energy and minerals." },
  { id: "curry-leaves-coconut", combination: "Curry Leaves + Coconut", reason: "Curry leaves are rich in iron and calcium; coconut fat improves absorption." },
  { id: "moringa-lemon", combination: "Moringa Powder + Lemon", reason: "Moringa is rich in iron, calcium and Vitamin A; lemon enhances iron absorption." },
  { id: "tamarind-iron", combination: "Tamarind + Iron-rich Foods", reason: "Tamarind provides Vitamin C and acidity that enhance non-heme iron absorption." },
  { id: "coriander-lemon", combination: "Coriander Leaves + Lemon", reason: "Coriander is rich in iron and Vitamin C; lemon further boosts iron absorption." },
  { id: "mint-lemon", combination: "Mint + Lemon", reason: "Mint aids digestion while lemon provides Vitamin C for immune support." },
  { id: "fenugreek-yogurt", combination: "Fenugreek Seeds + Yogurt", reason: "Fenugreek improves insulin sensitivity; yogurt provides probiotics and calcium." },
  { id: "cumin-iron", combination: "Cumin Seeds + Iron-rich Foods", reason: "Cumin seeds enhance iron absorption and add digestive benefits." },
  { id: "fennel-digestion", combination: "Fennel Seeds + Meals", reason: "Fennel aids digestion and helps reduce bloating after iron-rich meals." },
  { id: "asafoetida-digestion", combination: "Asafoetida (Hing) + Legumes", reason: "Asafoetida reduces gas and bloating from legumes, improving nutrient tolerance." },
  { id: "black-pepper-turmeric", combination: "Black Pepper + Turmeric", reason: "Piperine in black pepper increases curcumin absorption by 2000%." },
  { id: "cinnamon-blood-sugar", combination: "Cinnamon + Carbohydrate-rich Meals", reason: "Cinnamon improves insulin sensitivity and reduces blood sugar spikes after meals." },
  { id: "ginger-digestion", combination: "Ginger + Heavy Meals", reason: "Ginger stimulates digestion and reduces nausea, improving nutrient absorption." },
  { id: "garlic-iron", combination: "Garlic + Iron-rich Foods", reason: "Sulphur compounds in garlic enhance non-heme iron absorption." },
  { id: "onion-iron", combination: "Onion + Iron-rich Foods", reason: "Onion contains quercetin and sulphur compounds that improve iron absorption." },
  { id: "tomato-iron", combination: "Tomatoes + Iron-rich Foods", reason: "Tomatoes provide Vitamin C and acidity that enhance iron absorption." },
  { id: "bell-pepper-iron", combination: "Bell Peppers + Iron-rich Foods", reason: "Red bell peppers are exceptionally high in Vitamin C, boosting iron absorption." },
  { id: "broccoli-iron", combination: "Broccoli + Iron-rich Foods", reason: "Broccoli provides both iron and Vitamin C for enhanced absorption." },
  { id: "kale-citrus", combination: "Kale + Citrus Fruits", reason: "Vitamin C from citrus enhances iron and calcium absorption from kale." },
  { id: "sweet-potato-coconut", combination: "Sweet Potato + Coconut Milk", reason: "Healthy fats in coconut milk improve beta-carotene absorption from sweet potato." },
  { id: "pumpkin-coconut", combination: "Pumpkin + Coconut", reason: "Coconut fat improves absorption of Vitamin A and carotenoids from pumpkin." },
  { id: "avocado-spinach", combination: "Avocado + Spinach", reason: "Healthy fats in avocado improve absorption of Vitamin K and carotenoids from spinach." },
  { id: "olive-oil-tomato", combination: "Olive Oil + Tomatoes", reason: "Olive oil increases lycopene absorption from tomatoes by 4-5 times." },
  { id: "lemon-greens", combination: "Lemon Juice + Green Vegetables", reason: "Acidity from lemon enhances mineral solubility and absorption from greens." },
  { id: "vinegar-greens", combination: "Apple Cider Vinegar + Leafy Greens", reason: "Acidity from vinegar improves iron and calcium absorption from greens." },
  { id: "yogurt-turmeric", combination: "Yogurt + Turmeric", reason: "Healthy fats in yogurt improve curcumin absorption; probiotics aid digestion." },
  { id: "ghee-turmeric", combination: "Ghee + Turmeric", reason: "Fat in ghee significantly improves curcumin absorption and bioavailability." },
  { id: "coconut-turmeric", combination: "Coconut Milk + Turmeric", reason: "Medium-chain fats in coconut improve curcumin absorption." },
  { id: "sesame-jaggery", combination: "Sesame Seeds (Til) + Jaggery", reason: "Sesame provides calcium and iron; jaggery provides iron and enhances mineral absorption." },
  { id: "peanuts-jaggery", combination: "Peanuts + Jaggery", reason: "Peanuts provide protein and healthy fats; jaggery provides iron and energy." },
  { id: "coconut-dates", combination: "Coconut + Dates", reason: "Coconut provides healthy fats; dates provide iron, fiber and natural sweetness." },
  { id: "almonds-dates", combination: "Almonds + Dates", reason: "Almonds provide Vitamin E and magnesium; dates provide iron and energy." },
  { id: "walnuts-dates", combination: "Walnuts + Dates", reason: "Walnuts provide omega-3 fatty acids; dates provide quick energy and minerals." },
  { id: "cashews-spinach", combination: "Cashews + Spinach", reason: "Cashews provide magnesium and healthy fats that improve mineral absorption from spinach." },
  { id: "raisins-almonds", combination: "Raisins + Almonds", reason: "Raisins provide iron and copper; almonds provide Vitamin E and magnesium." },
  { id: "figs-almonds", combination: "Figs + Almonds", reason: "Figs are rich in calcium and iron; almonds provide Vitamin E and healthy fats." },
  { id: "apricots-almonds", combination: "Dried Apricots + Almonds", reason: "Apricots provide iron and Vitamin A; almonds provide Vitamin E and healthy fats." },
  { id: "prunes-almonds", combination: "Prunes + Almonds", reason: "Prunes provide iron and fiber; almonds provide calcium and Vitamin E." },
  { id: "watermelon-seeds", combination: "Watermelon + Pumpkin Seeds", reason: "Watermelon provides hydration and lycopene; seeds provide iron and magnesium." },
  { id: "pomegranate-seeds", combination: "Pomegranate + Pumpkin Seeds", reason: "Pomegranate provides antioxidants and Vitamin C; seeds provide iron and protein." },
  { id: "guava-lemon", combination: "Guava + Lemon", reason: "Guava is already rich in Vitamin C; lemon adds extra Vitamin C for immune boost." },
  { id: "papaya-lemon", combination: "Papaya + Lemon", reason: "Papaya provides Vitamin A and digestive enzymes; lemon adds Vitamin C." },
  { id: "orange-pomegranate", combination: "Orange + Pomegranate", reason: "Both are rich in Vitamin C and antioxidants for immune support synergy." },
  { id: "berries-yogurt", combination: "Berries + Yogurt", reason: "Berries provide antioxidants; yogurt provides probiotics and calcium for gut health." },
  { id: "apple-cinnamon", combination: "Apple + Cinnamon", reason: "Cinnamon improves insulin response to apple's natural sugars." },
  { id: "oatmeal-berries", combination: "Oatmeal + Berries", reason: "Oats provide fiber; berries provide antioxidants for heart health synergy." },
  { id: "quinoa-vegetables", combination: "Quinoa + Vegetables", reason: "Quinoa provides complete protein; vegetables provide vitamins and minerals." },
  { id: "brown-rice-beans", combination: "Brown Rice + Beans", reason: "Creates a complete protein profile with all essential amino acids." },
  { id: "whole-wheat-dal", combination: "Whole Wheat Roti + Dal", reason: "Traditional Indian combination that provides complete protein and balanced nutrition." },
  { id: "millet-vegetables", combination: "Millet + Vegetables", reason: "Millets are rich in iron and magnesium; vegetables add vitamins and fiber." },
  { id: "bajra-onion", combination: "Bajra (Pearl Millet) + Onion", reason: "Bajra is rich in iron; onion enhances iron absorption with sulphur compounds." },
  { id: "jowar-tamarind", combination: "Jowar (Sorghum) + Tamarind", reason: "Jowar provides iron and fiber; tamarind provides Vitamin C for iron absorption." },
  { id: "ragi-sesame", combination: "Ragi (Finger Millet) + Sesame Seeds", reason: "Both are exceptionally rich in calcium, creating a powerful bone health combination." },
  { id: "amaranth-lemon", combination: "Amaranth + Lemon", reason: "Amaranth is rich in iron and calcium; lemon enhances mineral absorption." },
  { id: "buckwheat-citrus", combination: "Buckwheat + Citrus Fruits", reason: "Buckwheat provides iron and magnesium; citrus provides Vitamin C for absorption." },
  { id: "fox-millet-vegetables", combination: "Fox Millet + Vegetables", reason: "Fox millet is rich in iron and fiber; vegetables add complementary nutrients." },
  { id: "kodo-millet-dal", combination: "Kodo Millet + Dal", reason: "Millet and dal together form a complete protein with complementary amino acids." },
  { id: "barnyard-millet-ghee", combination: "Barnyard Millet + Ghee", reason: "Ghee provides healthy fats that improve absorption of millet's fat-soluble nutrients." },
  { id: "little-millet-vegetables", combination: "Little Millet + Vegetables", reason: "Little millet is rich in B vitamins; vegetables add minerals and antioxidants." },
  { id: "pearl-millet-curd", combination: "Pearl Millet (Bajra) + Curd", reason: "Curd provides probiotics that improve mineral absorption from millet." },
  { id: "finger-millet-milk", combination: "Finger Millet (Ragi) + Milk", reason: "Ragi and milk together provide an exceptional calcium boost for bone health." },
  { id: "sorghum-lime", combination: "Sorghum (Jowar) + Lime", reason: "Lime provides Vitamin C that enhances iron absorption from sorghum." },
  { id: "proso-millet-dal", combination: "Proso Millet + Dal", reason: "Creates a complete amino acid profile for vegetarian protein needs." },
  { id: "foxtail-millet-lemon", combination: "Foxtail Millet + Lemon", reason: "Lemon enhances iron absorption from foxtail millet." },
];

const TIMING: { id: string; combination: string; reason: string }[] = [
  { id: "tea-timing", combination: "Tea", reason: "Wait at least 1 hour after iron-rich meals." },
  { id: "coffee-timing", combination: "Coffee", reason: "Wait at least 1 hour after iron-rich meals." },
  { id: "iron-vitamin-c-timing", combination: "Iron Supplements", reason: "Take together with Vitamin C-rich foods." },
  { id: "calcium-iron-timing", combination: "Calcium Supplements", reason: "Separate from Iron supplements by at least 2 hours." },
  { id: "iron-milk-timing", combination: "Iron Supplements", reason: "Avoid taking with milk." },
  { id: "levothyrodine-timing", combination: "Levothyrodine", reason: "Take on an empty stomach. Separate Calcium and Iron supplements by 4 hours." },
  { id: "antibiotics-timing", combination: "Antibiotics", reason: "Avoid dairy products within 2 hours if medically advised." },
  { id: "water-fiber-timing", combination: "Water", reason: "Drink sufficient water while taking fiber supplements." },
];

const LIFESTYLE_TIPS: { id: string; icon: string; title: string; description: string }[] = [
  { id: "hydration", icon: "💧", title: "Stay hydrated", description: "Drink adequate water throughout the day." },
  { id: "sleep", icon: "😴", title: "Sleep", description: "Maintain 7–9 hours of quality sleep." },
  { id: "exercise", icon: "🏃", title: "Exercise", description: "Perform regular moderate physical activity." },
  { id: "balanced-diet", icon: "🥗", title: "Balanced Diet", description: "Consume a variety of whole foods." },
  { id: "fruits-vegetables", icon: "🍎", title: "Fruits & Vegetables", description: "Include colorful fruits and vegetables daily." },
  { id: "reduce-processed", icon: "🧂", title: "Reduce Processed Foods", description: "Limit foods high in sodium and trans fats." },
  { id: "avoid-smoking", icon: "🚭", title: "Avoid Smoking", description: "Smoking increases oxidative stress." },
  { id: "limit-alcohol", icon: "🍺", title: "Limit Alcohol", description: "Alcohol interferes with nutrient metabolism." },
  { id: "manage-stress", icon: "😊", title: "Manage Stress", description: "Stress affects digestion and nutrient absorption." },
  { id: "stay-consistent", icon: "📅", title: "Stay Consistent", description: "Recovery requires consistency over time." },
];

type Recommendation = { id: string; type: "synergy" | "interaction"; combination: string; reason: string; icon: React.ReactElement };

export function RecoveryPlanPage() {
  const [location, setLocation] = useLocation();
  const [showFullGuide, setShowFullGuide] = useState(false);
  const profileIdStr = localStorage.getItem("nutrirecover_profile_id");
  const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

  useEffect(() => {
    if (!profileId) {
      setLocation("/");
    }
  }, [profileId, setLocation]);

    const queryClient = useQueryClient();
  const { data: targets, isLoading: targetsLoading, isError: targetsError } = useGetNutrientTargets(profileId as number, { query: { enabled: !!profileId, queryKey: getGetNutrientTargetsQueryKey(profileId as number) } });
  const { data: plan, isLoading: planLoading, isError: planError } = useGetRecoveryPlan(profileId as number, { query: { enabled: !!profileId, queryKey: getGetRecoveryPlanQueryKey(profileId as number) } });

  const personalizedRecommendations = useMemo(() => {
    const recs: Recommendation[] = [];
    const targetMap = new Map((targets || []).map((t) => [t.nutrient, t]));

    if (targetMap.has("iron")) {
      const synergy = SYNERGIES.find((s) => s.id === "iron-vitamin-c");
      if (synergy) recs.push({ id: "rec-" + synergy.id, type: "synergy", combination: synergy.combination, reason: synergy.reason, icon: <CheckCircle2 className="w-5 h-5 text-green-600" /> });
      const interaction = ANTAGONISTIC.find((i) => i.id === "tea-iron-meals");
      if (interaction) recs.push({ id: "rec-" + interaction.id, type: "interaction", combination: interaction.combination, reason: interaction.reason, icon: <AlertTriangle className="w-5 h-5 text-destructive" /> });
    }

    if (targetMap.has("calcium")) {
      const synergy = SYNERGIES.find((s) => s.id === "calcium-vitamin-d");
      if (synergy) recs.push({ id: "rec-" + synergy.id, type: "synergy", combination: synergy.combination, reason: synergy.reason, icon: <CheckCircle2 className="w-5 h-5 text-green-600" /> });
}

    if (targetMap.has("vitamin_d")) {
      const synergy = SYNERGIES.find((s) => s.id === "vitamin-d-healthy-fats");
      if (synergy) recs.push({ id: "rec-" + synergy.id, type: "synergy", combination: synergy.combination, reason: synergy.reason, icon: <CheckCircle2 className="w-5 h-5 text-green-600" /> });
    }

    if (targetMap.has("protein")) {
      const synergy = SYNERGIES.find((s) => s.id === "beans-whole-grains");
      if (synergy) recs.push({ id: "rec-" + synergy.id, type: "synergy", combination: synergy.combination, reason: synergy.reason, icon: <CheckCircle2 className="w-5 h-5 text-green-600" /> });
    }

    const interaction = ANTAGONISTIC.find((i) => i.id === "high-fat-vitamin-d");
    if (interaction && (targetMap.has("protein") || targetMap.has("iron"))) {
      recs.push({ id: "rec-" + interaction.id, type: "interaction", combination: interaction.combination, reason: interaction.reason, icon: <AlertTriangle className="w-5 h-5 text-destructive" /> });
    }

    const sugaryInteraction = ANTAGONISTIC.find((i) => i.id === "high-sugar-diabetes-type-2");
    if (sugaryInteraction && targetMap.has("iron")) {
      recs.push({ id: "rec-" + sugaryInteraction.id, type: "interaction", combination: sugaryInteraction.combination, reason: sugaryInteraction.reason, icon: <AlertTriangle className="w-5 h-5 text-destructive" /> });
    }

    const sodiumInteraction = ANTAGONISTIC.find((i) => i.id === "high-sodium-calcium");
    if (sodiumInteraction && targetMap.has("calcium")) {
      recs.push({ id: "rec-" + sodiumInteraction.id, type: "interaction", combination: sodiumInteraction.combination, reason: sodiumInteraction.reason, icon: <AlertTriangle className="w-5 h-5 text-destructive" /> });
    }

    return recs;
  }, [targets]);

  if (!profileId) return null;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-primary mb-2">Your Recovery Plan</h1>
          <p className="text-muted-foreground">
            Based on your assessment, here are your personalized dietary recovery targets and day-by-day food suggestions.
          </p>
        </div>

                {targetsError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load nutrient priorities</AlertTitle>
            <AlertDescription>
              <p className="mb-2 text-sm">Nutrient targets could not be loaded (often a transient startup delay on the first request after a cold start).</p>
              <Button size="sm" variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: getGetNutrientTargetsQueryKey(profileId as number) })}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : targetsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium">Nutrient Priorities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {targets?.map((target) => (
                <Card key={target.nutrient}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="capitalize">
                        {target.nutrient === "vitamin_d" ? "Vitamin D" :
                         target.nutrient === "vitamin_a" ? "Vitamin A" :
                         target.nutrient === "vitamin_c" ? "Vitamin C" :
                         target.nutrient === "vitamin_b7" ? "Vitamin B7" :
                         target.nutrient === "vitamin_e" ? "Vitamin E" :
                         target.nutrient === "vitamin_k" ? "Vitamin K" :
                         target.nutrient === "magnesium" ? "Magnesium" :
                         target.nutrient.replace("_", " ")}
                      </CardTitle>
                      <Badge variant={target.priority === "high" ? "destructive" : target.priority === "medium" ? "default" : "secondary"}>
                        {target.priority} Priority
                      </Badge>
                    </div>
                    <CardDescription>Target: {target.dailyTarget} {target.unit}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div>
                        <span className="font-medium">Why it matters:</span>
                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                          {target.reasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Food Sources:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {target.foodSources.map((food, i) => (
                            <Badge key={i} variant="outline">{food}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

                {planError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load recovery plan</AlertTitle>
            <AlertDescription>
              <p className="mb-2 text-sm">The recovery plan could not be generated (often a transient startup delay or temporary backend error).</p>
              <Button size="sm" variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: getGetRecoveryPlanQueryKey(profileId as number) })}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : planLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium">Daily Meal Plan</h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {plan?.days.map((day) => (
                <AccordionItem value={`day-${day.dayNumber}`} key={day.dayNumber} className="border bg-card rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline flex-col items-start gap-2">
                    <div className="flex items-center gap-4 w-full">
                      <span className="font-medium">Day {day.dayNumber}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1.5 w-full">
                      {Object.entries(day.status || {}).map(([nut, status]) => (
                         <Badge key={nut} variant="secondary" className="text-xs justify-center text-center whitespace-nowrap">
                           {nut === "vitaminD" ? "Vitamin D" : nut === "vitaminA" ? "Vitamin A" : nut === "vitaminC" ? "Vitamin C" : nut === "vitaminB7" ? "Vitamin B7" : nut === "vitaminE" ? "Vitamin E" : nut === "vitaminK" ? "Vitamin K" : nut === "magnesium" ? "Magnesium" : nut.replace("_", " ")}: {status?.replace("_", " ")}
                         </Badge>
                      ))}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-primary mb-2">Breakfast</h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground">
                            {day.breakfast.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-primary mb-2">Lunch</h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground">
                            {day.lunch.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-primary mb-2">Dinner</h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground">
                            {day.dinner.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-primary mb-2">Snacks</h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground">
                            {day.snacks.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {plan?.planExplanation && plan.planExplanation.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Why This Plan?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.planExplanation.map((explanation, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-primary font-bold">•</span>
                    <span>{explanation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {personalizedRecommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Personalized Recommendations
              </CardTitle>
              <CardDescription>
                Based on your detected nutrient deficiencies and health profile, these interactions are most relevant to your recovery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {personalizedRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={
                      "flex items-start gap-3 p-3 rounded-lg border " +
                      (rec.type === "synergy"
                        ? "border-green-200 bg-green-50/50"
                        : "border-destructive/20 bg-destructive/5")
                    }
                  >
                    {rec.icon}
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{rec.combination}</p>
                      <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFullGuide(!showFullGuide)}
                  className="gap-2"
                >
                  {showFullGuide ? "Hide" : "View Complete Interaction Guide"}
                  <span aria-hidden>{showFullGuide ? "▲" : "▼"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(showFullGuide || personalizedRecommendations.length === 0) && (
          <>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Foods & Nutrient Interactions to Avoid
                </CardTitle>
                <CardDescription>
                  The following combinations may reduce nutrient absorption, interfere with recovery, or negatively affect certain health conditions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {ANTAGONISTIC.map((interaction) => (
                    <AccordionItem
                      key={interaction.id}
                      value={interaction.id}
                      className="border border-destructive/20 bg-card/50 rounded-lg px-4 hover:bg-card/80 transition-colors"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left w-full">
                          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                          <span className="font-semibold text-left">{interaction.combination}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <Alert variant="default" className="border-destructive/30 bg-destructive/5">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <AlertTitle className="text-destructive font-medium">Scientific Explanation</AlertTitle>
                          <AlertDescription className="text-sm text-muted-foreground mt-1">
                            {interaction.reason}
                          </AlertDescription>
                        </Alert>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

                <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Foods That Work Better Together
                </CardTitle>
                <CardDescription>
                  The following combinations improve nutrient absorption and support faster nutritional recovery.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {SYNERGIES.map((synergy) => (
                    <AccordionItem
                      key={synergy.id}
                      value={synergy.id}
                      className="border border-green-200 bg-card/50 rounded-lg px-4 hover:bg-card/80 transition-colors"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left w-full">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="font-semibold text-left">{synergy.combination}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <Alert variant="default" className="border-green-300 bg-green-50">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-700 font-medium">Scientific Explanation</AlertTitle>
                          <AlertDescription className="text-sm text-muted-foreground mt-1">
                            {synergy.reason}
                          </AlertDescription>
                        </Alert>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Timing Recommendations
                </CardTitle>
                <CardDescription>
                  Proper timing of foods and supplements improves nutrient absorption.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {TIMING.map((timing) => (
                    <AccordionItem
                      key={timing.id}
                      value={timing.id}
                      className="border border-blue-200 bg-card/50 rounded-lg px-4 hover:bg-card/80 transition-colors"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left w-full">
                          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="font-semibold text-left">{timing.combination}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <Alert variant="default" className="border-blue-300 bg-blue-50">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-700 font-medium">Timing Recommendation</AlertTitle>
                          <AlertDescription className="text-sm text-muted-foreground mt-1">
                            {timing.reason}
                          </AlertDescription>
                        </Alert>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span aria-hidden>🌿</span>
              Lifestyle Recovery Tips
            </CardTitle>
            <CardDescription>
              Healthy lifestyle habits significantly improve nutritional recovery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LIFESTYLE_TIPS.map((tip) => (
                <Card
                  key={tip.id}
                  className="border border-border/60 bg-card/50 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden>
                        {tip.icon}
                      </span>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm">{tip.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-muted-foreground" />
                Medical Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="default" className="border-border/30 bg-muted/30">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertTitle className="font-medium">Medical Disclaimer</AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  This recovery plan is generated using your assessment, symptoms, dietary habits, lifestyle information and laboratory values (if available).<br /><br />
                  The recommendations are intended for nutritional guidance only.<br /><br />
                  They do not replace professional medical diagnosis or treatment.<br /><br />
                  Individuals taking prescription medications, undergoing medical treatment, pregnant women, elderly individuals, or people with chronic diseases should always consult a qualified physician or registered dietitian before making dietary changes.<br /><br />
                  Food interactions presented in this application are based on evidence-supported nutritional principles and should not be interpreted as universal restrictions.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border/30">
                <span aria-hidden>📘</span>
                <span className="font-medium">Educational Purpose Only</span>
              </div>
              <p className="text-sm text-muted-foreground">
                This application is intended to improve nutritional awareness and recovery planning.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Recovery Plan Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="default" className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm text-muted-foreground leading-relaxed">
                  This recovery plan is intended as nutritional guidance only.<br /><br />
                  Users may consume foods according to their preferences.<br /><br />
                  However, avoid clinically significant antagonistic food combinations whenever possible.<br /><br />
                  Always consult a healthcare professional before making major dietary changes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

      </div>
    </Layout>
  );
}

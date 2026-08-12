export interface SeedFood {
  name: string;
  servingSize: string;
  protein: number;
  iron: number;
  calcium: number;
  vitaminD: number;
  magnesium?: number | null;
  vitaminA?: number | null;
  vitaminC?: number | null;
  vitaminB7?: number | null;
  vitaminE?: number | null;
  vitaminK?: number | null;
  vitaminB12?: number | null;
  vitaminB1?: number | null;
  vitaminB2?: number | null;
  vitaminB3?: number | null;
  vitaminB6?: number | null;
  dietTags: string[];
  mealTags: string[];
  cuisineTags: string[];
}

const VEG = ["vegetarian", "eggetarian", "non_vegetarian"];
const VEGAN_OK = ["vegan", ...VEG];
const EGG_UP = ["eggetarian", "non_vegetarian"];
const NONVEG = ["non_vegetarian"];

export const SEED_FOODS: SeedFood[] = [
  { name: "Moong dal (cooked)", servingSize: "1 cup (200g)", protein: 14, iron: 3.2, calcium: 55, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["north_indian", "general"] },
  { name: "Toor dal (cooked)", servingSize: "1 cup (200g)", protein: 13, iron: 2.5, calcium: 40, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["south_indian", "general"] },
  { name: "Chana dal (cooked)", servingSize: "1 cup (200g)", protein: 15, iron: 4.6, calcium: 56, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["north_indian"] },
  { name: "Rajma (kidney beans, cooked)", servingSize: "1 cup (180g)", protein: 15, iron: 5.2, calcium: 62, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["north_indian"] },
  { name: "Chole (chickpea curry)", servingSize: "1 cup (180g)", protein: 12, iron: 4.7, calcium: 80, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["north_indian"] },
  { name: "Sprouted moong salad", servingSize: "1 cup (100g)", protein: 9, iron: 1.7, calcium: 27, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack", "breakfast"], cuisineTags: ["general"] },
  { name: "Soya chunks (cooked)", servingSize: "1 cup (100g)", protein: 26, iron: 4.5, calcium: 100, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Tofu (pan-fried)", servingSize: "100g", protein: 12, iron: 2.2, calcium: 200, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner", "snack"], cuisineTags: ["general"] },
  { name: "Paneer (cooked)", servingSize: "100g", protein: 18, iron: 0.5, calcium: 480, vitaminD: 8, dietTags: VEG, mealTags: ["lunch", "dinner"], cuisineTags: ["north_indian"] },
  { name: "Curd/Dahi (plain)", servingSize: "1 cup (200g)", protein: 8, iron: 0.1, calcium: 300, vitaminD: 4, dietTags: VEG, mealTags: ["breakfast", "lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Buttermilk (chaas)", servingSize: "1 glass (250ml)", protein: 3, iron: 0.1, calcium: 150, vitaminD: 2, dietTags: VEG, mealTags: ["breakfast", "snack"], cuisineTags: ["general"] },
  { name: "Milk (fortified toned)", servingSize: "1 glass (250ml)", protein: 8, iron: 0.1, calcium: 300, vitaminD: 100, dietTags: VEG, mealTags: ["breakfast", "snack"], cuisineTags: ["general"] },
  { name: "Cheese slice", servingSize: "1 slice (20g)", protein: 5, iron: 0.1, calcium: 150, vitaminD: 6, dietTags: VEG, mealTags: ["breakfast", "snack"], cuisineTags: ["general"] },
  { name: "Egg (boiled, whole)", servingSize: "1 large egg", protein: 6, iron: 0.9, calcium: 28, vitaminD: 44, dietTags: EGG_UP, mealTags: ["breakfast", "snack"], cuisineTags: ["general"] },
  { name: "Egg bhurji (2 eggs)", servingSize: "2 eggs", protein: 13, iron: 1.8, calcium: 56, vitaminD: 88, dietTags: EGG_UP, mealTags: ["breakfast", "dinner"], cuisineTags: ["general"] },
  { name: "Chicken curry", servingSize: "100g cooked", protein: 27, iron: 1.3, calcium: 15, vitaminD: 5, dietTags: NONVEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Grilled chicken breast", servingSize: "100g cooked", protein: 31, iron: 1.0, calcium: 12, vitaminD: 4, dietTags: NONVEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Mutton curry", servingSize: "100g cooked", protein: 25, iron: 3.0, calcium: 14, vitaminD: 3, dietTags: NONVEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Fish curry (rohu)", servingSize: "100g cooked", protein: 22, iron: 1.0, calcium: 40, vitaminD: 220, dietTags: NONVEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Sardines (grilled)", servingSize: "100g", protein: 25, iron: 2.9, calcium: 380, vitaminD: 272, dietTags: NONVEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Mackerel curry (bangda)", servingSize: "100g cooked", protein: 19, iron: 1.6, calcium: 66, vitaminD: 360, dietTags: NONVEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Prawns (cooked)", servingSize: "100g", protein: 24, iron: 0.5, calcium: 70, vitaminD: 152, dietTags: NONVEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Chicken liver (cooked)", servingSize: "100g", protein: 24, iron: 9.0, calcium: 10, vitaminD: 40, dietTags: NONVEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Palak (spinach) sabzi", servingSize: "1 cup (150g)", protein: 5, iron: 4.0, calcium: 180, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["north_indian"] },
  { name: "Methi (fenugreek leaves) sabzi", servingSize: "1 cup (150g)", protein: 4, iron: 3.5, calcium: 160, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["north_indian"] },
  { name: "Ragi roti", servingSize: "1 roti (60g)", protein: 3, iron: 2.5, calcium: 190, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast", "lunch", "dinner"], cuisineTags: ["south_indian"] },
  { name: "Bajra roti", servingSize: "1 roti (60g)", protein: 3.5, iron: 2.8, calcium: 30, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["north_indian"] },
  { name: "Whole wheat roti", servingSize: "1 roti (40g)", protein: 3, iron: 1.2, calcium: 15, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Brown rice (cooked)", servingSize: "1 cup (195g)", protein: 5, iron: 1.0, calcium: 20, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Idli (2 pcs)", servingSize: "2 idlis", protein: 4, iron: 0.9, calcium: 20, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast"], cuisineTags: ["south_indian"] },
  { name: "Dosa (plain)", servingSize: "1 dosa", protein: 4, iron: 1.0, calcium: 15, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast", "dinner"], cuisineTags: ["south_indian"] },
  { name: "Vegetable poha", servingSize: "1 plate (150g)", protein: 5, iron: 2.0, calcium: 25, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast"], cuisineTags: ["general"] },
  { name: "Vegetable upma", servingSize: "1 plate (150g)", protein: 5, iron: 1.5, calcium: 20, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast"], cuisineTags: ["south_indian"] },
  { name: "Besan chilla (2 pcs)", servingSize: "2 chillas", protein: 10, iron: 2.6, calcium: 40, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast", "dinner"], cuisineTags: ["general"] },
  { name: "Peanut chikki (jaggery-peanut)", servingSize: "30g", protein: 4, iron: 0.9, calcium: 25, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Til (sesame seed) laddu", servingSize: "1 laddu (25g)", protein: 3, iron: 2.0, calcium: 220, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Almonds (soaked)", servingSize: "10 almonds", protein: 4, iron: 0.9, calcium: 50, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Mixed nuts & seeds trail mix", servingSize: "30g", protein: 6, iron: 1.5, calcium: 60, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Dates (khajur, 4 pcs)", servingSize: "4 dates", protein: 1, iron: 0.9, calcium: 30, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Jaggery (gur) small piece", servingSize: "20g", protein: 0, iron: 2.1, calcium: 16, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Pomegranate (1 bowl)", servingSize: "1 bowl (150g)", protein: 2, iron: 0.5, calcium: 15, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Beetroot-carrot salad", servingSize: "1 bowl (120g)", protein: 2, iron: 1.2, calcium: 25, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner", "snack"], cuisineTags: ["general"] },
  { name: "Amla (Indian gooseberry, raw)", servingSize: "2 pcs", protein: 0, iron: 0.3, calcium: 25, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Orange (1 medium)", servingSize: "1 medium", protein: 1, iron: 0.1, calcium: 40, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Guava (1 medium)", servingSize: "1 medium", protein: 1.5, iron: 0.3, calcium: 18,vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["general"] },
  { name: "Banana (1 medium)", servingSize: "1 medium", protein: 1, iron: 0.3, calcium: 6, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast", "snack"], cuisineTags: ["general"] },
  { name: "Mushroom sabzi (sun-exposed)", servingSize: "1 cup (100g)", protein: 3, iron: 0.5, calcium: 3, vitaminD: 380, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Fortified breakfast cereal", servingSize: "1 bowl (40g) with milk", protein: 6, iron: 4.5, calcium: 120, vitaminD: 120, dietTags: VEG, mealTags: ["breakfast"], cuisineTags: ["general"] },
  { name: "Peanut butter toast", servingSize: "2 slices + 2 tbsp", protein: 10, iron: 1.4, calcium: 40, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast", "snack"], cuisineTags: ["general"] },
  { name: "Sattu drink", servingSize: "1 glass (200ml)", protein: 9, iron: 2.5, calcium: 35, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast", "snack"], cuisineTags: ["north_indian"] },
  { name: "Vegetable pulao", servingSize: "1 plate (200g)", protein: 5, iron: 1.5, calcium: 30, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Paneer bhurji", servingSize: "100g", protein: 16, iron: 0.6, calcium: 420, vitaminD: 6, dietTags: VEG, mealTags: ["breakfast", "dinner"], cuisineTags: ["north_indian"] },
  { name: "Curd rice", servingSize: "1 bowl (200g)", protein: 6, iron: 0.5, calcium: 220, vitaminD: 3, dietTags: VEG, mealTags: ["lunch", "dinner"], cuisineTags: ["south_indian"] },
  { name: "Sambar", servingSize: "1 cup (200g)", protein: 7, iron: 2.2, calcium: 45, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["south_indian"] },
  { name: "Rasam", servingSize: "1 cup (200ml)", protein: 3, iron: 1.2, calcium: 20, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["south_indian"] },
  { name: "Green leafy vegetable smoothie", servingSize: "1 glass (250ml)", protein: 3, iron: 2.5, calcium: 90, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["breakfast", "snack"], cuisineTags: ["general"] },
  { name: "Boiled chana chaat", servingSize: "1 bowl (150g)", protein: 10, iron: 3.5, calcium: 60, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["snack"], cuisineTags: ["north_indian"] },
  { name: "Multigrain khichdi", servingSize: "1 bowl (200g)", protein: 8, iron: 2.4, calcium: 40, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Ghee (1 tsp) on food", servingSize: "1 tsp (5g)", protein: 0, iron: 0, calcium: 0, vitaminD: 2, dietTags: VEG, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Fortified salt/atta based roti", servingSize: "1 roti (40g)", protein: 3, iron: 2.0, calcium: 15, vitaminD: 0, dietTags: VEGAN_OK, mealTags: ["lunch", "dinner"], cuisineTags: ["general"] },
  { name: "Soy milk (fortified)", servingSize: "1 glass (250ml)", protein: 7, iron: 1.0, calcium: 300, vitaminD: 100, dietTags: VEGAN_OK, mealTags: ["breakfast", "snack"], cuisineTags: ["general"] },
];


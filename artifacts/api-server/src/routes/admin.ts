import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, foodsTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const router: IRouter = Router();

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || "nrev-admin-2024";

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-admin-key"] as string;
  if (!key || key !== ADMIN_KEY) {
    res.status(403).json({ error: "Unauthorized admin access. Provide valid x-admin-key header." });
    return;
  }
  next();
}

// Apply admin middleware to all routes
router.use(requireAdmin);

// GET /admin/foods?search= — Search foods by name
router.get("/admin/foods", async (req, res): Promise<void> => {
  const search = (req.query.search as string) || "";
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;

  try {
    let rows;
    let total;
    if (search.trim()) {
      const pattern = `%${search.trim()}%`;
      rows = await db
        .select()
        .from(foodsTable)
        .where(like(foodsTable.name, pattern))
        .limit(limit)
        .offset(offset);
      total = rows.length;
      // Get total count for pagination
      const all = await db
        .select({ id: foodsTable.id })
        .from(foodsTable)
        .where(like(foodsTable.name, pattern));
      total = all.length;
    } else {
      rows = await db.select().from(foodsTable).limit(limit).offset(offset);
      const all = await db.select({ id: foodsTable.id }).from(foodsTable);
      total = all.length;
    }

    res.json({
      foods: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch foods" });
  }
});

// POST /admin/foods — Add a new food
router.post("/admin/foods", async (req, res): Promise<void> => {
  const body = req.body;
  const requiredFields = ["name", "protein", "iron", "calcium", "vitaminD"];
  const missing = requiredFields.filter((f) => body[f] == null);
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    return;
  }

  try {
    const [inserted] = await db
      .insert(foodsTable)
      .values({
        name: String(body.name),
        servingSize: String(body.servingSize || "1 serving"),
        protein: Number(body.protein) || 0,
        iron: Number(body.iron) || 0,
        calcium: Number(body.calcium) || 0,
        vitaminD: Number(body.vitaminD) || 0,
        magnesium: body.magnesium != null ? Number(body.magnesium) : null,
        vitaminA: body.vitaminA != null ? Number(body.vitaminA) : null,
        vitaminC: body.vitaminC != null ? Number(body.vitaminC) : null,
        vitaminB7: body.vitaminB7 != null ? Number(body.vitaminB7) : null,
        vitaminE: body.vitaminE != null ? Number(body.vitaminE) : null,
        vitaminK: body.vitaminK != null ? Number(body.vitaminK) : null,
        dietTags: Array.isArray(body.dietTags) ? body.dietTags : [],
        mealTags: Array.isArray(body.mealTags) ? body.mealTags : [],
        cuisineTags: Array.isArray(body.cuisineTags) ? body.cuisineTags : [],
      })
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Failed to create food" });
  }
});

// PUT /admin/foods/:id — Update a food's nutrient values
router.put("/admin/foods/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid food ID" });
    return;
  }

  const body = req.body;
  const updateData: Record<string, unknown> = {};

  // Only update provided fields
  const numericFields = ["protein", "iron", "calcium", "vitaminD", "magnesium", "vitaminA", "vitaminC", "vitaminB7", "vitaminE", "vitaminK"];
  for (const field of numericFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field] !== null ? Number(body[field]) : null;
    }
  }
  if (body.name !== undefined) updateData.name = String(body.name);
  if (body.servingSize !== undefined) updateData.servingSize = String(body.servingSize);
  if (body.dietTags !== undefined) updateData.dietTags = Array.isArray(body.dietTags) ? body.dietTags : [];
  if (body.mealTags !== undefined) updateData.mealTags = Array.isArray(body.mealTags) ? body.mealTags : [];
  if (body.cuisineTags !== undefined) updateData.cuisineTags = Array.isArray(body.cuisineTags) ? body.cuisineTags : [];

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  try {
    const [updated] = await db
      .update(foodsTable)
      .set(updateData)
      .where(eq(foodsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Food not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update food" });
  }
});

// DELETE /admin/foods/:id — Delete a food
router.delete("/admin/foods/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid food ID" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(foodsTable)
      .where(eq(foodsTable.id, id))
      .returning({ id: foodsTable.id, name: foodsTable.name });

    if (!deleted) {
      res.status(404).json({ error: "Food not found" });
      return;
    }

    res.json({ message: `Deleted "${deleted.name}"`, id: deleted.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete food" });
  }
});

// POST /admin/dataset/upload — Upload Excel file to replace dataset
router.post("/admin/dataset/upload", async (req, res): Promise<void> => {
  try {
    // Dynamically import xlsx to parse uploaded file
    const XLSX = await import("xlsx");
    const fileData = req.body?.fileData; // base64-encoded xlsx
    if (!fileData) {
      res.status(400).json({ error: "No file data provided. Send base64-encoded Excel data in 'fileData' field." });
      return;
    }

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (data.length === 0) {
      res.status(400).json({ error: "Excel file contains no data" });
      return;
    }

    // Map Excel rows to food records
    const foods = data.map((row) => ({
      name: String(row["food_name"] || row["Food Name"] || row["name"] || row["Food"] || ""),
      servingSize: String(row["serving_size"] || row["Serving Size"] || "1 serving"),
      protein: Number(row["protein_g"] || row["Protein_g"] || row["protein"] || 0),
      iron: Number(row["iron_mg"] || row["Iron_mg"] || row["iron"] || 0),
      calcium: Number(row["calcium_mg"] || row["Calcium_mg"] || row["calcium"] || 0),
      vitaminD: Number(row["vitamin_d_ug"] || row["VitaminD_IU"] || row["vitamin_d"] || 0),
      magnesium: row["magnesium_mg"] != null ? Number(row["magnesium_mg"]) : row["magnesium"] != null ? Number(row["magnesium"]) : null,
      vitaminA: row["vitamin_a_ug"] != null ? Number(row["vitamin_a_ug"]) : row["vitaminA"] != null ? Number(row["vitaminA"]) : null,
      vitaminC: row["vitamin_c_mg"] != null ? Number(row["vitamin_c_mg"]) : row["vitaminC"] != null ? Number(row["vitaminC"]) : null,
      vitaminB7: row["vitamin_b7_ug"] != null ? Number(row["vitamin_b7_ug"]) : row["vitaminB7"] != null ? Number(row["vitaminB7"]) : null,
      vitaminE: row["vitamin_e_mg"] != null ? Number(row["vitamin_e_mg"]) : row["vitaminE"] != null ? Number(row["vitaminE"]) : null,
      vitaminK: row["vitamin_k_ug"] != null ? Number(row["vitamin_k_ug"]) : row["vitaminK"] != null ? Number(row["vitaminK"]) : null,
      dietTags: [],
      mealTags: [],
      cuisineTags: [],
      tier: "primary" as const,
      source: (row["source"] as string | undefined) ?? null,
    })).filter((f) => f.name && f.servingSize);

    if (foods.length === 0) {
      res.status(400).json({ error: "No valid food records found in the uploaded file" });
      return;
    }

    // Delete all existing foods and insert new ones in batches
    await db.transaction(async (tx) => {
      await tx.delete(foodsTable);
      const BATCH = 1000;
      for (let i = 0; i < foods.length; i += BATCH) {
        await tx.insert(foodsTable).values(foods.slice(i, i + BATCH));
      }
    });

    res.json({
      message: `Dataset replaced successfully with ${foods.length} foods`,
      count: foods.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload dataset: " + (err instanceof Error ? err.message : String(err)) });
  }
});

// GET /admin/dataset/export — Export current dataset as JSON
router.get("/admin/dataset/export", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(foodsTable);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="nrev-dataset-export.json"`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to export dataset" });
  }
});

export default router;

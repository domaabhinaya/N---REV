import { Router, type IRouter } from "express";
import { db, foodsTable } from "@workspace/db";
import { ListFoodsQueryParams } from "@workspace/api-zod";
import { eq, and, or, ilike, desc, asc, sql } from "drizzle-orm";

const router: IRouter = Router();

function parsePagination(
  query: Record<string, unknown>,
): { limit: number; offset: number; search: string | null } {
  const rawLimit = Number(query.limit);
  const rawOffset = Number(query.offset);
  const search = typeof query.search === "string" ? query.search.trim() : null;

  return {
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 50,
    offset:
      Number.isFinite(rawOffset) && rawOffset >= 0
        ? Math.floor(rawOffset)
        : 0,
    search: search && search.length > 0 ? search : null,
  };
}

router.get("/foods", async (req, res): Promise<void> => {
  const query = ListFoodsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { limit, offset, search } = parsePagination(req.query as Record<string, unknown>);

  const conditions: (ReturnType<typeof eq> | ReturnType<typeof ilike>)[] = [];

  if (query.data.tier) {
    conditions.push(eq(foodsTable.tier, query.data.tier));
  }

  if (search) {
    conditions.push(ilike(foodsTable.name, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total matching rows
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(foodsTable)
    .where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);

  // Primary-before-Extended ordering: tier ASC NULLS LAST, then name ASC
  const rows = await db
    .select()
    .from(foodsTable)
    .where(whereClause)
    .orderBy(asc(foodsTable.tier), asc(foodsTable.name))
    .limit(limit)
    .offset(offset);

  const filtered = query.data.dietType
    ? rows.filter((f) => f.dietTags.length === 0 || f.dietTags.includes(query.data.dietType as string))
    : rows;

  res.json({
    items: filtered,
    total,
    limit,
    offset,
    hasMore: offset + filtered.length < total,
  });
});

export default router;

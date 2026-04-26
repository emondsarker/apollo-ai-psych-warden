import { NextRequest } from "next/server";
import { z } from "zod";
import { loadAllCases } from "@/lib/content";
import { buildCorpus, toJsonl } from "@/lib/corpus-export";

const RequestSchema = z.object({
  format: z.enum(["dpo", "hh-rlhf", "conversational"]),
  filters: z
    .object({
      minSeverity: z.number().int().min(0).max(4).optional(),
      maxSeverity: z.number().int().min(0).max(4).optional(),
      categories: z.array(z.string()).optional(),
      personaIds: z.array(z.string()).optional(),
      targetIds: z.array(z.string()).optional(),
      criticApprovedOnly: z.boolean().default(true),
    })
    .default({ criticApprovedOnly: true }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { format, filters } = RequestSchema.parse(body);

    const cases = await loadAllCases();
    const built = buildCorpus(cases);

    const rows = (
      format === "dpo"
        ? built.dpo
        : format === "hh-rlhf"
          ? built.hh
          : built.conv
    ).filter((row) => {
      const m = row.metadata;
      if (
        filters.minSeverity !== undefined &&
        m.severity < filters.minSeverity
      )
        return false;
      if (
        filters.maxSeverity !== undefined &&
        m.severity > filters.maxSeverity
      )
        return false;
      if (
        filters.categories?.length &&
        !m.failureCategories.some((c) => filters.categories!.includes(c))
      )
        return false;
      if (
        filters.personaIds?.length &&
        !filters.personaIds.includes(m.personaId)
      )
        return false;
      if (
        filters.targetIds?.length &&
        !filters.targetIds.includes(m.targetId)
      )
        return false;
      return true;
    });

    const jsonl = toJsonl(rows);
    const filename = `primum-${format}-${Date.now()}.jsonl`;

    return new Response(jsonl, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Row-Count": String(rows.length),
      },
    });
  } catch (err) {
    console.error("[/api/export]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

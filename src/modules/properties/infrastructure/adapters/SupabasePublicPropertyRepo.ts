import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Result } from "../../application/_shared/result";
import type {
  PublicPropertyListFiltersDTO,
  PublicPropertyPage,
  PublicPropertySummaryDTO,
} from "../../application/dto/PublicPropertyDTO";
import type { PublicPropertyRepo } from "../../application/ports/PublicPropertyRepo";
import { CURRENCY_VALUES, type Currency } from "../../domain/enums";

type PublicPropertyErrorCode = "UNKNOWN";

export type PublicPropertyInfraError = {
  scope: "properties_public";
  code: PublicPropertyErrorCode;
  message: string;
  cause?: unknown;
};

type PublicPropertyRow = {
  id: string;
  title: string | null;
  description: string | null;
  price: string | number | null;
  currency: string | null;
  city: string | null;
  state: string | null;
  published_at: string | null;
};

const PUBLIC_COLUMNS = [
  "id",
  "title",
  "description",
  "price",
  "currency",
  "city",
  "state",
  "published_at",
].join(",");

function publicError(code: PublicPropertyErrorCode, message: string, cause?: unknown): PublicPropertyInfraError {
  return { scope: "properties_public", code, message, cause };
}

function mapPostgrestError(error: PostgrestError): PublicPropertyInfraError {
  return publicError("UNKNOWN", error.message, error);
}

function escapeIlike(term: string): string {
  return term.replace(/[%_]/g, char => `\\${char}`).replace(/,/g, "\\,");
}

function parsePrice(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrency(value: string | null | undefined): Currency {
  if (!value) return "MXN";
  const upper = value.toUpperCase();
  return (CURRENCY_VALUES as string[]).includes(upper) ? (upper as Currency) : "MXN";
}

function mapRowToSummary(row: PublicPropertyRow): PublicPropertySummaryDTO {
  return {
    id: row.id,
    title: row.title ?? "Propiedad sin título",
    description: row.description ?? null,
    price: {
      amount: parsePrice(row.price),
      currency: normalizeCurrency(row.currency),
    },
    city: row.city ?? null,
    state: row.state ?? null,
    publishedAt: row.published_at ?? null,
    coverImageUrl: null,
  };
}

export class SupabasePublicPropertyRepo implements PublicPropertyRepo {
  private readonly client: SupabaseClient;

  constructor(deps: { client: SupabaseClient }) {
    this.client = deps.client;
  }

  async listPublished(filters: PublicPropertyListFiltersDTO): Promise<Result<PublicPropertyPage>> {
    const { page, pageSize, sortBy = "recent", city, state, q } = filters;
    const offset = (page - 1) * pageSize;
    const limit = offset + pageSize - 1;

    let query = this.client
      .from("properties")
      .select(PUBLIC_COLUMNS, { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null);

    if (city) {
      query = query.ilike("city", `%${escapeIlike(city)}%`);
    }

    if (state) {
      query = query.ilike("state", `%${escapeIlike(state)}%`);
    }

    if (q) {
      const term = escapeIlike(q.trim());
      if (term) {
        query = query.or(`title.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%`);
      }
    }

    if (sortBy === "price_asc") {
      query = query.order("price", { ascending: true, nullsFirst: true });
    } else if (sortBy === "price_desc") {
      query = query.order("price", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("published_at", { ascending: false, nullsFirst: false });
    }

    const { data, error, count } = await query.range(offset, limit);

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    const items = (data ?? []).map(row => mapRowToSummary(row as unknown as PublicPropertyRow));

    return Result.ok({
      items,
      total: count ?? items.length,
      page,
      pageSize,
    });
  }
}

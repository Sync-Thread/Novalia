export type ScopeContext = {
  orgId: string | null;
  userId: string;
  listerColumn?: string | null;
};

type FilterOps = {
  eq(column: string, value: unknown): unknown;
  is(column: string, value: unknown): unknown;
};

/**
 * Applies RLS-aware scoping to a PostgREST filter builder.
 * - When orgId is present, the query is restricted to the organization.
 * - When orgId is null, the query is restricted to org_id IS NULL and, if available,
 *   to the provided lister column matching the authenticated user.
 */
export function scopeByContext<T>(query: T, ctx: ScopeContext): T {
  const builder = query as unknown as FilterOps;

  if (ctx.orgId) {
    return builder.eq("org_id", ctx.orgId) as T;
  }

  const base = builder.is("org_id", null) as FilterOps;
  if (!ctx.listerColumn) {
    return base as unknown as T;
  }

  return base.eq(ctx.listerColumn, ctx.userId) as unknown as T;
}

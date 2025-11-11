export type ScopeContext = {
  orgId: string | null;
  userId: string;
};

type FilterOps = {
  eq(column: string, value: unknown): unknown;
  is(column: string, value: unknown): unknown;
};

export function scopeByContext<T>(query: T, ctx: ScopeContext): T {
  const builder = query as unknown as FilterOps;

  if (ctx.orgId) {
    return builder.eq("org_id", ctx.orgId) as T;
  }

  return builder.is("org_id", null) as T;
}

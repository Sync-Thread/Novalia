
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_org_roles enable row level security;

alter table public.properties enable row level security;
alter table public.media_assets enable row level security;
alter table public.documents enable row level security;

alter table public.fingerprints enable row level security;
alter table public.sessions enable row level security;
alter table public.events enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.property_leads enable row level security;
alter table public.attributions enable row level security;
alter table public.attribution_disputes enable row level security;

alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

alter table public.message_templates enable row level security;
alter table public.message_dispatches enable row level security;

alter table public.kyc_verifications enable row level security;

alter table public.contract_templates enable row level security;
alter table public.contracts enable row level security;
alter table public.notary_cases enable row level security;

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.commission_rules enable row level security;
alter table public.payments enable row level security;

alter table public.plans enable row level security;
alter table public.org_plan_subscriptions enable row level security;

alter table public.integration_providers enable row level security;
alter table public.integrations enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_logs enable row level security;

alter table public.jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.tags enable row level security;
alter table public.property_tags enable row level security;
alter table public.zones enable row level security;

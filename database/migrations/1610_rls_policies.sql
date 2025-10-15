
create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid());

create policy org_member_read on public.organizations for select using (public.is_in_org(id));
create policy user_org_roles_select on public.user_org_roles
  for select using (org_id in (select org_id from public.profiles where id = auth.uid()));
create policy roles_read_all on public.roles for select using (true);

create policy properties_public_read_published on public.properties for select using (status = 'published');
create policy properties_org_rw on public.properties
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy media_org_rw on public.media_assets
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy documents_org_rw on public.documents
  for all using (org_id is null or public.is_in_org(org_id))
  with check (org_id is null or public.is_in_org(org_id));

create policy fingerprints_anon_insert on public.fingerprints for insert with check (true);
create policy sessions_anon_insert     on public.sessions     for insert with check (true);
create policy events_anon_insert       on public.events       for insert with check (true);
create policy events_org_read          on public.events       for select using (org_id is not null and public.is_in_org(org_id));

create policy leads_org_rw on public.property_leads
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy attributions_org_rw on public.attributions
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy attribution_disputes_org_rw on public.attribution_disputes
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy threads_org_rw on public.chat_threads
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy participants_org_rw on public.chat_participants
  for all using (exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id)))
  with check (exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id)));
create policy messages_thread_scope on public.chat_messages
  for all using (exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id)))
  with check (exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id)));

create policy templates_read    on public.message_templates for select using (true);
create policy templates_org_rw  on public.message_templates
  for all using (org_id is null or public.is_in_org(org_id))
  with check (org_id is null or public.is_in_org(org_id));
create policy dispatches_org_rw on public.message_dispatches
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy kyc_self_or_org_read on public.kyc_verifications
  for select using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.org_id is not null));
create policy kyc_self_insert on public.kyc_verifications for insert with check (user_id = auth.uid());

create policy contracts_org_rw on public.contracts
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy notary_cases_org_rw on public.notary_cases
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy invoices_org_rw on public.invoices
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy invoice_items_cascade on public.invoice_items
  for all using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id)))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id)));
create policy commission_rules_rw on public.commission_rules
  for all using (org_id is null or public.is_in_org(org_id))
  with check (org_id is null or public.is_in_org(org_id));
create policy payments_cascade on public.payments
  for all using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id)))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id)));

create policy plans_read on public.plans for select using (true);
create policy org_plan_rw on public.org_plan_subscriptions
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy integration_providers_ro on public.integration_providers for select using (true);
create policy integrations_org_rw on public.integrations
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy webhooks_org_rw on public.webhooks
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy webhook_logs_org_r on public.webhook_logs
  for select using (exists (select 1 from public.webhooks w where w.id = webhook_id and public.is_in_org(w.org_id)));

create policy audit_org_read on public.audit_logs for select using (org_id is not null and public.is_in_org(org_id));
create policy tags_public_read on public.tags for select using (true);
create policy zones_public_read on public.zones for select using (true);
create policy property_tags_public_read on public.property_tags for select using (true);

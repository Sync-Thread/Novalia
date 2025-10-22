
create index if not exists idx_properties_geo on public.properties using gist (location);
create index if not exists idx_properties_status on public.properties(status);
create index if not exists idx_properties_search on public.properties using gin (search_vector);
create index if not exists idx_properties_tags_cached on public.properties using gin (tags_cached);
create index if not exists idx_documents_related on public.documents(related_type, related_id);

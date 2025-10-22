# Database migrations

The original `src/context/database/schema.sql` file was split into ordered migration files under `database/migrations`. Each file keeps the exact SQL from the monolithic schema while preserving execution order and dependencies.

Run migrations sequentially with:

```sh
./database/apply_all.sh
```

To verify that the concatenated migrations still match the source schema (ignoring the non-SQL annotations stored in `database/notes/schema_non_sql.txt`), use:

```sh
./database/verify_concat.sh
```

## Auth bootstrap

New rows in `auth.users` automatically create a matching record in
`public.profiles` through the `public.handle_new_user` trigger. The trigger
is idempotent and will also backfill missing profiles when the migration is
re-applied, so manual inserts from the application are not required.

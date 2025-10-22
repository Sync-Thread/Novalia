#!/usr/bin/env bash
set -euo pipefail
tmp_sql="$(mktemp)"
cat database/migrations/*.sql | sed '/^[[:space:]]*$/d' > "$tmp_sql"
filtered_src="$(mktemp)"
python - "$filtered_src" <<'PY'
from pathlib import Path
import sys
schema = Path('src/context/database/schema.sql').read_text().splitlines()
notes = Path('database/notes/schema_non_sql.txt').read_text().splitlines()
non_sql = {line for line in notes if line}
filtered = [line for line in schema if line not in non_sql and line.strip()]
Path(sys.argv[1]).write_text('\n'.join(filtered) + '\n')
PY
diff -u "$filtered_src" "$tmp_sql" && echo "OK"

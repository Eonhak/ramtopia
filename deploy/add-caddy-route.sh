#!/usr/bin/env bash
set -euo pipefail
caddy_container=${CADDY_CONTAINER:-deploy-caddy-1}
caddy_file=${CADDY_FILE:-/home/ubuntu/tiny-sword/deploy/Caddyfile}
ramtopia_domain=${RAMTOPIA_DOMAIN:-ramtopia.duckdns.org}

# Test the app over the shared network before changing any proxy configuration.
docker exec "$caddy_container" wget -qO- http://ramtopia-web:8080/api/health | python3 -c 'import sys,json; assert json.load(sys.stdin)["ok"] is True'
backup=$(mktemp "${caddy_file}.before-ramtopia.XXXXXX")
cp -p "$caddy_file" "$backup"
python3 - "$caddy_file" "$ramtopia_domain" <<'PY'
import re,sys
from pathlib import Path
path,domain = Path(sys.argv[1]), sys.argv[2]
if not re.fullmatch(r'[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?',domain):
    raise SystemExit('Invalid hostname. Configuration was not changed.')
text = path.read_text()
marker = '# RAMTOPIA dedicated domain'
if marker in text:
    if f'\n{domain} {{' not in text:
        raise SystemExit('RAMTOPIA route already exists for a different hostname. Configuration was not changed.')
else:
    route = f'''\n\n{marker}
{domain} {{
        encode zstd gzip
        request_body {{
                max_size 8KB
        }}
        reverse_proxy ramtopia-web:8080 {{
                header_up X-Forwarded-For {{remote_host}}
        }}
}}
'''
    # Write in place: replacing the file inode breaks the existing bind mount.
    path.write_text(text + route)
PY
if ! docker exec "$caddy_container" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
    cp -p "$backup" "$caddy_file"
    echo "Validation failed. Restored: $backup" >&2
    exit 1
fi
if ! docker exec "$caddy_container" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
    cp -p "$backup" "$caddy_file"
    docker exec "$caddy_container" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || true
    echo "Reload failed. Restored: $backup" >&2
    exit 1
fi
printf 'RAMTOPIA domain added. Backup: %s\n' "$backup"
printf 'Open https://%s/ (HTTPS certificate issuance may take a moment)\n' "$ramtopia_domain"

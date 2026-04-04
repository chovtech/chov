#!/bin/bash
# auto_provision.sh — run as root via cron every minute
# Finds verified custom domains with no Nginx vhost and provisions them.

PGCONN="postgresql://chov:chov_dev_password@localhost/chov"
PROVISION_SCRIPT="/home/chike/chov/scripts/provision_domain.sh"

psql "$PGCONN" -t -A -c \
  "SELECT custom_domain FROM workspaces WHERE custom_domain_verified = true AND custom_domain IS NOT NULL AND custom_domain != ''" \
| while IFS= read -r domain; do
  domain="$(echo "$domain" | xargs)"
  [ -z "$domain" ] && continue

  if [ ! -f "/etc/nginx/sites-available/$domain" ]; then
    echo "[$(date)] Provisioning $domain..."
    bash "$PROVISION_SCRIPT" "$domain" && echo "[$(date)] Done: $domain" || echo "[$(date)] Failed: $domain"
  fi
done

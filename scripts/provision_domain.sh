#!/bin/bash
# provision_domain.sh <domain>
# Issues a Let's Encrypt cert for a custom domain and adds an Nginx vhost.
# Called automatically by the PagePersona backend after domain verification.
# Requires: passwordless sudo for this script (see sudoers setup below)

set -e

DOMAIN="$1"
EMAIL="ssl@usepagepersona.com"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
BACKEND_PORT=3001

if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  exit 1
fi

# Sanitise domain — only allow valid hostname characters
if ! echo "$DOMAIN" | grep -qE '^[a-zA-Z0-9._-]+$'; then
  echo "Invalid domain: $DOMAIN"
  exit 1
fi

CONFIG_FILE="$NGINX_AVAILABLE/$DOMAIN"

# Skip if cert already exists and nginx config is in place
if [ -f "$CONFIG_FILE" ] && [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Already provisioned: $DOMAIN"
  exit 0
fi

echo "Provisioning SSL for $DOMAIN..."

# Issue cert via standalone (nginx will be briefly reloaded after)
certbot certonly \
  --nginx \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  --expand

echo "Writing Nginx config for $DOMAIN..."

cat > "$CONFIG_FILE" << NGINX
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf "$CONFIG_FILE" "$NGINX_ENABLED/$DOMAIN"

nginx -t && systemctl reload nginx

echo "Done: $DOMAIN is live on HTTPS"

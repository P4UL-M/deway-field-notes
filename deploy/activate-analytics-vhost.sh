#!/usr/bin/env sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

sudo install -m 0644 "$project_dir/deploy/analytics.blog.deway.fr.conf" /etc/apache2/sites-available/009-analytics.blog.deway.fr.conf
sudo a2enmod proxy proxy_http headers ssl rewrite auth_basic
sudo a2ensite 009-analytics.blog.deway.fr.conf
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "✓ Umami analytics vhost active (dashboard protected by Umami login)"
echo "After the CNAME analytics.blog.deway.fr → deway.fr resolves:"
echo "sudo certbot --apache -d analytics.blog.deway.fr --redirect"

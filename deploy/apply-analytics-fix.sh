#!/usr/bin/env sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

if [ "$(id -u)" -ne 0 ]; then
    echo "Run this script with sudo." >&2
    exit 1
fi

install -m 0644 \
    "$project_dir/deploy/analytics.blog.deway.fr.conf" \
    /etc/apache2/sites-available/009-analytics.blog.deway.fr.conf

install -m 0644 \
    "$project_dir/deploy/analytics.blog.deway.fr-le-ssl.conf" \
    /etc/apache2/sites-available/009-analytics.blog.deway.fr-le-ssl.conf

a2enmod proxy proxy_http headers ssl
a2ensite 009-analytics.blog.deway.fr.conf
a2ensite 009-analytics.blog.deway.fr-le-ssl.conf
apache2ctl configtest
systemctl reload apache2

echo "✓ Umami dashboard proxy fixed"

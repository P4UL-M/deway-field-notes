#!/usr/bin/env sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

sudo install -m 0644 "$project_dir/deploy/blog.deway.fr.conf" /etc/apache2/sites-available/008-blog.deway.fr.conf
sudo a2enmod proxy proxy_http headers ssl rewrite
sudo a2ensite 008-blog.deway.fr.conf
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "✓ HTTP vhost active"
echo "Once DNS resolves: sudo certbot --apache -d blog.deway.fr --redirect"

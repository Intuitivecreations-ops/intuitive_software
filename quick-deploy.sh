#!/bin/bash

# Clean Head - Quick VPS Deployment
# Run this script on your VPS after uploading files

echo "🚀 Clean Head Quick Deploy"
echo "=========================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root"
   exit 1
fi

# Use environment variables from .env.production
DOMAIN="vps.intuitivecreationsllc.com"

echo "🌐 Deploying to: $DOMAIN"
echo ""

echo ""
echo "🔧 Starting deployment..."
echo ""

# Update system
echo "📦 [1/9] Updating system..."
apt update > /dev/null 2>&1

# Install Node.js
if ! command -v node &> /dev/null; then
    echo "📦 [2/9] Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt install -y nodejs > /dev/null 2>&1
else
    echo "✅ [2/9] Node.js already installed ($(node --version))"
fi

# Install NGINX
if ! command -v nginx &> /dev/null; then
    echo "📦 [3/9] Installing NGINX..."
    apt install -y nginx > /dev/null 2>&1
else
    echo "✅ [3/9] NGINX already installed"
fi

# Install Certbot
if ! command -v certbot &> /dev/null; then
    echo "📦 [4/9] Installing Certbot..."
    apt install -y certbot python3-certbot-nginx > /dev/null 2>&1
else
    echo "✅ [4/9] Certbot already installed"
fi

# Create app directory
echo "📁 [5/9] Setting up application..."
mkdir -p /var/www/cleanhead
cd /var/www/cleanhead

# Copy .env.production to .env
if [ -f /root/project/.env.production ]; then
    cp /root/project/.env.production .env
elif [ -f .env.production ]; then
    cp .env.production .env
else
    echo "⚠️  Warning: No .env.production found"
fi

# Install and build
echo "📦 [6/9] Installing dependencies (this may take a minute)..."
npm install > /dev/null 2>&1

echo "🔨 [7/9] Building application..."
npm run build > /dev/null 2>&1

# Configure NGINX
echo "⚙️  [8/9] Configuring NGINX..."
cat > /etc/nginx/sites-available/cleanhead << EOF
server {
    listen 80;
    server_name $DOMAIN;

    root /var/www/cleanhead/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/cleanhead /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl restart nginx

# SSL Certificate
echo "🔐 [9/9] Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@intuitivecreationsllc.com --redirect > /dev/null 2>&1

# Set permissions
chown -R www-data:www-data /var/www/cleanhead
chmod -R 755 /var/www/cleanhead

echo ""
echo "✅ ================================"
echo "✅  DEPLOYMENT COMPLETE!"
echo "✅ ================================"
echo ""
echo "🌐 Your app is now live at:"
echo "   👉 https://$DOMAIN"
echo ""
echo "📊 Useful commands:"
echo "   • Check status: systemctl status nginx"
echo "   • View logs: tail -f /var/log/nginx/error.log"
echo "   • Restart: systemctl restart nginx"
echo "   • Rebuild: cd /var/www/cleanhead && npm run build"
echo ""
echo "🎉 Happy deploying!"

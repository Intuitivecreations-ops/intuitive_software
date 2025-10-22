#!/bin/bash

# Clean Head VPS Deployment Script
# Hostname: vps.intuitivecreationsllc.com
# Server IP: 77.37.67.253

set -e

echo "🚀 Starting Clean Head deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install NGINX
echo "📦 Installing NGINX..."
apt install -y nginx

# Install Certbot for SSL
echo "📦 Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Create app directory
echo "📁 Creating app directory..."
mkdir -p /var/www/cleanhead
cd /var/www/cleanhead

# Install dependencies and build (files should already be uploaded)
echo "📦 Installing app dependencies..."
npm install

# Build the application
echo "🔨 Building production bundle..."
npm run build

# Configure NGINX
echo "⚙️  Configuring NGINX..."
cat > /etc/nginx/sites-available/cleanhead << 'EOF'
server {
    listen 80;
    server_name vps.intuitivecreationsllc.com;

    root /var/www/cleanhead/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
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

# Enable site
ln -sf /etc/nginx/sites-available/cleanhead /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test NGINX configuration
echo "🧪 Testing NGINX configuration..."
nginx -t

# Restart NGINX
echo "🔄 Restarting NGINX..."
systemctl restart nginx
systemctl enable nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate..."
certbot --nginx -d vps.intuitivecreationsllc.com --non-interactive --agree-tos --email admin@intuitivecreationsllc.com --redirect

# Set up SSL auto-renewal
echo "🔄 Setting up SSL auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Set proper permissions
echo "🔒 Setting permissions..."
chown -R www-data:www-data /var/www/cleanhead
chmod -R 755 /var/www/cleanhead

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app should now be accessible at:"
echo "   https://vps.intuitivecreationsllc.com"
echo ""
echo "📊 Useful commands:"
echo "   - Check NGINX status: systemctl status nginx"
echo "   - View NGINX logs: tail -f /var/log/nginx/error.log"
echo "   - Renew SSL: certbot renew --dry-run"
echo "   - Rebuild app: cd /var/www/cleanhead && npm run build"
echo ""
echo "🎉 Happy deploying!"

# Clean Head VPS Deployment Guide

Complete step-by-step guide to deploy Clean Head to your VPS at **vps.intuitivecreationsllc.com**

## 🎯 Quick Summary

- **Domain**: vps.intuitivecreationsllc.com
- **Server IP**: 77.37.67.253
- **Stack**: React (Vite) + NGINX
- **SSL**: Certbot (Let's Encrypt)
- **Database**: Supabase (already configured)

---

## 📋 Prerequisites

✅ VPS with Ubuntu 20.04+ or Debian 11+
✅ Root SSH access
✅ DNS A record: vps.intuitivecreationsllc.com → 77.37.67.253
✅ Supabase project with credentials

---

## 🚀 Method 1: Automated Deployment (Recommended)

### Step 1: Upload Files to VPS

From your local machine, upload the project to your VPS:

```bash
# Option A: Using SCP
scp -r /path/to/project root@77.37.67.253:/tmp/cleanhead

# Option B: Using rsync (faster for updates)
rsync -avz --progress /path/to/project/ root@77.37.67.253:/tmp/cleanhead/
```

### Step 2: SSH into VPS

```bash
ssh root@77.37.67.253
```

### Step 3: Run Deployment Script

```bash
cd /tmp/cleanhead
chmod +x deploy.sh
./deploy.sh
```

The script will:
- ✅ Install Node.js 20.x
- ✅ Install NGINX
- ✅ Install Certbot for SSL
- ✅ Build your application
- ✅ Configure NGINX reverse proxy
- ✅ Obtain SSL certificate
- ✅ Set up auto-renewal

### Step 4: Configure Environment Variables

```bash
cd /var/www/cleanhead
nano .env.production
```

Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=https://vps.intuitivecreationsllc.com
```

### Step 5: Rebuild with Production Config

```bash
cd /var/www/cleanhead
npm run build
systemctl restart nginx
```

### Step 6: Verify Deployment

Visit: **https://vps.intuitivecreationsllc.com**

---

## 🔧 Method 2: Manual Deployment

If you prefer manual control, follow these steps:

### 1. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x
npm --version   # Should show v10.x
```

### 2. Install NGINX

```bash
apt update
apt install -y nginx
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```

### 3. Create Application Directory

```bash
mkdir -p /var/www/cleanhead
cd /var/www/cleanhead
```

### 4. Upload Application Files

From your local machine:

```bash
scp -r /path/to/project/* root@77.37.67.253:/var/www/cleanhead/
```

Or use Git:

```bash
cd /var/www/cleanhead
git clone YOUR_REPO_URL .
```

### 5. Install Dependencies & Build

```bash
cd /var/www/cleanhead
npm install
npm run build
```

This creates the `dist/` folder with production-ready files.

### 6. Configure NGINX

```bash
nano /etc/nginx/sites-available/cleanhead
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name vps.intuitivecreationsllc.com;

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
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/x-javascript
        application/xml
        application/xml+rss
        application/json
        image/svg+xml;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache images and fonts
    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 7. Enable Site

```bash
ln -s /etc/nginx/sites-available/cleanhead /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 8. Install SSL with Certbot

```bash
apt install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d vps.intuitivecreationsllc.com

# Follow prompts:
# - Enter email: admin@intuitivecreationsllc.com
# - Agree to terms: Yes
# - Redirect HTTP to HTTPS: Yes (recommended)
```

Certbot will automatically:
- Obtain SSL certificate
- Update NGINX config for HTTPS
- Set up auto-renewal

### 9. Verify SSL Auto-Renewal

```bash
systemctl status certbot.timer
certbot renew --dry-run
```

### 10. Set Permissions

```bash
chown -R www-data:www-data /var/www/cleanhead
chmod -R 755 /var/www/cleanhead
```

---

## 🔐 Environment Variables Setup

### Option 1: Build-time Variables (Recommended for Vite)

1. Create `.env.production` on your VPS:

```bash
cd /var/www/cleanhead
nano .env.production
```

2. Add your credentials:

```env
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=https://vps.intuitivecreationsllc.com
NODE_ENV=production
```

3. Rebuild:

```bash
npm run build
systemctl restart nginx
```

### Option 2: Runtime Variables (Alternative)

If you need runtime env vars, create a small Express server:

```bash
npm install express
```

Create `server.js`:

```javascript
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Then use PM2:

```bash
pm2 start server.js --name cleanhead
pm2 startup
pm2 save
```

Update NGINX to proxy:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 🔄 Updating Your Deployment

### Quick Update Script

Create `/root/update-cleanhead.sh`:

```bash
#!/bin/bash
cd /var/www/cleanhead
git pull  # or upload new files
npm install
npm run build
systemctl restart nginx
echo "✅ Update complete!"
```

Make executable:

```bash
chmod +x /root/update-cleanhead.sh
```

Run updates:

```bash
/root/update-cleanhead.sh
```

---

## 📊 Monitoring & Management

### Check Application Status

```bash
# NGINX status
systemctl status nginx

# View NGINX error logs
tail -f /var/log/nginx/error.log

# View NGINX access logs
tail -f /var/log/nginx/access.log

# Check SSL certificate
certbot certificates
```

### Restart Services

```bash
# Restart NGINX
systemctl restart nginx

# Reload NGINX config (no downtime)
nginx -s reload

# Test NGINX config
nginx -t
```

### SSL Certificate Renewal

Certbot auto-renews, but you can test/force:

```bash
# Test renewal
certbot renew --dry-run

# Force renewal
certbot renew --force-renewal

# Check auto-renewal timer
systemctl status certbot.timer
```

---

## 🔥 Firewall Configuration

```bash
# Install UFW if needed
apt install -y ufw

# Allow SSH (important!)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## 🐛 Troubleshooting

### Issue: DNS not resolving

```bash
# Check DNS propagation
nslookup vps.intuitivecreationsllc.com
dig vps.intuitivecreationsllc.com

# Should return: 77.37.67.253
```

Wait 5-60 minutes for DNS propagation.

### Issue: 502 Bad Gateway

```bash
# Check NGINX error log
tail -50 /var/log/nginx/error.log

# Verify dist folder exists
ls -la /var/www/cleanhead/dist/

# Check permissions
ls -la /var/www/cleanhead/
```

### Issue: SSL certificate failed

```bash
# Check DNS first
nslookup vps.intuitivecreationsllc.com

# Retry certificate
certbot --nginx -d vps.intuitivecreationsllc.com --force-renewal

# Check firewall
ufw status
```

### Issue: White screen / blank page

```bash
# Check browser console for errors
# Usually means wrong Supabase URL or CORS issues

# Verify .env.production
cat /var/www/cleanhead/.env.production

# Rebuild
cd /var/www/cleanhead
npm run build
systemctl restart nginx
```

### Issue: "Module not found" errors

```bash
cd /var/www/cleanhead
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📱 Testing Your Deployment

### 1. Check HTTP → HTTPS Redirect

```bash
curl -I http://vps.intuitivecreationsllc.com
# Should return: 301 redirect to https://
```

### 2. Check SSL Certificate

```bash
curl -I https://vps.intuitivecreationsllc.com
# Should return: 200 OK with SSL headers
```

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=vps.intuitivecreationsllc.com

### 3. Check Application

Visit: **https://vps.intuitivecreationsllc.com**

- Should load login page
- Should be able to sign up/login
- Check browser console for errors
- Test all pages

---

## 🎯 Performance Optimization

### Enable HTTP/2

NGINX automatically enables HTTP/2 with SSL.

### Add Response Compression

Already included in NGINX config (gzip).

### Add Security Headers

Already included in NGINX config.

### Monitor Performance

```bash
# Install htop for resource monitoring
apt install -y htop
htop
```

---

## 📧 Support & Next Steps

**Deployment Complete! ✅**

Your Clean Head app should now be live at:
**https://vps.intuitivecreationsllc.com**

### What's Working:
- ✅ SSL/HTTPS enabled
- ✅ React SPA routing
- ✅ Asset caching
- ✅ Gzip compression
- ✅ Security headers
- ✅ Auto SSL renewal

### Post-Deployment:
1. Test all features thoroughly
2. Set up backups (database is on Supabase)
3. Configure monitoring (optional)
4. Set up CI/CD for automatic deployments (optional)

### Need Help?

Check logs:
```bash
tail -f /var/log/nginx/error.log
```

Restart services:
```bash
systemctl restart nginx
```

Rebuild app:
```bash
cd /var/www/cleanhead && npm run build
```

---

**🎉 Happy Deploying!**

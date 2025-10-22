# 🚀 Clean Head VPS Deployment Checklist

## Before You Start

- [ ] VPS with Ubuntu 20.04+ or Debian 11+
- [ ] Root SSH access to 77.37.67.253
- [ ] DNS A record confirmed: ops.intuitivecreationsllc.com → 77.37.67.253
- [ ] Supabase project URL and Anon Key ready

---

## 📦 Deployment Steps

### 1️⃣ Upload Project to VPS

**From your local machine:**

```bash
# Navigate to your project folder
cd /path/to/clean-head-project

# Upload to VPS using SCP
scp -r . root@77.37.67.253:/tmp/cleanhead

# Or use rsync (recommended for updates)
rsync -avz --progress . root@77.37.67.253:/tmp/cleanhead/
```

- [ ] Files uploaded successfully

### 2️⃣ SSH into Your VPS

```bash
ssh root@77.37.67.253
```

- [ ] Connected to VPS

### 3️⃣ Run Quick Deploy Script

**On your VPS:**

```bash
cd /tmp/cleanhead
chmod +x quick-deploy.sh
./quick-deploy.sh
```

**The script will ask you for:**
1. Supabase URL (e.g., `https://yourproject.supabase.co`)
2. Supabase Anon Key (starts with `eyJhbG...`)
3. Confirm domain (defaults to `ops.intuitivecreationsllc.com`)

**The script automatically:**
- ✅ Installs Node.js 20.x
- ✅ Installs NGINX
- ✅ Installs Certbot
- ✅ Builds your application
- ✅ Configures NGINX
- ✅ Obtains SSL certificate
- ✅ Sets up auto-renewal

**Time estimate:** 3-5 minutes

- [ ] Script completed successfully

### 4️⃣ Verify Deployment

**Visit your site:**

👉 **https://ops.intuitivecreationsllc.com**

**Check:**
- [ ] Site loads without errors
- [ ] HTTPS (green lock) is enabled
- [ ] Login page displays correctly
- [ ] Can create a new account
- [ ] Can log in successfully
- [ ] All pages load correctly

---

## 🔍 Verification Commands

**On your VPS, verify everything is running:**

```bash
# Check NGINX status
systemctl status nginx
# Should show: active (running)

# Check SSL certificate
certbot certificates
# Should show certificate for ops.intuitivecreationsllc.com

# Check if files are in place
ls -la /var/www/cleanhead/dist/
# Should show index.html and assets folder

# Test website
curl -I https://ops.intuitivecreationsllc.com
# Should return: HTTP/2 200
```

- [ ] NGINX is running
- [ ] SSL certificate is valid
- [ ] Dist files exist
- [ ] Website responds with 200 OK

---

## 🐛 Troubleshooting

### ❌ DNS Not Resolving

**Check DNS propagation:**
```bash
nslookup ops.intuitivecreationsllc.com
```

Should return: `77.37.67.253`

**If not:**
- Wait 5-60 minutes for DNS propagation
- Verify A record in your DNS provider
- Try from different device/network

### ❌ SSL Certificate Failed

**Common causes:**
1. DNS not propagated yet → Wait and retry
2. Port 80/443 blocked → Check firewall

**Retry SSL:**
```bash
certbot --nginx -d ops.intuitivecreationsllc.com --force-renewal
```

**Check firewall:**
```bash
ufw status
# Ensure ports 80 and 443 are allowed
```

### ❌ White Screen / Blank Page

**Check browser console for errors**

**Common causes:**
1. Wrong Supabase credentials
2. Build failed

**Fix:**
```bash
cd /var/www/cleanhead

# Update .env file
nano .env
# Add correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Rebuild
npm run build

# Restart NGINX
systemctl restart nginx
```

### ❌ 502 Bad Gateway

**Check NGINX logs:**
```bash
tail -50 /var/log/nginx/error.log
```

**Verify dist folder:**
```bash
ls -la /var/www/cleanhead/dist/
```

**Rebuild if needed:**
```bash
cd /var/www/cleanhead
npm run build
systemctl restart nginx
```

### ❌ Module Not Found Errors

**Reinstall dependencies:**
```bash
cd /var/www/cleanhead
rm -rf node_modules package-lock.json
npm install
npm run build
systemctl restart nginx
```

---

## 🔄 Updating Your Deployment

**When you make changes to your app:**

### From Local Machine:

```bash
# Upload updated files
rsync -avz --progress . root@77.37.67.253:/var/www/cleanhead/
```

### On VPS:

```bash
cd /var/www/cleanhead
npm install  # If dependencies changed
npm run build
systemctl restart nginx
```

**Or create an update script:**

```bash
# On VPS, create /root/update.sh
nano /root/update.sh
```

```bash
#!/bin/bash
cd /var/www/cleanhead
npm install
npm run build
systemctl restart nginx
echo "✅ Update complete!"
```

```bash
chmod +x /root/update.sh
# Run updates with: /root/update.sh
```

---

## 📊 Monitoring & Logs

### View Logs

```bash
# NGINX error log
tail -f /var/log/nginx/error.log

# NGINX access log
tail -f /var/log/nginx/access.log
```

### Check Status

```bash
# NGINX
systemctl status nginx

# SSL auto-renewal
systemctl status certbot.timer

# Test SSL renewal
certbot renew --dry-run
```

### Resource Usage

```bash
# Install htop
apt install -y htop

# Monitor resources
htop
```

---

## 🔐 Security Checklist

- [ ] SSL/HTTPS enabled
- [ ] HTTP redirects to HTTPS
- [ ] Firewall configured (UFW)
- [ ] Only necessary ports open (22, 80, 443)
- [ ] Root login should be disabled (optional but recommended)
- [ ] SSH key authentication enabled (optional but recommended)

### Optional: Improve Security

**Disable root login:**
```bash
# Create a non-root user first!
adduser deployuser
usermod -aG sudo deployuser

# Then disable root SSH
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
systemctl restart sshd
```

**Configure firewall:**
```bash
apt install -y ufw
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

---

## ✅ Post-Deployment

### You Should Now Have:

✅ Clean Head running at https://ops.intuitivecreationsllc.com
✅ SSL certificate (auto-renewing)
✅ NGINX serving optimized static files
✅ Gzip compression enabled
✅ Security headers configured
✅ Asset caching for performance

### Next Steps:

1. **Test thoroughly** - Try all features
2. **Set up backups** - Supabase handles database backups
3. **Monitor performance** - Check logs regularly
4. **Update regularly** - Keep Node.js and packages updated

### Ongoing Maintenance:

**Monthly:**
- [ ] Check SSL certificate status: `certbot certificates`
- [ ] Review logs: `tail -100 /var/log/nginx/error.log`
- [ ] Update system: `apt update && apt upgrade`

**As Needed:**
- [ ] Deploy updates: `/root/update.sh`
- [ ] Monitor disk space: `df -h`
- [ ] Check NGINX status: `systemctl status nginx`

---

## 📞 Support Resources

### Official Docs:
- **NGINX**: https://nginx.org/en/docs/
- **Certbot**: https://certbot.eff.org/
- **Vite**: https://vitejs.dev/guide/
- **Supabase**: https://supabase.com/docs

### Useful Commands Reference:

```bash
# Restart NGINX
systemctl restart nginx

# Reload NGINX config (no downtime)
nginx -s reload

# Test NGINX config
nginx -t

# Renew SSL manually
certbot renew

# Check SSL certificate
certbot certificates

# View active connections
netstat -tuln | grep ':80\|:443'

# Check disk space
df -h

# Check memory usage
free -h

# View running processes
ps aux | grep nginx
```

---

## 🎉 Success!

Your Clean Head app is now deployed and running in production!

**Live at:** https://ops.intuitivecreationsllc.com

Need help? Check the full documentation in `DEPLOYMENT.md`

**Happy deploying! 🚀**

# Deployment Checklist - EasyPanel VPS

Use this comprehensive checklist to ensure a successful deployment of your LMS application.

## Pre-Deployment Checklist

### 1. Domain & DNS Setup
- [ ] Domain name purchased and active
- [ ] DNS A record pointing to VPS IP address
  - Record Type: `A`
  - Host: `@` (or `your-domain.com`)
  - Value: Your VPS IP address
  - TTL: 3600 (or default)
- [ ] DNS A record for www subdomain (optional but recommended)
  - Record Type: `A`
  - Host: `www`
  - Value: Your VPS IP address
  - TTL: 3600 (or default)
- [ ] DNS propagation verified (use: `nslookup your-domain.com` or `dig your-domain.com`)
- [ ] Wait 24-48 hours if DNS was just changed

### 2. VPS Requirements
- [ ] VPS with at least:
  - **CPU**: 2 cores minimum
  - **RAM**: 4GB minimum (8GB recommended)
  - **Storage**: 20GB minimum (50GB recommended for uploads)
  - **OS**: Ubuntu 20.04/22.04 or Debian 11/12
- [ ] Root or sudo access confirmed
- [ ] SSH access working
- [ ] VPS IP address noted

### 3. Credentials & Secrets
- [ ] PostgreSQL database password generated (strong, random)
- [ ] Session secret generated: `openssl rand -base64 32`
- [ ] SMTP credentials ready (if using email)
- [ ] Admin account email/password planned
- [ ] All credentials stored securely (password manager)

### 4. Application Files
- [ ] Code repository ready (GitHub, GitLab, etc.)
- [ ] OR application files zipped and ready to upload
- [ ] `.env.example` file reviewed
- [ ] All dependencies listed in `package.json`

## Deployment Steps Checklist

### Step 1: Server Initial Setup
- [ ] Connected to VPS via SSH
- [ ] System updated: `sudo apt update && sudo apt upgrade -y`
- [ ] Firewall configured (SSH, HTTP, HTTPS ports open)
- [ ] Timezone set correctly: `sudo timedatectl set-timezone Your/Timezone`

### Step 2: Install Node.js
- [ ] Node.js 20.x installed
- [ ] Verified: `node --version` shows v20.x or later
- [ ] npm verified: `npm --version`

### Step 3: Install PostgreSQL
- [ ] PostgreSQL installed
- [ ] PostgreSQL service started and enabled
- [ ] Database `lmsc` created
- [ ] User `lmsc_user` created with password
- [ ] Permissions granted to user
- [ ] Connection tested: `psql -U lmsc_user -d lmsc -h localhost`

### Step 4: Install PM2
- [ ] PM2 installed globally: `sudo npm install -g pm2`
- [ ] PM2 verified: `pm2 --version`

### Step 5: Install Nginx
- [ ] Nginx installed
- [ ] Nginx service started and enabled
- [ ] Default site disabled (if exists)

### Step 6: Application Setup
- [ ] Application directory created: `/var/www/lmsc`
- [ ] Files uploaded/cloned to `/var/www/lmsc`
- [ ] Directory permissions set correctly
- [ ] `.env` file created with all required variables
- [ ] `.env` file permissions set: `chmod 600 .env`

### Step 7: Environment Variables
- [ ] `DATABASE_URL` set correctly
- [ ] `NODE_ENV=production` set
- [ ] `NEXT_PUBLIC_APP_URL` set to your domain
- [ ] `SESSION_SECRET` set (strong random string)
- [ ] SMTP variables set (if using email)
- [ ] All file paths verified

### Step 8: Build Application
- [ ] Dependencies installed: `npm install`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Database migrations run: `npx prisma migrate deploy`
- [ ] Application built: `npm run build`
- [ ] Build successful (no errors)

### Step 9: PM2 Configuration
- [ ] `ecosystem.config.js` reviewed and updated if needed
- [ ] Application started with PM2: `pm2 start ecosystem.config.js`
- [ ] PM2 status checked: `pm2 status` (should show "online")
- [ ] PM2 logs checked: `pm2 logs` (no critical errors)
- [ ] PM2 save: `pm2 save`
- [ ] PM2 startup configured: `pm2 startup` (follow instructions)

### Step 10: Nginx Configuration
- [ ] Nginx config file created: `/etc/nginx/sites-available/lmsc`
- [ ] Domain name replaced in config
- [ ] Proxy settings configured correctly
- [ ] Upload size limit set (50M)
- [ ] Config file enabled: symlink created
- [ ] Nginx config tested: `sudo nginx -t` (no errors)
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Nginx status: `sudo systemctl status nginx` (active)

### Step 11: SSL Certificate
- [ ] Certbot installed: `sudo apt install -y certbot python3-certbot-nginx`
- [ ] SSL certificate obtained: `sudo certbot --nginx -d your-domain.com -d www.your-domain.com`
- [ ] Certificate auto-renewal configured (Certbot does this automatically)
- [ ] HTTPS redirect configured in Nginx
- [ ] HTTPS tested: `curl -I https://your-domain.com` (should return 200)

### Step 12: Firewall Configuration
- [ ] UFW installed: `sudo apt install -y ufw`
- [ ] SSH port allowed: `sudo ufw allow 22/tcp`
- [ ] HTTP port allowed: `sudo ufw allow 80/tcp`
- [ ] HTTPS port allowed: `sudo ufw allow 443/tcp`
- [ ] Firewall enabled: `sudo ufw enable`
- [ ] Firewall status checked: `sudo ufw status`

### Step 13: Backups Setup
- [ ] Backup directory created: `/var/backups/lms`
- [ ] Backup script executable: `chmod +x backup.sh`
- [ ] Backup script tested manually
- [ ] Cron job added for daily backups
- [ ] Backup location noted

### Step 14: Database Seeding
- [ ] Super admin user created (via seed script or manual)
- [ ] Initial admin account tested (can log in)
- [ ] Database schema verified

### Step 15: Initial Configuration
- [ ] Logged in as super admin
- [ ] Company branding configured (logo, colors)
- [ ] SMTP settings configured and tested
- [ ] Favicon updated
- [ ] Other system settings configured

## Post-Deployment Verification

### Application Access
- [ ] Homepage loads: `https://your-domain.com`
- [ ] Sign-in page works: `https://your-domain.com/signin`
- [ ] Can log in as super admin
- [ ] Dashboard loads correctly
- [ ] No console errors in browser

### Functionality Tests
- [ ] Can create a course
- [ ] Can upload files (images, PDFs, videos)
- [ ] Can create users
- [ ] Can assign courses
- [ ] Email sending works (if configured)
- [ ] Certificates can be generated
- [ ] Quiz functionality works

### Performance Checks
- [ ] Page load times acceptable (< 3 seconds)
- [ ] No memory leaks (check with `pm2 monit`)
- [ ] Database queries optimized
- [ ] File uploads working correctly

### Security Checks
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Strong passwords set for all accounts
- [ ] `.env` file not accessible via web
- [ ] File permissions correct (uploads directory)
- [ ] Firewall rules correct
- [ ] No unnecessary ports open

### Monitoring Setup
- [ ] PM2 monitoring: `pm2 monit`
- [ ] Log rotation configured
- [ ] Disk space monitoring: `df -h`
- [ ] Memory monitoring: `free -h`
- [ ] Backup verification scheduled

## Common Issues & Solutions

### Issue: Application Won't Start
**Check:**
- [ ] PM2 logs: `pm2 logs`
- [ ] Port 3000 in use: `sudo lsof -i :3000`
- [ ] Environment variables set: `cat .env`
- [ ] Database connection: `npx prisma db pull`
- [ ] Build successful: Check `.next` directory exists

**Solutions:**
- Kill process on port 3000 if needed
- Verify DATABASE_URL is correct
- Rebuild application: `npm run build`
- Check file permissions

### Issue: Nginx 502 Bad Gateway
**Check:**
- [ ] Next.js running: `pm2 status`
- [ ] Port 3000 accessible locally: `curl http://localhost:3000`
- [ ] Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Proxy settings in Nginx config

**Solutions:**
- Restart Next.js: `pm2 restart lms-app`
- Check Nginx proxy_pass URL
- Verify firewall allows localhost connections

### Issue: Database Connection Failed
**Check:**
- [ ] PostgreSQL running: `sudo systemctl status postgresql`
- [ ] User exists: `sudo -u postgres psql -c "\du"`
- [ ] Database exists: `sudo -u postgres psql -c "\l"`
- [ ] Password correct in DATABASE_URL
- [ ] PostgreSQL listening: `sudo netstat -tlnp | grep 5432`

**Solutions:**
- Restart PostgreSQL: `sudo systemctl restart postgresql`
- Recreate user/database if needed
- Check pg_hba.conf for authentication

### Issue: SSL Certificate Failed
**Check:**
- [ ] DNS pointing to correct IP
- [ ] Port 80 open and accessible
- [ ] Domain accessible: `curl http://your-domain.com`
- [ ] No other services using port 80

**Solutions:**
- Wait for DNS propagation
- Verify DNS: `dig your-domain.com`
- Check firewall allows port 80
- Temporarily disable Nginx redirect

### Issue: File Uploads Not Working
**Check:**
- [ ] Uploads directory exists: `ls -la uploads/`
- [ ] Permissions correct: `chmod -R 755 uploads/`
- [ ] Owner correct: `chown -R $USER:$USER uploads/`
- [ ] Nginx client_max_body_size set
- [ ] Disk space available: `df -h`

**Solutions:**
- Fix permissions: `sudo chown -R $USER:$USER uploads/`
- Increase Nginx upload limit
- Check disk quota

## Maintenance Checklist

### Daily
- [ ] Check PM2 status: `pm2 status`
- [ ] Check disk space: `df -h`
- [ ] Check application logs: `pm2 logs --lines 50`

### Weekly
- [ ] Review error logs
- [ ] Check backup status
- [ ] Monitor resource usage: `htop`
- [ ] Review security logs

### Monthly
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Update Node.js dependencies: `npm audit fix`
- [ ] Review and rotate logs
- [ ] Test backup restoration
- [ ] Security audit

## Quick Reference Commands

```bash
# Application Management
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart lms-app     # Restart app
pm2 stop lms-app        # Stop app
pm2 monit               # Monitor resources

# Database
sudo systemctl status postgresql   # Check status
sudo systemctl restart postgresql  # Restart
psql -U lmsc_user -d lmsc         # Connect

# Nginx
sudo nginx -t                      # Test config
sudo systemctl reload nginx        # Reload
sudo tail -f /var/log/nginx/error.log  # View errors

# System
df -h                              # Disk space
free -h                            # Memory
htop                               # Resource monitor
sudo ufw status                    # Firewall status

# Application
cd /var/www/lmsc                   # Navigate to app
npm run build                      # Rebuild
npx prisma migrate deploy          # Run migrations
pm2 restart lms-app                # Restart after changes
```

## Support & Resources

- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma Documentation**: https://www.prisma.io/docs
- **Let's Encrypt**: https://letsencrypt.org/

---

**Last Updated:** 2025-01-11
**Version:** 1.0


# Deployment Guide for EasyPanel VPS

This comprehensive guide will help you deploy your LMS application on a VPS managed through EasyPanel.

## Quick Start

**Before you begin:** Review the [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) for a complete step-by-step checklist.

**Replace domain placeholders:** Use the provided script to automatically replace all domain placeholders:
```bash
./scripts/replace-domain.sh your-domain.com
```

## Prerequisites

1. **VPS with EasyPanel** installed and accessible
   - Minimum: 2 CPU cores, 4GB RAM, 20GB storage
   - Recommended: 4 CPU cores, 8GB RAM, 50GB storage
   - OS: Ubuntu 20.04/22.04 or Debian 11/12
2. **Domain name** pointing to your VPS IP
   - DNS A record configured
   - DNS propagation completed (may take 24-48 hours)
3. **SSH access** to your VPS
   - Root or sudo access required
4. **Basic knowledge** of Linux commands
5. **Credentials ready:**
   - Database password (strong, random)
   - Session secret (generate with: `openssl rand -base64 32`)
   - SMTP credentials (if using email)

## Step 1: Access Your VPS via EasyPanel

### Via EasyPanel Web Interface

1. Log in to your EasyPanel dashboard
2. Navigate to your VPS instance
3. Use the **Terminal** or **SSH** feature to access your server

### Via SSH (Recommended)

1. Get your VPS IP and SSH credentials from EasyPanel
2. Connect via SSH:
   ```bash
   ssh root@your-vps-ip
   # or
   ssh username@your-vps-ip
   ```

## Step 2: Install Required Software

### 2.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Node.js (v20 or later)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x or later
npm --version
```

### 2.3 Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE lmsc;
CREATE USER lmsc_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE lmsc TO lmsc_user;
\q
EOF
```

**Important:** Replace `'your_secure_password_here'` with a strong password.

### 2.4 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 2.5 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 3: Clone/Upload Your Application

### Option A: Using Git (Recommended)

```bash
# Create application directory
sudo mkdir -p /var/www/lmsc
sudo chown -R $USER:$USER /var/www/lmsc

# Clone your repository
cd /var/www/lmsc
git clone https://github.com/your-username/your-repo.git .
# OR if you're using SSH:
# git clone git@github.com:your-username/your-repo.git .
```

### Option B: Upload via SFTP/File Manager

1. Use EasyPanel's **File Manager** or an SFTP client (FileZilla, WinSCP)
2. Upload your project files to `/var/www/lmsc`
3. Extract if needed:
   ```bash
   cd /var/www/lmsc
   unzip your-project.zip
   ```

## Step 4: Configure Environment Variables

```bash
cd /var/www/lmsc

# Create .env file
nano .env
```

### Complete Environment Variables Template

Copy and paste this complete template, then replace all placeholders:

```env
# ==========================================
# DATABASE CONFIGURATION
# ==========================================
# Format: postgresql://user:password@host:port/database?schema=public
DATABASE_URL="postgresql://lmsc_user:YOUR_DB_PASSWORD@localhost:5432/lmsc?schema=public"

# ==========================================
# NEXT.JS CONFIGURATION
# ==========================================
NODE_ENV=production
# Your full domain URL (with https://)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# ==========================================
# AUTHENTICATION & SESSION
# ==========================================
# Generate a secure random string: openssl rand -base64 32
SESSION_SECRET="YOUR_SESSION_SECRET_HERE"

# ==========================================
# SMTP/EMAIL CONFIGURATION (Required for OTP emails)
# ==========================================
# Gmail SMTP Example:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
# For Gmail, use an App Password (not your regular password)
# Generate at: https://myaccount.google.com/apppasswords
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com

# Alternative SMTP providers:
# Outlook/Hotmail: smtp-mail.outlook.com:587
# SendGrid: smtp.sendgrid.net:587
# Mailgun: smtp.mailgun.org:587
# Custom SMTP: your-smtp-server.com:587

# ==========================================
# FILE UPLOADS & PATHS
# ==========================================
UPLOAD_DIR=./uploads
CERTIFICATES_DIR=./certificates

# ==========================================
# OPTIONAL: ADVANCED SETTINGS
# ==========================================
# Port for Next.js (default: 3000)
PORT=3000

# Logging level (optional)
LOG_LEVEL=info
```

### Important Notes:

1. **Database Password:**
   - Replace `YOUR_DB_PASSWORD` with the password you created in Step 2.3
   - Must match the password you set for `lmsc_user`

2. **Domain:**
   - Replace `your-domain.com` with your actual domain
   - Must include `https://` protocol
   - Use the script: `./scripts/replace-domain.sh your-domain.com`

3. **Session Secret:**
   - Generate a secure random string: `openssl rand -base64 32`
   - Replace `YOUR_SESSION_SECRET_HERE` with the generated value
   - Keep this secret - never commit to Git

4. **SMTP Configuration:**
   - **Required** for OTP email functionality
   - For Gmail: Use App Password (not regular password)
   - For other providers: Use their SMTP settings
   - Test after deployment in Admin Settings

5. **Security:**
   - Set file permissions: `chmod 600 .env`
   - Never commit `.env` to Git (should be in `.gitignore`)

### Verify Environment Variables:

```bash
# Check if .env file exists and has content
cat .env | grep -v "^#" | grep -v "^$"

# Test database connection
npx prisma db pull
```

Save and exit (Ctrl+X, then Y, then Enter).

## Step 5: Install Dependencies and Build

```bash
cd /var/www/lmsc

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build the application
npm run build
```

## Step 6: Configure PM2

```bash
cd /var/www/lmsc

# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 7: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/lmsc
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # For now, proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase upload size limit
    client_max_body_size 50M;
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/lmsc /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 8: Setup SSL Certificate (HTTPS)

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure Nginx for HTTPS
```

### After SSL Setup

Update your Nginx configuration to redirect HTTP to HTTPS:

```bash
sudo nano /etc/nginx/sites-available/lmsc
```

Uncomment the redirect line:
```nginx
return 301 https://$server_name$request_uri;
```

Reload Nginx:
```bash
sudo systemctl reload nginx
```

## Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 10: Setup Automatic Backups

```bash
cd /var/www/lmsc

# Make backup script executable
chmod +x backup.sh

# Setup cron job for daily backups at 2 AM
sudo crontab -e
```

Add this line:
```
0 2 * * * /var/www/lmsc/backup.sh
```

## Step 11: Verify Deployment

1. **Check Application Status:**
   ```bash
   pm2 status
   pm2 logs
   ```

2. **Check Nginx Status:**
   ```bash
   sudo systemctl status nginx
   ```

3. **Check Database Connection:**
   ```bash
   cd /var/www/lmsc
   npx prisma db pull
   ```

4. **Access Your Application:**
   - Open your browser and navigate to `https://your-domain.com`
   - You should see your LMS application

## Step 12: Post-Deployment Tasks

### Create Super Admin User

If you haven't seeded the database, you may need to create a super admin user:

```bash
cd /var/www/lmsc
npx ts-node prisma/seed.ts
```

Or manually via database:

```bash
sudo -u postgres psql -d lmsc
```

### Configure Initial Settings

1. Log in to your application
2. Navigate to Admin Settings
3. Configure:
   - Company branding (logo, colors)
   - SMTP settings
   - Other system settings

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs lmsc

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart application
pm2 restart lmsc
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -U lmsc_user -d lmsc -h localhost
```

### Nginx 502 Bad Gateway

```bash
# Check if Next.js is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### File Upload Issues

```bash
# Check upload directory permissions
ls -la /var/www/lmsc/uploads
sudo chown -R $USER:$USER /var/www/lmsc/uploads
sudo chmod -R 755 /var/www/lmsc/uploads
```

## Updating Your Application

```bash
cd /var/www/lmsc

# Pull latest changes (if using Git)
git pull origin main

# Install new dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart application
pm2 restart lmsc
```

## Useful Commands

```bash
# View application logs
pm2 logs lmsc

# Restart application
pm2 restart lmsc

# Stop application
pm2 stop lmsc

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h
```

## Security Recommendations

1. **Change default passwords** for database and admin accounts
2. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
3. **Regular backups** - ensure backup script runs daily
4. **Firewall** - only allow necessary ports
5. **SSL/HTTPS** - always use HTTPS in production
6. **Environment variables** - never commit `.env` file to Git
7. **File permissions** - ensure proper permissions on uploads directory

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check application logs in the browser console
4. Verify all environment variables are set correctly

## Additional Resources

### Quick Reference

- **Deployment Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Complete step-by-step checklist
- **Replace Domain Script**: `./scripts/replace-domain.sh your-domain.com` - Automatically replace all domain placeholders
- **Deployment Script**: `./deploy.sh` - Automated deployment script

### Useful Links

- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/application-declaration/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Let's Encrypt**: https://letsencrypt.org/getting-started/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

### Getting Help

If you encounter issues:

1. **Check the logs:**
   ```bash
   pm2 logs lms-app --lines 100
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Review the checklist:**
   - Open [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
   - Go to "Common Issues & Solutions" section

3. **Verify configuration:**
   - Environment variables set correctly
   - Services running (PM2, Nginx, PostgreSQL)
   - Firewall rules correct
   - DNS pointing to correct IP

4. **Check system resources:**
   ```bash
   df -h          # Disk space
   free -h        # Memory
   htop           # CPU/Memory usage
   ```

---

**Note:** This guide assumes you have root or sudo access to your VPS. Adjust commands accordingly if you're using a different user account.

**Last Updated:** 2025-01-11


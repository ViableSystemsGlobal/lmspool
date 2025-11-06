#!/bin/bash

# Script to replace all domain placeholders in deployment files
# Usage: ./scripts/replace-domain.sh your-domain.com

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Domain name required${NC}"
    echo "Usage: ./scripts/replace-domain.sh your-domain.com"
    exit 1
fi

DOMAIN=$1
DOMAIN_WWW="www.$DOMAIN"

# Validate domain format (basic check)
if [[ ! $DOMAIN =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${YELLOW}⚠️  Warning: Domain format may be invalid. Continue anyway? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}🔄 Replacing domain placeholders with: $DOMAIN${NC}"
echo -e "${GREEN}   (www: $DOMAIN_WWW)${NC}"
echo ""

# Files to update
FILES=(
    "DEPLOYMENT_EASYPANEL.md"
    "DEPLOYMENT_HPANEL.md"
    "DEPLOYMENT.md"
    "QUICK_DEPLOY.md"
    "nginx.conf"
    "ecosystem.config.js"
    ".env.example"
)

REPLACED=0

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        # Replace domain placeholders
        if sed -i.bak "s/your-domain\.com/$DOMAIN/g; s/www\.your-domain\.com/$DOMAIN_WWW/g; s/your_domain/$DOMAIN/g" "$file" 2>/dev/null; then
            rm -f "$file.bak"
            echo -e "${GREEN}✅ Updated: $file${NC}"
            REPLACED=$((REPLACED + 1))
        fi
    fi
done

# Also check for any other common patterns
echo ""
echo -e "${GREEN}📝 Checking for other domain references...${NC}"

# Find all files that might contain domain references
grep -r "your-domain\|your_domain\|example\.com" --include="*.md" --include="*.conf" --include="*.js" --include="*.ts" --include="*.env*" . 2>/dev/null | grep -v node_modules | grep -v ".next" || echo "No additional references found"

echo ""
echo -e "${GREEN}✅ Replaced domain in $REPLACED file(s)${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important: Please review the changes before committing!${NC}"
echo -e "${YELLOW}   Run: git diff to see what changed${NC}"


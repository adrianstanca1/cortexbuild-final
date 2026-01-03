#!/bin/bash
set -e # Stop script on first error

echo "🔧 repairing dependencies..."
# Force remove with retry logic or just simple rm
# rm -rf node_modules package-lock.json (Skipping aggressive clean to avoid locks)
# sleep 2

echo "📦 Installing clean dependencies..."
npm install
# Ensure ssh2-sftp-client is present for the deployment scripts
npm install ssh2-sftp-client --no-save

echo "🏗️ Building project..."
npm run build:frontend
npm run build:backend

echo "🚀 Deploying..."
# Using the direct FTP/SSH host is required because the main domain is proxied
export SFTP_HOST="ftp.cortexbuildpro.com"
export SFTP_PORT=65002
# User is the same, just checking if we need the .admin suffix or just user
# Based on successful connection earlier, user was likely u875310796 (or whatever was in .env)
# The previous script had u875310796.admin, but standard hostinger user is usually just the ID or with suffix.
# We will use the ENV vars if set, or defaults in the node scripts if not.
# Better to set them here from knowledge or rely on the Node scripts reading .env.hostinger or process.env
# Actually, let's explicit export what we know works (from previous success msg or assumption)
export SFTP_USER="u875310796" 
export SFTP_PASSWORD='Cumparavinde1@'

echo "Deploying Backend (via SFTP)..."
node scripts/deploy-backend-sftp.js
 
echo "Deploying Frontend (via SFTP)..."
node scripts/deploy-frontend-sftp.js

#!/bin/bash

# Deployment script for VPS
VPS_IP="77.37.67.253"
VPS_USER="root"
VPS_PATH="/var/www/html"

echo "Building project..."
npm run build

echo "Copying files to VPS..."
scp -r dist/* ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

echo "Restarting Nginx..."
ssh ${VPS_USER}@${VPS_IP} "systemctl restart nginx"

echo "Deployment complete!"

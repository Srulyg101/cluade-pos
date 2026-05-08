#!/bin/bash
set -e

echo "🚀 Starting POS deployment..."

# Install Node.js 20
if ! command -v node &>/dev/null; then
  echo "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node $(node --version)"

# Install git
if ! command -v git &>/dev/null; then
  apt-get install -y git
fi

# Install PM2
if ! command -v pm2 &>/dev/null; then
  echo "📦 Installing PM2..."
  npm install -g pm2
fi

# Deploy app
echo "📥 Cloning repo..."
cd /opt
rm -rf cluade-pos
git clone https://github.com/Srulyg101/cluade-pos.git
cd cluade-pos
git checkout claude/build-pos-system-v7SBY

echo "📦 Installing dependencies..."
npm install --production

# Stop old instance if running
pm2 stop pos 2>/dev/null || true
pm2 delete pos 2>/dev/null || true

# Start app
echo "▶️  Starting POS server..."
pm2 start server.js --name pos --restart-delay=3000

# Start admin API
pm2 stop admin-api 2>/dev/null || true
pm2 delete admin-api 2>/dev/null || true
pm2 start admin-api.js --name admin-api

pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

# Firewall
ufw allow 3000 2>/dev/null || true
ufw allow 4000 2>/dev/null || true

echo ""
echo "✅ Deployment complete!"
echo "🌐 POS live at:       http://92.242.187.95:3000"
echo "🔧 Admin API live at: http://92.242.187.95:4000"
echo ""
pm2 status

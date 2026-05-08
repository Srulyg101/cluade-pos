#!/bin/bash
set -e

echo "🚀 Starting POS deployment..."

# Install Node.js if needed
if ! command -v node &>/dev/null; then
  echo "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node $(node --version)"

# Install git & nginx if needed
apt-get install -y git nginx 2>/dev/null

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

# Setup nginx
echo "🔧 Configuring nginx..."
cp nginx.conf /etc/nginx/sites-available/pos
ln -sf /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/pos
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx && systemctl enable nginx

# Stop old PM2 processes
pm2 stop pos 2>/dev/null || true
pm2 delete pos 2>/dev/null || true
pm2 stop admin-api 2>/dev/null || true
pm2 delete admin-api 2>/dev/null || true
pm2 stop webhook 2>/dev/null || true
pm2 delete webhook 2>/dev/null || true

# Start all processes
echo "▶️  Starting services..."
pm2 start server.js --name pos
pm2 start admin-api.js --name admin-api
pm2 start webhook.js --name webhook

pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

# Firewall
ufw allow 80 2>/dev/null || true
ufw allow 3008 2>/dev/null || true

echo ""
echo "✅ All done!"
echo "🌐 POS:      http://92.242.187.95"
echo "🔧 Admin:    http://92.242.187.95/admin/ping"
echo "🔗 Webhook:  http://92.242.187.95/webhook"
echo ""
pm2 status

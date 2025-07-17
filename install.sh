#!/bin/bash
set -euo pipefail

# Security Audit Server Installation Script
# For Linux Headless Systems

echo "🛡️  Installing Security Audit Server..."

# Configuration
USER="audit"
GROUP="audit"
INSTALL_DIR="/opt/security-audit"
DATA_DIR="/opt/security-audit/data"
SSH_DIR="/opt/security-audit/.ssh"
SERVICE_NAME="security-audit"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    DIST=$ID
else
    log_error "Cannot detect Linux distribution"
    exit 1
fi

log_info "Detected OS: $OS"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    log_info "Installing Node.js..."
    
    case $DIST in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
            ;;
        centos|rhel|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs npm
            ;;
        *)
            log_error "Unsupported distribution: $DIST"
            exit 1
            ;;
    esac
    
    log_success "Node.js installed"
else
    log_info "Node.js is already installed ($(node --version))"
fi

# Create user and group
if ! id "$USER" &>/dev/null; then
    log_info "Creating user: $USER"
    useradd --system --create-home --shell /bin/bash --groups sudo "$USER"
    log_success "User $USER created"
else
    log_info "User $USER already exists"
fi

# Create directories
log_info "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$SSH_DIR"
mkdir -p "$DATA_DIR/audit-results"
mkdir -p "$DATA_DIR/logs"

# Copy application files
log_info "Copying application files..."
cp -r * "$INSTALL_DIR/"

# Set ownership
chown -R "$USER:$GROUP" "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR"
chmod 700 "$SSH_DIR"

# Install dependencies
log_info "Installing Node.js dependencies..."
cd "$INSTALL_DIR"
sudo -u "$USER" npm install

# Generate SSH key if not exists
if [ ! -f "$SSH_DIR/id_rsa" ]; then
    log_info "Generating SSH key pair..."
    sudo -u "$USER" ssh-keygen -t rsa -b 4096 -f "$SSH_DIR/id_rsa" -N ""
    log_success "SSH key pair generated"
    log_info "Public key location: $SSH_DIR/id_rsa.pub"
else
    log_info "SSH key already exists"
fi

# Install systemd service
log_info "Installing systemd service..."
cp security-audit.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable $SERVICE_NAME
log_success "Systemd service installed and enabled"

# Configure firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    log_info "Configuring firewall..."
    ufw allow 3000/tcp comment "Security Audit HTTP"
    ufw allow 3001/tcp comment "Security Audit WebSocket"
    log_success "Firewall rules added"
fi

# Create configuration template
cat > "$INSTALL_DIR/config/default.json" << EOF
{
  "server": {
    "port": 3000,
    "wsPort": 3001,
    "host": "0.0.0.0"
  },
  "security": {
    "maxConnections": 10,
    "sessionTimeout": 3600
  },
  "logging": {
    "level": "info",
    "maxFiles": 30
  },
  "ollama": {
    "url": "http://127.0.0.1:11434",
    "timeout": 60000
  }
}
EOF

chown "$USER:$GROUP" "$INSTALL_DIR/config/default.json"

# Start service
log_info "Starting Security Audit service..."
systemctl start $SERVICE_NAME

# Wait for service to start
sleep 5

# Check service status
if systemctl is-active --quiet $SERVICE_NAME; then
    log_success "Security Audit Server is running!"
    
    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "┌─────────────────────────────────────────────────┐"
    echo "│  🛡️  Security Audit Server - Installation Done │"
    echo "├─────────────────────────────────────────────────┤"
    echo "│  Access URL: http://$SERVER_IP:3000          │"
    echo "│  WebSocket:  ws://$SERVER_IP:3001            │"
    echo "│  Data Dir:   $DATA_DIR                     │"
    echo "│  SSH Key:    $SSH_DIR/id_rsa.pub           │"
    echo "│  Service:    systemctl status $SERVICE_NAME      │"
    echo "│  Logs:       journalctl -u $SERVICE_NAME -f      │"
    echo "└─────────────────────────────────────────────────┘"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Copy SSH public key to target servers:"
    echo "   cat $SSH_DIR/id_rsa.pub"
    echo ""
    echo "2. Start Ollama service (if needed):"
    echo "   ollama serve"
    echo ""
    echo "3. Access web interface:"
    echo "   http://$SERVER_IP:3000"
    echo ""
    echo "4. Check service status:"
    echo "   sudo systemctl status $SERVICE_NAME"
    echo ""
    
else
    log_error "Service failed to start"
    systemctl status $SERVICE_NAME
    exit 1
fi

log_success "Installation completed successfully!"
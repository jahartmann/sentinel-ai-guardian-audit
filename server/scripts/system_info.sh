#!/bin/bash

# System Information Collection Script
# This script collects comprehensive system information for audit purposes

echo "Starting system information collection..."

# Create temporary file for results
RESULT_FILE="/tmp/system_info_$(date +%s).json"

# Function to safely execute commands and capture output
safe_exec() {
    local cmd="$1"
    local output
    output=$(eval "$cmd" 2>/dev/null) || output="Command failed or not available"
    echo "$output"
}

# Start JSON output
cat > "$RESULT_FILE" << 'EOF'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "hostname": "$(hostname)",
  "system": {
EOF

# Basic system information
echo '    "uname": "'"$(safe_exec 'uname -a')"'",' >> "$RESULT_FILE"
echo '    "uptime": "'"$(safe_exec 'uptime')"'",' >> "$RESULT_FILE"
echo '    "date": "'"$(safe_exec 'date')"'",' >> "$RESULT_FILE"

# Operating System
echo '    "os_release": "'"$(safe_exec 'cat /etc/os-release | tr "\n" " "')"'",' >> "$RESULT_FILE"
echo '    "kernel": "'"$(safe_exec 'uname -r')"'",' >> "$RESULT_FILE"

# Hardware Information
echo '    "cpu_info": "'"$(safe_exec 'cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2 | xargs')"'",' >> "$RESULT_FILE"
echo '    "cpu_cores": "'"$(safe_exec 'nproc')"'",' >> "$RESULT_FILE"
echo '    "memory_info": "'"$(safe_exec 'cat /proc/meminfo | head -10 | tr "\n" " "')"'",' >> "$RESULT_FILE"

# Storage Information
echo '    "disk_usage": "'"$(safe_exec 'df -h | tr "\n" " "')"'",' >> "$RESULT_FILE"
echo '    "mount_points": "'"$(safe_exec 'mount | tr "\n" " "')"'",' >> "$RESULT_FILE"

# Network Information
echo '    "network_interfaces": "'"$(safe_exec 'ip addr show | tr "\n" " "')"'",' >> "$RESULT_FILE"
echo '    "network_routes": "'"$(safe_exec 'ip route | tr "\n" " "')"'",' >> "$RESULT_FILE"
echo '    "dns_config": "'"$(safe_exec 'cat /etc/resolv.conf | tr "\n" " "')"'",' >> "$RESULT_FILE"

# Process Information
echo '    "running_processes": "'"$(safe_exec 'ps aux --sort=-%cpu | head -20 | tr "\n" " "')"'",' >> "$RESULT_FILE"
echo '    "systemd_services": "'"$(safe_exec 'systemctl list-units --type=service --state=active | tr "\n" " "')"'",' >> "$RESULT_FILE"

# Security Information
echo '    "users": "'"$(safe_exec 'cat /etc/passwd | tr "\n" " "')"'",' >> "$RESULT_FILE"
echo '    "groups": "'"$(safe_exec 'cat /etc/group | tr "\n" " "')"'",' >> "$RESULT_FILE"
echo '    "sudo_users": "'"$(safe_exec 'getent group sudo | cut -d: -f4')"'",' >> "$RESULT_FILE"

# SSH Configuration
echo '    "ssh_config": "'"$(safe_exec 'cat /etc/ssh/sshd_config | grep -v "^#" | grep -v "^$" | tr "\n" " "')"'",' >> "$RESULT_FILE"

# Firewall Status
echo '    "firewall_status": "'"$(safe_exec 'ufw status || iptables -L -n | head -20 | tr "\n" " "')"'",' >> "$RESULT_FILE"

# Package Information
if command -v apt > /dev/null; then
    echo '    "package_manager": "apt",' >> "$RESULT_FILE"
    echo '    "installed_packages": "'"$(safe_exec 'dpkg --get-selections | wc -l')"'",' >> "$RESULT_FILE"
    echo '    "package_updates": "'"$(safe_exec 'apt list --upgradable 2>/dev/null | head -20 | tr "\n" " "')"'",' >> "$RESULT_FILE"
elif command -v yum > /dev/null; then
    echo '    "package_manager": "yum",' >> "$RESULT_FILE"
    echo '    "installed_packages": "'"$(safe_exec 'rpm -qa | wc -l')"'",' >> "$RESULT_FILE"
    echo '    "package_updates": "'"$(safe_exec 'yum check-update | head -20 | tr "\n" " "')"'",' >> "$RESULT_FILE"
elif command -v pacman > /dev/null; then
    echo '    "package_manager": "pacman",' >> "$RESULT_FILE"
    echo '    "installed_packages": "'"$(safe_exec 'pacman -Q | wc -l')"'",' >> "$RESULT_FILE"
    echo '    "package_updates": "'"$(safe_exec 'pacman -Qu | head -20 | tr "\n" " "')"'",' >> "$RESULT_FILE"
else
    echo '    "package_manager": "unknown",' >> "$RESULT_FILE"
    echo '    "installed_packages": "0",' >> "$RESULT_FILE"
    echo '    "package_updates": "",' >> "$RESULT_FILE"
fi

# System Load
echo '    "load_average": "'"$(safe_exec 'cat /proc/loadavg')"'",' >> "$RESULT_FILE"
echo '    "memory_usage": "'"$(safe_exec 'free -h | tr "\n" " "')"'"' >> "$RESULT_FILE"

# Close JSON
echo '  }' >> "$RESULT_FILE"
echo '}' >> "$RESULT_FILE"

# Output the result file content
cat "$RESULT_FILE"

# Clean up
rm -f "$RESULT_FILE"

echo "System information collection completed."
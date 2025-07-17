#!/bin/bash
set -euo pipefail

# Universal Linux System Data Collection Script
# Works on: Ubuntu, Debian, CentOS, RHEL, SUSE, Arch, Alpine, Proxmox, etc.

SCRIPT_VERSION="1.0.0"
SHARED_DIR="${1:-/tmp}"
OUTPUT_FILE="${SHARED_DIR}/system_audit_$(hostname)_$(date +%Y%m%d_%H%M%S).tar.gz"
tmp_dir=$(mktemp -d -p /tmp system_audit.XXXXXX)

# Cleanup on exit
trap 'rm -rf "${tmp_dir}"' EXIT

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

detect_system() {
    local system_type="unknown"
    
    if [ -f /etc/os-release ]; then
        source /etc/os-release
        case "${ID:-unknown}" in
            ubuntu|debian) system_type="debian" ;;
            centos|rhel|fedora|rocky|almalinux) system_type="redhat" ;;
            opensuse*|sles) system_type="suse" ;;
            arch|manjaro) system_type="arch" ;;
            alpine) system_type="alpine" ;;
            *) system_type="generic" ;;
        esac
        
        # Check for specific environments
        if command -v pveversion >/dev/null 2>&1; then
            system_type="proxmox"
        elif command -v docker >/dev/null 2>&1 && [ -f /.dockerenv ]; then
            system_type="docker"
        elif systemd-detect-virt -q 2>/dev/null; then
            system_type="virtual"
        fi
    fi
    
    echo "$system_type"
}

gather_basic_info() {
    local dest_dir="${1}/basic"
    mkdir -p "${dest_dir}"
    
    log "Gathering basic system information..."
    
    # System identification
    uname -a > "${dest_dir}/uname.txt" 2>/dev/null || true
    hostname > "${dest_dir}/hostname.txt" 2>/dev/null || true
    cat /etc/os-release > "${dest_dir}/os_release.txt" 2>/dev/null || true
    lsb_release -a > "${dest_dir}/lsb_release.txt" 2>/dev/null || true
    uptime > "${dest_dir}/uptime.txt" 2>/dev/null || true
    date > "${dest_dir}/collection_date.txt" 2>/dev/null || true
    whoami > "${dest_dir}/current_user.txt" 2>/dev/null || true
    id > "${dest_dir}/user_id.txt" 2>/dev/null || true
    
    # System load and performance
    cat /proc/loadavg > "${dest_dir}/loadavg.txt" 2>/dev/null || true
    cat /proc/cpuinfo > "${dest_dir}/cpuinfo.txt" 2>/dev/null || true
    cat /proc/meminfo > "${dest_dir}/meminfo.txt" 2>/dev/null || true
    cat /proc/version > "${dest_dir}/kernel_version.txt" 2>/dev/null || true
}

gather_hardware_info() {
    local dest_dir="${1}/hardware"
    mkdir -p "${dest_dir}"
    
    log "Gathering hardware information..."
    
    # CPU information
    lscpu > "${dest_dir}/lscpu.txt" 2>/dev/null || true
    cat /proc/cpuinfo > "${dest_dir}/proc_cpuinfo.txt" 2>/dev/null || true
    
    # Memory information
    free -h > "${dest_dir}/memory_usage.txt" 2>/dev/null || true
    cat /proc/meminfo > "${dest_dir}/proc_meminfo.txt" 2>/dev/null || true
    
    # Storage information
    df -h > "${dest_dir}/disk_usage.txt" 2>/dev/null || true
    lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE,UUID > "${dest_dir}/block_devices.txt" 2>/dev/null || true
    fdisk -l > "${dest_dir}/disk_partitions.txt" 2>/dev/null || true
    cat /proc/mounts > "${dest_dir}/mounts.txt" 2>/dev/null || true
    
    # Hardware devices
    lspci -vv > "${dest_dir}/pci_devices.txt" 2>/dev/null || true
    lsusb -v > "${dest_dir}/usb_devices.txt" 2>/dev/null || true
    lshw -html > "${dest_dir}/hardware_summary.html" 2>/dev/null || true
    dmidecode > "${dest_dir}/dmidecode.txt" 2>/dev/null || true
    
    # SMART data for all drives
    if command -v smartctl >/dev/null 2>&1; then
        smartctl --scan > "${dest_dir}/smart_scan.txt" 2>/dev/null || true
        for disk in $(lsblk -d -n -o NAME | grep -E '^(sd|nvme|hd)'); do
            smartctl -a "/dev/$disk" > "${dest_dir}/smart_${disk}.txt" 2>/dev/null || true
        done
    fi
}

gather_network_info() {
    local dest_dir="${1}/network"
    mkdir -p "${dest_dir}"
    
    log "Gathering network information..."
    
    # Network interfaces and configuration
    ip addr show > "${dest_dir}/ip_addresses.txt" 2>/dev/null || true
    ip route show > "${dest_dir}/routing_table.txt" 2>/dev/null || true
    ip link show > "${dest_dir}/network_interfaces.txt" 2>/dev/null || true
    
    # Network statistics
    ss -tuln > "${dest_dir}/listening_ports.txt" 2>/dev/null || true
    ss -tun > "${dest_dir}/network_connections.txt" 2>/dev/null || true
    netstat -i > "${dest_dir}/interface_statistics.txt" 2>/dev/null || true
    
    # Network configuration files
    cat /etc/hosts > "${dest_dir}/hosts.txt" 2>/dev/null || true
    cat /etc/resolv.conf > "${dest_dir}/dns_config.txt" 2>/dev/null || true
    cat /etc/nsswitch.conf > "${dest_dir}/nsswitch.txt" 2>/dev/null || true
    
    # Firewall information
    iptables -L -n -v > "${dest_dir}/iptables.txt" 2>/dev/null || true
    ip6tables -L -n -v > "${dest_dir}/ip6tables.txt" 2>/dev/null || true
    ufw status verbose > "${dest_dir}/ufw_status.txt" 2>/dev/null || true
    firewall-cmd --list-all > "${dest_dir}/firewalld.txt" 2>/dev/null || true
}

gather_security_info() {
    local dest_dir="${1}/security"
    mkdir -p "${dest_dir}"
    
    log "Gathering security information..."
    
    # User and group information
    cat /etc/passwd > "${dest_dir}/users.txt" 2>/dev/null || true
    cat /etc/group > "${dest_dir}/groups.txt" 2>/dev/null || true
    cat /etc/shadow > "${dest_dir}/shadow.txt" 2>/dev/null || true
    getent passwd > "${dest_dir}/getent_passwd.txt" 2>/dev/null || true
    
    # Sudo configuration
    cat /etc/sudoers > "${dest_dir}/sudoers.txt" 2>/dev/null || true
    find /etc/sudoers.d -type f -exec cat {} \; > "${dest_dir}/sudoers_d.txt" 2>/dev/null || true
    
    # SSH configuration
    cat /etc/ssh/sshd_config > "${dest_dir}/sshd_config.txt" 2>/dev/null || true
    cat /etc/ssh/ssh_config > "${dest_dir}/ssh_config.txt" 2>/dev/null || true
    
    # File permissions and capabilities
    find /usr/bin /usr/sbin /bin /sbin -perm -4000 -type f > "${dest_dir}/suid_files.txt" 2>/dev/null || true
    find /usr/bin /usr/sbin /bin /sbin -perm -2000 -type f > "${dest_dir}/sgid_files.txt" 2>/dev/null || true
    getcap -r / > "${dest_dir}/capabilities.txt" 2>/dev/null || true
    
    # Security modules
    sestatus > "${dest_dir}/selinux_status.txt" 2>/dev/null || true
    aa-status > "${dest_dir}/apparmor_status.txt" 2>/dev/null || true
    
    # Login information
    last -n 50 > "${dest_dir}/last_logins.txt" 2>/dev/null || true
    lastb -n 50 > "${dest_dir}/failed_logins.txt" 2>/dev/null || true
    w > "${dest_dir}/current_sessions.txt" 2>/dev/null || true
}

gather_processes_services() {
    local dest_dir="${1}/processes"
    mkdir -p "${dest_dir}"
    
    log "Gathering process and service information..."
    
    # Running processes
    ps aux --sort=-%cpu > "${dest_dir}/processes_by_cpu.txt" 2>/dev/null || true
    ps aux --sort=-%mem > "${dest_dir}/processes_by_memory.txt" 2>/dev/null || true
    pstree -p > "${dest_dir}/process_tree.txt" 2>/dev/null || true
    
    # System services
    if command -v systemctl >/dev/null 2>&1; then
        systemctl list-units --type=service > "${dest_dir}/systemd_services.txt" 2>/dev/null || true
        systemctl list-units --type=service --state=failed > "${dest_dir}/failed_services.txt" 2>/dev/null || true
        systemctl list-timers > "${dest_dir}/systemd_timers.txt" 2>/dev/null || true
    fi
    
    # Init system specific
    if [ -d /etc/init.d ]; then
        ls -la /etc/init.d/ > "${dest_dir}/init_d_services.txt" 2>/dev/null || true
    fi
    
    # Scheduled tasks
    crontab -l > "${dest_dir}/user_crontab.txt" 2>/dev/null || true
    cat /etc/crontab > "${dest_dir}/system_crontab.txt" 2>/dev/null || true
    find /etc/cron.* -type f -exec cat {} \; > "${dest_dir}/cron_jobs.txt" 2>/dev/null || true
    
    # Open files and network connections
    lsof > "${dest_dir}/open_files.txt" 2>/dev/null || true
}

gather_packages_software() {
    local dest_dir="${1}/packages"
    mkdir -p "${dest_dir}"
    
    log "Gathering package and software information..."
    
    # Package managers
    if command -v dpkg >/dev/null 2>&1; then
        dpkg -l > "${dest_dir}/dpkg_packages.txt" 2>/dev/null || true
        apt list --installed > "${dest_dir}/apt_packages.txt" 2>/dev/null || true
        apt list --upgradable > "${dest_dir}/apt_upgradable.txt" 2>/dev/null || true
    fi
    
    if command -v rpm >/dev/null 2>&1; then
        rpm -qa > "${dest_dir}/rpm_packages.txt" 2>/dev/null || true
        yum list installed > "${dest_dir}/yum_packages.txt" 2>/dev/null || true
        dnf list installed > "${dest_dir}/dnf_packages.txt" 2>/dev/null || true
    fi
    
    if command -v pacman >/dev/null 2>&1; then
        pacman -Q > "${dest_dir}/pacman_packages.txt" 2>/dev/null || true
    fi
    
    if command -v apk >/dev/null 2>&1; then
        apk list -I > "${dest_dir}/apk_packages.txt" 2>/dev/null || true
    fi
    
    # Development tools and languages
    python3 --version > "${dest_dir}/python_version.txt" 2>/dev/null || true
    node --version > "${dest_dir}/nodejs_version.txt" 2>/dev/null || true
    java -version > "${dest_dir}/java_version.txt" 2>&1 || true
    php --version > "${dest_dir}/php_version.txt" 2>/dev/null || true
    ruby --version > "${dest_dir}/ruby_version.txt" 2>/dev/null || true
    go version > "${dest_dir}/go_version.txt" 2>/dev/null || true
    
    # Container runtimes
    docker --version > "${dest_dir}/docker_version.txt" 2>/dev/null || true
    docker images > "${dest_dir}/docker_images.txt" 2>/dev/null || true
    docker ps -a > "${dest_dir}/docker_containers.txt" 2>/dev/null || true
    podman --version > "${dest_dir}/podman_version.txt" 2>/dev/null || true
}

gather_logs() {
    local dest_dir="${1}/logs"
    mkdir -p "${dest_dir}"
    
    log "Gathering system logs..."
    
    # Systemd journal logs
    if command -v journalctl >/dev/null 2>&1; then
        journalctl --since "7 days ago" --no-pager > "${dest_dir}/journal_7days.log" 2>/dev/null || true
        journalctl --since "24 hours ago" -p err --no-pager > "${dest_dir}/journal_errors_24h.log" 2>/dev/null || true
        journalctl --since "24 hours ago" -u ssh.service --no-pager > "${dest_dir}/ssh_service.log" 2>/dev/null || true
    fi
    
    # Traditional log files
    if [ -f /var/log/syslog ]; then
        tail -n 1000 /var/log/syslog > "${dest_dir}/syslog_tail.log" 2>/dev/null || true
    fi
    
    if [ -f /var/log/auth.log ]; then
        tail -n 1000 /var/log/auth.log > "${dest_dir}/auth_tail.log" 2>/dev/null || true
    fi
    
    if [ -f /var/log/messages ]; then
        tail -n 1000 /var/log/messages > "${dest_dir}/messages_tail.log" 2>/dev/null || true
    fi
    
    # Boot logs
    dmesg > "${dest_dir}/dmesg.log" 2>/dev/null || true
}

gather_specialized_info() {
    local dest_dir="${1}/specialized"
    local system_type="$2"
    mkdir -p "${dest_dir}"
    
    log "Gathering specialized information for: $system_type"
    
    case "$system_type" in
        "proxmox")
            gather_proxmox_info "$dest_dir"
            ;;
        "docker")
            gather_docker_info "$dest_dir"
            ;;
        "virtual")
            gather_virtual_info "$dest_dir"
            ;;
    esac
}

gather_proxmox_info() {
    local dest_dir="$1"
    
    log "Gathering Proxmox-specific information..."
    
    # Proxmox version and status
    pveversion -v > "${dest_dir}/pve_version.txt" 2>/dev/null || true
    pvecm status > "${dest_dir}/cluster_status.txt" 2>/dev/null || true
    pvesm status > "${dest_dir}/storage_status.txt" 2>/dev/null || true
    
    # VM and container lists
    qm list > "${dest_dir}/vm_list.txt" 2>/dev/null || true
    pct list > "${dest_dir}/container_list.txt" 2>/dev/null || true
    
    # Configurations
    cp -r /etc/pve "${dest_dir}/pve_config" 2>/dev/null || true
    
    # HA status
    ha-status > "${dest_dir}/ha_status.txt" 2>/dev/null || true
}

gather_docker_info() {
    local dest_dir="$1"
    
    log "Gathering Docker-specific information..."
    
    docker info > "${dest_dir}/docker_info.txt" 2>/dev/null || true
    docker system df > "${dest_dir}/docker_disk_usage.txt" 2>/dev/null || true
    docker network ls > "${dest_dir}/docker_networks.txt" 2>/dev/null || true
    docker volume ls > "${dest_dir}/docker_volumes.txt" 2>/dev/null || true
}

gather_virtual_info() {
    local dest_dir="$1"
    
    log "Gathering virtualization information..."
    
    systemd-detect-virt > "${dest_dir}/virt_type.txt" 2>/dev/null || true
    virt-what > "${dest_dir}/virt_what.txt" 2>/dev/null || true
    
    # VM-specific information
    if [ -d /sys/class/dmi/id ]; then
        cat /sys/class/dmi/id/product_name > "${dest_dir}/product_name.txt" 2>/dev/null || true
        cat /sys/class/dmi/id/sys_vendor > "${dest_dir}/vendor.txt" 2>/dev/null || true
    fi
}

create_archive() {
    local source_dir="$1"
    
    log "Creating archive: $OUTPUT_FILE"
    
    # Create summary file
    {
        echo "System Audit Report"
        echo "==================="
        echo "Generated: $(date)"
        echo "Hostname: $(hostname)"
        echo "Script Version: $SCRIPT_VERSION"
        echo "System Type: $(detect_system)"
        echo ""
        echo "Archive Contents:"
        find "$source_dir" -type f | sed "s|$source_dir/||" | sort
    } > "${source_dir}/AUDIT_SUMMARY.txt"
    
    tar -czf "${OUTPUT_FILE}" -C "${source_dir}" .
    chmod 644 "${OUTPUT_FILE}"
    
    local size=$(du -h "${OUTPUT_FILE}" | cut -f1)
    log "Archive created successfully: $OUTPUT_FILE ($size)"
}

main() {
    log "Starting Universal System Audit v$SCRIPT_VERSION"
    log "Target directory: $SHARED_DIR"
    
    local system_type
    system_type=$(detect_system)
    log "Detected system type: $system_type"
    
    # Create main directory structure
    mkdir -p "$SHARED_DIR"
    
    # Gather all information
    gather_basic_info "$tmp_dir"
    gather_hardware_info "$tmp_dir"
    gather_network_info "$tmp_dir"
    gather_security_info "$tmp_dir"
    gather_processes_services "$tmp_dir"
    gather_packages_software "$tmp_dir"
    gather_logs "$tmp_dir"
    gather_specialized_info "$tmp_dir" "$system_type"
    
    # Create final archive
    create_archive "$tmp_dir"
    
    log "System audit completed successfully!"
    echo "$OUTPUT_FILE"
}

# Run main function
main "$@"
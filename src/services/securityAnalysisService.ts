// Security Analysis Service für IP-basierte Audits
import { logger } from '@/services/loggerService';

export interface SecurityFinding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  recommendation: string;
  affectedComponent?: string;
  riskScore: number;
}

export interface SecurityScores {
  overall: number;
  security: number;
  performance: number;
  compliance: number;
  networkSecurity: number;
  serviceSecurity: number;
}

export interface SecurityAuditResult {
  findings: SecurityFinding[];
  scores: SecurityScores;
  summary: string;
  timestamp: string;
}

export async function performSecurityAnalysis(
  systemInfo: any, 
  connection: any
): Promise<SecurityAuditResult> {
  logger.info('audit', '🔍 Starting comprehensive security analysis');

  const findings: SecurityFinding[] = [];
  let totalRiskScore = 0;

  // 1. Netzwerk-Sicherheitsanalyse
  const networkFindings = analyzeNetworkSecurity(systemInfo);
  findings.push(...networkFindings);

  // 2. Service-Sicherheitsanalyse
  const serviceFindings = analyzeServiceSecurity(systemInfo);
  findings.push(...serviceFindings);

  // 3. Konfigurationssicherheit
  const configFindings = analyzeConfigurationSecurity(systemInfo);
  findings.push(...configFindings);

  // 4. Performance-Indikatoren
  const performanceFindings = analyzePerformanceIndicators(systemInfo);
  findings.push(...performanceFindings);

  // 5. Compliance-Checks
  const complianceFindings = analyzeComplianceFactors(systemInfo);
  findings.push(...complianceFindings);

  // Berechne Gesamtrisiko
  totalRiskScore = findings.reduce((sum, finding) => sum + finding.riskScore, 0);

  // Berechne Scores
  const scores = calculateSecurityScores(findings, systemInfo);

  const summary = generateSecuritySummary(findings, scores);

  logger.info('audit', '✅ Security analysis completed', {
    findingsCount: findings.length,
    overallScore: scores.overall,
    totalRiskScore
  });

  return {
    findings,
    scores,
    summary,
    timestamp: new Date().toISOString()
  };
}

function analyzeNetworkSecurity(systemInfo: any): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const { network, services } = systemInfo;

  logger.debug('audit', '🌐 Analyzing network security');

  // Analysiere offene Ports
  if (services && services.length > 0) {
    const criticalServices = services.filter((s: any) => 
      ['SSH', 'RDP', 'FTP', 'Telnet'].includes(s.name)
    );

    if (criticalServices.length > 3) {
      findings.push({
        id: 'net-001',
        title: 'Excessive Critical Services Exposed',
        severity: 'high',
        category: 'Network Security',
        description: `${criticalServices.length} critical network services are exposed: ${criticalServices.map((s: any) => s.name).join(', ')}`,
        recommendation: 'Review and disable unnecessary services. Consider using a firewall to restrict access.',
        affectedComponent: 'Network Services',
        riskScore: 8
      });
    }

    // Prüfe auf unsichere Protokolle
    const insecureServices = services.filter((s: any) => 
      ['FTP', 'Telnet', 'HTTP'].includes(s.name)
    );

    if (insecureServices.length > 0) {
      findings.push({
        id: 'net-002',
        title: 'Insecure Protocols Detected',
        severity: 'medium',
        category: 'Network Security',
        description: `Insecure protocols found: ${insecureServices.map((s: any) => s.name).join(', ')}`,
        recommendation: 'Replace with secure alternatives (SFTP instead of FTP, SSH instead of Telnet, HTTPS instead of HTTP).',
        affectedComponent: 'Protocol Configuration',
        riskScore: 6
      });
    }
  }

  // Prüfe SSH-Konfiguration
  const sshService = services?.find((s: any) => s.name === 'SSH');
  if (sshService && sshService.port === 22) {
    findings.push({
      id: 'net-003',
      title: 'SSH on Default Port',
      severity: 'low',
      category: 'Network Security',
      description: 'SSH is running on the default port 22, which makes it a target for automated attacks.',
      recommendation: 'Consider changing SSH to a non-standard port and implement fail2ban.',
      affectedComponent: 'SSH Configuration',
      riskScore: 3
    });
  }

  return findings;
}

function analyzeServiceSecurity(systemInfo: any): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const { services } = systemInfo;

  logger.debug('audit', '🔧 Analyzing service security');

  if (!services || services.length === 0) {
    findings.push({
      id: 'svc-001',
      title: 'Limited Service Visibility',
      severity: 'info',
      category: 'Service Security',
      description: 'Limited visibility into running services due to network-based scanning.',
      recommendation: 'For complete service analysis, consider enabling agent-based monitoring.',
      affectedComponent: 'Service Discovery',
      riskScore: 1
    });
    return findings;
  }

  // Analyse Database Services
  const dbServices = services.filter((s: any) => 
    ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis'].includes(s.name)
  );

  if (dbServices.length > 0) {
    findings.push({
      id: 'svc-002',
      title: 'Database Services Exposed',
      severity: 'high',
      category: 'Service Security',
      description: `Database services are accessible from the network: ${dbServices.map((s: any) => s.name).join(', ')}`,
      recommendation: 'Restrict database access to localhost or specific IP ranges. Use proper authentication and encryption.',
      affectedComponent: 'Database Configuration',
      riskScore: 9
    });
  }

  // Analyse Web Services
  const webServices = services.filter((s: any) => 
    s.protocol === 'http' || s.protocol === 'https'
  );

  if (webServices.length > 0) {
    const httpOnly = webServices.filter((s: any) => s.protocol === 'http');
    if (httpOnly.length > 0) {
      findings.push({
        id: 'svc-003',
        title: 'Unencrypted Web Services',
        severity: 'medium',
        category: 'Service Security',
        description: `${httpOnly.length} web service(s) are running without encryption.`,
        recommendation: 'Implement HTTPS/TLS encryption for all web services.',
        affectedComponent: 'Web Server Configuration',
        riskScore: 5
      });
    }
  }

  return findings;
}

function analyzeConfigurationSecurity(systemInfo: any): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const { server, metadata } = systemInfo;

  logger.debug('audit', '⚙️  Analyzing configuration security');

  // OS-basierte Empfehlungen
  if (server?.os) {
    const os = server.os.toLowerCase();
    
    if (os.includes('windows')) {
      findings.push({
        id: 'cfg-001',
        title: 'Windows Security Recommendations',
        severity: 'info',
        category: 'Configuration',
        description: 'Windows system detected. Standard security hardening should be applied.',
        recommendation: 'Enable Windows Defender, configure automatic updates, disable unnecessary services, and implement proper user access controls.',
        affectedComponent: 'Operating System',
        riskScore: 2
      });
    } else if (os.includes('linux') || os.includes('ubuntu') || os.includes('debian') || os.includes('centos')) {
      findings.push({
        id: 'cfg-002',
        title: 'Linux Security Recommendations',
        severity: 'info',
        category: 'Configuration',
        description: 'Linux system detected. Standard security hardening should be applied.',
        recommendation: 'Configure UFW/iptables firewall, enable automatic security updates, implement SELinux/AppArmor, and disable root SSH access.',
        affectedComponent: 'Operating System',
        riskScore: 2
      });
    }
  }

  // Scanning-basierte Limitationen
  if (metadata?.collectionMethod === 'ip_based_discovery') {
    findings.push({
      id: 'cfg-003',
      title: 'Limited Configuration Visibility',
      severity: 'info',
      category: 'Configuration',
      description: 'Configuration analysis is limited due to network-based scanning approach.',
      recommendation: 'For detailed configuration analysis, consider SSH-based agent deployment or authenticated scanning.',
      affectedComponent: 'Audit Methodology',
      riskScore: 1
    });
  }

  return findings;
}

function analyzePerformanceIndicators(systemInfo: any): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const { services } = systemInfo;

  logger.debug('audit', '📊 Analyzing performance indicators');

  // Service Response Time Analysis
  if (services && services.length > 5) {
    findings.push({
      id: 'perf-001',
      title: 'High Service Count',
      severity: 'low',
      category: 'Performance',
      description: `${services.length} network services are running, which may impact performance.`,
      recommendation: 'Review and disable unnecessary services to improve system performance and security.',
      affectedComponent: 'System Resources',
      riskScore: 2
    });
  }

  return findings;
}

function analyzeComplianceFactors(systemInfo: any): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const { services, security } = systemInfo;

  logger.debug('audit', '📋 Analyzing compliance factors');

  // Basic compliance checks
  if (services) {
    const sshService = services.find((s: any) => s.name === 'SSH');
    if (sshService) {
      findings.push({
        id: 'comp-001',
        title: 'SSH Access Available',
        severity: 'info',
        category: 'Compliance',
        description: 'SSH access is available for system administration.',
        recommendation: 'Ensure SSH is properly configured with key-based authentication and logging enabled.',
        affectedComponent: 'Access Control',
        riskScore: 1
      });
    }
  }

  // Risk assessment based on exposed services
  if (security?.riskLevel) {
    const riskLevel = security.riskLevel;
    if (riskLevel === 'high') {
      findings.push({
        id: 'comp-002',
        title: 'High Risk Configuration',
        severity: 'high',
        category: 'Compliance',
        description: 'System configuration indicates high security risk due to multiple exposed critical services.',
        recommendation: 'Immediate security hardening required. Review firewall rules and service configurations.',
        affectedComponent: 'Overall Security Posture',
        riskScore: 8
      });
    } else if (riskLevel === 'medium') {
      findings.push({
        id: 'comp-003',
        title: 'Medium Risk Configuration',
        severity: 'medium',
        category: 'Compliance',
        description: 'System configuration indicates medium security risk.',
        recommendation: 'Review security configuration and apply recommended hardening measures.',
        affectedComponent: 'Security Configuration',
        riskScore: 5
      });
    }
  }

  return findings;
}

function calculateSecurityScores(findings: SecurityFinding[], systemInfo: any): SecurityScores {
  const maxScore = 100;
  
  // Berechne Score basierend auf Findings
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;

  // Penalty system
  let penalty = 0;
  penalty += criticalCount * 25;  // Critical: -25 points each
  penalty += highCount * 15;      // High: -15 points each
  penalty += mediumCount * 8;     // Medium: -8 points each
  penalty += lowCount * 3;        // Low: -3 points each

  const overall = Math.max(maxScore - penalty, 0);

  // Category-specific scores
  const networkFindings = findings.filter(f => f.category === 'Network Security');
  const serviceFindings = findings.filter(f => f.category === 'Service Security');
  const configFindings = findings.filter(f => f.category === 'Configuration');
  const performanceFindings = findings.filter(f => f.category === 'Performance');
  const complianceFindings = findings.filter(f => f.category === 'Compliance');

  const calculateCategoryScore = (categoryFindings: SecurityFinding[]) => {
    const categoryPenalty = categoryFindings.reduce((sum, f) => {
      switch (f.severity) {
        case 'critical': return sum + 25;
        case 'high': return sum + 15;
        case 'medium': return sum + 8;
        case 'low': return sum + 3;
        default: return sum;
      }
    }, 0);
    return Math.max(maxScore - categoryPenalty, 0);
  };

  return {
    overall,
    security: overall, // Für Kompatibilität
    performance: calculateCategoryScore(performanceFindings),
    compliance: calculateCategoryScore(complianceFindings),
    networkSecurity: calculateCategoryScore(networkFindings),
    serviceSecurity: calculateCategoryScore(serviceFindings)
  };
}

function generateSecuritySummary(findings: SecurityFinding[], scores: SecurityScores): string {
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;

  let summary = `Security audit completed with an overall score of ${scores.overall}/100. `;

  if (criticalCount > 0) {
    summary += `${criticalCount} critical issue(s) require immediate attention. `;
  }
  
  if (highCount > 0) {
    summary += `${highCount} high-priority issue(s) should be addressed soon. `;
  }

  if (mediumCount > 0) {
    summary += `${mediumCount} medium-priority issue(s) identified for improvement. `;
  }

  if (scores.overall >= 80) {
    summary += 'Overall security posture is good with minor improvements needed.';
  } else if (scores.overall >= 60) {
    summary += 'Security posture needs improvement. Address high-priority issues first.';
  } else {
    summary += 'Security posture requires significant attention. Immediate action recommended.';
  }

  return summary;
}
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";

interface AuditData {
  serverId: string;
  serverName: string;
  hostname: string;
  ip: string;
  os: string;
  lastScan: string;
  overallScore: number;
  securityScore: number;
  performanceScore: number;
  complianceScore: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  findings: Array<{
    id: number;
    title: string;
    severity: string;
    category: string;
    description: string;
    recommendation: string;
    status: string;
    cve?: string;
  }>;
  systemInfo: {
    uptime: string;
    loadAverage: string;
    memoryUsage: string;
    diskUsage: string;
    networkConnections: number;
    runningProcesses: number;
  };
  compliance: {
    cis: number;
    nist: number;
    iso27001: number;
    pci: number;
  };
}

interface PDFExportProps {
  auditData: AuditData;
}

export function PDFExport({ auditData }: PDFExportProps) {
  const generatePDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 8;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Helper function to add text with word wrapping
    const addText = (text: string, x: number, y: number, maxWidth?: number) => {
      if (maxWidth) {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * lineHeight);
      } else {
        doc.text(text, x, y);
        return y + lineHeight;
      }
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Title Page
    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    yPosition = addText("Security Audit Report", margin, yPosition);
    
    doc.setFontSize(16);
    doc.setFont(undefined, "normal");
    yPosition = addText(auditData.serverName, margin, yPosition + 10);
    yPosition = addText(auditData.hostname, margin, yPosition + 5);
    
    doc.setFontSize(12);
    yPosition = addText(`Generated: ${new Date().toLocaleDateString('de-DE')}`, margin, yPosition + 10);
    yPosition = addText(`Last Scan: ${new Date(auditData.lastScan).toLocaleDateString('de-DE')}`, margin, yPosition + 5);

    // Executive Summary
    yPosition += 20;
    checkNewPage(60);
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    yPosition = addText("Executive Summary", margin, yPosition);
    
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    yPosition += 10;
    
    // Scores
    yPosition = addText(`Overall Security Score: ${auditData.overallScore}/100`, margin, yPosition);
    yPosition = addText(`Security Assessment: ${auditData.securityScore}/100`, margin, yPosition);
    yPosition = addText(`Performance Score: ${auditData.performanceScore}/100`, margin, yPosition);
    yPosition = addText(`Compliance Score: ${auditData.complianceScore}/100`, margin, yPosition);
    
    yPosition += 10;
    
    // Vulnerability Summary
    doc.setFont(undefined, "bold");
    yPosition = addText("Vulnerability Summary:", margin, yPosition);
    doc.setFont(undefined, "normal");
    yPosition = addText(`Critical: ${auditData.vulnerabilities.critical}`, margin + 10, yPosition);
    yPosition = addText(`High: ${auditData.vulnerabilities.high}`, margin + 10, yPosition);
    yPosition = addText(`Medium: ${auditData.vulnerabilities.medium}`, margin + 10, yPosition);
    yPosition = addText(`Low: ${auditData.vulnerabilities.low}`, margin + 10, yPosition);

    // System Information
    yPosition += 20;
    checkNewPage(80);
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    yPosition = addText("System Information", margin, yPosition);
    
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    yPosition += 10;
    
    yPosition = addText(`Operating System: ${auditData.os}`, margin, yPosition);
    yPosition = addText(`IP Address: ${auditData.ip}`, margin, yPosition);
    yPosition = addText(`Uptime: ${auditData.systemInfo.uptime}`, margin, yPosition);
    yPosition = addText(`Load Average: ${auditData.systemInfo.loadAverage}`, margin, yPosition);
    yPosition = addText(`Memory Usage: ${auditData.systemInfo.memoryUsage}`, margin, yPosition);
    yPosition = addText(`Disk Usage: ${auditData.systemInfo.diskUsage}`, margin, yPosition);
    yPosition = addText(`Network Connections: ${auditData.systemInfo.networkConnections}`, margin, yPosition);
    yPosition = addText(`Running Processes: ${auditData.systemInfo.runningProcesses}`, margin, yPosition);

    // Security Findings
    yPosition += 20;
    checkNewPage(40);
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    yPosition = addText("Security Findings", margin, yPosition);
    
    doc.setFontSize(12);
    yPosition += 10;
    
    auditData.findings.forEach((finding, index) => {
      checkNewPage(50);
      
      doc.setFont(undefined, "bold");
      yPosition = addText(`${index + 1}. ${finding.title}`, margin, yPosition);
      
      doc.setFont(undefined, "normal");
      yPosition = addText(`Severity: ${finding.severity.toUpperCase()}`, margin + 10, yPosition);
      yPosition = addText(`Category: ${finding.category}`, margin + 10, yPosition);
      yPosition = addText("Description:", margin + 10, yPosition);
      yPosition = addText(finding.description, margin + 15, yPosition, pageWidth - margin - 30);
      yPosition += 5;
      yPosition = addText("Recommendation:", margin + 10, yPosition);
      yPosition = addText(finding.recommendation, margin + 15, yPosition, pageWidth - margin - 30);
      
      if (finding.cve && finding.cve !== "N/A") {
        yPosition = addText(`CVE: ${finding.cve}`, margin + 10, yPosition);
      }
      
      yPosition += 10;
    });

    // Compliance Status
    yPosition += 10;
    checkNewPage(60);
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    yPosition = addText("Compliance Status", margin, yPosition);
    
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    yPosition += 10;
    
    yPosition = addText(`CIS Controls: ${auditData.compliance.cis}%`, margin, yPosition);
    yPosition = addText(`NIST Framework: ${auditData.compliance.nist}%`, margin, yPosition);
    yPosition = addText(`ISO 27001: ${auditData.compliance.iso27001}%`, margin, yPosition);
    yPosition = addText(`PCI DSS: ${auditData.compliance.pci}%`, margin, yPosition);

    // Recommendations Summary
    yPosition += 20;
    checkNewPage(40);
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    yPosition = addText("Priority Recommendations", margin, yPosition);
    
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    yPosition += 10;
    
    // Sort findings by severity
    const criticalFindings = auditData.findings.filter(f => f.severity === "critical");
    const highFindings = auditData.findings.filter(f => f.severity === "high");
    
    if (criticalFindings.length > 0) {
      doc.setFont(undefined, "bold");
      yPosition = addText("Immediate Action Required (Critical):", margin, yPosition);
      doc.setFont(undefined, "normal");
      criticalFindings.forEach((finding, index) => {
        checkNewPage(20);
        yPosition = addText(`${index + 1}. ${finding.title}`, margin + 10, yPosition);
        yPosition = addText(finding.recommendation, margin + 15, yPosition, pageWidth - margin - 30);
        yPosition += 5;
      });
    }
    
    if (highFindings.length > 0) {
      yPosition += 10;
      doc.setFont(undefined, "bold");
      yPosition = addText("High Priority (Address within 30 days):", margin, yPosition);
      doc.setFont(undefined, "normal");
      highFindings.forEach((finding, index) => {
        checkNewPage(20);
        yPosition = addText(`${index + 1}. ${finding.title}`, margin + 10, yPosition);
        yPosition = addText(finding.recommendation, margin + 15, yPosition, pageWidth - margin - 30);
        yPosition += 5;
      });
    }

    // Footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text(`Seite ${i} von ${pageCount}`, pageWidth - 30, doc.internal.pageSize.height - 10);
      doc.text("Vertraulich - Nur für interne Verwendung", margin, doc.internal.pageSize.height - 10);
    }

    // Save the PDF
    const fileName = `Security_Audit_${auditData.serverName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <Button onClick={generatePDF} variant="default">
      <Download className="h-4 w-4 mr-2" />
      PDF Export
    </Button>
  );
}
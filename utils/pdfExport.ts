/**
 * PDF Export Utility
 * Provides dynamic PDF generation for Daily Logs and RFIs
 * Uses dynamic imports to avoid bloating the main bundle
 */

import type { DailyLog, RFI } from '../types';

/**
 * Export a Daily Log to PDF
 */
export const exportDailyLogPDF = async (log: any, projectName: string, companyName: string = 'BuildPro') => {
    // Dynamic import to avoid bundle bloat
    const { default: jsPDF } = await import('jspdf');

    const pdf = new jsPDF();
    let yPos = 20;

    // Header
    pdf.setFontSize(24);
    pdf.setTextColor(15, 92, 130); // BuildPro blue
    pdf.text('Daily Log Report', 20, yPos);
    yPos += 10;

    // Company branding
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(companyName, 20, yPos);
    yPos += 15;

    // Project and Date Info
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Project: ${projectName}`, 20, yPos);
    yPos += 7;
    pdf.text(`Date: ${log.logDate}`, 20, yPos);
    yPos += 7;
    if (log.weather) {
        pdf.text(`Weather: ${log.weather}`, 20, yPos);
        yPos += 10;
    } else {
        yPos += 5;
    }

    // Summary
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', 20, yPos);
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const summaryLines = pdf.splitTextToSize(log.summary || 'No summary provided', 170);
    pdf.text(summaryLines, 20, yPos);
    yPos += summaryLines.length * 5 + 10;

    // Workers on site
    if (log.workersOnSite) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Workers on Site', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Total: ${log.workersOnSite}`, 20, yPos);
        yPos += 10;
    }

    // Activities
    if (log.activities && log.activities.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Activities', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        log.activities.forEach((activity: string, index: number) => {
            if (yPos > 270) {
                pdf.addPage();
                yPos = 20;
            }
            pdf.text(`${index + 1}. ${activity}`, 25, yPos);
            yPos += 5;
        });
        yPos += 5;
    }

    // Issues
    if (log.issues && log.issues.length > 0) {
        if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(200, 50, 50); // Red for issues
        pdf.text('Issues & Concerns', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        log.issues.forEach((issue: string, index: number) => {
            if (yPos > 270) {
                pdf.addPage();
                yPos = 20;
            }
            pdf.text(`${index + 1}. ${issue}`, 25, yPos);
            yPos += 5;
        });
    }

    // Footer
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
            `Page ${i} of ${pageCount} | Generated ${new Date().toLocaleString()}`,
            105,
            290,
            { align: 'center' }
        );
    }

    // Save the PDF
    pdf.save(`daily-log-${log.logDate}.pdf`);
};

/**
 * Export an RFI to PDF
 */
export const exportRFIPDF = async (rfi: any, projectName: string, companyName: string = 'BuildPro') => {
    const { default: jsPDF } = await import('jspdf');

    const pdf = new jsPDF();
    let yPos = 20;

    // Header
    pdf.setFontSize(24);
    pdf.setTextColor(15, 92, 130);
    pdf.text('Request for Information', 20, yPos);
    yPos += 10;

    // Company branding
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(companyName, 20, yPos);
    yPos += 15;

    // RFI Details
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Project: ${projectName}`, 20, yPos);
    yPos += 7;
    pdf.text(`RFI #: ${rfi.id}`, 20, yPos);
    yPos += 7;
    pdf.text(`Status: ${rfi.status}`, 20, yPos);
    yPos += 7;
    pdf.text(`Priority: ${rfi.priority || 'Medium'}`, 20, yPos);
    yPos += 7;
    pdf.text(`Created: ${new Date(rfi.createdAt).toLocaleDateString()}`, 20, yPos);
    yPos += 10;

    // Title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Subject', 20, yPos);
    yPos += 7;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const titleLines = pdf.splitTextToSize(rfi.title, 170);
    pdf.text(titleLines, 20, yPos);
    yPos += titleLines.length * 6 + 10;

    // Description
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', 20, yPos);
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const descLines = pdf.splitTextToSize(rfi.description || 'No description provided', 170);
    pdf.text(descLines, 20, yPos);
    yPos += descLines.length * 5 + 10;

    // Response (if available)
    if (rfi.response) {
        if (yPos > 240) {
            pdf.addPage();
            yPos = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 92, 130);
        pdf.text('Response', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        const responseLines = pdf.splitTextToSize(rfi.response, 170);
        pdf.text(responseLines, 20, yPos);
        yPos += responseLines.length * 5;

        if (rfi.respondedAt) {
            yPos += 5;
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Responded: ${new Date(rfi.respondedAt).toLocaleDateString()}`, 20, yPos);
        }
    }

    // Footer
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
            `Page ${i} of ${pageCount} | Generated ${new Date().toLocaleString()}`,
            105,
            290,
            { align: 'center' }
        );
    }

    // Save the PDF
    pdf.save(`rfi-${rfi.id}.pdf`);
};

/**
 * PFF Sentinel - System Audit UI
 * User interface for running and displaying system connectivity audit
 */

import { runSystemAudit } from './system-connectivity-audit.js';

/**
 * Run audit and display results in UI
 * @param {HTMLElement} container - Container element to display results
 */
export async function runAndDisplayAudit(container) {
  if (!container) {
    console.error('❌ Audit container not found');
    return;
  }
  
  // Show loading state
  container.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border: 2px solid #60a5fa;
      border-radius: 12px;
      padding: 30px;
      color: white;
      text-align: center;
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
      <h3 style="margin: 0 0 12px 0;">Running System Audit...</h3>
      <p style="margin: 0; opacity: 0.9;">Checking Supabase, Polygon Chain, and VIDA split logic</p>
      <div style="
        margin-top: 20px;
        height: 4px;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
        overflow: hidden;
      ">
        <div style="
          height: 100%;
          background: white;
          animation: loading 2s ease-in-out infinite;
        "></div>
      </div>
    </div>
    <style>
      @keyframes loading {
        0% { width: 0%; }
        50% { width: 100%; }
        100% { width: 0%; }
      }
    </style>
  `;
  
  try {
    // Run audit
    const report = await runSystemAudit();
    
    // Display results
    displayAuditResults(container, report);
    
    // Also log to console
    console.log('📊 System Audit Report:', report);
    
  } catch (error) {
    container.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #dc2626, #991b1b);
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 30px;
        color: white;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
        <h3 style="margin: 0 0 12px 0;">Audit Failed</h3>
        <p style="margin: 0; opacity: 0.9;">${error.message}</p>
      </div>
    `;
  }
}

/**
 * Display audit results in UI
 */
function displayAuditResults(container, report) {
  const { summary, supabase, polygon, vitalizationData, vidaSplit, errorHandling } = report;
  
  // Determine status color
  const statusColors = {
    'EXCELLENT': { bg: '#10b981', border: '#34d399' },
    'GOOD': { bg: '#3b82f6', border: '#60a5fa' },
    'FAIR': { bg: '#f59e0b', border: '#fbbf24' },
    'POOR': { bg: '#dc2626', border: '#ef4444' }
  };
  
  const colors = statusColors[summary.overallStatus] || statusColors['FAIR'];
  
  container.innerHTML = `
    <div style="
      background: linear-gradient(135deg, ${colors.bg}, ${colors.bg}dd);
      border: 2px solid ${colors.border};
      border-radius: 12px;
      padding: 30px;
      color: white;
      margin: 20px 0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    ">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 64px; margin-bottom: 12px;">
          ${summary.overallStatus === 'EXCELLENT' ? '✅' : summary.overallStatus === 'GOOD' ? '👍' : summary.overallStatus === 'FAIR' ? '⚠️' : '❌'}
        </div>
        <h2 style="margin: 0 0 8px 0;">System Status: ${summary.overallStatus}</h2>
        <div style="font-size: 32px; font-weight: bold;">${summary.healthScore}%</div>
        <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Health Score</p>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        ${createStatusCard('📦 Supabase', supabase.status, supabase.connected)}
        ${createStatusCard('⛓️ Polygon Chain', polygon.status, polygon.connected)}
        ${createStatusCard('🔄 Data Sync', vitalizationData.status, vitalizationData.dataMatch)}
        ${createStatusCard('💰 VIDA Split', vidaSplit.status, vidaSplit.splitCorrect)}
        ${createStatusCard('⚠️ Error Handling', errorHandling.status, errorHandling.hasNetworkErrorHandling)}
      </div>
      
      ${summary.criticalIssues.length > 0 ? `
        <div style="background: rgba(220, 38, 38, 0.3); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px 0; color: #fecaca;">🚨 Critical Issues</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${summary.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${summary.warnings.length > 0 ? `
        <div style="background: rgba(245, 158, 11, 0.3); border: 1px solid rgba(251, 191, 36, 0.5); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px 0; color: #fde68a;">⚠️ Warnings</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${summary.warnings.map(warning => `<li>${warning}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${summary.recommendations.length > 0 ? `
        <div style="background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(96, 165, 250, 0.5); border-radius: 8px; padding: 16px;">
          <h4 style="margin: 0 0 8px 0; color: #bfdbfe;">💡 Recommendations</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center; opacity: 0.7; font-size: 12px;">
        Last updated: ${new Date(report.timestamp).toLocaleString()}
      </div>
    </div>
  `;
}

/**
 * Create status card HTML
 */
function createStatusCard(title, status, isHealthy) {
  const icon = isHealthy ? '✅' : '❌';
  const statusText = status || 'UNKNOWN';
  
  return `
    <div style="
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    ">
      <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 12px; opacity: 0.8;">${statusText}</div>
    </div>
  `;
}


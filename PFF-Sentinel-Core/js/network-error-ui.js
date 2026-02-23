/**
 * PFF Sentinel - Network Error UI
 * User-friendly error messages for blockchain connection failures
 */

/**
 * Display network latency error
 * @param {HTMLElement} container - Container element to display error
 * @param {Object} options - Error options
 */
export function displayNetworkError(container, options = {}) {
  const {
    title = 'Network Latency',
    message = 'Unable to connect to Polygon blockchain. Please check your internet connection.',
    retryCallback = null,
    showRetry = true
  } = options;

  if (!container) {
    console.error('❌ Network error container not found');
    return;
  }

  container.innerHTML = `
    <div class="network-error" style="
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border: 2px solid #fbbf24;
      border-radius: 12px;
      padding: 30px;
      color: white;
      margin: 20px 0;
      box-shadow: 0 8px 32px rgba(245, 158, 11, 0.3);
      text-align: center;
    ">
      <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
      <h3 style="margin: 0 0 12px 0; font-size: 24px;">${title}</h3>
      <p style="margin: 0 0 20px 0; opacity: 0.9; font-size: 16px;">${message}</p>
      
      ${showRetry ? `
        <button 
          id="retry-connection-btn"
          style="
            background: white;
            color: #d97706;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          "
          onmouseover="this.style.transform='scale(1.05)'"
          onmouseout="this.style.transform='scale(1)'"
        >
          🔄 Retry Connection
        </button>
      ` : ''}
      
      <div style="
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.2);
        font-size: 14px;
        opacity: 0.8;
      ">
        <p style="margin: 0;">💡 Troubleshooting Tips:</p>
        <ul style="
          margin: 8px 0 0 0;
          padding: 0;
          list-style: none;
          text-align: left;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        ">
          <li style="margin: 4px 0;">• Check your internet connection</li>
          <li style="margin: 4px 0;">• Disable VPN if active</li>
          <li style="margin: 4px 0;">• Try refreshing the page</li>
        </ul>
      </div>
    </div>
  `;

  // Attach retry callback if provided
  if (showRetry && retryCallback) {
    const retryBtn = container.querySelector('#retry-connection-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', async () => {
        retryBtn.textContent = '⏳ Retrying...';
        retryBtn.disabled = true;
        
        try {
          await retryCallback();
        } catch (error) {
          console.error('Retry failed:', error);
          retryBtn.textContent = '🔄 Retry Connection';
          retryBtn.disabled = false;
        }
      });
    }
  }
}

/**
 * Display loading state while connecting
 * @param {HTMLElement} container - Container element
 */
export function displayConnecting(container) {
  if (!container) return;

  container.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border: 2px solid #60a5fa;
      border-radius: 12px;
      padding: 30px;
      color: white;
      text-align: center;
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">🔗</div>
      <h3 style="margin: 0 0 12px 0;">Connecting to Polygon...</h3>
      <p style="margin: 0; opacity: 0.9;">Please wait while we establish connection</p>
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
        0% { width: 0%; margin-left: 0%; }
        50% { width: 50%; margin-left: 25%; }
        100% { width: 0%; margin-left: 100%; }
      }
    </style>
  `;
}

/**
 * Display success message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Success message
 */
export function displaySuccess(container, message = 'Connected successfully!') {
  if (!container) return;

  container.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #10b981, #059669);
      border: 2px solid #34d399;
      border-radius: 12px;
      padding: 20px;
      color: white;
      text-align: center;
      margin: 20px 0;
    ">
      <div style="font-size: 36px; margin-bottom: 8px;">✅</div>
      <p style="margin: 0; font-size: 16px;">${message}</p>
    </div>
  `;
}


import React, { useEffect, useState } from 'react';

interface SystemCheckResult {
  screenResolution: boolean;
  browserSupport: boolean;
  es6Support: boolean;
  flexboxSupport: boolean;
  mouseSupport: boolean;
}

const SystemCheck: React.FC = () => {
  const [systemCheck, setSystemCheck] = useState<SystemCheckResult>({
    screenResolution: false,
    browserSupport: false,
    es6Support: false,
    flexboxSupport: false,
    mouseSupport: false
  });

  useEffect(() => {
    // Check screen resolution
    const checkScreenResolution = (): boolean => {
      return window.screen.width >= 1024 && window.screen.height >= 768;
    };

    // Check browser support
    const checkBrowserSupport = (): boolean => {
      const userAgent = navigator.userAgent;
      const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isEdge = /Edge/.test(userAgent);
      
      return isChrome || isFirefox || isSafari || isEdge;
    };

    // Check ES6 support
    const checkES6Support = (): boolean => {
      try {
        new Function('() => {}');
        return true;
      } catch {
        return false;
      }
    };

    // Check Flexbox support
    const checkFlexboxSupport = (): boolean => {
      const testEl = document.createElement('div');
      testEl.style.display = 'flex';
      return testEl.style.display === 'flex';
    };

    // Check mouse support
    const checkMouseSupport = (): boolean => {
      return 'onmousedown' in document;
    };

    setSystemCheck({
      screenResolution: checkScreenResolution(),
      browserSupport: checkBrowserSupport(),
      es6Support: checkES6Support(),
      flexboxSupport: checkFlexboxSupport(),
      mouseSupport: checkMouseSupport()
    });
  }, []);

  const allChecksPassed = Object.values(systemCheck).every(check => check);

  if (allChecksPassed) {
    return null; // Don't show anything if all checks pass
  }

  return (
    <div className="system-check-overlay">
      <div className="system-check-modal">
        <h2>⚠️ System Requirements Check</h2>
        <p>Your system may not meet the minimum requirements for optimal performance.</p>
        
        <div className="check-results">
          <div className={`check-item ${systemCheck.screenResolution ? 'pass' : 'fail'}`}>
            <span>📺 Screen Resolution (1024x768+):</span>
            <span>{systemCheck.screenResolution ? 'Pass' : 'Fail'}</span>
          </div>
          
          <div className={`check-item ${systemCheck.browserSupport ? 'pass' : 'fail'}`}>
            <span>🌐 Browser Support:</span>
            <span>{systemCheck.browserSupport ? 'Pass' : 'Fail'}</span>
          </div>
          
          <div className={`check-item ${systemCheck.es6Support ? 'pass' : 'fail'}`}>
            <span>⚡ ES6 Support:</span>
            <span>{systemCheck.es6Support ? 'Pass' : 'Fail'}</span>
          </div>
          
          <div className={`check-item ${systemCheck.flexboxSupport ? 'pass' : 'fail'}`}>
            <span>🎨 CSS Flexbox:</span>
            <span>{systemCheck.flexboxSupport ? 'Pass' : 'Fail'}</span>
          </div>
          
          <div className={`check-item ${systemCheck.mouseSupport ? 'pass' : 'fail'}`}>
            <span>🖱️ Mouse Support:</span>
            <span>{systemCheck.mouseSupport ? 'Pass' : 'Fail'}</span>
          </div>
        </div>
        
        <div className="system-info">
          <p><strong>Current Resolution:</strong> {window.screen.width}x{window.screen.height}</p>
          <p><strong>Browser:</strong> {navigator.userAgent}</p>
        </div>
        
        <button 
          className="continue-button"
          onClick={() => {
            const overlay = document.querySelector('.system-check-overlay');
            if (overlay) {
              overlay.remove();
            }
          }}
        >
          Continue Anyway
        </button>
      </div>
    </div>
  );
};

export default SystemCheck; 
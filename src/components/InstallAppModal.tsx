import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sound } from '../services/sound';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    sound.playClick();
    if (isInstallable) {
      const success = await install();
      if (success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl border"
        style={{
          backgroundColor: 'var(--bg-surface-elevated, #1e293b)',
          borderColor: 'var(--border-subtle, #334155)',
          color: 'var(--text-main, #f8fafc)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-75"
          style={{ backgroundColor: 'var(--bg-surface, #0f172a)' }}
        >
          ✕
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-3 mb-4">
          <img src="/icon.png" alt="XO Arena" className="w-12 h-12 rounded-xl object-cover shadow-md" />
          <div>
            <h2 className="text-xl font-bold font-display">फ़ोन में सीधे इनस्टॉल करें</h2>
            <p className="text-xs text-emerald-400 font-semibold">बिना GitHub और बिना किसी झंझट के</p>
          </div>
        </div>

        {/* Main Action Button */}
        {isInstallable ? (
          <div className="my-5">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-base text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.4)'
              }}
            >
              <span>📲</span>
              <span>अभी फ़ोन में इंस्टॉल करें (Install Now)</span>
            </button>
            <p className="text-[11px] text-center text-gray-400 mt-2">
              Google Chrome यह ऐप सीधे आपके फ़ोन के होम स्क्रीन और ऐप ड्रॉअर में जोड़ देगा।
            </p>
          </div>
        ) : (
          <div className="my-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
              <span>🚀</span>
              <span>1-क्लिक आसान तरीक़ा (Chrome Browser):</span>
            </div>
            <ol className="text-xs space-y-2 text-gray-300 list-decimal list-inside leading-relaxed">
              <li>
                Chrome में ऊपर दाहिने कोने पर <strong className="text-white">3 डॉट्स (⋮)</strong> दबाएँ।
              </li>
              <li>
                मेन्यू में <strong className="text-emerald-300">"Install app"</strong> या <strong className="text-emerald-300">"Add to Home screen"</strong> पर क्लिक करें।
              </li>
              <li>
                <strong className="text-white">Install</strong> पर टैप करें—गेम सीधे आपके फ़ोन की होम स्क्रीन पर एक असली ऐप (WebAPK) की तरह आ जाएगा!
              </li>
            </ol>
          </div>
        )}

        {/* Benefits list */}
        <div className="space-y-2.5 pt-2 border-t border-slate-700/50 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span>बिना किसी GitHub कमिट या कंपाइल एरर के तुरंत चलेगा</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span>फ़ुल स्क्रीन में बिना किसी ब्राउज़र बार के असली ऐप जैसा अनुभव</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span>ऑफलाइन भी चलेगा और सारा स्कोर / हिस्ट्री सेव रहेगी</span>
          </div>
        </div>

        {/* Close footer */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full mt-5 py-2.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition"
          style={{
            borderColor: 'var(--border-subtle, #334155)',
            backgroundColor: 'var(--bg-surface, #0f172a)'
          }}
        >
          ठीक है, समझ गया (Close)
        </button>
      </div>
    </div>
  );
};

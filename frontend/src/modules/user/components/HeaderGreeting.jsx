import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Search, Wallet } from 'lucide-react';
import { DEFAULT_LOCATION_LABEL, getSavedLocationLabel, LOCATION_UPDATED_EVENT } from '../services/locationStore';

const fallingCoins = [
  { id: 1, left: '24%', delay: 0 },
  { id: 2, left: '50%', delay: 0.65 },
  { id: 3, left: '72%', delay: 1.2 },
];

import { useSettings } from '../../../shared/context/SettingsContext';

const HeaderGreeting = () => {
  const navigate = useNavigate();
  const { settings, loading, hasBootstrapSettings } = useSettings();
  const appLogo = settings.general?.logo || settings.customization?.logo || settings.general?.favicon || '';
  const appName = settings.general?.app_name || 'App';
  const [locationLabel, setLocationLabel] = useState(getSavedLocationLabel);
  const showBrandingSkeleton = loading && !hasBootstrapSettings && !appLogo;

  useEffect(() => {
    const syncLocationLabel = () => {
      setLocationLabel(getSavedLocationLabel());
    };

    syncLocationLabel();
    window.addEventListener('storage', syncLocationLabel);
    window.addEventListener(LOCATION_UPDATED_EVENT, syncLocationLabel);

    return () => {
      window.removeEventListener('storage', syncLocationLabel);
      window.removeEventListener(LOCATION_UPDATED_EVENT, syncLocationLabel);
    };
  }, []);

  return (
    <>
      <div className="bg-[#0c1527] text-white pt-8 pb-5 px-5 border-b border-slate-800 shadow-md fixed top-0 z-50 w-full max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 flex-1">
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative inline-flex items-center bg-transparent"
            >
              <motion.div
                aria-hidden="true"
                className="absolute inset-x-2 inset-y-1 rounded-full bg-emerald-500/10 blur-md"
                animate={{ opacity: [0.3, 0.75, 0.3], scale: [0.92, 1.06, 0.92] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {appLogo ? (
                <motion.img
                  key={appLogo}
                  src={appLogo}
                  alt={appName}
                  className="relative z-10 h-8 object-contain drop-shadow-sm"
                  animate={{ y: [0, -2, 0], scale: [1, 1.02, 1] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              ) : showBrandingSkeleton ? (
                <div className="relative z-10 h-8 min-w-[32px] animate-pulse rounded-full bg-slate-800" />
              ) : (
                <div className="relative z-10 flex h-8 min-w-[32px] items-center justify-center rounded-full bg-slate-800 px-2 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                  {appName.slice(0, 2)}
                </div>
              )}
            </motion.div>

            <motion.button
              type="button"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.03, ease: 'easeOut' }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate('/ride/select-location')}
              className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-transparent text-left transition-opacity active:opacity-80"
            >
              <MapPin size={16} className="text-indigo-400 transition-colors group-hover:text-indigo-300 shrink-0" strokeWidth={2.5} />

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-indigo-300 leading-none">Location</p>
                <p className="truncate text-[11px] font-bold text-white mt-1 leading-none">{locationLabel}</p>
              </div>
            </motion.button>
          </div>

          <button
            onClick={() => navigate('/wallet')}
            className="relative w-10 h-10 overflow-hidden rounded-full border border-white/10 bg-white/10 flex items-center justify-center shadow-lg shrink-0 active:scale-95 transition-transform"
          >
            <motion.div
              className="absolute inset-x-2 top-1 h-3 rounded-full bg-gradient-to-b from-amber-200/20 to-transparent"
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {fallingCoins.map((coin) => (
              <motion.span
                key={coin.id}
                aria-hidden="true"
                className="absolute top-1 block h-1.5 w-1.5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 shadow-[0_1px_4px_rgba(245,158,11,0.45)]"
                style={{ left: coin.left }}
                animate={{
                  y: [0, 10, 16],
                  opacity: [0, 1, 1, 0],
                  scale: [0.85, 1, 0.92],
                }}
                transition={{
                  duration: 1.8,
                  delay: coin.delay,
                  repeat: Infinity,
                  repeatDelay: 0.8,
                  ease: 'easeIn',
                }}
              />
            ))}

            <motion.div
              className="relative z-10"
              animate={{ y: [0, -1, 0], rotate: [0, -2, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Wallet size={18} className="text-white" strokeWidth={2.5} />
            </motion.div>
          </button>
        </div>
      </div>
      {/* Invisible placeholder to prevent content from jumping up under the fixed header */}
      <div className="h-[92px] w-full" />
    </>
  );
};

export default HeaderGreeting;

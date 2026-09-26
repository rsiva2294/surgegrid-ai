import React from 'react';
import { Zap, Heart } from 'lucide-react';

interface FooterProps {
  lang: 'en' | 'ta';
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">SurgeGrid AI</span>
            <span className="text-slate-400">·</span>
            <span>
              {lang === 'en'
                ? 'Pre-Landfall Grid Resilience & Fluvial Surge Defense Platform'
                : 'முன்னெச்சரிக்கை மின் கட்டமைப்பு மற்றும் வெள்ள தடுப்பு தளம்'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <span>Track 5: Extreme Weather</span>
            <span>·</span>
            <span>Chennai Metropolitan Area</span>
            <span>·</span>
            <span className="text-slate-400">MIT & ODbL Open Data</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <p>
            Ground data integrated from <strong>TANGEDCO</strong>, <strong>GCC</strong>,{' '}
            <strong>Neer Vazhvu</strong>, and <strong>OpenCity.in</strong>. Meteorological forcing by{' '}
            <strong>Google DeepMind WeatherNext 3</strong>.
          </p>
          <p className="flex items-center gap-1">
            Built for Chennai with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};

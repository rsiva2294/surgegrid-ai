import React from 'react';
import { Search, X } from 'lucide-react';
import type { TnebSubstation, TnebSection } from '../../types/tneb';

interface MapSearchBoxProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: {
    substations: TnebSubstation[];
    sections: TnebSection[];
  };
  onSelectSubstation: (ss: TnebSubstation | null) => void;
  onSelectSection: (sec: TnebSection | null) => void;
  isLight: boolean;
}

export const MapSearchBox: React.FC<MapSearchBoxProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  onSelectSubstation,
  onSelectSection,
  isLight
}) => {
  return (
    <div
      className={`pointer-events-auto rounded-xl p-2.5 shadow-xl transition-colors ${
        isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-slate-800'
      }`}
    >
      <div
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-white'
        }`}
      >
        <Search className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Search Substation or AE Section..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full bg-transparent text-sm outline-none ${
            isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-slate-500'
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-400 hover:text-white'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Search Dropdown */}
      {searchQuery && (searchResults.substations.length > 0 || searchResults.sections.length > 0) && (
        <div
          className={`mt-2 pt-2 border-t max-h-60 overflow-y-auto space-y-1 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          {searchResults.substations.map((ss) => (
            <button
              key={ss.code}
              onClick={() => {
                onSelectSubstation(ss);
                onSelectSection(null);
                setSearchQuery('');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <div className="truncate pr-2">
                <span className="font-semibold block truncate">{ss.name}</span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {ss.totalConsumers ? `${ss.totalConsumers.toLocaleString()} consumers` : ss.circle}
                </span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-xs font-bold shrink-0 ${
                  ss.tier === 'bulk'
                    ? isLight
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-pink-500/20 text-pink-300'
                    : ss.tier === 'subtransmission'
                    ? isLight
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-amber-500/20 text-amber-300'
                    : isLight
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                {ss.voltage} kV
              </span>
            </button>
          ))}
          {searchResults.sections.map((sec) => (
            <button
              key={sec.code}
              onClick={() => {
                onSelectSection(sec);
                onSelectSubstation(null);
                setSearchQuery('');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <span className={`font-semibold truncate ${isLight ? 'text-emerald-700' : 'text-emerald-200'}`}>
                {sec.name}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-xs ${
                  isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                AE
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

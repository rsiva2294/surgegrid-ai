import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Info, Navigation, Search } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import { IMD_RAIN_CLASSES } from '../../data/officialSources';
import { HEAVY_RAIN_MIN_MM, type ExposedSubstation, type SimulationExposure } from '../../services/simulationExposure';

interface ExposedSubstationsCardProps {
  exposure: SimulationExposure;
  stepLabel: string;
  isLight: boolean;
  selectedSubstation: TnebSubstation | null;
  onSelect: (s: TnebSubstation) => void;
}

type SortKey = 'rain' | 'elevation' | 'consumers';

const SORTS: Record<SortKey, { label: string; cmp: (a: ExposedSubstation, b: ExposedSubstation) => number }> = {
  rain: { label: 'Most rain', cmp: (a, b) => b.mm24 - a.mm24 },
  elevation: { label: 'Lowest yard', cmp: (a, b) => (a.substation.elevationM ?? 99) - (b.substation.elevationM ?? 99) },
  consumers: { label: 'Most consumers', cmp: (a, b) => (b.substation.totalConsumers ?? 0) - (a.substation.totalConsumers ?? 0) },
};

/**
 * Every substation that is exposed at the current step: flood-flagged and in a rain cell at Heavy or worse over the last
 * 24 hours. It lists them all (no top-N), sortable and searchable; clicking one opens it and flies to it.
 */
export const ExposedSubstationsCard: React.FC<ExposedSubstationsCardProps> = ({
  exposure,
  stepLabel,
  isLight,
  selectedSubstation,
  onSelect,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [sort, setSort] = useState<SortKey>('rain');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? exposure.exposed.filter(
          e => e.substation.name.toLowerCase().includes(q) || (e.substation.cleanName ?? '').toLowerCase().includes(q)
        )
      : exposure.exposed.slice();
    return list.sort(SORTS[sort].cmp);
  }, [exposure, sort, query]);

  // How many of the exposed sites sit in each IMD rain class, worst first.
  const byClass = useMemo(() => {
    const counts = new Map<string, number>();
    exposure.exposed.forEach(e => counts.set(e.rainClass.name, (counts.get(e.rainClass.name) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => IMD_RAIN_CLASSES.findIndex(c => c.name === b[0]) - IMD_RAIN_CLASSES.findIndex(c => c.name === a[0]));
  }, [exposure]);

  const card = isLight
    ? 'bg-white/98 border-slate-300/90 text-slate-800 shadow-[0_10px_35px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10'
    : 'bg-slate-900/95 border-slate-700/80 text-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10';
  const muted = isLight ? 'text-slate-600' : 'text-slate-400';
  const chip = isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-800 text-slate-300 border border-slate-700';
  const iconBtn = `p-1 rounded-md ${muted} hover:opacity-80`;

  return (
    <div
      className={`pointer-events-auto rounded-xl border p-3 text-xs flex flex-col gap-2 backdrop-blur-md min-h-0 shrink ${card}`}
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="font-bold text-xs truncate">
            Exposed now <span className={`font-mono font-semibold ${muted}`}>· {stepLabel}</span>
          </div>
          <div className={`text-[10px] ${muted}`}>
            <strong className={isLight ? 'text-slate-900' : 'text-slate-100'}>{exposure.exposed.length}</strong> of {exposure.floodFlaggedCount}{' '}
            flood-flagged sites in heavy rain or worse
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={() => setShowRule(v => !v)} aria-expanded={showRule} aria-label="How this list is decided" className={iconBtn}>
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(v => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand list' : 'Minimize list'}
            className={iconBtn}
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {byClass.length > 0 && (
        <div className="flex flex-wrap gap-1 shrink-0">
          {byClass.map(([name, n]) => (
            <span key={name} className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${chip}`}>
              {n} {name.toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {showRule && (
        <p className={`text-[10px] leading-snug shrink-0 ${muted}`}>
          Flood-flagged means the yard is at or below 2.0 m, or the site is inside the 2015 flood extent, or it is rated Moderate or High on
          the official hazard maps. Exposed means flood-flagged and the site&apos;s rain cell has {HEAVY_RAIN_MIN_MM} mm or more in the last 24
          hours (IMD&apos;s Heavy class). Two facts side by side, not a prediction of flooding or of any outage.
        </p>
      )}

      {!collapsed && (
        <>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Filter ${exposure.exposed.length} substations...`}
                className={`w-full pl-6 pr-2 py-1 rounded-lg text-xs outline-none ${
                  isLight
                    ? 'bg-slate-100 border border-slate-300/80 focus:border-sky-500 focus:bg-white text-slate-800'
                    : 'bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 text-slate-200'
                }`}
              />
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              aria-label="Sort the list"
              className={`rounded-lg border px-1.5 py-1 text-[11px] ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-600 text-slate-100'
              }`}
            >
              {(Object.keys(SORTS) as SortKey[]).map(k => (
                <option key={k} value={k}>
                  {SORTS[k].label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-y-auto space-y-1.5 pr-0.5 min-h-0 flex-1 scrollbar-thin">
            {rows.length === 0 ? (
              <p className={`py-3 text-center text-[11px] ${muted}`}>
                {exposure.exposed.length === 0
                  ? 'No flood-flagged substation is in heavy rain at this step.'
                  : 'No substation matches the filter.'}
              </p>
            ) : (
              rows.map(e => {
                const s = e.substation;
                const isSelected = selectedSubstation?.code === s.code;
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => onSelect(s)}
                    className={`w-full text-left p-2 rounded-lg border flex items-center justify-between gap-2 group transition-all ${
                      isSelected
                        ? isLight
                          ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300/50'
                          : 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400/30 text-white'
                        : isLight
                        ? 'bg-slate-50/90 hover:bg-sky-50/90 border-slate-200 hover:border-sky-300'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-bold text-xs truncate">{s.name}</div>
                      <div className="flex items-center gap-1 flex-wrap text-[10px]">
                        <span
                          className={`px-1.5 rounded font-mono font-bold ${
                            e.rainClass.name === 'Extremely heavy'
                              ? isLight
                                ? 'bg-violet-100 text-violet-900'
                                : 'bg-violet-500/25 text-violet-200'
                              : isLight
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-blue-500/20 text-blue-200'
                          }`}
                        >
                          {e.mm24.toFixed(0)} mm
                        </span>
                        <span className={muted}>{e.rainClass.name}</span>
                        {e.reasons.map(r => (
                          <span key={r} className={`px-1.5 rounded ${chip}`}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Navigation className={`w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 ${muted}`} />
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

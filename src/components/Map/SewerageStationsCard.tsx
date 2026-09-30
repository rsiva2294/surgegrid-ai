import React from 'react';
import type { TnebSubstation } from '../../types/tneb';
import { getOfficialRule, formatCitation } from '../../data/officialSources';
import { useSewerageStations } from '../../services/sewerageStations';

/** A station farther than this is not "near" the substation, so the card stays hidden. */
const NEAR_KM = 5;

interface SewerageStationsCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

/** Nearest CMWSSB sewerage pumping station (TNGIS), with the power-sector plan's own line on pumping stations. */
export const SewerageStationsCard: React.FC<SewerageStationsCardProps> = ({ substation, isLight }) => {
  const data = useSewerageStations();
  const near = data?.nearest[substation.code];
  const station = data && near ? data.stations[near.i] : null;
  if (!data || !near || !station || near.km > NEAR_KM) return null;

  const rule = getOfficialRule('mop-restore-priority');
  const box = isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100';
  const label = isLight ? 'text-slate-500' : 'text-slate-400';
  const chip = isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300';

  return (
    <div className={`p-3 rounded-xl border space-y-2 shrink-0 ${box}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[12px] font-bold uppercase tracking-wider ${label}`}>Sewerage pumping stations</span>
        <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${chip}`}>
          {near.within1km} within 1 km
        </span>
      </div>
      <div className="text-[13px] font-semibold leading-snug">
        {station.name} <span className={`font-normal ${label}`}>· {near.km.toFixed(1)} km away</span>
      </div>
      <div className={`text-[12px] leading-snug ${label}`}>{station.road}</div>
      {rule && (
        <div className={`text-[12px] leading-snug border-l-2 pl-2 ${isLight ? 'border-slate-300 text-slate-700' : 'border-slate-600 text-slate-300'}`}>
          “{rule.quote}”
          <div className={label}>{formatCitation(rule)}</div>
        </div>
      )}
      <div className={`text-[12px] leading-snug ${label}`}>
        These are sewage pumps, not storm-water pumps. Straight-line distance; which substation feeds a station is not known.
        Source: TNGIS, CMWSSB layer.
      </div>
    </div>
  );
};

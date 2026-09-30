import React from 'react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M, getQuote } from '../../data/officialSources';
import { useOfficialFlood } from '../../services/officialFloodLayers';

interface FloodPlanNotesProps {
  substation: TnebSubstation;
  isLight: boolean;
}

const title = (r: string) => r.charAt(0) + r.slice(1).toLowerCase();

/**
 * The official plan's flood actions, word for word, shown only when a flood flag applies to this substation:
 * yard at or below Chennai's 2.0 m average, inside the 2015 flood extent, or Moderate/High on the official hazard maps.
 * Lives inside the collapsed "Plan notes" section of the Respond tab.
 */
export const FloodPlanNotes: React.FC<FloodPlanNotesProps> = ({ substation, isLight }) => {
  const { flood } = useOfficialFlood(substation.code);
  const elevation = substation.elevationM;

  const reasons: string[] = [];
  if (elevation !== undefined && elevation <= CHENNAI_AVERAGE_ELEVATION_M) {
    reasons.push(`yard at ${elevation} m MSL, at or below Chennai's ${CHENNAI_AVERAGE_ELEVATION_M} m average`);
  }
  if (flood?.nrsc2015) reasons.push('inside the 2015 flood extent');
  if (flood?.returnPeriod === 'HIGH' || flood?.returnPeriod === 'MODERATE') {
    reasons.push(`${title(flood.returnPeriod)} rating on the official flood-hazard maps`);
  }
  if (reasons.length === 0) return null;

  const label = isLight ? 'text-slate-500' : 'text-slate-400';
  const quote = (id: string) => {
    const q = getQuote(id);
    return q ? (
      <blockquote
        className={`italic border-l-2 pl-2.5 text-[12.5px] leading-relaxed ${
          isLight ? 'text-slate-800 border-indigo-300' : 'text-slate-200 border-indigo-500/60'
        }`}
      >
        &ldquo;{q.quote}&rdquo;
        <span className={`block not-italic text-xs mt-0.5 ${label}`}>{q.citation}</span>
      </blockquote>
    ) : null;
  };

  return (
    <div className="space-y-2">
      <div className={`text-xs uppercase tracking-wider font-semibold ${label}`}>Flood actions in the plans</div>
      <p className="text-[12.5px]">Applies here: {reasons.join('; ')}.</p>
      {quote('mop-identify-flood-prone')}
      {quote('mop-dewatering-pump-arranged')}
    </div>
  );
};

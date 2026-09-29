import React from 'react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M } from '../../data/officialSources';
import { useOfficialFlood } from '../../services/officialFloodLayers';
import { useReliefCentres } from '../../services/reliefCentres';

interface ReliefCentresCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

/**
 * GCC relief centres listed for this substation's ward, and a backup-substation suggestion.
 * The GCC list has ward and address only (no coordinates), so we cannot say which substation feeds which centre.
 */
export const ReliefCentresCard: React.FC<ReliefCentresCardProps> = ({ substation, isLight }) => {
  const data = useReliefCentres();
  const { flood } = useOfficialFlood(substation.code);

  const box = isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100';
  const label = isLight ? 'text-slate-500' : 'text-slate-400';
  const sub = isLight ? 'text-slate-400' : 'text-slate-500';

  const ward = substation.gccWard !== undefined ? String(substation.gccWard) : null;
  const wardEntry = ward && data ? data.wards[ward] : undefined;
  const centres = wardEntry?.centres ?? [];

  const hasLifelineFeeders = (substation.feeders || []).some(f => f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water');
  const isFlagged =
    (substation.elevationM !== undefined && substation.elevationM <= CHENNAI_AVERAGE_ELEVATION_M) ||
    Boolean(flood?.nrsc2015) ||
    flood?.returnPeriod === 'HIGH' ||
    flood?.returnPeriod === 'MODERATE';
  const backup = data?.backups[substation.code];
  const showBackup = Boolean(backup) && isFlagged && (centres.length > 0 || hasLifelineFeeders);

  if (!data || (!ward && !showBackup)) return null;
  if (centres.length === 0 && !showBackup && ward) {
    return (
      <div className={`p-3 rounded-xl border text-[11px] ${box}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${label}`}>Relief centres</div>
        The GCC relief-centre list has no centre in Ward {ward}.
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl border space-y-2.5 ${box}`}>
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>Relief centres and backup</div>

      {ward && centres.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px]">
            The GCC list has <strong>{centres.length}</strong> relief centre{centres.length > 1 ? 's' : ''} in Ward {ward}
            {wardEntry?.zone ? ` (Zone ${wardEntry.zone})` : ''}:
          </p>
          {centres.map((c, i) => (
            <div
              key={`${c.address}-${i}`}
              className={`p-2 rounded-lg border text-[11px] ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'}`}
            >
              <div className="font-semibold">{c.address || 'Address not listed'}</div>
              <div className={`font-mono text-[10px] ${label}`}>
                {c.officer || 'Officer not listed'}
                {c.contact && (
                  <>
                    {' · '}
                    <a href={`tel:${c.contact}`} className="underline">
                      {c.contact}
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
          <span className={`text-[10px] block ${sub}`}>
            The GCC list gives ward and address only, with no map coordinates. We cannot say which substation feeds which centre.
          </span>
        </div>
      )}

      {showBackup && backup && (
        <div className="space-y-1">
          <p className="text-[11px]">
            Nearest other substation with none of the flood flags above (yard above {CHENNAI_AVERAGE_ELEVATION_M} m, outside the 2015
            flood extent, not rated Moderate or High): <strong>{backup.name}</strong>, {backup.km} km away in a straight line.
          </p>
          <span className={`text-[10px] block ${sub}`}>
            Our own calculation from the facts on this card, not from the official plans. Whether load can be moved between the two has
            not been checked.
          </span>
        </div>
      )}
    </div>
  );
};

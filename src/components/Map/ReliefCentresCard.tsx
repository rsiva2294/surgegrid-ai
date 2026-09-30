import React, { useState } from 'react';
import { Info, Phone } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M } from '../../data/officialSources';
import { useOfficialFlood, isOfficiallyFloodFlagged } from '../../services/officialFloodLayers';
import { useReliefCentres } from '../../services/reliefCentres';
import { useGccPlan, wardFacts } from '../../services/gccPlan';

interface ReliefCentresCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

/**
 * GCC relief centres listed for this substation's ward, and a backup-substation suggestion.
 * The GCC list has ward and address only (no coordinates), so we cannot say which substation feeds which centre.
 */
const yn = (v: boolean | null) => (v === null ? 'not stated' : v ? 'yes' : 'no');

export const ReliefCentresCard: React.FC<ReliefCentresCardProps> = ({ substation, isLight }) => {
  const data = useReliefCentres();
  const { flood } = useOfficialFlood(substation.code);
  const planRelief = wardFacts(useGccPlan(), substation.gccWard)?.relief ?? [];
  const [showCriteria, setShowCriteria] = useState(false);

  const box = isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100';
  const label = isLight ? 'text-slate-500' : 'text-slate-400';
  const sub = isLight ? 'text-slate-400' : 'text-slate-500';
  const chip = isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300';

  const ward = substation.gccWard !== undefined ? String(substation.gccWard) : null;
  const wardEntry = ward && data ? data.wards[ward] : undefined;
  const centres = wardEntry?.centres ?? [];

  const hasLifelineFeeders = (substation.feeders || []).some(f => f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water');
  const isFlagged = isOfficiallyFloodFlagged(substation.elevationM, flood);
  const backup = data?.backups[substation.code];
  const showBackup = Boolean(backup) && isFlagged && (centres.length > 0 || hasLifelineFeeders);

  if (!data || (!ward && !showBackup)) return null;
  if (centres.length === 0 && !showBackup && ward) {
    return (
      <div className={`p-3 rounded-xl border text-[11px] ${box}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${label}`}>Relief centres</div>
        No GCC relief centre listed for Ward {ward}.
      </div>
    );
  }

  const hasCentres = Boolean(ward) && centres.length > 0;
  const notes = [
    hasCentres && 'GCC list: ward and address only, no coordinates, so we cannot say which substation feeds which centre.',
    showBackup && 'Backup is our own straight-line calculation; whether load can be moved has not been checked.',
  ].filter(Boolean);

  return (
    <div className={`p-3 rounded-xl border space-y-2.5 ${box}`}>
      {hasCentres && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>
              Relief centres · Ward {ward}
              {wardEntry?.zone ? ` · Zone ${wardEntry.zone}` : ''}
            </div>
            <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${chip}`}>{centres.length} listed</span>
          </div>

          <div className="space-y-1.5">
            {centres.map((c, i) => (
              <div
                key={`${c.address}-${i}`}
                className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold">{c.address || 'Address not listed'}</div>
                  <div className={`text-[10px] ${label}`}>{c.officer || 'Officer not listed'}</div>
                </div>
                {c.contact && (
                  <a
                    href={`tel:${c.contact}`}
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono text-[10px] font-semibold ${
                      isLight ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-sky-500/10 text-cyan-300 border border-sky-500/30'
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    {c.contact}
                  </a>
                )}
              </div>
            ))}
          </div>
          {planRelief.length > 0 && (
            <div className={`pt-2 border-t space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div
                className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}
                title="GCC plan 2024 relief-centre table. Shown only for zones where our parse of the table equals the plan's own totals (zones 1, 9 and 11)."
              >
                Capacity and facilities (GCC plan 2024)
              </div>
              {planRelief.map((c, i) => (
                <p key={`${c.name}-${i}`} className="text-[11px] leading-snug">
                  <span className="font-semibold">{c.name}</span>: {c.capacity !== null ? `${c.capacity} people` : 'capacity not given'}
                  <span className={label}>
                    {' '}
                    · water {yn(c.water)}, toilets {yn(c.toilets)}, cooking {yn(c.cooking)}
                  </span>
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {showBackup && backup && (
        <div className={hasCentres ? `pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}` : ''}>
          <div className="flex items-center justify-between gap-2">
            <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>Backup substation</div>
            <button
              type="button"
              onClick={() => setShowCriteria(v => !v)}
              aria-expanded={showCriteria}
              aria-label="How the backup is chosen"
              className={`p-0.5 rounded ${label} hover:opacity-80`}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[12px] mt-0.5">
            <strong>{backup.name}</strong> · {backup.km} km
          </p>
          {showCriteria && (
            <p className={`text-[10px] mt-1 ${label}`}>
              Nearest other substation with none of the flood flags: yard above {CHENNAI_AVERAGE_ELEVATION_M} m, outside the 2015 flood
              extent, not rated Moderate or High. Straight-line distance.
            </p>
          )}
        </div>
      )}

      {notes.length > 0 && <span className={`text-[10px] block leading-snug ${sub}`}>{notes.join(' ')}</span>}
    </div>
  );
};

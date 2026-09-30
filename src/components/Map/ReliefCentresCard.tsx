import React, { useState, useMemo } from 'react';
import { Info, Phone } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M } from '../../data/officialSources';
import { useOfficialFlood, isOfficiallyFloodFlagged } from '../../services/officialFloodLayers';
import { useReliefCentres, type ReliefWard } from '../../services/reliefCentres';
import { useGccPlan, wardFacts } from '../../services/gccPlan';
import { getDistanceMeters } from '../../services/liveOutageService';

interface ReliefCentresCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

/**
 * GCC relief centres listed for this substation's ward, or the nearest available ward if none listed,
 * plus a backup-substation suggestion.
 */
const yn = (v: boolean | null) => (v === null ? 'not stated' : v ? 'yes' : 'no');

export const ReliefCentresCard: React.FC<ReliefCentresCardProps> = ({ substation, isLight }) => {
  const data = useReliefCentres();
  const gccPlan = useGccPlan();
  const { flood } = useOfficialFlood(substation.code);
  const planRelief = wardFacts(gccPlan, substation.gccWard)?.relief ?? [];
  const [showCriteria, setShowCriteria] = useState(false);

  const box = isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100';
  const label = isLight ? 'text-slate-500' : 'text-slate-400';
  const sub = isLight ? 'text-slate-400' : 'text-slate-500';
  const chip = isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300';

  const ward = substation.gccWard !== undefined ? String(substation.gccWard) : null;
  const wardEntry = ward && data ? data.wards[ward] : undefined;
  const centres = wardEntry?.centres ?? [];

  // When no relief centres are listed for this substation's ward, find the nearest ward with active shelters
  const nearestWard = useMemo(() => {
    if (!data || centres.length > 0 || !substation.lat || !substation.lng) return null;
    let minD = Infinity;
    let closest: { wardNum: string; ward: ReliefWard; distanceKm: number } | null = null;
    for (const [wNum, wData] of Object.entries(data.wards)) {
      if (!wData.lat || !wData.lng || !wData.centres || wData.centres.length === 0) continue;
      const dMeters = getDistanceMeters(substation.lat, substation.lng, wData.lat, wData.lng);
      if (dMeters < minD) {
        minD = dMeters;
        closest = {
          wardNum: wNum,
          ward: wData,
          distanceKm: Math.round((dMeters / 1000) * 10) / 10,
        };
      }
    }
    return closest;
  }, [data, centres.length, substation.lat, substation.lng]);

  const hasCentres = centres.length > 0;
  const isNearestFallback = !hasCentres && Boolean(nearestWard);
  const displayedCentres = hasCentres ? centres : (nearestWard?.ward.centres ?? []);
  const displayedWard = hasCentres ? ward : nearestWard?.wardNum;
  const effectivePlanRelief = hasCentres
    ? planRelief
    : (nearestWard ? wardFacts(gccPlan, Number(nearestWard.wardNum))?.relief ?? [] : []);

  const hasLifelineFeeders = (substation.feeders || []).some(f => f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water');
  const isFlagged = isOfficiallyFloodFlagged(substation.elevationM, flood);
  const backup = data?.backups[substation.code];
  const showBackup = Boolean(backup) && isFlagged && (displayedCentres.length > 0 || hasLifelineFeeders);

  if (!data || (!ward && !showBackup)) return null;
  if (displayedCentres.length === 0 && !showBackup && ward) {
    return (
      <div className={`p-3 rounded-xl border text-[12.5px] ${box}`}>
        <div className={`text-xs uppercase tracking-wider font-semibold mb-1 ${label}`}>Relief centres</div>
        No GCC relief centre listed for Ward {ward}.
      </div>
    );
  }

  const notes = [
    hasCentres && 'GCC list: ward and address only, no coordinates, so we cannot say which substation feeds which centre.',
    isNearestFallback && `Ward ${ward} has no relief shelter listed. Showing nearest official centre in Ward ${displayedWard}.`,
    showBackup && 'Backup is our own straight-line calculation; whether load can be moved has not been checked.',
  ].filter(Boolean);

  return (
    <div className={`p-3 rounded-xl border space-y-2.5 ${box}`}>
      {displayedCentres.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className={`text-xs uppercase tracking-wider font-semibold ${label}`}>
              {isNearestFallback ? (
                <span>Nearest Relief Centre · Ward {displayedWard} (~{nearestWard?.distanceKm} km)</span>
              ) : (
                <span>Relief centres · Ward {ward}{wardEntry?.zone ? ` · Zone ${wardEntry.zone}` : ''}</span>
              )}
            </div>
            <span className={`px-1.5 py-0.5 rounded font-mono text-xs font-bold ${chip}`}>
              {displayedCentres.length} listed
            </span>
          </div>

          {isNearestFallback && (
            <div className={`p-2 rounded-lg text-xs leading-snug border ${
              isLight
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-amber-950/25 border-amber-800/60 text-amber-300'
            }`}>
              No GCC relief centre listed for Ward {ward}. Showing nearest official shelter in adjacent Ward {displayedWard} (~{nearestWard?.distanceKm} km away).
            </div>
          )}

          <div className="space-y-1.5">
            {displayedCentres.map((c, i) => (
              <div
                key={`${c.address}-${i}`}
                className={`p-2 rounded-lg border text-[12.5px] flex items-center justify-between gap-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold">{c.address || 'Address not listed'}</div>
                  <div className={`text-xs ${label}`}>{c.officer || 'Officer not listed'}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.contact && (
                    <a
                      href={`tel:${c.contact.replace(/[^0-9+]/g, '')}`}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono text-xs font-semibold ${
                        isLight ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-sky-500/10 text-cyan-300 border border-sky-500/30'
                      }`}
                      title="Call Officer"
                    >
                      <Phone className="w-3 h-3" />
                      {c.contact}
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address + ', Chennai')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 shadow-2xs'
                    }`}
                    title="View on Google Maps"
                  >
                    <span>View Place</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
          {effectivePlanRelief.length > 0 && (
            <div className={`pt-2 border-t space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div
                className={`text-xs uppercase tracking-wider font-semibold ${label}`}
                title="GCC plan 2024 relief-centre table. Table rows as printed; the plan's own zone totals sometimes differ from its tables."
              >
                Capacity and facilities (GCC plan 2024 · Ward {displayedWard})
              </div>
              {effectivePlanRelief.map((c, i) => (
                <p key={`${c.name}-${i}`} className="text-[12.5px] leading-snug">
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
        <div className={displayedCentres.length > 0 ? `pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}` : ''}>
          <div className="flex items-center justify-between gap-2">
            <div className={`text-xs uppercase tracking-wider font-semibold ${label}`}>Backup substation</div>
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
          <p className="text-[12.5px] mt-0.5">
            <strong>{backup.name}</strong> · {backup.km} km
          </p>
          {showCriteria && (
            <p className={`text-xs mt-1 ${label}`}>
              Nearest other substation with none of the flood flags: yard above {CHENNAI_AVERAGE_ELEVATION_M} m, outside the 2015 flood
              extent, not rated Moderate or High. Straight-line distance.
            </p>
          )}
        </div>
      )}

      {notes.length > 0 && <span className={`text-xs block leading-snug ${sub}`}>{notes.join(' ')}</span>}
    </div>
  );
};

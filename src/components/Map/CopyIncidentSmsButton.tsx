import React, { useState } from 'react';
import type { TnebSubstation, TnebSection } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M, getQuote } from '../../data/officialSources';

interface CopyIncidentSmsButtonProps {
  node: TnebSubstation | TnebSection;
  isLight: boolean;
}

export const CopyIncidentSmsButton: React.FC<CopyIncidentSmsButtonProps> = ({
  node,
  isLight
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const isSubstation = 'voltage' in node;
    const elev = isSubstation ? (node as TnebSubstation).elevationM : undefined;
    const isLowLying = elev !== undefined && elev <= CHENNAI_AVERAGE_ELEVATION_M;
    // Action text is quoted from the official plans, with its source.
    const action = getQuote(isLowLying ? 'mop-dewatering-pump-arranged' : 'gcc-check-transformers-pillar-boxes');
    const text = `[TNEB CRISIS DISPATCH]
NODE: ${node.name} (Code: ${node.code})
STATUS: ${isLowLying ? `LOW-LYING YARD (${elev} m MSL, at or below Chennai's ${CHENNAI_AVERAGE_ELEVATION_M} m average)` : 'STORM WATCH'}
WARD: GCC Zone ${node.gccZone || 'NA'} • Ward ${node.gccWard || 'NA'} (${node.gccZoneName || 'CMA'})
COUNCILLOR CUG: ${node.wardCouncillorMobile || 'NA'}
CMWSSB WATER AE: ${node.wardCmwssbMobile || 'NA'}
GCC CIVIL AE: ${node.wardGccAeMobile || 'NA'}
RIPON CONTROL: 1913 (24x7)
ACTION: "${action?.quote ?? ''}" (${action?.citation ?? ''})`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`w-full py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
        copied
          ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
          : (isLight
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-indigo-600/20'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-indigo-950')
      }`}
      title="Copy standardized crisis incident format for 2G SMS or wireless VHF dispatch"
    >
      <span>{copied ? '✓ Copied to Clipboard!' : '📋 Copy Incident SMS (Offline Dispatch)'}</span>
    </button>
  );
};

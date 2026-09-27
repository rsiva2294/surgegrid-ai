import React, { useState } from 'react';
import type { TnebSubstation, TnebSection } from '../../types/tneb';

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
    const isSubmerged = elev !== undefined && elev <= 3.2;
    const sop = isSubstation ? (node as TnebSubstation).anticipatorySop : undefined;
    const text = `[TNEB CRISIS DISPATCH]
NODE: ${node.name} (Code: ${node.code})
STATUS: ${isSubmerged ? 'CRITICAL - SWITCHYARD INUNDATION (Surge <= 3.2m MSL)' : 'ACTIVE STORM PATROL'}
WARD: GCC Zone ${node.gccZone || 'NA'} • Ward ${node.gccWard || 'NA'} (${node.gccZoneName || 'CMA'})
COUNCILLOR CUG: ${node.wardCouncillorMobile || 'NA'}
CMWSSB WATER AE: ${node.wardCmwssbMobile || 'NA'}
GCC CIVIL AE: ${node.wardGccAeMobile || 'NA'}
RIPON CONTROL: 1913 (24x7)
ACTION: ${sop || 'Maintain live telemetry and portable diesel dewatering pump standby.'}`;

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

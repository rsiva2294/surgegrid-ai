import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Printer,
  Shield,
  Clock,
  UserCheck,
  BookOpen,
  Send
} from 'lucide-react';
import type { TacticalDirectivePlan } from '../../services/geminiDirectiveService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TacticalCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  directive: TacticalDirectivePlan | null;
  isLoading: boolean;
  isLight: boolean;
}

export const TacticalCommandModal: React.FC<TacticalCommandModalProps> = ({
  isOpen,
  onClose,
  directive,
  isLoading,
  isLight
}) => {
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [copiedSms, setCopiedSms] = useState(false);

  const toggleStep = (id: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopySms = () => {
    if (!directive?.smsDispatchFormat) return;
    navigator.clipboard.writeText(directive.smsDispatchFormat);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={cn(
          "max-w-3xl w-[95vw] md:w-[720px] max-h-[88vh] flex flex-col p-5 overflow-hidden rounded-2xl border",
          isLight
            ? "bg-white text-slate-900 border-slate-200 shadow-2xl"
            : "bg-slate-950 text-slate-100 border-slate-800 shadow-2xl"
        )}
      >
        {/* Header */}
        <DialogHeader className="shrink-0 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md">
                <Sparkles className="size-4 animate-pulse" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-extrabold tracking-tight">
                {directive?.targetScope === 'CITY_WIDE_GRID'
                  ? 'City-Wide Grid Incident Action Plan (IAP)'
                  : 'Hyperlocal Substation Tactical Directive'}
              </DialogTitle>
            </div>

            {directive && (
              <Badge variant={directive.currentRiskLevel.includes('CRITICAL') ? 'danger' : 'warning'} className="font-mono text-[10px]">
                {directive.currentRiskLevel}
              </Badge>
            )}
          </div>

          <DialogDescription className="text-xs flex items-center justify-between gap-2 pt-1 flex-wrap">
            <span className="font-medium truncate">
              Target: <strong className="text-foreground">{directive?.targetName || 'Chennai Grid'}</strong>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Plan ID: {directive?.planId || 'IAP-LIVE'} • {directive?.generatedAt}
            </span>
          </DialogDescription>

          {/* Statutory Reference Badges */}
          <div className="flex items-center gap-1.5 pt-2 flex-wrap text-[10px]">
            <Badge variant="statutory">TNSDMA SDMP 2023 §5.6</Badge>
            <Badge variant="statutory">TNSDMA ESF 15 (Energy)</Badge>
            <Badge variant="statutory">TANGEDCO Manual 2017 R44</Badge>
            <Badge variant="statutory">GCC CDMP 2023</Badge>
          </div>
        </DialogHeader>

        {/* Modal Body: Scrollable Action Plan */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 py-3">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-muted-foreground animate-pulse">
                Synthesizing statutory guidelines from TNSDMA SDMP 2023 and TANGEDCO 2017 Manual...
              </p>
            </div>
          ) : directive ? (
            <>
              {/* Executive Command Briefing Card */}
              <Card
                className={cn(
                  "p-3 rounded-xl border text-xs leading-relaxed",
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
                )}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1 text-primary">
                  <Shield className="size-3.5" />
                  <span>Executive Operational Assessment</span>
                </div>
                <p className="text-muted-foreground">{directive.executiveSummary}</p>
                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Conditions: {directive.weatherSnapshot}</span>
                </div>
              </Card>

              {/* Action Steps Interactive Checklist */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Tactical SOP Execution Checklist ({Object.values(completedSteps).filter(Boolean).length}/{directive.steps.length} Completed)</span>
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Click step to toggle completion</span>
                </div>

                <div className="flex flex-col gap-2">
                  {directive.steps.map((step) => {
                    const isDone = Boolean(completedSteps[step.id]);
                    return (
                      <div
                        key={step.id}
                        onClick={() => toggleStep(step.id)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 group",
                          isDone
                            ? isLight
                              ? "bg-emerald-50/70 border-emerald-300 opacity-75"
                              : "bg-emerald-950/20 border-emerald-800/60 opacity-75"
                            : isLight
                            ? "bg-white hover:bg-slate-50 border-slate-200 shadow-xs hover:border-slate-300"
                            : "bg-slate-900/80 hover:bg-slate-900 border-slate-800 shadow-xs hover:border-slate-700"
                        )}
                      >
                        {/* Checkbox Icon */}
                        <div className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                          {isDone ? (
                            <CheckCircle2 className="size-4 text-emerald-500 fill-emerald-500/20" />
                          ) : (
                            <Circle className="size-4" />
                          )}
                        </div>

                        {/* Step Details */}
                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={cn("text-xs font-bold", isDone && "line-through text-muted-foreground")}>
                              {step.stepNumber}. {step.title}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge
                                variant={step.priority === 'CRITICAL' ? 'danger' : step.priority === 'HIGH' ? 'warning' : 'info'}
                                className="text-[9px] py-0 px-1.5"
                              >
                                {step.priority}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono">
                                <Clock className="size-2.5 mr-0.5 inline" />
                                {step.timeframeSla}
                              </Badge>
                            </div>
                          </div>

                          <p className={cn("text-xs leading-snug", isDone ? "text-muted-foreground" : "text-foreground")}>
                            {step.action}
                          </p>

                          {/* Statutory Footnote */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-[10px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <BookOpen className="size-3 text-indigo-400" />
                              <span>{step.statutoryBasis}</span>
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <UserCheck className="size-3 text-emerald-400" />
                              <span>{step.responsibleEntity}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2G SMS Dispatch Preview Box */}
              <div
                className={cn(
                  "p-3 rounded-xl border flex flex-col gap-1.5 text-xs",
                  isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Send className="size-3.5 text-sky-500" />
                    <span>2G Emergency SMS / Field Dispatch Broadcast</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleCopySms}
                    className="gap-1 h-6 text-[10px]"
                  >
                    {copiedSms ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    <span>{copiedSms ? 'Copied' : 'Copy Dispatch Text'}</span>
                  </Button>
                </div>
                <pre className="font-mono text-[11px] p-2 rounded-lg bg-black/10 dark:bg-black/40 overflow-x-auto whitespace-pre-wrap leading-tight text-muted-foreground select-all">
                  {directive.smsDispatchFormat}
                </pre>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 pt-3 border-t border-border flex items-center justify-between sm:justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs"
            >
              <Printer className="size-3.5" />
              <span>Print / Binder Export</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Acknowledge &amp; Return to Map
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

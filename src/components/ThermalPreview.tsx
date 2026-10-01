import React, { useState } from 'react';
import {
  Printer,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Ruler,
} from 'lucide-react';
import type { NotionTask, RollHeaderConfig } from '../types';

interface ThermalPreviewProps {
  previewUrl: string;
  crispUrl?: string;
  linesCount: number;
  isPrinting: boolean;
  printProgress: number;
  isBleConnected: boolean;
  onPrint: () => void;
  onConnectBle: () => void;
  printError?: string;
  printSuccess?: boolean;
  batchTasks?: NotionTask[];
  currentBatchIndex?: number;
  onSelectBatchTask?: (taskId: string) => void;
  activeTaskTitle?: string;
  isRollMode?: boolean;
  onToggleRollMode?: (isRoll: boolean) => void;
  rollConfig?: RollHeaderConfig;
  onChangeRollConfig?: (config: Partial<RollHeaderConfig>) => void;
}

export const ThermalPreview: React.FC<ThermalPreviewProps> = ({
  previewUrl,
  crispUrl,
  linesCount,
  isPrinting,
  printProgress,
  isBleConnected,
  onPrint,
  onConnectBle,
  printError,
  printSuccess,
  batchTasks = [],
  currentBatchIndex = 0,
  onSelectBatchTask,
  activeTaskTitle,
  isRollMode = false,
  onToggleRollMode,
  rollConfig,
  onChangeRollConfig,
}) => {
  const [viewMode, setViewMode] = useState<'crisp' | 'thermal'>('crisp');
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [isHeaderConfigOpen, setIsHeaderConfigOpen] = useState<boolean>(false);
  const heightMm = Math.round(linesCount / 8);
  const heightCm = (heightMm / 10).toFixed(1);

  const displayUrl = viewMode === 'crisp' && crispUrl ? crispUrl : previewUrl;

  const handleDownload = () => {
    if (!displayUrl) return;
    const a = document.createElement('a');
    a.href = displayUrl;
    a.download = `papertask-card-${Date.now()}.png`;
    a.click();
  };

  const handlePrintPdf = () => {
    if (!displayUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PaperTask - ${activeTaskTitle || 'Card'}</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              background: #ffffff;
            }
            img {
              width: 58mm;
              max-width: 100%;
              height: auto;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${displayUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-md p-4 sm:p-5 flex flex-col items-center space-y-4">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-[#00213f] tracking-tight">Preview</h2>
          <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-[#f3efff] text-[#6314ff]">
            384px
          </span>
        </div>

        {/* View Mode Toggle: Crisp vs Thermal 1-Bit */}
        <div className="flex items-center p-0.5 bg-[#f0f4f8] rounded text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('crisp')}
            className={`px-2.5 py-1 rounded transition ${
              viewMode === 'crisp'
                ? 'bg-white text-[#00213f] font-extrabold'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Crisp
          </button>
          <button
            type="button"
            onClick={() => setViewMode('thermal')}
            className={`px-2.5 py-1 rounded transition ${
              viewMode === 'thermal'
                ? 'bg-white text-[#00213f] font-extrabold'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            1-Bit Dot
          </button>
        </div>
      </div>

      {/* Roll vs Single Card Mode Switcher (when multiple tasks are selected) */}
      {batchTasks.length > 1 && (
        <div className="w-full flex items-center p-1 bg-[#f0f4f8] rounded text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => onToggleRollMode?.(true)}
            className={`flex-1 py-1.5 rounded transition flex items-center justify-center gap-1.5 ${
              isRollMode
                ? 'bg-[#00213f] text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span>Continuous Roll ({batchTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleRollMode?.(false)}
            className={`flex-1 py-1.5 rounded transition flex items-center justify-center gap-1.5 ${
              !isRollMode
                ? 'bg-[#00213f] text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <span>Single Card</span>
          </button>
        </div>
      )}

      {/* Batch Navigation Carousel (when multiple tasks selected and viewing Single Card) */}
      {batchTasks.length > 1 && !isRollMode && (
        <div className="w-full flex items-center justify-between p-2 rounded bg-[#f3efff] text-[#00213f] text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              const prevIdx = (currentBatchIndex - 1 + batchTasks.length) % batchTasks.length;
              onSelectBatchTask?.(batchTasks[prevIdx].id);
            }}
            className="p-1.5 rounded bg-white hover:bg-[#ede7ff] transition shrink-0"
            title="Previous card"
          >
            <ChevronLeft className="w-4 h-4 text-[#6314ff]" />
          </button>
          <div className="flex flex-col items-center min-w-0 px-2 text-center">
            <span className="text-[#6314ff] font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>Card {currentBatchIndex + 1} of {batchTasks.length}</span>
            </span>
            <span className="text-xs truncate max-w-[190px] font-bold text-[#00213f]">
              {activeTaskTitle || batchTasks[currentBatchIndex]?.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextIdx = (currentBatchIndex + 1) % batchTasks.length;
              onSelectBatchTask?.(batchTasks[nextIdx].id);
            }}
            className="p-1.5 rounded bg-white hover:bg-[#ede7ff] transition shrink-0"
            title="Next card"
          >
            <ChevronRight className="w-4 h-4 text-[#6314ff]" />
          </button>
        </div>
      )}

      {/* Roll Header Banner Collapsible Quick-Bar */}
      {isRollMode && batchTasks.length > 1 && rollConfig && (
        <div className="w-full bg-[#f8fafc] rounded-md p-2 space-y-2 text-xs text-[#00213f]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsHeaderConfigOpen(!isHeaderConfigOpen)}
              className="flex items-center gap-1.5 font-bold text-zinc-800 hover:text-[#6314ff] transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#6314ff]" />
              <span>Roll Banner & Reflections</span>
              <span className="text-[10px] text-zinc-500 font-normal">
                ({rollConfig.enabled ? 'Active' : 'Off'}) · {isHeaderConfigOpen ? 'Hide' : 'Edit'}
              </span>
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rollConfig.enabled}
                onChange={(e) => onChangeRollConfig?.({ enabled: e.target.checked })}
                className="accent-[#6314ff] w-3.5 h-3.5 rounded cursor-pointer"
              />
              <span className="text-[11px] text-zinc-600 font-semibold">Enable</span>
            </label>
          </div>

          {isHeaderConfigOpen && rollConfig.enabled && (
            <div className="space-y-2 pt-1.5 border-t border-zinc-200 animate-in fade-in duration-150">
              <input
                type="text"
                placeholder="Header Title (e.g. TODAY'S MISSIONS)..."
                value={rollConfig.customTitle}
                onChange={(e) => onChangeRollConfig?.({ customTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Daily Motto / Quote..."
                value={rollConfig.motto}
                onChange={(e) => onChangeRollConfig?.({ motto: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
              <label className="flex items-center gap-1.5 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={rollConfig.includeFooterNotes}
                  onChange={(e) => onChangeRollConfig?.({ includeFooterNotes: e.target.checked })}
                  className="accent-[#6314ff] w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span className="text-[11px] text-zinc-600 font-medium">Add Reflection Notes section at end of roll</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* 100% Width Scrollable Thermal Paper Strip with Calibrated Physical Metric Ruler */}
      <div className="w-full bg-[#eef2f6] rounded-md p-1.5 flex flex-col items-center">
        <div className="w-full max-h-[580px] overflow-y-auto overflow-x-hidden rounded bg-white shadow-xs flex relative">
          
          {/* Calibrated Metric Ruler (80 dots = 1cm at 203 DPI) */}
          {showRuler && linesCount > 0 && (
            <div
              className="w-7 shrink-0 bg-[#f8fafc] border-r border-zinc-200 select-none relative text-[8px] font-mono text-zinc-400 font-bold"
              style={{ minHeight: `${linesCount}px` }}
            >
              {Array.from({ length: Math.ceil(linesCount / 80) + 1 }).map((_, cm) => {
                const topPx = cm * 80;
                if (topPx > linesCount) return null;
                return (
                  <div key={cm} className="absolute left-0 w-full" style={{ top: `${topPx}px` }}>
                    <div className="w-full flex items-center justify-between pr-0.5">
                      <div className="w-2.5 h-[1.5px] bg-zinc-400" />
                      <span>{cm}</span>
                    </div>
                    {/* 0.5cm tick */}
                    <div className="absolute left-0 w-1.5 h-[1px] bg-zinc-300" style={{ top: '40px' }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Paper Strip */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Serrated Top Edge */}
            <div className="w-full flex justify-between overflow-hidden opacity-35 py-1 bg-white shrink-0">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 bg-zinc-400 transform rotate-45 -mt-1.5 shrink-0" />
              ))}
            </div>

            {/* Canvas Render (100% full width, razor-sharp anti-aliased font or 1-bit dot) */}
            {displayUrl ? (
              <div className="w-full flex justify-center bg-white">
                <img
                  src={displayUrl}
                  alt="Card Preview"
                  className="w-full h-auto block select-none"
                  style={{
                    imageRendering: viewMode === 'thermal' ? 'pixelated' : '-webkit-optimize-contrast',
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-48 flex flex-col items-center justify-center text-zinc-400 gap-2">
                <Eye className="w-8 h-8 opacity-40 text-[#6314ff]" />
                <span className="text-sm font-medium text-zinc-500">No task selected</span>
              </div>
            )}

            {/* Serrated Bottom Edge */}
            <div className="w-full flex justify-between overflow-hidden opacity-35 py-1 bg-white shrink-0">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 bg-zinc-400 transform rotate-45 -mb-1.5 shrink-0" />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Paper length info & Ruler Toggle */}
      <div className="w-full flex items-center justify-between text-xs text-zinc-500 font-semibold px-1">
        <span>Paper length: ~{heightCm} cm</span>
        <button
          type="button"
          onClick={() => setShowRuler(!showRuler)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
            showRuler ? 'bg-[#f3efff] text-[#6314ff] font-bold' : 'hover:text-zinc-800'
          }`}
          title="Toggle physical centimeter ruler"
        >
          <Ruler className="w-3 h-3" />
          <span>{showRuler ? 'Ruler On' : 'Ruler Off'}</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {printSuccess && (
        <div className="w-full p-3.5 rounded-md bg-purple-50 text-[#6314ff] text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#6314ff] shrink-0" />
          <span>Printed successfully</span>
        </div>
      )}

      {printError && (
        <div className="w-full p-3.5 rounded-md bg-rose-50 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="break-all">{printError}</span>
        </div>
      )}

      {/* Printing Progress */}
      {isPrinting && (
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs sm:text-sm font-medium text-zinc-700">
            <span>Printing...</span>
            <span className="font-bold text-[#6314ff]">{Math.round(printProgress * 100)}%</span>
          </div>
          <div className="w-full h-2.5 rounded bg-zinc-200 overflow-hidden">
            <div
              className="h-full bg-[#6314ff] rounded transition-all duration-150"
              style={{ width: `${Math.round(printProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full space-y-2">
        <div className="w-full flex gap-2">
          {/* Direct Print to PDF / System Print */}
          <button
            type="button"
            onClick={handlePrintPdf}
            disabled={!displayUrl}
            className="flex-1 py-3 px-3 rounded-md bg-[#f0f4f8] hover:bg-[#e4ebf3] text-[#00213f] text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 min-h-[46px]"
            title="Print directly to PDF or standard printer"
          >
            <FileText className="w-4 h-4 text-[#6314ff]" />
            <span>
              {isRollMode && batchTasks.length > 1
                ? `PDF / Roll (${batchTasks.length})`
                : 'PDF / Print'}
            </span>
          </button>

          {/* Download PNG image */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!displayUrl}
            className="flex-1 py-3 px-3 rounded-md bg-[#f0f4f8] hover:bg-[#e4ebf3] text-[#00213f] text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 min-h-[46px]"
          >
            <Download className="w-4 h-4 text-[#6314ff]" />
            <span>Save Image</span>
          </button>
        </div>

        {/* Primary Bluetooth Print Button */}
        {isBleConnected ? (
          <button
            type="button"
            onClick={onPrint}
            disabled={isPrinting || !previewUrl}
            className="w-full py-3.5 px-4 rounded-md bg-[#00213f] hover:bg-[#003366] active:bg-[#00172e] text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]"
          >
            <Printer className="w-4 h-4 text-purple-300" />
            <span>
              {isPrinting
                ? isRollMode && batchTasks.length > 1
                  ? 'Printing Seamless Roll...'
                  : 'Printing...'
                : isRollMode && batchTasks.length > 1
                ? `Print Seamless Roll (${batchTasks.length})`
                : 'Print to Bluetooth Cat'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnectBle}
            disabled={!previewUrl}
            className="w-full py-3.5 px-4 rounded-md bg-[#00213f] hover:bg-[#003366] active:bg-[#00172e] text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>
              {isRollMode && batchTasks.length > 1
                ? `Connect & Print Roll (${batchTasks.length})`
                : 'Connect & Print'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import type { CardPropertyConfig, PrintSettings } from '../types';
import {
  Tag,
  Calendar,
  QrCode,
  Clock,
  FileText,
  Sparkles,
  User,
  Hash,
  Check,
  CheckSquare,
  Plus,
  Eye,
  EyeOff,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PropertyMapperProps {
  isOpen: boolean;
  onClose: () => void;
  properties: CardPropertyConfig[];
  onToggleProperty: (id: string) => void;
  printSettings: PrintSettings;
  onChangePrintSettings: (settings: Partial<PrintSettings>) => void;
  onAddCustomLabel: (label: string) => void;
  onClearAllTasks: () => void;
  hasTasks: boolean;
}

export const PropertyMapper: React.FC<PropertyMapperProps> = ({
  isOpen,
  onClose,
  properties,
  onToggleProperty,
  printSettings,
  onChangePrintSettings,
  onAddCustomLabel,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showHardwareSettings, setShowHardwareSettings] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onAddCustomLabel(customInput.trim());
    setCustomInput('');
  };

  const getIcon = (type: string, id: string) => {
    switch (type) {
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-rose-500" />;
      case 'number':
        return <Clock className="w-3.5 h-3.5 text-[#6314ff]" />;
      case 'multi_select':
        return <Tag className="w-3.5 h-3.5 text-indigo-500" />;
      case 'select':
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      case 'status':
        return <CheckSquare className="w-3.5 h-3.5 text-[#6314ff]" />;
      case 'people':
        return <User className="w-3.5 h-3.5 text-blue-500" />;
      case 'checkbox':
        return <Check className="w-3.5 h-3.5 text-emerald-500" />;
      case 'qr':
      case 'url':
        return <QrCode className="w-3.5 h-3.5 text-[#6314ff]" />;
      case 'rich_text':
      case 'title':
        return <FileText className="w-3.5 h-3.5 text-zinc-600" />;
      default:
        if (id === 'qrCode') return <QrCode className="w-3.5 h-3.5 text-[#6314ff]" />;
        return <Hash className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const enabledCount = properties.filter((p) => p.enabled).length;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-1.5 w-76 sm:w-80 bg-white rounded-md shadow-xl border border-zinc-200/90 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden text-[#00213f]"
    >
      {/* Notion-style Popover Header */}
      <div className="px-3.5 py-2.5 bg-[#fbfcfd] border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
            Card Properties
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f3efff] text-[#6314ff] font-bold">
            {enabledCount}/{properties.length}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400">Click to toggle</span>
      </div>

      {/* Properties List (Notion table menu rows) */}
      <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
        {properties.length === 0 ? (
          <div className="p-3 text-center text-xs text-zinc-400">No properties loaded</div>
        ) : (
          properties.map((prop) => (
            <button
              key={prop.id}
              type="button"
              onClick={() => onToggleProperty(prop.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors text-left cursor-pointer group ${
                prop.enabled
                  ? 'hover:bg-[#f6f3ff] text-[#00213f]'
                  : 'hover:bg-zinc-50 text-zinc-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0">{getIcon(prop.type, prop.id)}</div>
                <span className="text-xs font-semibold truncate leading-tight">
                  {prop.label}
                </span>
              </div>

              {/* Eye toggle indicator */}
              <div className="shrink-0 text-zinc-400 group-hover:text-zinc-700">
                {prop.enabled ? (
                  <Eye className="w-3.5 h-3.5 text-[#6314ff]" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-zinc-300" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Inline Quick Add Custom Property */}
      <form onSubmit={handleAddCustom} className="p-2 border-t border-zinc-100 bg-[#fbfcfd] flex gap-1.5">
        <input
          type="text"
          placeholder="New property name..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          className="flex-1 bg-white px-2 py-1 rounded border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#6314ff]"
        />
        <button
          type="submit"
          className="px-2.5 py-1 rounded bg-[#00213f] hover:bg-[#003366] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </form>

      {/* Collapsible Printer Darkness & Contrast Section */}
      <div className="border-t border-zinc-100 bg-[#f8fafc]">
        <button
          type="button"
          onClick={() => setShowHardwareSettings(!showHardwareSettings)}
          className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-zinc-600 hover:text-[#00213f] hover:bg-zinc-100/60 transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>Thermal Burn & Contrast</span>
          </span>
          {showHardwareSettings ? (
            <ChevronUp className="w-3 h-3 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          )}
        </button>

        {showHardwareSettings && (
          <div className="p-3 pt-1 space-y-2.5 border-t border-zinc-100 bg-white animate-in fade-in duration-100">
            {/* Contrast Mode */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Contrast Mode</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangePrintSettings({ dithering: 'threshold' })}
                  className={`py-1 px-2 rounded text-[11px] font-bold transition cursor-pointer ${
                    printSettings.dithering === 'threshold'
                      ? 'bg-[#00213f] text-white'
                      : 'bg-[#f0f4f8] text-[#00213f] hover:bg-[#e4ebf3]'
                  }`}
                >
                  Solid Crisp
                </button>
                <button
                  type="button"
                  onClick={() => onChangePrintSettings({ dithering: 'atkinson' })}
                  className={`py-1 px-2 rounded text-[11px] font-bold transition cursor-pointer ${
                    printSettings.dithering === 'atkinson'
                      ? 'bg-[#00213f] text-white'
                      : 'bg-[#f0f4f8] text-[#00213f] hover:bg-[#e4ebf3]'
                  }`}
                >
                  Photo Dither
                </button>
              </div>
            </div>

            {/* Darkness Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-zinc-500 uppercase">Burn Darkness</span>
                <span className="font-extrabold text-[#6314ff]">{printSettings.darkness}</span>
              </div>
              <input
                type="range"
                min="150"
                max="255"
                value={printSettings.darkness}
                onChange={(e) => onChangePrintSettings({ darkness: Number(e.target.value) })}
                className="w-full accent-[#6314ff] h-1.5 bg-[#e2e8f0] rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

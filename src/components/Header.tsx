import React from 'react';
import { Bluetooth, Database, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  isBleConnected: boolean;
  deviceName: string;
  isConnecting: boolean;
  onConnectBle: () => void;
  onDisconnectBle: () => void;
  onOpenNotionModal: () => void;
  onOpenQuickAdd: () => void;
  onRefreshTasks: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isBleConnected,
  deviceName,
  isConnecting,
  onConnectBle,
  onDisconnectBle,
  onOpenNotionModal,
  onOpenQuickAdd,
  onRefreshTasks,
  isSyncing,
}) => {
  return (
    <header className="w-full bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 space-y-3 md:space-y-0">
        
        {/* Main Bar */}
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#f3efff] flex items-center justify-center shrink-0">
              <img src="/papertask_icon.svg" alt="PaperTask" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-[#00213f] tracking-tight">
                  PaperTask
                </span>
                <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-[#f3efff] text-[#6314ff]">
                  Cat 384px
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            <button
              onClick={onRefreshTasks}
              disabled={isSyncing}
              className="p-2.5 rounded-md bg-[#f0f4f8] hover:bg-[#e4ebf3] text-[#00213f] transition flex items-center justify-center disabled:opacity-50 min-h-[42px] min-w-[42px]"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onOpenQuickAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#f0f4f8] hover:bg-[#e4ebf3] text-[#00213f] text-sm font-bold transition min-h-[42px]"
            >
              <Plus className="w-4 h-4 text-[#6314ff]" />
              <span>Add</span>
            </button>

            <button
              onClick={onOpenNotionModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#f0f4f8] hover:bg-[#e4ebf3] text-[#00213f] text-sm font-bold transition min-h-[42px]"
            >
              <Database className="w-4 h-4 text-[#6314ff]" />
              <span>Notion</span>
            </button>

            {isBleConnected ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-[#f0f4f8] text-[#00213f] text-sm font-bold min-h-[42px]">
                  <CheckCircle2 className="w-4 h-4 text-[#6314ff] shrink-0" />
                  <span className="max-w-[130px] truncate">{deviceName || 'Cat Printer'}</span>
                </div>
                <button
                  onClick={onDisconnectBle}
                  className="px-3 py-2.5 rounded-md bg-[#f0f4f8] hover:bg-rose-50 hover:text-rose-700 text-zinc-600 text-sm font-semibold transition min-h-[42px]"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectBle}
                disabled={isConnecting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#00213f] hover:bg-[#003366] active:bg-[#00172e] text-white text-sm font-bold transition disabled:opacity-60 min-h-[42px]"
              >
                <Bluetooth className={`w-4 h-4 text-purple-300 ${isConnecting ? 'animate-bounce' : ''}`} />
                <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
              </button>
            )}
          </div>

          {/* Mobile Right Action: Connect Printer Button or Status */}
          <div className="flex md:hidden items-center gap-2">
            {isBleConnected ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#f0f4f8] text-[#00213f] text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#6314ff] shrink-0" />
                <span className="truncate max-w-[90px]">{deviceName || 'Printer'}</span>
              </div>
            ) : (
              <button
                onClick={onConnectBle}
                disabled={isConnecting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#00213f] hover:bg-[#003366] text-white text-xs font-bold transition disabled:opacity-60 shrink-0"
              >
                <Bluetooth className={`w-3.5 h-3.5 text-purple-300 ${isConnecting ? 'animate-bounce' : ''}`} />
                <span>{isConnecting ? 'Pairing...' : 'Connect'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Row 2: Secondary Action Bar (Spacious & uncluttered) */}
        <div className="flex md:hidden items-center gap-2 pt-1">
          <button
            onClick={onOpenQuickAdd}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md bg-[#f0f4f8] active:bg-[#e4ebf3] text-[#00213f] text-xs font-bold transition"
          >
            <Plus className="w-4 h-4 text-[#6314ff]" />
            <span>Add</span>
          </button>

          <button
            onClick={onOpenNotionModal}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md bg-[#f0f4f8] active:bg-[#e4ebf3] text-[#00213f] text-xs font-bold transition"
          >
            <Database className="w-4 h-4 text-[#6314ff]" />
            <span>Notion</span>
          </button>

          <button
            onClick={onRefreshTasks}
            disabled={isSyncing}
            className="p-2.5 rounded-md bg-[#f0f4f8] active:bg-[#e4ebf3] text-[#00213f] transition flex items-center justify-center disabled:opacity-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>
    </header>
  );
};

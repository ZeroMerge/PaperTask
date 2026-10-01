import React, { useState } from 'react';
import { X, Database, Key, Check } from 'lucide-react';
import type { NotionCredentials } from '../services/notionService';

interface NotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: NotionCredentials;
  onSaveAndSync: (creds: NotionCredentials) => Promise<void>;
  isLoading: boolean;
  errorMessage?: string;
}

export const NotionModal: React.FC<NotionModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSaveAndSync,
  isLoading,
  errorMessage,
}) => {
  const [apiKey, setApiKey] = useState(credentials.apiKey);
  const [databaseId, setDatabaseId] = useState(credentials.databaseId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAndSync({ apiKey, databaseId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-md p-6 sm:p-7 space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#f3efff] flex items-center justify-center text-[#6314ff]">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#00213f] tracking-tight">
              Notion Sync
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded bg-[#f0f4f8] hover:bg-[#e4ebf3] text-zinc-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="p-3.5 rounded bg-rose-50 text-rose-800 text-xs sm:text-sm font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#6314ff]" />
              <span>Integration Secret</span>
            </label>
            <input
              type="password"
              placeholder="secret_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#f0f4f8] px-3.5 py-3 rounded-md text-sm sm:text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-[#e4ebf3] transition"
            />
          </div>

          {/* Database ID / URL */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#6314ff]" />
              <span>Database URL or ID</span>
            </label>
            <input
              type="text"
              placeholder="Paste database URL or ID..."
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              className="w-full bg-[#f0f4f8] px-3.5 py-3 rounded-md text-sm sm:text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-[#e4ebf3] transition"
            />
          </div>

          {/* Minimal setup hint */}
          <p className="text-xs text-zinc-500 pt-0.5">
            Connect your integration at <a href="https://notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-[#6314ff] underline font-bold">notion.so/my-integrations</a> to your database.
          </p>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-md bg-[#f0f4f8] hover:bg-[#e4ebf3] text-zinc-800 text-sm font-bold transition min-h-[46px]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading || !apiKey || !databaseId}
              className="flex-1 py-3 px-4 rounded-md bg-[#00213f] hover:bg-[#003366] active:bg-[#00172e] text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[46px]"
            >
              <Check className="w-4 h-4 text-purple-300" />
              <span>{isLoading ? 'Connecting...' : 'Sync'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

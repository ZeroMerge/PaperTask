import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { TaskCard } from './components/TaskCard';
import { PropertyMapper } from './components/PropertyMapper';
import { ThermalPreview } from './components/ThermalPreview';
import { NotionModal } from './components/NotionModal';
import { QuickAddModal } from './components/QuickAddModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import type {
  NotionTask,
  CardPropertyConfig,
  PrintSettings,
  RollHeaderConfig,
} from './types';
import {
  loadSavedCredentials,
  saveCredentials,
  loadStoredTasks,
  saveStoredTasks,
  clearAllStoredTasks,
  loadStoredProperties,
  saveStoredProperties,
  fetchNotionDatabaseTasks,
  loadStoredPrintSettings,
  saveStoredPrintSettings,
  loadStoredRollHeaderConfig,
  saveStoredRollHeaderConfig,
  updateNotionTaskCompletion,
  type NotionCredentials,
} from './services/notionService';
import { catPrinter } from './services/blePrinter';
import { renderTaskCard, renderSeamlessRoll, canvasTo1BitBitmap } from './services/rasterizer';
import {
  Printer,
  Filter,
  CheckCircle2,
  Sliders,
  Sparkles,
} from 'lucide-react';

const DEFAULT_PROPERTIES: CardPropertyConfig[] = [
  { id: 'Priority', label: 'Priority', type: 'select', enabled: true },
  { id: 'Status', label: 'Status', type: 'status', enabled: true },
  { id: 'Project', label: 'Project', type: 'select', enabled: true },
  { id: 'Due Date', label: 'Due Date', type: 'date', enabled: true },
  { id: 'Tags', label: 'Tags', type: 'multi_select', enabled: true },
  { id: 'Estimated Pomodoros', label: 'Estimated Pomodoros', type: 'number', enabled: true },
  { id: 'qrCode', label: 'Notion Page QR Code', type: 'qr', enabled: true },
];

export function App() {
  // Tasks state (starts strictly empty unless user already synced their own Notion)
  const [tasks, setTasks] = useState<NotionTask[]>(() => loadStoredTasks());
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    const stored = loadStoredTasks();
    return stored[0]?.id || '';
  });

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'urgent' | 'in_progress'>('all');

  // Mobile active tab: 'tasks' | 'preview'
  const [mobileTab, setMobileTab] = useState<'tasks' | 'preview'>('tasks');

  // Slide-over fields & settings drawer state
  const [isFieldsOpen, setIsFieldsOpen] = useState<boolean>(false);

  // Properties configuration loaded dynamically from Notion database
  const [properties, setProperties] = useState<CardPropertyConfig[]>(() => {
    const storedProps = loadStoredProperties();
    if (storedProps && storedProps.length > 0) {
      const list: CardPropertyConfig[] = storedProps
        .filter((p) => p.type !== 'title')
        .map((p) => ({
          id: p.name,
          label: p.name,
          type: p.type,
          enabled: p.enabled,
        }));
      list.push({ id: 'qrCode', label: 'Notion Page QR Code', type: 'qr', enabled: true });
      return list;
    }
    return DEFAULT_PROPERTIES;
  });

  // Print settings (persisted in localStorage)
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    const saved = loadStoredPrintSettings();
    if (saved) return saved;
    return {
      darkness: 215,
      dithering: 'threshold',
      autoFeedLines: 80,
      showTearGuide: true,
      paperWidthMm: 57,
      printableDots: 384,
    };
  });

  useEffect(() => {
    saveStoredPrintSettings(printSettings);
  }, [printSettings]);

  // Roll Mission Header configuration (persisted in localStorage)
  const [rollConfig, setRollConfig] = useState<RollHeaderConfig>(() => loadStoredRollHeaderConfig());

  useEffect(() => {
    saveStoredRollHeaderConfig(rollConfig);
  }, [rollConfig]);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [crispUrl, setCrispUrl] = useState<string>('');
  const [linesCount, setLinesCount] = useState<number>(0);
  const [rawBitmap, setRawBitmap] = useState<Uint8Array | null>(null);

  // BLE state
  const [isBleConnected, setIsBleConnected] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const [isConnectingBle, setIsConnectingBle] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printProgress, setPrintProgress] = useState<number>(0);
  const [printError, setPrintError] = useState<string | undefined>(undefined);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);

  // Notion state
  const [notionCreds, setNotionCreds] = useState<NotionCredentials>(() => loadSavedCredentials());
  const [isNotionModalOpen, setIsNotionModalOpen] = useState<boolean>(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notionError, setNotionError] = useState<string | undefined>(undefined);

  // Save tasks to local storage whenever they change
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  // Current active task
  const activeTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || tasks[0] || null;
  }, [tasks, selectedTaskId]);

  // Seamless Roll Mode state (auto-enabled when >= 2 tasks selected)
  const [isRollMode, setIsRollMode] = useState<boolean>(false);

  // Task Sequencing Queue: Ordered IDs for continuous roll printing (Single Source of Truth)
  const [batchSequence, setBatchSequence] = useState<string[]>([]);

  // Derived set of selected IDs (guaranteed 100% in sync with batchSequence, never duplicates)
  const batchSelectedIds = useMemo(() => new Set(batchSequence), [batchSequence]);

  // Batch tasks selected (strictly deduplicated and respecting custom sequencing order)
  const batchTasks = useMemo(() => {
    const seen = new Set<string>();
    const uniqueIds = batchSequence.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return uniqueIds
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is NotionTask => Boolean(t));
  }, [tasks, batchSequence]);

  const currentBatchIndex = useMemo(() => {
    const idx = batchTasks.findIndex((t) => t.id === selectedTaskId);
    return idx >= 0 ? idx : 0;
  }, [batchTasks, selectedTaskId]);

  // Filter tasks (deduplicate by ID to guard against any double entries from Notion or localStorage)
  const filteredTasks = useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      if (activeFilter === 'today') return t.dueDate?.toLowerCase().includes('today');
      if (activeFilter === 'urgent') return t.priority?.toLowerCase() === 'urgent' || t.priority?.toLowerCase() === 'high';
      if (activeFilter === 'in_progress') return t.status?.toLowerCase().includes('progress');
      return true;
    });
  }, [tasks, activeFilter]);

  // Render 1-bit thermal preview whenever activeTask, batchTasks, isRollMode, properties, or printSettings change
  const updatePreview = useCallback(async () => {
    try {
      if (isRollMode && batchTasks.length > 1) {
        const { canvas, height } = await renderSeamlessRoll(batchTasks, properties, printSettings, rollConfig);
        const { bitmap, previewDataUrl, crispDataUrl } = canvasTo1BitBitmap(
          canvas,
          printSettings.dithering,
          printSettings.darkness
        );

        setPreviewUrl(previewDataUrl);
        setCrispUrl(crispDataUrl);
        setLinesCount(height);
        setRawBitmap(bitmap);
        return;
      }

      if (!activeTask) {
        setPreviewUrl('');
        setCrispUrl('');
        setLinesCount(0);
        setRawBitmap(null);
        return;
      }

      const { canvas, height } = await renderTaskCard(activeTask, properties, printSettings);
      const { bitmap, previewDataUrl, crispDataUrl } = canvasTo1BitBitmap(
        canvas,
        printSettings.dithering,
        printSettings.darkness
      );

      setPreviewUrl(previewDataUrl);
      setCrispUrl(crispDataUrl);
      setLinesCount(height);
      setRawBitmap(bitmap);
    } catch (err) {
      console.error('Failed to render preview', err);
    }
  }, [activeTask, batchTasks, isRollMode, properties, printSettings, rollConfig]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Bluetooth connect handler
  const handleConnectBle = async () => {
    setIsConnectingBle(true);
    setPrintError(undefined);
    try {
      await catPrinter.connect();
      setIsBleConnected(true);
      setDeviceName(catPrinter.deviceName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect Bluetooth';
      setPrintError(msg);
      setIsBleConnected(false);
    } finally {
      setIsConnectingBle(false);
    }
  };

  const handleDisconnectBle = () => {
    catPrinter.disconnect();
    setIsBleConnected(false);
    setDeviceName('');
  };

  // Print execution handler
  const handlePrint = async () => {
    if (!rawBitmap || linesCount === 0) return;

    setIsPrinting(true);
    setPrintError(undefined);
    setPrintSuccess(false);
    setPrintProgress(0);

    try {
      if (!isBleConnected) {
        await handleConnectBle();
      }

      await catPrinter.printBitmap(rawBitmap, linesCount, (progress) => {
        setPrintProgress(progress);
      });

      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Printing failed';
      setPrintError(msg);
    } finally {
      setIsPrinting(false);
    }
  };


  // Notion Sync
  const handleSaveAndSyncNotion = async (creds: NotionCredentials) => {
    setIsSyncing(true);
    setNotionError(undefined);
    try {
      saveCredentials(creds);
      setNotionCreds(creds);
      const { tasks: fetchedTasks, properties: fetchedProps } = await fetchNotionDatabaseTasks(
        creds.apiKey,
        creds.databaseId
      );

      // Build dynamic card properties strictly from the user's Notion database!
      const newCardProps: CardPropertyConfig[] = fetchedProps
        .filter((p) => p.type !== 'title')
        .map((p) => ({
          id: p.name,
          label: p.name,
          type: p.type,
          enabled: true,
        }));

      // Always append scannable QR code linking to the Notion page
      newCardProps.push({
        id: 'qrCode',
        label: 'Notion Page QR Code',
        type: 'qr',
        enabled: true,
      });

      setProperties(newCardProps);
      saveStoredProperties(fetchedProps);
      // Deduplicate by page ID — guards against Notion returning the same page in multiple results
      const uniqueTasks = fetchedTasks.filter(
        (t, idx, self) => self.findIndex((x) => x.id === t.id) === idx
      );
      setTasks(uniqueTasks);
      if (uniqueTasks.length > 0) {
        setSelectedTaskId(uniqueTasks[0].id);
      }
      setIsNotionModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync with Notion';
      setNotionError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAllTasks = () => {
    clearAllStoredTasks();
    setTasks([]);
    setSelectedTaskId('');
    setBatchSequence([]);
    setIsRollMode(false);
  };

  const handleToggleProperty = (propId: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === propId ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleAddCustomLabel = (customLabel: string) => {
    setProperties((prev) => [
      ...prev,
      { id: customLabel, label: customLabel, type: 'text', enabled: true },
    ]);
  };

  const handleToggleBatchCheck = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskId(taskId); // Immediately preview checked card
    setBatchSequence((prev) => {
      const exists = prev.includes(taskId);
      let next: string[];
      if (exists) {
        next = prev.filter((id) => id !== taskId);
      } else {
        // Guaranteed deduplication: remove any prior occurrence, then append once
        next = [...prev.filter((id) => id !== taskId), taskId];
      }

      // Auto-manage roll mode: requires 2 or more distinct tasks
      if (next.length >= 2) {
        setIsRollMode(true);
      } else if (next.length <= 1) {
        setIsRollMode(false);
      }
      return next;
    });
  };

  const handleSelectAllBatch = () => {
    if (batchSequence.length >= filteredTasks.length && filteredTasks.length > 0) {
      setBatchSequence([]);
      setIsRollMode(false);
    } else {
      const allIds = Array.from(new Set(filteredTasks.map((t) => t.id)));
      setBatchSequence(allIds);
      if (allIds.length >= 2) {
        setIsRollMode(true);
      } else {
        setIsRollMode(false);
      }
    }
  };

  const handleMoveTaskOrder = (taskId: string, direction: 'up' | 'down') => {
    setBatchSequence((prev) => {
      const idx = prev.indexOf(taskId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const handleToggleTaskDone = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentDone =
      (task.status || '').toLowerCase().includes('done') ||
      (task.status || '').toLowerCase().includes('complete');
    const newStatus = currentDone ? 'To Do' : 'Done';

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    // Sync back to Notion in background if connected
    if (notionCreds.apiKey && task.id && !task.id.startsWith('custom-')) {
      const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
      if (statusProp) {
        await updateNotionTaskCompletion(
          notionCreds.apiKey,
          task.id,
          statusProp.label,
          statusProp.type,
          !currentDone
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#00213f] flex flex-col antialiased">
      
      {/* Zero-Border Navigation Header */}
      <Header
        isBleConnected={isBleConnected}
        deviceName={deviceName}
        isConnecting={isConnectingBle}
        onConnectBle={handleConnectBle}
        onDisconnectBle={handleDisconnectBle}
        onOpenNotionModal={() => setIsNotionModalOpen(true)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onRefreshTasks={() => {
          if (notionCreds.apiKey && notionCreds.databaseId) {
            handleSaveAndSyncNotion(notionCreds);
          } else {
            setIsNotionModalOpen(true);
          }
        }}
        isSyncing={isSyncing}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Mobile Viewport Tabs Switcher (Shown ONLY on mobile < lg) */}
        <div className="lg:hidden flex items-center p-1 bg-white rounded-md mb-4 shadow-xs">
          <button
            onClick={() => setMobileTab('tasks')}
            className={`flex-1 py-2.5 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mobileTab === 'tasks'
                ? 'bg-[#00213f] text-white'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />
            <span>Tasks ({filteredTasks.length})</span>
          </button>

          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2.5 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mobileTab === 'preview'
                ? 'bg-[#00213f] text-white'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-purple-300" />
            <span>Thermal Preview</span>
          </button>
        </div>

        {/* 2-Column Master & Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1: Tasks Manager (5 Cols on desktop) */}
          <div className={`lg:col-span-6 xl:col-span-5 bg-white rounded-md p-4 sm:p-5 space-y-3.5 flex flex-col shadow-xs ${mobileTab !== 'tasks' ? 'hidden lg:flex' : ''}`}>
            
            {/* Row 1: Clean Header (Title + count on left, Properties on right) */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#00213f] tracking-tight">
                  Tasks
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#f0f4f8] text-[#00213f]">
                  {filteredTasks.length}
                </span>
              </div>

              {/* Notion-Style Properties Popover Button & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFieldsOpen(!isFieldsOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold text-zinc-600 hover:text-[#00213f] hover:bg-[#f0f4f8] transition cursor-pointer"
                  title="Configure printable properties"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#6314ff]" />
                  <span>Properties</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f3efff] text-[#6314ff] font-extrabold">
                    {properties.filter((p) => p.enabled).length}
                  </span>
                </button>

                {/* Popover anchored directly below */}
                <PropertyMapper
                  isOpen={isFieldsOpen}
                  onClose={() => setIsFieldsOpen(false)}
                  properties={properties}
                  onToggleProperty={handleToggleProperty}
                  printSettings={printSettings}
                  onChangePrintSettings={(newSettings) =>
                    setPrintSettings((prev) => ({ ...prev, ...newSettings }))
                  }
                  onAddCustomLabel={handleAddCustomLabel}
                  onClearAllTasks={handleClearAllTasks}
                  hasTasks={tasks.length > 0}
                />
              </div>
            </div>

            {/* Row 2: Filter Tabs & Select All (Unified, Balanced Single Bar) */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {/* Segmented Filter Pills */}
              <div className="flex items-center p-0.5 bg-[#f0f4f8] rounded text-xs font-bold">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'today', label: 'Today' },
                  { id: 'urgent', label: 'Urgent' },
                  { id: 'in_progress', label: 'Active' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                      activeFilter === f.id
                        ? 'bg-white text-[#00213f] font-extrabold shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Selection Checkbox & Counter */}
              <button
                type="button"
                onClick={handleSelectAllBatch}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-[#00213f] transition cursor-pointer shrink-0"
                title={batchSelectedIds.size === filteredTasks.length && filteredTasks.length > 0 ? 'Deselect all' : 'Select all'}
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    batchSelectedIds.size > 0 ? 'text-[#6314ff]' : 'text-zinc-400'
                  }`}
                />
                <span>
                  {batchSelectedIds.size > 0
                    ? `${batchSelectedIds.size} queued`
                    : 'Select all'}
                </span>
              </button>
            </div>

            {/* Tasks List */}
            <div className="pt-0.5">
              {filteredTasks.length === 0 ? (
                <div className="bg-[#f0f4f8] rounded-md p-8 text-center space-y-3">
                  <div className="w-10 h-10 rounded-md bg-white mx-auto flex items-center justify-center text-[#6314ff]">
                    <Filter className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#00213f]">No tasks found</h3>
                    <p className="text-xs text-zinc-500 mt-1">Connect your Notion database or add a task manually.</p>
                  </div>
                  <div className="flex justify-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => setIsNotionModalOpen(true)}
                      className="px-3.5 py-2 rounded-md bg-[#00213f] hover:bg-[#003366] text-white text-xs font-bold transition cursor-pointer"
                    >
                      Sync Notion
                    </button>
                    <button
                      onClick={() => setIsQuickAddOpen(true)}
                      className="px-3.5 py-2 rounded-md bg-[#e2e8f0] hover:bg-[#d5dee8] text-[#00213f] text-xs font-bold transition cursor-pointer"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onSelect={() => {
                        setSelectedTaskId(task.id);
                      }}
                      isCheckedForBatch={batchSelectedIds.has(task.id)}
                      onToggleBatchCheck={(e) => handleToggleBatchCheck(task.id, e)}
                      onMoveUp={() => handleMoveTaskOrder(task.id, 'up')}
                      onMoveDown={() => handleMoveTaskOrder(task.id, 'down')}
                      isFirstInBatch={batchSequence[0] === task.id}
                      isLastInBatch={batchSequence[batchSequence.length - 1] === task.id}
                      onToggleDone={() => handleToggleTaskDone(task.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile jump to preview */}
            {selectedTaskId && (
              <div className="lg:hidden pt-2">
                <button
                  onClick={() => setMobileTab('preview')}
                  className="w-full py-2.5 px-4 rounded-md bg-[#00213f] hover:bg-[#003366] text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>Preview receipt roll →</span>
                </button>
              </div>
            )}

          </div>

          {/* COLUMN 2: Thermal Print Studio & Live Strip Preview (7 Cols on desktop) */}
          <div className={`lg:col-span-6 xl:col-span-7 lg:sticky lg:top-20 ${mobileTab !== 'preview' ? 'hidden lg:block' : ''}`}>
            <ThermalPreview
              previewUrl={previewUrl}
              crispUrl={crispUrl}
              linesCount={linesCount}
              isPrinting={isPrinting}
              printProgress={printProgress}
              isBleConnected={isBleConnected}
              onPrint={handlePrint}
              onConnectBle={handleConnectBle}
              printError={printError}
              printSuccess={printSuccess}
              batchTasks={batchTasks}
              currentBatchIndex={currentBatchIndex}
              onSelectBatchTask={(id) => setSelectedTaskId(id)}
              activeTaskTitle={
                isRollMode && batchTasks.length > 1
                  ? `${batchTasks.length} Seamless Tasks Roll`
                  : activeTask?.title
              }
              isRollMode={isRollMode}
              onToggleRollMode={(val) => setIsRollMode(val)}
              rollConfig={rollConfig}
              onChangeRollConfig={(partial) => setRollConfig((prev) => ({ ...prev, ...partial }))}
            />
          </div>

        </div>
      </main>


      {/* Notion Connection Modal */}
      <NotionModal
        isOpen={isNotionModalOpen}
        onClose={() => setIsNotionModalOpen(false)}
        credentials={notionCreds}
        onSaveAndSync={handleSaveAndSyncNotion}
        isLoading={isSyncing}
        errorMessage={notionError}
      />

      {/* Quick Add Custom Task Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddTask={(newTask) => {
          setTasks((prev) => {
            // Guard: don't add if ID already exists
            if (prev.some((t) => t.id === newTask.id)) return prev;
            return [newTask, ...prev];
          });
          setSelectedTaskId(newTask.id);
        }}
      />

      {/* PWA Install Promotion Banner (Auto-dismisses in 10s, cancelable, permanently hidden once installed) */}
      <PwaInstallBanner />

    </div>
  );
}

export default App;

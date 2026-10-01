import type { NotionTask, NotionDbProperty, NotionTaskProperty, PrintSettings, RollHeaderConfig } from '../types';

export interface NotionCredentials {
  apiKey: string;
  databaseId: string;
}

const STORAGE_KEY_CREDS = 'papertask_notion_creds';
const STORAGE_KEY_TASKS = 'papertask_saved_tasks';
const STORAGE_KEY_PROPS = 'papertask_saved_props';
const STORAGE_KEY_PRINT_SETTINGS = 'papertask_print_settings';
const STORAGE_KEY_ROLL_HEADER = 'papertask_roll_header_config';

export const DEFAULT_ROLL_HEADER_CONFIG: RollHeaderConfig = {
  enabled: true,
  customTitle: "TODAY'S MISSIONS",
  showDate: true,
  showStats: true,
  motto: 'Focus on what moves the needle.',
  includeFooterNotes: true,
};

export function loadStoredPrintSettings(): PrintSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRINT_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveStoredPrintSettings(settings: PrintSettings): void {
  localStorage.setItem(STORAGE_KEY_PRINT_SETTINGS, JSON.stringify(settings));
}

export function loadStoredRollHeaderConfig(): RollHeaderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROLL_HEADER);
    if (raw) return { ...DEFAULT_ROLL_HEADER_CONFIG, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_ROLL_HEADER_CONFIG;
}

export function saveStoredRollHeaderConfig(config: RollHeaderConfig): void {
  localStorage.setItem(STORAGE_KEY_ROLL_HEADER, JSON.stringify(config));
}

export function loadSavedCredentials(): NotionCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CREDS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { apiKey: '', databaseId: '' };
}

export function saveCredentials(creds: NotionCredentials): void {
  localStorage.setItem(STORAGE_KEY_CREDS, JSON.stringify(creds));
}

/**
 * Load tasks, automatically purging any old mock data remnants
 */
export function loadStoredTasks(): NotionTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // If it contains the old mock tasks with id "task-1", purge it
        const hasMockTasks = parsed.some(
          (t) => t.id === 'task-1' || t.id === 'task-2' || t.id === 'task-3' || t.id === 'task-4'
        );
        if (hasMockTasks) {
          localStorage.removeItem(STORAGE_KEY_TASKS);
          return [];
        }
        // Strictly deduplicate by task id
        const seen = new Set<string>();
        const deduped: NotionTask[] = [];
        for (const task of parsed) {
          if (task && task.id && !seen.has(task.id)) {
            seen.add(task.id);
            deduped.push(task);
          }
        }
        return deduped;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredTasks(tasks: NotionTask[]): void {
  const seen = new Set<string>();
  const deduped: NotionTask[] = [];
  for (const task of tasks) {
    if (task && task.id && !seen.has(task.id)) {
      seen.add(task.id);
      deduped.push(task);
    }
  }
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(deduped));
}

export function clearAllStoredTasks(): void {
  localStorage.removeItem(STORAGE_KEY_TASKS);
}

export function loadStoredProperties(): NotionDbProperty[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredProperties(props: NotionDbProperty[]): void {
  localStorage.setItem(STORAGE_KEY_PROPS, JSON.stringify(props));
}

/**
 * Clean ANY Notion Database ID or URL to extract the 32-character hex ID
 * Supports:
 * - Direct 32-hex ID (e.g. 6296a73d7029829e8adf81a24b1a0212)
 * - Standard UUID with hyphens (e.g. 6296a73d-7029-829e-8adf-81a24b1a0212)
 * - app.notion.com URLs with title slugs (e.g. /p/Task-Manager-6296a73d7029829e8adf81a24b1a0212)
 * - notion.so URLs with view queries (e.g. /workspace/Tasks-6296a73d7029829e8adf81a24b1a0212?v=...)
 * - Inline database block anchors (e.g. /page#6296a73d7029829e8adf81a24b1a0212)
 */
export function cleanDatabaseId(rawInput: string): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();

  // 1. If URL has a fragment/hash anchor (e.g. inline database anchor: ...#6296a73d...)
  if (trimmed.includes('#')) {
    const hashPart = trimmed.split('#')[1];
    const matchHash =
      hashPart.match(/[a-f0-9]{32}/i) ||
      hashPart.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (matchHash) {
      return matchHash[0].replace(/-/g, '').toLowerCase();
    }
  }

  // 2. Strip query parameters (?v=... or ?source=...) so we never match a View ID
  const withoutQuery = trimmed.split('?')[0];

  // 3. Match standard UUID format (8-4-4-4-12 hex)
  const matchWithHyphens = withoutQuery.match(
    /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i
  );
  if (matchWithHyphens) {
    return matchWithHyphens[0].replace(/-/g, '').toLowerCase();
  }

  // 4. Match 32 consecutive hex characters
  const match32Hex = withoutQuery.match(/[a-f0-9]{32}/i);
  if (match32Hex) {
    return match32Hex[0].toLowerCase();
  }

  // 5. Fallback: filter to hex chars only and take the last 32 chars
  const hexOnly = withoutQuery.replace(/[^a-f0-9]/gi, '');
  if (hexOnly.length >= 32) {
    return hexOnly.slice(-32).toLowerCase();
  }

  return hexOnly.toLowerCase();
}

/**
 * Robust fetch helper with multi-proxy fallback for Notion API
 */
async function fetchNotionViaProxy(endpoint: string, options: RequestInit): Promise<Response> {
  const notionTargetUrl = `https://api.notion.com${endpoint}`;

  // Attempt 1: corsproxy.io
  try {
    const proxyUrl1 = `https://corsproxy.io/?${encodeURIComponent(notionTargetUrl)}`;
    const res1 = await fetch(proxyUrl1, options);
    // If we received an authentic Notion HTTP response (even a 4xx error from Notion), return it
    if (res1.ok || res1.status === 400 || res1.status === 401 || res1.status === 404) {
      return res1;
    }
  } catch (err) {
    console.warn('corsproxy.io unreachable, switching to fallback proxy...', err);
  }

  // Attempt 2: allorigins.win fallback
  try {
    const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(notionTargetUrl)}`;
    const res2 = await fetch(proxyUrl2, options);
    return res2;
  } catch (err) {
    // Attempt 3: Direct fetch fallback
    return fetch(notionTargetUrl, options);
  }
}

/**
 * Auto-resolves any Notion ID or URL.
 * If the user provides a Page URL/ID that contains a database (common when creating a table in Notion),
 * this queries the page's child blocks to find the child_database block, making page URLs work seamlessly!
 */
export async function resolveToDatabaseId(apiKey: string, rawInputId: string): Promise<string> {
  const cleanId = cleanDatabaseId(rawInputId);
  if (!cleanId) return '';

  // 1. First test if this ID is directly a database
  try {
    const testRes = await fetchNotionViaProxy(`/v1/databases/${cleanId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (testRes.ok) {
      return cleanId; // Already a direct database ID!
    }

    const errJson = await testRes.json().catch(() => null);
    const msg = errJson?.message || '';

    // If Notion tells us: "Provided ID ... is a page, not a database"
    if (msg.includes('is a page, not a database') || testRes.status === 400 || testRes.status === 404) {
      // 2. Fetch page block children to locate the child_database block inside this page
      const blocksRes = await fetchNotionViaProxy(`/v1/blocks/${cleanId}/children?page_size=100`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        const results = blocksData.results || [];

        // Find child_database block
        const childDb = results.find((b: { type?: string }) => b.type === 'child_database');
        if (childDb && childDb.id) {
          return cleanDatabaseId(childDb.id);
        }

        // Look for linked database
        const linkBlock = results.find(
          (b: { type?: string; link_to_page?: { database_id?: string } }) =>
            b.type === 'link_to_page' && b.link_to_page?.database_id
        );
        if (linkBlock?.link_to_page?.database_id) {
          return cleanDatabaseId(linkBlock.link_to_page.database_id);
        }
      }
    }
  } catch (err) {
    console.warn('resolveToDatabaseId lookup error, falling back to direct ID', err);
  }

  return cleanId;
}

/**
 * Fetch the exact schema properties configured on ANY user Notion database
 */
export async function fetchNotionDatabaseSchema(
  apiKey: string,
  rawId: string
): Promise<NotionDbProperty[]> {
  const cleanId = await resolveToDatabaseId(apiKey, rawId);
  const response = await fetchNotionViaProxy(`/v1/databases/${cleanId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => null);
    const rawMsg = errJson?.message || (await response.text().catch(() => ''));
    if (rawMsg.includes('is a page, not a database')) {
      throw new Error(
        'This link points to a page without a detected database. In Notion, hover over your database table, click the ··· menu on the table (next to "+ New"), and select "Copy link to view".'
      );
    }
    if (response.status === 404) {
      throw new Error(
        'Database not found. In Notion, click ··· at the top right of your page -> Connections -> Connect to PaperTask.'
      );
    }
    throw new Error(`Notion error (${response.status}): ${rawMsg}`);
  }

  const data = await response.json();
  const rawProps = data.properties || {};
  const dbProperties: NotionDbProperty[] = [];

  for (const key of Object.keys(rawProps)) {
    const prop = rawProps[key];
    dbProperties.push({
      id: prop.id,
      name: prop.name || key,
      type: prop.type,
      enabled: true,
    });
  }

  return dbProperties;
}

/**
 * Fetch tasks and dynamically parse all property types from ANY Notion DB
 */
export async function fetchNotionDatabaseTasks(
  apiKey: string,
  rawDatabaseId: string
): Promise<{ tasks: NotionTask[]; properties: NotionDbProperty[] }> {
  if (!apiKey || !rawDatabaseId) {
    throw new Error('Please provide both Notion API Key and Database ID');
  }

  const cleanId = await resolveToDatabaseId(apiKey, rawDatabaseId);

  // 1. First fetch dynamic database schema
  const dbProperties = await fetchNotionDatabaseSchema(apiKey, cleanId);

  // 2. Fetch pages in the database
  const response = await fetchNotionViaProxy(`/v1/databases/${cleanId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_size: 50,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => null);
    const rawMsg = errJson?.message || (await response.text().catch(() => ''));
    throw new Error(`Notion API query error (${response.status}): ${rawMsg}`);
  }

  const data = await response.json();
  const tasks: NotionTask[] = [];

  for (const page of data.results || []) {
    const props = page.properties || {};
    const taskProperties: Record<string, NotionTaskProperty> = {};

    let title = 'Untitled Task';
    let status = 'todo';
    let priority: string | undefined;
    let dueDate: string | undefined;
    let dueTime: string | undefined;
    const tags: string[] = [];
    let project: string | undefined;
    let estimatePomodoros: number | undefined;
    let notes: string | undefined;

    // Dynamically parse every property defined on this page
    for (const propName of Object.keys(props)) {
      const p = props[propName];
      let displayString = '';
      let value: unknown = null;

      switch (p.type) {
        case 'title': {
          title = p.title?.map((t: { plain_text: string }) => t.plain_text).join('') || title;
          displayString = title;
          value = title;
          break;
        }
        case 'select': {
          if (p.select?.name) {
            displayString = p.select.name;
            value = p.select.name;
            const lower = propName.toLowerCase();
            if (lower.includes('priority')) priority = p.select.name;
            if (lower.includes('project') || lower.includes('category')) project = p.select.name;
          }
          break;
        }
        case 'status': {
          if (p.status?.name) {
            displayString = p.status.name;
            value = p.status.name;
            status = p.status.name;
          }
          break;
        }
        case 'multi_select': {
          const list = (p.multi_select || []).map((m: { name: string }) => m.name);
          displayString = list.join(', ');
          value = list;
          if (list.length > 0) {
            tags.push(...list);
          }
          break;
        }
        case 'date': {
          if (p.date?.start) {
            const raw = p.date.start;
            if (raw.includes('T')) {
              const parts = raw.split('T');
              dueDate = parts[0];
              dueTime = parts[1].slice(0, 5);
              displayString = `${dueDate} ${dueTime}`;
            } else {
              dueDate = raw;
              displayString = raw;
            }
            value = p.date;
          }
          break;
        }
        case 'number': {
          if (p.number !== null && p.number !== undefined) {
            displayString = String(p.number);
            value = p.number;
            const lower = propName.toLowerCase();
            if (lower.includes('pomo') || lower.includes('estimate') || lower.includes('time') || lower.includes('hrs')) {
              estimatePomodoros = p.number;
            }
          }
          break;
        }
        case 'checkbox': {
          displayString = p.checkbox ? 'Checked' : 'Unchecked';
          value = p.checkbox;
          break;
        }
        case 'people': {
          const names = (p.people || []).map((u: { name?: string }) => u.name || 'User');
          displayString = names.join(', ');
          value = names;
          break;
        }
        case 'rich_text': {
          displayString = p.rich_text?.map((t: { plain_text: string }) => t.plain_text).join('') || '';
          value = displayString;
          const lower = propName.toLowerCase();
          if (lower.includes('note') || lower.includes('desc')) {
            notes = displayString;
          }
          break;
        }
        case 'url': {
          displayString = p.url || '';
          value = p.url;
          break;
        }
        case 'formula': {
          if (p.formula) {
            displayString = String(p.formula[p.formula.type] ?? '');
            value = displayString;
          }
          break;
        }
        default: {
          displayString = '';
          value = null;
        }
      }

      taskProperties[propName] = {
        name: propName,
        type: p.type,
        value,
        displayString,
      };
    }

    tasks.push({
      id: page.id,
      title,
      status,
      priority,
      dueDate,
      dueTime,
      tags,
      project,
      estimatePomodoros,
      notes,
      completedPomodoros: 0,
      notionUrl: page.url,
      subtasks: [],
      properties: taskProperties,
    });
  }

  return { tasks, properties: dbProperties };
}

/**
 * Update a task's status or checkbox in Notion in real time
 */
export async function updateNotionTaskCompletion(
  apiKey: string,
  pageId: string,
  propertyName: string,
  propertyType: string,
  isCompleted: boolean
): Promise<boolean> {
  if (!apiKey || !pageId) return false;

  let propPayload: unknown = null;
  if (propertyType === 'checkbox') {
    propPayload = { checkbox: isCompleted };
  } else if (propertyType === 'status') {
    propPayload = { status: { name: isCompleted ? 'Done' : 'Not started' } };
  } else if (propertyType === 'select') {
    propPayload = { select: { name: isCompleted ? 'Done' : 'To Do' } };
  } else {
    // Default fallback to status
    propPayload = { status: { name: isCompleted ? 'Done' : 'Not started' } };
  }

  const cleanPageId = pageId.replace(/-/g, '');
  try {
    const response = await fetchNotionViaProxy(`/v1/pages/${cleanPageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          [propertyName]: propPayload,
        },
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to sync status to Notion', err);
    return false;
  }
}

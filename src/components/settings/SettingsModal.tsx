import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { downloadText } from '../../services/files';
import type { ProviderConfig } from '../../types';
interface Props {
  isOpen: boolean; onClose: () => void; providers: ProviderConfig[];
  activeModel: string; onSelectModel: (model: string) => void;
  currentWorkspace: string; onSelectWorkspace: (name: string) => void; onResetData: () => void;
}
export function SettingsModal({ isOpen, onClose, currentWorkspace, onSelectWorkspace, onResetData }: Props) {
  const [message, setMessage] = useState('');
  if (!isOpen) return null;
  return <div className="fixed inset-0 bg-black/75 p-4 flex items-center justify-center z-50">
    <section role="dialog" aria-modal="true" aria-label="Settings" className="max-w-xl w-full bg-slate-900 border border-slate-700 p-6 rounded-xl space-y-5 overflow-auto max-h-[90vh]">
      <h2 className="text-lg font-bold">Workspace settings</h2>
      <p className="text-sm text-slate-300">This build stores your workspace in this browser or installed app. AI providers, document OCR, messaging integrations and cloud sync are not connected. Example generators are demonstrations, not verified teaching or clinical material.</p>
      <label className="block">Workspace name<input className="block bg-slate-800 p-2 w-full mt-2" value={currentWorkspace} onChange={e => onSelectWorkspace(e.target.value)} /></label>
      <p className="text-xs text-slate-400">Changing the name renames this workspace; it does not create separate storage.</p>
      <button className="bg-blue-700 p-2 rounded" onClick={() => downloadText(StorageService.exportFullBackup(), 'Deep-Tutor-Backup.json', 'application/json')}>Export full backup</button>
      <label className="block">Restore backup<input className="block mt-2" type="file" accept=".json,application/json" onChange={async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          if (file.size > 10 * 1024 * 1024) throw new Error('Backup exceeds the 10 MB limit.');
          const text = await file.text();
          if (!confirm('Replace the stores included in this backup? Export your current workspace first.')) return;
          if (!StorageService.importBackup(text)) throw new Error('Invalid backup or insufficient storage. Current data was preserved where possible.');
          window.location.reload();
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Restore failed.'); }
        e.target.value = '';
      }} /></label>
      {message && <p role="alert" className="text-amber-300">{message}</p>}
      <p className="text-xs text-slate-400">Backups are plain JSON, not encrypted. Keep a copy before clearing device data.</p>
      <div className="flex justify-between gap-3"><button className="text-rose-300" onClick={() => {
        if (confirm('Delete this app’s saved workspace on this device? This cannot be undone without a backup.')) {
          try { onResetData(); window.location.reload(); } catch { setMessage('Unable to reset device storage.'); }
        }
      }}>Reset workspace data</button><button onClick={onClose} className="bg-slate-700 px-4 py-2 rounded">Done</button></div>
    </section>
  </div>;
}

import { useMemo, useState } from 'react';
import { resolveConflict, useSyncStatus, useWorkspace } from '../state/store';
import { diffSummary } from '../lib/sync';
import { Button, Modal } from '../ui/kit';

/** Shown when the cloud copy changed on another device and this device has unsynced edits too. */
export function ConflictDialog() {
  const s = useSyncStatus();
  const ws = useWorkspace();
  const [busy, setBusy] = useState(false);
  const c = s.conflict;
  const rows = useMemo(() => (c ? diffSummary(ws, c.cloud) : []), [c, ws]);
  if (s.state !== 'conflict' || !c) return null;
  const choose = async (choice: 'device' | 'cloud' | 'merge') => {
    setBusy(true);
    await resolveConflict(choice);
    setBusy(false);
  };
  return (
    <Modal
      open
      wide
      onClose={() => undefined}
      title="Review changes from another device"
      footer={
        <>
          <Button busy={busy} onClick={() => void choose('cloud')}>Use the cloud copy</Button>
          <Button busy={busy} onClick={() => void choose('device')}>Keep this device's copy</Button>
          <Button busy={busy} variant="primary" onClick={() => void choose('merge')}>
            Combine both (recommended)
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">
        Your cloud copy was updated from <strong className="text-ink">{c.cloudDevice || 'another device'}</strong>
        {c.cloudUpdatedAt ? ` on ${new Date(c.cloudUpdatedAt).toLocaleString()}` : ''}, and this device also has changes that are not in the cloud yet.
        Nothing has been overwritten. <strong className="text-ink">Combine both</strong> keeps everything from both copies; where the same item was edited in both, the most recent edit wins.
        The replaced cloud version stays in Settings › Cloud history.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1.5">What</th>
              <th>Only on this device</th>
              <th>Only in the cloud</th>
              <th>Edited in both</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <td className="py-1.5">{r.label}</td>
                <td>{r.onlyLocal || '—'}</td>
                <td>{r.onlyCloud || '—'}</td>
                <td>{r.changed || '—'}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="py-3 text-muted">
                  Only settings differ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

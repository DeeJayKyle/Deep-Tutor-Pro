import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService as storage, PHARMACY_CURRICULUM_SAMPLE, INITIAL_STUDENTS_BIODATA } from '../src/services/storage';
beforeEach(() => localStorage.clear());
describe('workspace persistence', () => {
  it('starts empty and round-trips every store', () => {
    storage.loadSamplePharmacyCurriculum();
    storage.setCurrentWorkspace('My workspace');
    storage.setSelectedTools(['reason']);
    storage.setDrafts([{ id:'draft',kind:'exam',className:'Class',unitTitle:'Topic',detail:'brief',difficulty:'mixed',content:'Draft text',createdAt:'2026-10-18' }]);
    const before = JSON.parse(storage.exportFullBackup());
    expect(Object.keys(before.stores)).toHaveLength(17);
    storage.resetDefaults();
    expect(storage.getStudents()).toEqual([]);
    expect(storage.importBackup(JSON.stringify(before))).toBe(true);
    expect(JSON.parse(storage.exportFullBackup()).stores).toEqual(before.stores);
  });
  it.each(['null', '[]', '{}', 'broken', '{"stores":{}}', '{"version":"3.0.0","stores":{"tasks":[]}}', '{"version":"2.0.0","stores":{"students":[{"id":"broken"}]}}'])('rejects malformed backup %s without changing data', input => {
    storage.setStudents(INITIAL_STUDENTS_BIODATA);
    const before = localStorage.getItem('deeptutor_students_biodata_v2');
    expect(storage.importBackup(input)).toBe(false);
    expect(localStorage.getItem('deeptutor_students_biodata_v2')).toBe(before);
  });
  it('validates all fields before writing the first one', () => {
    storage.setCurrentWorkspace('Original');
    expect(storage.importBackup(JSON.stringify({version:'2.1.0', stores:{workspace:'Replacement',curriculum:{title:'missing units'}}}))).toBe(false);
    expect(storage.getCurrentWorkspace()).toBe('Original');
  });
  it('restores legacy backups and explicit empty stores', () => {
    storage.setCurriculumPackage(PHARMACY_CURRICULUM_SAMPLE);
    expect(storage.importBackup('{"version":"2.0.0","stores":{"curriculum":null,"tasks":[]}}')).toBe(true);
    expect(storage.getCurriculumPackage()).toBeNull();
  });
  it.each(['null', '{}', '[{}]', 'invalid'])('recovers safely from invalid stored arrays: %s', input => {
    localStorage.setItem('deeptutor_students_biodata_v2', input);
    expect(storage.getStudents()).toEqual([]);
  });
  it('rolls back a partial import if storage quota fails', () => {
    storage.setCurrentWorkspace('Original');
    storage.setStudents(INITIAL_STUDENTS_BIODATA);
    const real = Storage.prototype.setItem;
    let writes = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (++writes === 2) throw new DOMException('Full', 'QuotaExceededError');
      return real.call(this, key, value);
    });
    expect(storage.importBackup('{"version":"2.1.0","stores":{"students":[],"workspace":"New"}}')).toBe(false);
    expect(storage.getStudents()).toEqual(INITIAL_STUDENTS_BIODATA);
    expect(storage.getCurrentWorkspace()).toBe('Original');
  });
  it('reset preserves other applications on the same origin', () => {
    localStorage.setItem('another-app', 'keep');
    storage.setCurrentWorkspace('remove'); storage.resetDefaults();
    expect(localStorage.getItem('another-app')).toBe('keep');
    expect(localStorage.getItem('deeptutor_workspace_v2')).toBeNull();
  });
  it('reports persistence failure to the UI', () => {
    const listener = vi.fn(); window.addEventListener('deeptutor-storage-error', listener);
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw new Error('Unavailable'); });
    expect(storage.setTasks([])).toBe(false); expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('deeptutor-storage-error', listener);
  });
});

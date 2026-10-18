import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../src/App';
import { StorageService } from '../src/services/storage';
import { RELEASE_ASSETS } from '../src/components/release/ClientReleaseHub';
const screens = ['Curriculum & Units','Lecture Notes','Exams & Coursework','Students & Gradebook','Reference Library','Tutor Chat','Deep Solve','Deep Question','Deep Research','Visualize','Math Animator','Mastery Path','Immersive Reading','Co-Writer','Task Board','Question Bank','Memory Graph (3-Layer)','Knowledge Bases','Partners & Subagents','Tutor Companion'];
it.each(screens)('opens empty screen without crashing: %s', name => {
 render(<App />);
 fireEvent.click(within(document.querySelector('aside')!).getByRole('button', {name: new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}));
 expect(document.querySelector('main')?.textContent?.length).toBeGreaterThan(0);
});
it.each(screens)('opens populated screen without crashing: %s', name => {
 StorageService.loadSamplePharmacyCurriculum(); render(<App />);
 fireEvent.click(within(document.querySelector('aside')!).getByRole('button', {name: new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}));
 expect(document.querySelector('main')?.textContent?.length).toBeGreaterThan(0);
});
it('links to real installer assets instead of generating fake executables', () => {
 render(<App />); fireEvent.click(screen.getByRole('button',{name:/EXE & APK Release Hub/}));
 for(const asset of RELEASE_ASSETS) expect(screen.getByRole('link',{name:asset.label}).getAttribute('href')).toBe('https://github.com/DeeJayKyle/Deep-Tutor-Pro/releases/download/v1.6.14/'+asset.file);
});
it('does not show another course’s notes after switching course', () => {
 StorageService.loadSamplePharmacyCurriculum(); render(<App />);
 fireEvent.click(within(document.querySelector('aside')!).getByRole('button',{name:/^Lecture Notes/}));
 expect(screen.getAllByText('Physicochemical Principles of Drug Absorption & Fickian Diffusion').length).toBeGreaterThan(0);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'unit-pha-201'}});
 expect(screen.queryByText('Physicochemical Principles of Drug Absorption & Fickian Diffusion')).toBeNull();
});

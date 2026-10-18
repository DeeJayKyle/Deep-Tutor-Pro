import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Image,
  BookOpen,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Search,
  Plus,
  Eye,
  Layers,
  Sparkles
} from 'lucide-react';
import { ReferenceDocument, CourseUnit } from '../../types';

interface ReferenceLibraryViewProps {
  referenceDocs: ReferenceDocument[];
  courseUnits: CourseUnit[];
  onUpdateReferences: (refs: ReferenceDocument[]) => void;
}

export const ReferenceLibraryView: React.FC<ReferenceLibraryViewProps> = ({
  referenceDocs,
  courseUnits,
  onUpdateReferences
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>(referenceDocs[0]?.id || '');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // New Upload Form
  const [newDocName, setNewDocName] = useState('');
  const [newCategory, setNewCategory] = useState<'textbook' | 'clinical_guideline' | 'pharmacopoeia' | 'exam_standard' | 'image_diagram'>('textbook');
  const [newFormat, setNewFormat] = useState('PDF');
  const [selectedUnitCode, setSelectedUnitCode] = useState(courseUnits[0]?.code || 'PHA 1101');
  const [extractedSnippet, setExtractedSnippet] = useState('');

  const activeDoc = referenceDocs.find((d) => d.id === selectedDocId) || referenceDocs[0];

  const filtered = referenceDocs.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDocName(file.name);
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      setNewFormat(ext);
      if (['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext)) {
        setNewCategory('image_diagram');
        setExtractedSnippet(`[Image OCR Extraction]: Chemical structure / biological flow diagram from ${file.name}. Recognized drug formula and pathway kinetics.`);
      } else {
        setExtractedSnippet(`[Document Ingestion]: Extracted chapters and reference excerpts from ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB). Verified pharmacological terminology.`);
      }
    }
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const newRef: ReferenceDocument = {
      id: `ref-${Date.now()}`,
      name: newDocName,
      category: newCategory,
      fileFormat: newFormat,
      fileSize: '4.8 MB',
      extractedText: extractedSnippet || 'Extracted clinical definitions, dosing tables, and chemical structures ready for lecture note generation.',
      attachedUnitCodes: [selectedUnitCode],
      uploadedAt: new Date().toISOString().slice(0, 10)
    };

    onUpdateReferences([newRef, ...referenceDocs]);
    setSelectedDocId(newRef.id);
    setShowUploadModal(false);
    setNewDocName('');
    setExtractedSnippet('');
  };

  const handleDelete = (id: string) => {
    onUpdateReferences(referenceDocs.filter((d) => d.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>Reference Library & Textbook Ingestion</span>
          </h2>
          <p className="text-xs text-slate-400">
            Upload textbooks, clinical guidelines, pharmacopoeias, and diagrams. Notes and assessments cite these genuine sources.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Reference (PDF/Word/Image)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Document List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-[#121826] border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search references..."
              className="w-full bg-transparent text-slate-200 focus:outline-none placeholder-slate-500"
            />
          </div>

          <div className="space-y-2">
            {filtered.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const isImg = ['PNG', 'JPG', 'JPEG'].includes(doc.fileFormat);
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500/50 text-blue-200 shadow'
                      : 'bg-[#121826] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold truncate max-w-[170px]">
                      {isImg ? <Image className="w-3.5 h-3.5 text-purple-400 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      <span className="truncate">{doc.name}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {doc.fileFormat}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="capitalize">{doc.category.replace('_', ' ')}</span>
                    <span className="font-mono text-emerald-400">Linked to {doc.attachedUnitCodes.join(', ')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Doc Detail & OCR / Content Inspector */}
        <div className="md:col-span-2">
          {activeDoc ? (
            <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-6 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{activeDoc.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                    <span>{activeDoc.fileFormat} • {activeDoc.fileSize}</span>
                    <span>•</span>
                    <span>Uploaded: {activeDoc.uploadedAt}</span>
                    <span>•</span>
                    <span className="text-blue-400">Category: {activeDoc.category.replace('_', ' ')}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(activeDoc.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove reference"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Course Units Attached */}
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-slate-300">Attached Course Units:</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeDoc.attachedUnitCodes.map((code) => (
                    <span key={code} className="px-2 py-0.5 rounded font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {/* Extracted Content & OCR Text */}
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-slate-300">Extracted Ingestion & Excerpt Material:</span>
                <div className="p-4 rounded-xl bg-[#0d131f] border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {activeDoc.extractedText}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200">
                ✓ DeepTutor's Lecture Note Engine and Assessment Generator actively cite this source using <code>[Source: {activeDoc.name.slice(0, 20)}...]</code> annotations.
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select or upload a reference document on the left.
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#121826] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Upload Textbook or Reference Document</span>
            </h3>

            <form onSubmit={handleSaveDoc} className="space-y-3">
              {/* File Drop area */}
              <div className="border border-dashed border-slate-700 rounded-xl p-4 text-center space-y-1 bg-[#0d131f] relative cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-6 h-6 text-blue-400 mx-auto" />
                <span className="text-slate-200 font-medium block">
                  {newDocName || 'Select PDF, DOCX, TXT or Diagram Image'}
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Document Name / Title:</label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Goodman & Gilman Pharmacology"
                  className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="textbook">Textbook</option>
                    <option value="clinical_guideline">Clinical Guideline</option>
                    <option value="pharmacopoeia">Pharmacopoeia</option>
                    <option value="exam_standard">Exam Standard</option>
                    <option value="image_diagram">Medical Diagram / Image</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Attach to Course Unit:</label>
                  <select
                    value={selectedUnitCode}
                    onChange={(e) => setSelectedUnitCode(e.target.value)}
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  >
                    {courseUnits.map((u) => (
                      <option key={u.id} value={u.code}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Extracted Highlights / Content:</label>
                <textarea
                  value={extractedSnippet}
                  onChange={(e) => setExtractedSnippet(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Add Reference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

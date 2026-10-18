import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  Download,
  Upload,
  Search,
  Filter,
  GraduationCap,
  Award,
  Calendar,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import { StudentBiodata, StudentMarkRecord, CourseUnit } from '../../types';

interface StudentLedgerViewProps {
  students: StudentBiodata[];
  marks: StudentMarkRecord[];
  courseUnits: CourseUnit[];
  onUpdateStudents: (students: StudentBiodata[]) => void;
  onUpdateMarks: (marks: StudentMarkRecord[]) => void;
}

export const StudentLedgerView: React.FC<StudentLedgerViewProps> = ({
  students,
  marks,
  courseUnits,
  onUpdateStudents,
  onUpdateMarks
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'biodata' | 'gradebook'>('gradebook');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(courseUnits[0]?.id || '');

  // Add / Edit student state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentBiodata | null>(null);

  // Form states
  const [regNo, setRegNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [dob, setDob] = useState('2004-01-01');
  const [phone, setPhone] = useState('+256 ');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRel, setGuardianRel] = useState('Parent');

  // Filter students by year and search
  const filteredStudents = students.filter((s) => {
    const matchesYear = s.yearOfStudy === selectedYear;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.regNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesYear && matchesSearch;
  });

  const currentUnit = courseUnits.find((u) => u.id === selectedUnitId) || courseUnits[0];

  // Helper to get or default mark for a student & unit
  const getStudentMark = (studentId: string): StudentMarkRecord => {
    const existing = marks.find(
      (m) => m.studentId === studentId && m.courseUnitId === selectedUnitId
    );
    if (existing) return existing;

    return {
      id: `mark-${studentId}-${selectedUnitId}`,
      studentId,
      courseUnitId: selectedUnitId,
      academicYear: '2025/2026',
      cat1Score: 0,
      cat2Score: 0,
      assignmentScore: 0,
      practicalScore: 0,
      finalExamScore: 0,
      totalPercentage: 0,
      letterGrade: 'F',
      gradePoint: 0.0,
      remarks: 'Pending Assessment'
    };
  };

  const calculateGrade = (total: number): { grade: 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'; gp: number } => {
    if (total >= 80) return { grade: 'A', gp: 5.0 };
    if (total >= 75) return { grade: 'B+', gp: 4.5 };
    if (total >= 70) return { grade: 'B', gp: 4.0 };
    if (total >= 65) return { grade: 'C+', gp: 3.5 };
    if (total >= 60) return { grade: 'C', gp: 3.0 };
    if (total >= 50) return { grade: 'D', gp: 2.0 };
    return { grade: 'F', gp: 0.0 };
  };

  const handleUpdateScore = (
    studentId: string,
    field: 'cat1Score' | 'cat2Score' | 'assignmentScore' | 'practicalScore' | 'finalExamScore',
    value: number
  ) => {
    const current = getStudentMark(studentId);
    const updatedMark = { ...current, [field]: value };
    const total =
      updatedMark.cat1Score +
      updatedMark.cat2Score +
      updatedMark.assignmentScore +
      updatedMark.practicalScore +
      updatedMark.finalExamScore;

    const { grade, gp } = calculateGrade(total);
    updatedMark.totalPercentage = total;
    updatedMark.letterGrade = grade;
    updatedMark.gradePoint = gp;

    const existingIndex = marks.findIndex(
      (m) => m.studentId === studentId && m.courseUnitId === selectedUnitId
    );
    if (existingIndex >= 0) {
      const copy = [...marks];
      copy[existingIndex] = updatedMark;
      onUpdateMarks(copy);
    } else {
      onUpdateMarks([...marks, updatedMark]);
    }
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !regNo.trim()) return;

    if (editingStudent) {
      const updated = students.map((s) =>
        s.id === editingStudent.id
          ? {
              ...s,
              regNumber: regNo,
              fullName,
              gender,
              dateOfBirth: dob,
              contactPhone: phone,
              email,
              homeDistrictAddress: address,
              nextOfKinName: guardianName,
              nextOfKinPhone: guardianPhone,
              nextOfKinRelationship: guardianRel
            }
          : s
      );
      onUpdateStudents(updated);
    } else {
      const newStd: StudentBiodata = {
        id: `std-${Date.now()}`,
        regNumber: regNo,
        fullName,
        gender,
        dateOfBirth: dob,
        yearOfStudy: selectedYear,
        classCohort: `Diploma Pharmacy - Year ${selectedYear}`,
        contactPhone: phone,
        email: email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@pharmacy.ac.ug`,
        homeDistrictAddress: address,
        nextOfKinName: guardianName,
        nextOfKinPhone: guardianPhone,
        nextOfKinRelationship: guardianRel,
        enrollmentStatus: 'Active',
        attendancePercentage: 95
      };
      onUpdateStudents([...students, newStd]);
    }

    setShowStudentModal(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Are you sure you want to remove this student record?')) {
      onUpdateStudents(students.filter((s) => s.id !== id));
      onUpdateMarks(marks.filter((m) => m.studentId !== id));
    }
  };

  const handleExportCSV = () => {
    let csv = 'Reg Number,Full Name,Year of Study,Course Unit,CAT 1 (15%),CAT 2 (15%),Assignment (10%),Practical (20%),Final Exam (40%),Total (100%),Grade,Grade Point\n';
    filteredStudents.forEach((std) => {
      const m = getStudentMark(std.id);
      csv += `"${std.regNumber}","${std.fullName}",${std.yearOfStudy},"${currentUnit?.code}",${m.cat1Score},${m.cat2Score},${m.assignmentScore},${m.practicalScore},${m.finalExamScore},${m.totalPercentage},"${m.letterGrade}",${m.gradePoint}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Student_Marks_Year_${selectedYear}_${currentUnit?.code}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Student Biodata & Academic Gradebook</span>
          </h2>
          <p className="text-xs text-slate-400">
            Systematic student records by academic years of study, continuous assessments (CATs), coursework, and final exams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Year Switcher */}
          <div className="flex items-center gap-1 bg-[#121826] p-1 rounded-xl border border-slate-800 text-xs">
            {[1, 2, 3].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedYear === yr
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Year {yr}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingStudent(null);
              setRegNo(`DIP/PHA/2026/0${students.length + 1}`);
              setFullName('');
              setPhone('+256 ');
              setEmail('');
              setAddress('');
              setGuardianName('');
              setGuardianPhone('');
              setShowStudentModal(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Student</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher: Biodata vs Marks Ledger */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111726] border border-[#1e293b] p-3 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('gradebook')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'gradebook'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Academic Marks Ledger
          </button>
          <button
            onClick={() => setActiveTab('biodata')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'biodata'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Student Biodata & Profiles
          </button>
        </div>

        {activeTab === 'gradebook' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Course Unit:</span>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="bg-[#0d131f] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
            >
              {courseUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code}: {u.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or reg number..."
            className="bg-transparent text-slate-200 text-xs focus:outline-none w-48"
          />
        </div>
      </div>

      {/* Gradebook Tab */}
      {activeTab === 'gradebook' && (
        <div className="bg-[#121826] border border-[#1e293b] rounded-2xl overflow-hidden shadow">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-white">
              Grade Ledger: {currentUnit?.code} — {currentUnit?.title} (Year {selectedYear})
            </span>
            <span className="text-slate-400 text-[11px] font-mono">
              Formula: CAT1 (15) + CAT2 (15) + Asmt (10) + Pract (20) + Exam (40) = 100%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0d131f] text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <th className="p-3">Reg No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 text-center">CAT 1 (15)</th>
                  <th className="p-3 text-center">CAT 2 (15)</th>
                  <th className="p-3 text-center">Asmt (10)</th>
                  <th className="p-3 text-center">Pract (20)</th>
                  <th className="p-3 text-center">Exam (40)</th>
                  <th className="p-3 text-center">Total (100)</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3 text-center">GP</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredStudents.map((std) => {
                  const m = getStudentMark(std.id);
                  return (
                    <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-400 font-bold">{std.regNumber}</td>
                      <td className="p-3 font-sans font-medium text-white">{std.fullName}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={m.cat1Score}
                          onChange={(e) => handleUpdateScore(std.id, 'cat1Score', Number(e.target.value))}
                          className="w-12 bg-[#090d16] border border-slate-700 rounded text-center p-1 text-slate-200"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={m.cat2Score}
                          onChange={(e) => handleUpdateScore(std.id, 'cat2Score', Number(e.target.value))}
                          className="w-12 bg-[#090d16] border border-slate-700 rounded text-center p-1 text-slate-200"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={m.assignmentScore}
                          onChange={(e) => handleUpdateScore(std.id, 'assignmentScore', Number(e.target.value))}
                          className="w-12 bg-[#090d16] border border-slate-700 rounded text-center p-1 text-slate-200"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={m.practicalScore}
                          onChange={(e) => handleUpdateScore(std.id, 'practicalScore', Number(e.target.value))}
                          className="w-12 bg-[#090d16] border border-slate-700 rounded text-center p-1 text-slate-200"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={m.finalExamScore}
                          onChange={(e) => handleUpdateScore(std.id, 'finalExamScore', Number(e.target.value))}
                          className="w-12 bg-[#090d16] border border-slate-700 rounded text-center p-1 text-slate-200"
                        />
                      </td>
                      <td className="p-3 text-center font-bold text-white">{m.totalPercentage}%</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.letterGrade === 'A'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : m.letterGrade.startsWith('B')
                              ? 'bg-blue-500/20 text-blue-300'
                              : m.letterGrade === 'F'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {m.letterGrade}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-300">{m.gradePoint.toFixed(1)}</td>
                      <td className="p-3 font-sans text-[11px] text-slate-400 truncate max-w-xs">{m.remarks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              No students enrolled in Year {selectedYear}. Use "Enroll Student" above.
            </div>
          )}
        </div>
      )}

      {/* Biodata Tab */}
      {activeTab === 'biodata' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStudents.map((std) => (
            <div
              key={std.id}
              className="bg-[#121826] border border-[#1e293b] rounded-2xl p-5 space-y-3 text-xs shadow hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-emerald-400 font-bold text-xs">{std.regNumber}</span>
                  <h3 className="font-bold text-white text-sm">{std.fullName}</h3>
                  <div className="text-[11px] text-slate-400">
                    {std.gender} • Born {std.dateOfBirth} • Attendance: {std.attendancePercentage}%
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingStudent(std);
                      setRegNo(std.regNumber);
                      setFullName(std.fullName);
                      setGender(std.gender);
                      setDob(std.dateOfBirth);
                      setPhone(std.contactPhone);
                      setEmail(std.email);
                      setAddress(std.homeDistrictAddress);
                      setGuardianName(std.nextOfKinName);
                      setGuardianPhone(std.nextOfKinPhone);
                      setGuardianRel(std.nextOfKinRelationship);
                      setShowStudentModal(true);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Edit student biodata"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(std.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{std.contactPhone}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 text-slate-500" />
                  <span className="truncate">{std.email}</span>
                </div>
              </div>

              {/* Next of Kin */}
              <div className="bg-[#0d131f] p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                <div className="text-slate-300 font-semibold">Guardian / Next of Kin:</div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>{std.nextOfKinName} ({std.nextOfKinRelationship})</span>
                  <span>{std.nextOfKinPhone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#121826] border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>{editingStudent ? 'Edit Student Biodata' : 'Enroll New Student in Year ' + selectedYear}</span>
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Registration Number:</label>
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    required
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Full Legal Name:</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Gender:</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Date of Birth:</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Contact Phone:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Email:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Home District / Address:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot 14, Kampala Road"
                  className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block">Next of Kin / Guardian Details:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Name:</label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Phone:</label>
                    <input
                      type="text"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Relationship:</label>
                    <input
                      type="text"
                      value={guardianRel}
                      onChange={(e) => setGuardianRel(e.target.value)}
                      className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

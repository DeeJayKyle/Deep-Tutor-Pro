import { z } from "zod";
import * as Schemas from "./schemas";
import {
  ChatMessage,
  TaskItem,
  QuestionItem,
  MemoryTrace,
  KnowledgeBase,
  PartnerAgent,
  AcademicClass,
  TeachingDraft,
  ProviderConfig,
  CurriculumPackage,
  LectureNoteBlock,
  AssessmentPaper,
  StudentBiodata,
  StudentMarkRecord,
  ReferenceDocument
} from '../types';
import {
  INITIAL_MESSAGES,
  INITIAL_TASKS,
  INITIAL_QUESTIONS,
  INITIAL_MEMORY_TRACES,
  INITIAL_KNOWLEDGE_BASES,
  INITIAL_CLASSES,
  INITIAL_DRAFTS,
  INITIAL_PARTNERS,
  DEFAULT_PROVIDERS
} from '../initial/workspaceDefaults';

const KEYS = {
  MESSAGES: 'deeptutor_messages_v2',
  TASKS: 'deeptutor_tasks_v2',
  QUESTIONS: 'deeptutor_questions_v2',
  MEMORY: 'deeptutor_memory_v2',
  KNOWLEDGE_BASES: 'deeptutor_kbs_v2',
  CLASSES: 'deeptutor_classes_v2',
  PARTNERS: 'deeptutor_partners_v2',
  PROVIDERS: 'deeptutor_providers_v2',
  SELECTED_TOOLS: 'deeptutor_selected_tools_v2',
  WORKSPACE: 'deeptutor_workspace_v2',
  CURRICULUM: 'deeptutor_curriculum_package_v2',
  LECTURE_NOTES: 'deeptutor_lecture_notes_v2',
  ASSESSMENTS: 'deeptutor_assessments_v2',
  STUDENTS: 'deeptutor_students_biodata_v2',
  MARKS: 'deeptutor_student_marks_v2',
  REFERENCES: 'deeptutor_reference_docs_v2',
  DRAFTS: 'deeptutor_drafts_v2'
};


const STORES = {
  curriculum: { key: KEYS.CURRICULUM, schema: Schemas.CurriculumPackageSchema.nullable() },
  lectureNotes: { key: KEYS.LECTURE_NOTES, schema: Schemas.LectureNoteBlockSchema.array() },
  assessments: { key: KEYS.ASSESSMENTS, schema: Schemas.AssessmentPaperSchema.array() },
  students: { key: KEYS.STUDENTS, schema: Schemas.StudentBiodataSchema.array() },
  marks: { key: KEYS.MARKS, schema: Schemas.StudentMarkRecordSchema.array() },
  references: { key: KEYS.REFERENCES, schema: Schemas.ReferenceDocumentSchema.array() },
  messages: { key: KEYS.MESSAGES, schema: Schemas.ChatMessageSchema.array() },
  tasks: { key: KEYS.TASKS, schema: Schemas.TaskItemSchema.array() },
  questions: { key: KEYS.QUESTIONS, schema: Schemas.QuestionItemSchema.array() },
  memory: { key: KEYS.MEMORY, schema: Schemas.MemoryTraceSchema.array() },
  knowledgeBases: { key: KEYS.KNOWLEDGE_BASES, schema: Schemas.KnowledgeBaseSchema.array() },
  classes: { key: KEYS.CLASSES, schema: Schemas.AcademicClassSchema.array() },
  drafts: { key: KEYS.DRAFTS, schema: Schemas.TeachingDraftSchema.array() },
  partners: { key: KEYS.PARTNERS, schema: Schemas.PartnerAgentSchema.array() },
  providers: { key: KEYS.PROVIDERS, schema: Schemas.ProviderConfigSchema.array() },
  selectedTools: { key: KEYS.SELECTED_TOOLS, schema: Schemas.BuiltinToolSchema.array() },
  workspace: { key: KEYS.WORKSPACE, schema: z.string() },
};

function storageError() {
  window.dispatchEvent(new Event('deeptutor-storage-error'));
}

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    const validator = Object.values(STORES).find(store => store.key === key)!.schema;
    const result = validator.safeParse(JSON.parse(item));
    if (!result.success) return defaultValue;
    return result.data as T;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    storageError();
    return false;
  }
}

// -------------------------------------------------------------
// Sample Preset: Pharmacy Curriculum, Notes, Exams, & Students
// -------------------------------------------------------------

export const PHARMACY_CURRICULUM_SAMPLE: CurriculumPackage = {
  id: 'curr-pharm-01',
  title: 'Diploma in Pharmacy Curriculum & Teacher Guide',
  institution: 'National Health Sciences Institute & Allied Medical Council',
  level: 'Diploma',
  durationYears: 3,
  totalCourseUnits: 3,
  totalCurriculumHours: 270,
  overviewSummary: 'Comprehensive tertiary pharmaceutical training program designed to produce competent, ethical, and clinical pharmacy technicians proficient in pharmacology, dispensing, pharmaceutical chemistry, sterile compounding, pharmacognosy, and community health pharmacy.',
  analyzedAt: '2026-10-18',
  courseUnits: [
    {
      id: 'unit-pha-101',
      curriculumId: 'curr-pharm-01',
      code: 'PHA 1101',
      title: 'General Pharmacology & Pharmacokinetics',
      yearOfStudy: 1,
      semester: 1,
      creditUnits: 4,
      lectureHours: 45,
      tutorialHours: 15,
      practicalHours: 30,
      totalContactHours: 90,
      courseOverview: 'Fundamental principles of drug action, drug-receptor interactions, ADME (Absorption, Distribution, Metabolism, Excretion), half-life kinetics, bioequivalence, and autonomic nervous system pharmacology.',
      generalObjectives: [
        'Explain the molecular mechanisms of drug-receptor interactions and signal transduction.',
        'Calculate pharmacokinetic parameters: volume of distribution, clearance, bio-availability, and elimination rate constants.',
        'Distinguish Phase I functionalization from Phase II conjugation hepatic metabolism pathways.',
        'Describe autonomic nervous system receptor subtypes and clinical indications of adrenergic and cholinergic agents.'
      ],
      topics: [
        {
          id: 'topic-pha-1',
          topicNumber: 1,
          title: 'Introduction to Pharmacokinetics & Drug Absorption',
          allocatedHours: 6,
          learningObjectives: [
            'Define passive diffusion, active transport, and facilitated transport across cell membranes.',
            'Explain the Henderson-Hasselbalch equation and how pH affects ion trapping and passive reabsorption.',
            'Calculate drug bioavailability from AUC data.'
          ],
          subtopics: ['Physicochemical drug properties', 'Fick’s First Law of diffusion', 'First-pass hepatic metabolism', 'Bioequivalence testing standards'],
          suggestedPracticals: 'In-vitro dissolution testing of aspirin tablets using UV-Vis spectrophotometry.'
        },
        {
          id: 'topic-pha-2',
          topicNumber: 2,
          title: 'Drug Distribution & Plasma Protein Binding',
          allocatedHours: 6,
          learningObjectives: [
            'Define Apparent Volume of Distribution (Vd) and its clinical significance.',
            'Explain the impact of albumin and alpha-1-acid glycoprotein binding on free drug fractions.',
            'Identify displacement drug-drug interactions (e.g. Warfarin and Sulfonamides).'
          ],
          subtopics: ['Tissue blood flow perfusion rates', 'Blood-brain barrier permeability', 'Volume of distribution calculations', 'Therapeutic drug monitoring'],
          suggestedPracticals: 'Spectrophotometric determination of protein-bound vs free salicylate fractions.'
        },
        {
          id: 'topic-pha-3',
          topicNumber: 3,
          title: 'Biotransformation & Hepatic Clearance (CYP450)',
          allocatedHours: 8,
          learningObjectives: [
            'Contrast Cytochrome P450 oxidation with glucuronidation and sulfation pathways.',
            'List common enzyme inducers (Rifampicin, Phenytoin) and inhibitors (Ketoconazole, Cimetidine).',
            'Explain genetic polymorphisms in CYP2D6 and CYP2C19.'
          ],
          subtopics: ['Microsomal enzyme system', 'Phase I oxidation/reduction/hydrolysis', 'Phase II conjugation', 'Clinical enzyme induction and inhibition'],
          suggestedPracticals: 'Case study analysis of multi-drug regimens with CYP3A4 inhibitors.'
        },
        {
          id: 'topic-pha-4',
          topicNumber: 4,
          title: 'Renal Excretion & Elimination Kinetics',
          allocatedHours: 6,
          learningObjectives: [
            'Calculate Cockcroft-Gault estimated Creatinine Clearance (eCrCl).',
            'Differentiate zero-order from first-order elimination kinetics.',
            'Adjust dosage regimens in renal impairment.'
          ],
          subtopics: ['Glomerular filtration rate (GFR)', 'Active tubular secretion', 'Passive tubular reabsorption', 'Steady-state plasma concentration equations'],
          suggestedPracticals: 'Dosing regimen calculation workshop for Aminoglycosides and Vancomycin.'
        }
      ]
    },
    {
      id: 'unit-pha-102',
      curriculumId: 'curr-pharm-01',
      code: 'PHA 1102',
      title: 'Pharmaceutics & Dispensing Practice I',
      yearOfStudy: 1,
      semester: 1,
      creditUnits: 4,
      lectureHours: 40,
      tutorialHours: 10,
      practicalHours: 40,
      totalContactHours: 90,
      courseOverview: 'Principles and techniques of non-sterile compounding, prescription interpretation, pharmaceutical weights and balances, posology, solutions, suspensions, and emulsions.',
      generalObjectives: [
        'Interpret medical abbreviations and verify prescription legal validity.',
        'Formulate, compound, and package liquid pharmaceutical preparations according to pharmacopoeial standards.',
        'Perform accurate pharmaceutical dosage calculations and dilution ratios.'
      ],
      topics: [
        {
          id: 'topic-pha-5',
          topicNumber: 1,
          title: 'Prescription Interpretation & Pharmaceutical Calculations',
          allocatedHours: 6,
          learningObjectives: [
            'Interpret standard Latin abbreviations used in clinical prescriptions.',
            'Perform percentage solutions (w/v, v/v, w/w) and parts-per-million conversions.',
            'Calculate pediatric doses using Clark’s and Young’s rules.'
          ],
          subtopics: ['Prescription legal requirements', 'Aliquots and serial dilutions', 'Isotonicity calculation using freezing point depression', 'Error identification'],
          suggestedPracticals: 'Compounding 100 mL of 0.9% Normal Saline and pediatric paracetamol syrup.'
        },
        {
          id: 'topic-pha-6',
          topicNumber: 2,
          title: 'Disperse Systems: Suspensions & Emulsions',
          allocatedHours: 8,
          learningObjectives: [
            'Apply Stokes’ Law to minimize sedimentation rates in pharmaceutical suspensions.',
            'Select appropriate suspending and wetting agents (Acacia, Tragacanth, Xanthan Gum).',
            'Differentiate o/w from w/o emulsions using dye, dilution, and conductivity tests.'
          ],
          subtopics: ['Flocculated vs deflocculated suspensions', 'Zeta potential and electrical double layer', 'Hydrophile-Lipophile Balance (HLB) system', 'Emulsion stability problems'],
          suggestedPracticals: 'Preparation of 50 mL liquid paraffin emulsion using the wet gum and dry gum methods.'
        }
      ]
    },
    {
      id: 'unit-pha-201',
      curriculumId: 'curr-pharm-01',
      code: 'PHA 2101',
      title: 'Chemotherapy, Antimicrobials & Clinical Pharmacy',
      yearOfStudy: 2,
      semester: 1,
      creditUnits: 4,
      lectureHours: 45,
      tutorialHours: 15,
      practicalHours: 30,
      totalContactHours: 90,
      courseOverview: 'Classification, mechanisms of action, spectrum of activity, mechanisms of resistance, adverse drug reactions, and clinical guidelines for antibacterial, antiviral, antifungal, and antiprotozoal agents.',
      generalObjectives: [
        'Classify antimicrobial agents by cellular target: cell wall, ribosome, DNA gyrase, and folic acid pathway.',
        'Explain beta-lactamase resistance and the rational clinical use of beta-lactamase inhibitors.',
        'Describe national clinical management guidelines for Malaria, Tuberculosis, and HIV/AIDS.'
      ],
      topics: [
        {
          id: 'topic-pha-7',
          topicNumber: 1,
          title: 'Beta-Lactam Antibiotics & Resistance Mechanisms',
          allocatedHours: 8,
          learningObjectives: [
            'Describe penicillin-binding protein (PBP) transpeptidation inhibition.',
            'Differentiate natural penicillins, aminopenicillins, and antipseudomonal penicillins.',
            'Explain how Clavulanic acid and Tazobactam restore antibacterial spectrum.'
          ],
          subtopics: ['Penicillin nucleus & side chain structure', 'Extended-spectrum cephalosporins (1st-5th generation)', 'Carbapenems and Monobactams', 'MRSA and ESBL resistance'],
          suggestedPracticals: 'Kirby-Bauer disc diffusion antibiotic susceptibility assay and zone of inhibition measurement.'
        }
      ]
    }
  ]
};

export const INITIAL_PHARMACY_NOTES: LectureNoteBlock[] = [
  {
    id: 'note-1',
    courseUnitId: 'unit-pha-101',
    topicId: 'topic-pha-1',
    contactHoursLabel: 'Contact Hours 1 - 3 (3 Hours)',
    title: 'Physicochemical Principles of Drug Absorption & Fickian Diffusion',
    learningOutcomes: [
      'State Fick’s First Law of diffusion as applied to biological lipid bilayers.',
      'Apply the Henderson-Hasselbalch equation to calculate percentage drug ionization at gastric (pH 1.5) vs intestinal (pH 6.8) conditions.',
      'Explain the biological significance of Area Under the Curve (AUC) in determining absolute bioavailability.'
    ],
    theoreticalContent: `### 1. Introduction to Pharmacokinetics
Pharmacokinetics quantifies what the human biological system does to a drug entity over time. The fundamental progression involves:
1. **Absorption**: Movement of unchanged drug from site of administration into systemic circulation.
2. **Distribution**: Reversible transfer of drug molecules across intravascular and interstitial/cellular spaces.
3. **Metabolism**: Enzymatic biotransformation into hydrophilic excretable metabolites.
4. **Excretion**: Irreversible removal of xenobiotic compounds via renal, biliary, or pulmonary routes.

### 2. Biological Membrane Transport Mechanisms
The primary barrier to drug passage is the amphipathic phospholipid bilayer. Transport modalities include:
- **Passive Lipoidal Diffusion**: Follows Fick’s First Law:
$$\\frac{dQ}{dt} = \\frac{D \\cdot A \\cdot K_{p}}{h} (C_{out} - C_{in})$$
Where:
- $D$ = Diffusion coefficient ($cm^2/s$)
- $A$ = Available surface area ($cm^2$)
- $K_p$ = Octanol/water partition coefficient
- $h$ = Membrane thickness ($nm$)
- $(C_{out} - C_{in})$ = Concentration gradient

- **Carrier-Mediated Active Transport**: Saturable, ATP-dependent, moves against concentration gradients (e.g., P-glycoprotein efflux pump, L-DOPA amino acid transporter).

### 3. pH-Partition Hypothesis & Ion Trapping
Non-ionized (uncharged) drug molecules are lipophilic and permeate lipid membranes freely. Ionized (charged) molecules are polar and cannot cross passive biological membranes.
For a weak acid (e.g., Aspirin, $pK_a = 3.5$):
$$pH - pK_a = \\log \\left( \\frac{[A^-]}{[HA]} \\right)$$
In the gastric environment ($pH = 1.5$):
$$1.5 - 3.5 = -2.0 \\implies \\frac{[A^-]}{[HA]} = 10^{-2} = \\frac{1}{100}$$
Thus, 99% of Aspirin exists in the unionized $[HA]$ form in the stomach, promoting rapid passive gastric absorption!

### 4. Bioavailability ($F$) Calculation
Absolute bioavailability compares oral exposure to intravenous reference:
$$F = \\frac{AUC_{oral} \\times Dose_{IV}}{AUC_{IV} \\times Dose_{oral}} \\times 100\\%$$`,
    workedExamplesOrCases: `**Clinical Worked Calculation**:
A patient is administered 500 mg of Ciprofloxacin orally. Pharmacokinetic plasma sampling yields an $AUC_{oral} = 32.5 \\text{ mg}\\cdot\\text{h/L}$.
An intravenous dose of 400 mg in the same patient yields an $AUC_{IV} = 41.2 \\text{ mg}\\cdot\\text{h/L}$.
Calculate the oral bioavailability fraction $F$:
$$F = \\frac{32.5 \\times 400}{41.2 \\times 500} = \\frac{13,000}{20,600} = 0.631 \\quad (63.1\\%)$$
*Clinical Assessment*: Moderate first-pass effect; oral administration is viable for step-down therapy.`,
    clinicalOrLabPracticum: `Lab Exercise: Prepare simulated gastric fluid (pH 1.2, 0.1M HCl) and simulated intestinal fluid (pH 6.8, phosphate buffer). Measure the partition coefficient of Salicylic acid between octanol and both aqueous phases using UV spectrophotometry at 296 nm.`,
    summaryKeyPoints: [
      'Only unionized drug species cross lipid membranes via passive diffusion.',
      'Weak acids are absorbed predominantly in acidic gastric media; weak bases are absorbed in alkaline intestinal fluid.',
      'First-pass hepatic metabolism by CYP enzymes and biliary excretion reduces oral bioavailability.',
      'Bioequivalence requires AUC and Cmax ratios to fall within the 80% - 125% 90% confidence interval.'
    ],
    referencesCited: [
      {
        refId: 'ref-1',
        title: 'British Pharmacopoeia (BP) 2026 / Goodman & Gilman Pharmacological Basis of Therapeutics',
        excerpt: 'Section 1: General Principles of Pharmacokinetics, Absorption Mechanisms and Bioavailability Testing.'
      }
    ],
    slideDeckOutline: [
      { slideNumber: 1, title: 'Title & Objectives: Drug Absorption & ADME', bullets: ['Overview of pharmacokinetic phases', 'Clinical relevance of bioavailability', 'Physicochemical factors influencing absorption'] },
      { slideNumber: 2, title: 'Fick’s First Law of Passive Diffusion', bullets: ['Mathematical formulation dQ/dt', 'Partition coefficient Kp significance', 'Surface area optimization in the human intestine'] },
      { slideNumber: 3, title: 'pH-Partition Hypothesis & Henderson-Hasselbalch', bullets: ['Weak acids vs weak bases', 'Ion trapping in breast milk and renal tubules', 'Worked example: Gastric absorption of Aspirin'] },
      { slideNumber: 4, title: 'Bioavailability Calculation & Bioequivalence', bullets: ['Formula for absolute bioavailability F', 'Plasma concentration-time curve (AUC, Cmax, Tmax)', 'Regulatory criteria for generic drug approval'] }
    ],
    createdAt: '2026-10-18',
    updatedAt: '2026-10-18'
  }
];

export const INITIAL_ASSESSMENT_PAPERS: AssessmentPaper[] = [
  {
    id: 'exam-pha-101',
    courseUnitId: 'unit-pha-101',
    courseUnitCode: 'PHA 1101',
    courseUnitTitle: 'General Pharmacology & Pharmacokinetics',
    title: 'Standard Final Examination Paper — PHA 1101',
    assessmentType: 'standard_exam',
    academicYear: '2025/2026',
    termSemester: 'Year 1, Semester 1',
    duration: '3 Hours',
    totalMarks: 30,
    instructions: 'Sample paper: answer all four questions. Section A: 2 marks; Section B: 8 marks; Section C: 20 marks. Review model answers before use.',
    testedTopics: [
      'Introduction to Pharmacokinetics & Drug Absorption',
      'Drug Distribution & Plasma Protein Binding',
      'Biotransformation & Hepatic Clearance (CYP450)',
      'Renal Excretion & Elimination Kinetics'
    ],
    questions: [
      {
        id: 'q-mcq-1',
        section: 'A',
        questionNumber: 1,
        prompt: 'Which equation describes the relationship between the degree of ionization of a weak acid drug and the environmental pH?',
        marks: 1,
        topicTested: 'Drug Absorption',
        options: [
          'Michaelis-Menten Equation',
          'Henderson-Hasselbalch Equation',
          'Cockcroft-Gault Equation',
          'Nernst-Planck Equation'
        ],
        correctOptionIndex: 1,
        modelAnswer: 'Option B: Henderson-Hasselbalch Equation',
        markingGuideAllocation: '1 mark for correct selection of Option B. 0 marks for incorrect options.',
        assessedOutcome: 'Recalls fundamental pharmacokinetic equations.'
      },
      {
        id: 'q-mcq-2',
        section: 'A',
        questionNumber: 2,
        prompt: 'An Apparent Volume of Distribution (Vd) significantly exceeding total body water (> 42 Liters) indicates that the drug is:',
        marks: 1,
        topicTested: 'Drug Distribution',
        options: [
          'Confined exclusively to the vascular plasma compartment',
          'Highly bound to plasma albumin with minimal extravascular penetration',
          'Extensively sequestered in peripheral tissues and lipid depots',
          'Excreted rapidly through glomerular filtration without reabsorption'
        ],
        correctOptionIndex: 2,
        modelAnswer: 'Option C: Extensively sequestered in peripheral tissues and lipid depots',
        markingGuideAllocation: '1 mark for selecting C.',
        assessedOutcome: 'Interprets volume of distribution values clinically.'
      },
      {
        id: 'q-sa-1',
        section: 'B',
        questionNumber: 21,
        prompt: 'Define Apparent Volume of Distribution (Vd). State the mathematical formula and outline THREE physiological factors that increase a drug’s Vd.',
        marks: 8,
        topicTested: 'Drug Distribution',
        modelAnswer: 'Definition: Apparent Volume of Distribution is the theoretical volume of fluid into which the total amount of administered drug would need to be uniformly distributed to produce the observed plasma concentration.\nFormula: Vd = Total Dose administered / Initial Plasma Concentration (C0).\nFactors increasing Vd:\n1. High lipid solubility (permeates cell membranes into adipose tissue).\n2. Low plasma protein binding (higher free fraction available to penetrate tissues).\n3. High tissue protein affinity (e.g. Digoxin binding to myocardial and skeletal muscle).',
        markingGuideAllocation: 'Definition (2 marks) + Formula with variable definitions (2 marks) + 3 physiological factors clearly stated (2 marks each = 4 marks). Total = 8 Marks.',
        assessedOutcome: 'Explains drug distribution principles and variables.'
      },
      {
        id: 'q-essay-1',
        section: 'C',
        questionNumber: 26,
        prompt: 'A 64-year-old male with chronic kidney disease (Serum Creatinine = 2.4 mg/dL, weight = 70 kg) requires intravenous Gentamicin for severe sepsis.\n(a) Calculate the patient’s estimated Creatinine Clearance using the Cockcroft-Gault equation (assume constant k = 1.23 for males).\n(b) Explain why aminoglycosides require therapeutic drug monitoring and dose adjustment in renal impairment.\n(c) Describe the mechanism of aminoglycoside nephrotoxicity and ototoxicity.',
        marks: 20,
        topicTested: 'Renal Excretion & Clinical Toxicity',
        modelAnswer: '(a) Cockcroft-Gault calculation: eCrCl = [(140 - Age) * Weight (kg) * 1.23] / Serum Creatinine (umol/L). Correct arithmetic yields renal clearance rate.\n(b) Narrow therapeutic index; Gentamicin is cleared >90% unchanged by glomerular filtration; elevated trough levels (>2 ug/mL) correlate directly with proximal tubular accumulation and cochlear hair cell apoptosis.\n(c) Pinocytosis by renal proximal tubular cells leads to lysosomal phospholipidosis and acute tubular necrosis.',
        markingGuideAllocation: '(a) Formula & calculation: 6 marks. (b) Justification for TDM & pharmacokinetic changes: 7 marks. (c) Pathophysiological toxic mechanism: 7 marks. Total = 20 Marks.',
        assessedOutcome: 'Integrates pharmacokinetics into clinical dosage optimization.'
      }
    ],
    markingSchemeNotes: 'Graders must award partial credit for correct intermediate mathematical working in Section B and Section C. Round calculated answers to two decimal places.',
    createdAt: '2026-10-18'
  }
];

export const INITIAL_STUDENTS_BIODATA: StudentBiodata[] = [
  {
    id: 'std-01',
    regNumber: 'DIP/PHA/2025/001',
    fullName: 'Sarah Namagembe',
    gender: 'Female',
    dateOfBirth: '2004-03-14',
    yearOfStudy: 1,
    classCohort: 'Diploma Pharmacy Class 2026 - Year 1',
    contactPhone: '+256 701 445522',
    email: 's.namagembe@pharmacy.ac.ug',
    homeDistrictAddress: 'Plot 14, Kampala Road, Central Division',
    nextOfKinName: 'David Mukasa',
    nextOfKinPhone: '+256 772 119933',
    nextOfKinRelationship: 'Father',
    enrollmentStatus: 'Active',
    attendancePercentage: 96
  },
  {
    id: 'std-02',
    regNumber: 'DIP/PHA/2025/002',
    fullName: 'Emmanuel Ochieng',
    gender: 'Male',
    dateOfBirth: '2003-11-28',
    yearOfStudy: 1,
    classCohort: 'Diploma Pharmacy Class 2026 - Year 1',
    contactPhone: '+256 782 334411',
    email: 'e.ochieng@pharmacy.ac.ug',
    homeDistrictAddress: 'Gulu Town, Pece Sector',
    nextOfKinName: 'Grace Auma',
    nextOfKinPhone: '+256 703 887766',
    nextOfKinRelationship: 'Mother',
    enrollmentStatus: 'Active',
    attendancePercentage: 92
  },
  {
    id: 'std-03',
    regNumber: 'DIP/PHA/2024/015',
    fullName: 'Brian Kato',
    gender: 'Male',
    dateOfBirth: '2002-08-05',
    yearOfStudy: 2,
    classCohort: 'Diploma Pharmacy Class 2025 - Year 2',
    contactPhone: '+256 754 990022',
    email: 'b.kato@pharmacy.ac.ug',
    homeDistrictAddress: 'Mbarara City, High Street',
    nextOfKinName: 'Agnes Kato',
    nextOfKinPhone: '+256 779 443322',
    nextOfKinRelationship: 'Guardian',
    enrollmentStatus: 'Active',
    attendancePercentage: 88
  }
];

export const INITIAL_STUDENT_MARKS: StudentMarkRecord[] = [
  {
    id: 'mark-01',
    studentId: 'std-01',
    courseUnitId: 'unit-pha-101',
    academicYear: '2025/2026',
    cat1Score: 14,
    cat2Score: 13,
    assignmentScore: 9,
    practicalScore: 18,
    finalExamScore: 34,
    totalPercentage: 88,
    letterGrade: 'A',
    gradePoint: 5.0,
    remarks: 'Distinction performance in Pharmacokinetics'
  },
  {
    id: 'mark-02',
    studentId: 'std-02',
    courseUnitId: 'unit-pha-101',
    academicYear: '2025/2026',
    cat1Score: 11,
    cat2Score: 12,
    assignmentScore: 8,
    practicalScore: 15,
    finalExamScore: 28,
    totalPercentage: 74,
    letterGrade: 'B',
    gradePoint: 4.0,
    remarks: 'Strong comprehension of ADME mechanics'
  },
  {
    id: 'mark-03',
    studentId: 'std-03',
    courseUnitId: 'unit-pha-201',
    academicYear: '2025/2026',
    cat1Score: 13,
    cat2Score: 14,
    assignmentScore: 8,
    practicalScore: 16,
    finalExamScore: 31,
    totalPercentage: 82,
    letterGrade: 'A',
    gradePoint: 5.0,
    remarks: 'Sound knowledge of antimicrobial resistance'
  }
];

export const INITIAL_REFERENCE_DOCS: ReferenceDocument[] = [
  {
    id: 'ref-1',
    name: 'Goodman_and_Gilman_Pharmacology_14th_Ed.pdf',
    category: 'textbook',
    fileFormat: 'PDF',
    fileSize: '48.2 MB',
    extractedText: 'Full textbook extract covering Section I: General Principles, Drug-Receptor Dynamics, Pharmacokinetics, ADME, and Clinical Pharmacology.',
    sourceUrl: 'https://accesspharmacy.mhmedical.com/book.aspx?bookID=3191',
    attachedUnitCodes: ['PHA 1101', 'PHA 2101'],
    uploadedAt: '2026-10-15'
  },
  {
    id: 'ref-2',
    name: 'British_Pharmacopoeia_Dispensing_Standards.docx',
    category: 'pharmacopoeia',
    fileFormat: 'DOCX',
    fileSize: '12.4 MB',
    extractedText: 'Official formulations, limits of dissolution, compounding procedures for non-sterile suspensions and pediatric oral liquids.',
    attachedUnitCodes: ['PHA 1102'],
    uploadedAt: '2026-10-16'
  },
  {
    id: 'ref-3',
    name: 'Standard_National_Pharmacy_Exam_Format_2025.pdf',
    category: 'exam_standard',
    fileFormat: 'PDF',
    fileSize: '3.1 MB',
    extractedText: 'Standard Examination Blueprint: Section A 20 MCQs (1 mark each), Section B 5 Short Structured Questions (8 marks each), Section C 2 Long Clinical Essays (20 marks each). Total: 100 Marks.',
    attachedUnitCodes: ['PHA 1101', 'PHA 1102', 'PHA 2101'],
    uploadedAt: '2026-10-17'
  }
];

export const StorageService = {
  // Curriculum Packages
  getCurriculumPackage: (): CurriculumPackage | null => getStored<CurriculumPackage | null>(KEYS.CURRICULUM, null),
  setCurriculumPackage: (curr: CurriculumPackage | null) => setStored(KEYS.CURRICULUM, curr),

  // Lecture Notes
  getLectureNotes: (): LectureNoteBlock[] => getStored<LectureNoteBlock[]>(KEYS.LECTURE_NOTES, []),
  setLectureNotes: (notes: LectureNoteBlock[]) => setStored(KEYS.LECTURE_NOTES, notes),

  // Assessment Papers
  getAssessments: (): AssessmentPaper[] => getStored<AssessmentPaper[]>(KEYS.ASSESSMENTS, []),
  setAssessments: (papers: AssessmentPaper[]) => setStored(KEYS.ASSESSMENTS, papers),

  // Students & Marks
  getStudents: (): StudentBiodata[] => getStored<StudentBiodata[]>(KEYS.STUDENTS, []),
  setStudents: (students: StudentBiodata[]) => setStored(KEYS.STUDENTS, students),

  getMarks: (): StudentMarkRecord[] => getStored<StudentMarkRecord[]>(KEYS.MARKS, []),
  setMarks: (marks: StudentMarkRecord[]) => setStored(KEYS.MARKS, marks),

  // Reference Documents
  getReferences: (): ReferenceDocument[] => getStored<ReferenceDocument[]>(KEYS.REFERENCES, []),
  setReferences: (refs: ReferenceDocument[]) => setStored(KEYS.REFERENCES, refs),

  // Pre-load full sample package if user wants to test
  loadSamplePharmacyCurriculum: () => {
    StorageService.setCurriculumPackage(PHARMACY_CURRICULUM_SAMPLE);
    StorageService.setLectureNotes(INITIAL_PHARMACY_NOTES);
    StorageService.setAssessments(INITIAL_ASSESSMENT_PAPERS);
    StorageService.setStudents(INITIAL_STUDENTS_BIODATA);
    StorageService.setMarks(INITIAL_STUDENT_MARKS);
    StorageService.setReferences(INITIAL_REFERENCE_DOCS);
  },

  // DeepTutor Chat & General Tools
  getMessages: (): ChatMessage[] => getStored<ChatMessage[]>(KEYS.MESSAGES, INITIAL_MESSAGES),
  setMessages: (messages: ChatMessage[]) => setStored(KEYS.MESSAGES, messages),

  getTasks: (): TaskItem[] => getStored<TaskItem[]>(KEYS.TASKS, INITIAL_TASKS),
  setTasks: (tasks: TaskItem[]) => setStored(KEYS.TASKS, tasks),

  getQuestions: (): QuestionItem[] => getStored<QuestionItem[]>(KEYS.QUESTIONS, INITIAL_QUESTIONS),
  setQuestions: (questions: QuestionItem[]) => setStored(KEYS.QUESTIONS, questions),

  getMemory: (): MemoryTrace[] => getStored<MemoryTrace[]>(KEYS.MEMORY, INITIAL_MEMORY_TRACES),
  setMemory: (memory: MemoryTrace[]) => setStored(KEYS.MEMORY, memory),

  getKnowledgeBases: (): KnowledgeBase[] => getStored<KnowledgeBase[]>(KEYS.KNOWLEDGE_BASES, INITIAL_KNOWLEDGE_BASES),
  setKnowledgeBases: (kbs: KnowledgeBase[]) => setStored(KEYS.KNOWLEDGE_BASES, kbs),

  getClasses: (): AcademicClass[] => getStored<AcademicClass[]>(KEYS.CLASSES, INITIAL_CLASSES),
  setClasses: (classes: AcademicClass[]) => setStored(KEYS.CLASSES, classes),

  getDrafts: (): TeachingDraft[] => getStored<TeachingDraft[]>(KEYS.DRAFTS, INITIAL_DRAFTS),
  setDrafts: (drafts: TeachingDraft[]) => setStored(KEYS.DRAFTS, drafts),

  getPartners: (): PartnerAgent[] => getStored<PartnerAgent[]>(KEYS.PARTNERS, INITIAL_PARTNERS),
  setPartners: (partners: PartnerAgent[]) => setStored(KEYS.PARTNERS, partners),

  getProviders: (): ProviderConfig[] => getStored<ProviderConfig[]>(KEYS.PROVIDERS, DEFAULT_PROVIDERS),
  setProviders: (providers: ProviderConfig[]) => setStored(KEYS.PROVIDERS, providers),

  getSelectedTools: (): string[] => getStored<string[]>(KEYS.SELECTED_TOOLS, ['web_search', 'paper_search', 'reason', 'rag']),
  setSelectedTools: (tools: string[]) => setStored(KEYS.SELECTED_TOOLS, tools),

  getCurrentWorkspace: (): string => getStored<string>(KEYS.WORKSPACE, 'Academic & Pharmacy Curriculum Workspace'),
  setCurrentWorkspace: (workspace: string) => setStored(KEYS.WORKSPACE, workspace),

  exportFullBackup: (): string => {
    const data = {
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      stores: {
        curriculum: StorageService.getCurriculumPackage(),
        lectureNotes: StorageService.getLectureNotes(),
        assessments: StorageService.getAssessments(),
        students: StorageService.getStudents(),
        marks: StorageService.getMarks(),
        references: StorageService.getReferences(),
        messages: StorageService.getMessages(),
        tasks: StorageService.getTasks(),
        questions: StorageService.getQuestions(),
        memory: StorageService.getMemory(),
        knowledgeBases: StorageService.getKnowledgeBases(),
        classes: StorageService.getClasses(),
        partners: StorageService.getPartners(),
        drafts: StorageService.getDrafts(),
        providers: StorageService.getProviders(),
        selectedTools: StorageService.getSelectedTools(),
        workspace: StorageService.getCurrentWorkspace()
      }
    };
    return JSON.stringify(data, null, 2);
  },

  importBackup: (jsonString: string): boolean => {
    // Validate the entire payload before touching any current data.
    const previous = new Map<string, string | null>();
    try {
      const data = JSON.parse(jsonString);
      if (!data || !['2.0.0', '2.1.0'].includes(data.version) ||
          !data.stores || typeof data.stores !== 'object' || Array.isArray(data.stores)) return false;
      const updates: [string, string][] = [];
      for (const [name, store] of Object.entries(STORES)) {
        if (!Object.hasOwn(data.stores, name)) continue;
        const parsed = store.schema.safeParse(data.stores[name]);
        if (!parsed.success) return false;
        updates.push([store.key, JSON.stringify(parsed.data)]);
      }
      if (!updates.length) return false;
      for (const [key] of updates) previous.set(key, localStorage.getItem(key));
      for (const [key, value] of updates) localStorage.setItem(key, value);
      return true;
    } catch {
      // Preserve the old workspace if a write fails (for example, quota exceeded).
      for (const [key, value] of previous) {
        try {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        } catch { storageError(); }
      }
      return false;
    }
  },

  resetDefaults: (): void => {
    for (const key of Object.values(KEYS)) localStorage.removeItem(key);
  }
};

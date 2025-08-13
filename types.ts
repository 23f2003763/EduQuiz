export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  NUMERICAL = 'NUMERICAL',
  SUBJECTIVE = 'SUBJECTIVE',
}

export interface QuizQuestion {
  question: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswerIndices?: number[];
  numericalAnswer?: number;
  explanation: string;
}

export interface QuizConfig {
  pageRange: { start: number; end: number; };
  difficulty: 'Easy' | 'Medium' | 'Hard';
  numQuestions: number;
  questionTypes: QuestionType[];
  timerMinutes: number; // 0 for no timer
  topics: string;
  source: 'document' | 'pyq';
  examType?: Exam;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  CONFIG = 'CONFIG',
  GENERATING = 'GENERATING',
  QUIZ = 'QUIZ',
  RESULTS = 'RESULTS'
}

// Types for new features
export interface User {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  age?: number;
  targetExam?: Exam;
}

export enum Exam {
    JEE_MAINS = "JEE Mains",
    JEE_ADVANCED = "JEE Advanced",
    NEET = "NEET",
    MATH_OLYMPIAD = "Math Olympiad",
    PHYSICS_OLYMPIAD = "Physics Olympiad",
    CHEM_OLYMPIAD = "Chemistry Olympiad",
    ISI_BSTAT = "ISI B.Stat",
    CMI_BSC = "CMI B.Sc",
}

export interface SubjectProgress {
    name: string;
    progress: number; // 0-100
    subTopics: { name: string; progress: number; }[];
}
import React, { useState, useCallback, useEffect } from 'react';
import QuizConfigComponent from './components/FileUpload.js';
import Quiz from './components/Quiz.js';
import Results from './components/Results.js';
import Loader from './components/Loader.js';
import Solver from './components/Solver.js';
import { AppState, QuestionType, Exam } from './types.js';
import type { QuizQuestion, QuizConfig as QuizConfigType, User, SubjectProgress } from './types.js';
import { generateQuizFromContent, createChat } from './services/geminiService.js';
import { 
    BookOpenIcon, ChatBubbleLeftRightIcon, UserCircleIcon, 
    ArrowLeftOnRectangleIcon, PencilSquareIcon, Cog6ToothIcon, ChevronDownIcon 
} from './components/icons.js';
import type { Chat } from '@google/genai';
import { auth, signInWithGoogle } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';


type ViewMode = 'quiz' | 'solver' | 'strategy' | 'profile';

// Mock Data for Strategy and Profile pages
const mockUser: User = { uid: '123', name: 'Aditya Sharma', email: 'aditya.sharma@example.com', photoURL: null, age: 17, targetExam: Exam.JEE_ADVANCED };
const mockProgress: SubjectProgress[] = [
    { name: 'Physics', progress: 65, subTopics: [{name: 'Mechanics', progress: 75}, {name: 'Electrodynamics', progress: 55}] },
    { name: 'Chemistry', progress: 80, subTopics: [{name: 'Organic', progress: 90}, {name: 'Inorganic', progress: 70}] },
    { name: 'Mathematics', progress: 50, subTopics: [{name: 'Calculus', progress: 60}, {name: 'Algebra', progress: 40}] },
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [viewMode, setViewMode] = useState<ViewMode>('quiz');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<(number[] | number | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [quizConfig, setQuizConfig] = useState<QuizConfigType | null>(null);

  const [documentContext, setDocumentContext] = useState<string[]>([]);
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            const appUser: User = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
            };
            setCurrentUser(appUser);
            if (!chatInstance) {
                setChatInstance(createChat());
            }
        } else {
            setCurrentUser(null);
        }
        setAuthChecked(true); // Mark that we've checked for a user
    });
    return () => unsubscribe(); // Cleanup on unmount
  }, [chatInstance]);
  
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle setting the user
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Could not sign in with Google. Please try again.");
    }
  };

  const handleLogout = () => {
    auth.signOut();
    handleRestart();
  };
  
  const handleContinueAsGuest = () => {
    setCurrentUser({uid: 'guest', name: 'Guest', email: null, photoURL: null});
    if (!chatInstance) {
        setChatInstance(createChat());
    }
  };

  const handleStartQuizGeneration = useCallback(async (config: QuizConfigType, base64Images: string[]) => {
    setError(null);
    setQuizConfig(config);
    if (config.source === 'document') {
        setDocumentContext(base64Images);
    }
    setAppState(AppState.GENERATING);
    setViewMode('quiz');
    setLoadingMessage('Analyzing your document with AI...');

    try {
      setLoadingMessage('Creating your custom quiz...');
      const questions = await generateQuizFromContent(base64Images, config);
      if (questions && questions.length > 0) {
        setQuizQuestions(questions);
        setAppState(AppState.QUIZ);
        if (!chatInstance) setChatInstance(createChat());
      } else {
        throw new Error("The generated quiz was empty. Please try different options.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      setAppState(AppState.UPLOAD);
    } finally {
        setLoadingMessage('');
    }
  }, [chatInstance]);

  const handleQuizComplete = (answers: (number[] | number | null)[]) => {
    setUserAnswers(answers);
    setAppState(AppState.RESULTS);
  };

  const handleRestart = () => {
    setAppState(AppState.UPLOAD);
    setQuizQuestions([]);
    setUserAnswers([]);
    setError(null);
    setViewMode('quiz');
  };

  const renderQuizContent = () => {
    switch (appState) {
      case AppState.UPLOAD:
        return <QuizConfigComponent onStartQuizGeneration={handleStartQuizGeneration} disabled={false} />;
      case AppState.GENERATING:
        return <Loader message={loadingMessage} />;
      case AppState.QUIZ:
        return <Quiz questions={quizQuestions} timerMinutes={quizConfig?.timerMinutes || 0} onQuizComplete={handleQuizComplete} />;
      case AppState.RESULTS:
        return <Results questions={quizQuestions} userAnswers={userAnswers} onRestart={handleRestart} />;
      default:
        return <QuizConfigComponent onStartQuizGeneration={handleStartQuizGeneration} disabled={false} />;
    }
  };
  
  // --- Placeholder Components for New Features ---
  const StrategyPage = () => (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <PencilSquareIcon className="mx-auto h-16 w-16 text-indigo-500" />
          <h2 className="mt-4 text-3xl font-bold">Personalized Strategy</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Your target exam: <strong>{currentUser?.targetExam || 'Not Set'}</strong></p>
          <div className="mt-6 text-left space-y-4">
              {mockProgress.map(subject => (
                  <div key={subject.name} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                          <span className="font-bold">{subject.name}</span>
                          <span className="text-sm font-semibold">{subject.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mt-2">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${subject.progress}%` }}></div>
                      </div>
                  </div>
              ))}
          </div>
          <p className="mt-8 text-sm text-gray-400">This is a placeholder. A future update will enable full personalized study plans, progress tracking, and targeted quizzes based on your performance.</p>
      </div>
  );

  const ProfilePage = () => (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <UserCircleIcon className="mx-auto h-24 w-24 text-gray-400" />
          <h2 className="mt-4 text-3xl font-bold">{currentUser?.name || 'Guest User'}</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
          <div className="mt-8 space-y-4">
              <button className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Cog6ToothIcon className="w-5 h-5"/> Change Theme
              </button>
               <button className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <PencilSquareIcon className="w-5 h-5"/> Edit Profile
              </button>
          </div>
      </div>
  );

  const renderContent = () => {
    if (!authChecked) {
        return <Loader message="Authenticating..." />;
    }
    if (!currentUser) {
        return (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                <BookOpenIcon className="w-16 h-16 mx-auto text-indigo-500"/>
                <h2 className="mt-4 text-2xl font-bold">Welcome to EduQuiz AI</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Log in to save your progress and access personalized features.</p>
                <div className="mt-8 flex flex-col items-center gap-4">
                    <button onClick={handleLogin} className="w-full max-w-xs px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
                        Login with Google
                    </button>
                     <button onClick={handleContinueAsGuest} className="w-full max-w-xs px-6 py-2 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700">
                        Continue as Guest
                    </button>
                </div>
            </div>
        )
    }

    switch(viewMode) {
        case 'quiz': return renderQuizContent();
        case 'solver':
            if (!chatInstance) return <div className="text-center p-4">Please generate a quiz first to initialize the solver.</div>;
            return <Solver chat={chatInstance} documentImages={documentContext} />;
        case 'strategy': return <StrategyPage />;
        case 'profile': return <ProfilePage />;
        default: return renderQuizContent();
    }
  }

  const Header = () => {
    if (!currentUser) return null;
    return (
        <header className="w-full max-w-4xl mb-6">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800/50 p-2 rounded-xl shadow-md">
                <nav className="flex-1 flex justify-center">
                   <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                        {([ 'strategy', 'quiz', 'solver'] as ViewMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                disabled={(mode === 'solver' && !chatInstance)}
                                className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                                    viewMode === mode
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow'
                                    : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {mode === 'strategy' && <PencilSquareIcon className="w-5 h-5"/>}
                                {mode === 'quiz' && <BookOpenIcon className="w-5 h-5"/>}
                                {mode === 'solver' && <ChatBubbleLeftRightIcon className="w-5 h-5"/>}
                                <span className="hidden sm:inline">{mode}</span>
                            </button>
                        ))}
                    </div>
                </nav>
                <div className="flex items-center gap-2">
                     <button onClick={() => setViewMode('profile')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <UserCircleIcon className="w-7 h-7 text-gray-600 dark:text-gray-300"/>
                    </button>
                    <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ArrowLeftOnRectangleIcon className="w-7 h-7 text-gray-600 dark:text-gray-300"/>
                    </button>
                </div>
            </div>
        </header>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200">
      <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-start min-h-screen">
        <Header />
        <div className="w-full max-w-4xl">
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            )}
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
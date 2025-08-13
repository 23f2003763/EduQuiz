import React, { useState, useEffect } from 'react';
import type { QuizQuestion } from '../types.js';
import { QuestionType } from '../types.js';
import LatexRenderer from './LatexRenderer.js';
import { TimerIcon, CheckCircleIcon } from './icons.js';

interface QuizProps {
  questions: QuizQuestion[];
  timerMinutes: number;
  onQuizComplete: (answers: (number[] | number | null)[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, timerMinutes, onQuizComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number[] | number | null)[]>(new Array(questions.length).fill(null));
  const [currentSelection, setCurrentSelection] = useState<number[] | number | null>(null);
  const [timeLeft, setTimeLeft] = useState(timerMinutes > 0 ? timerMinutes * 60 : null);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleQuizEnd();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(t => t! - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);
  
  const handleQuizEnd = () => {
    // onQuizComplete is called with the latest state of userAnswers
    // when the last question is answered or time runs out.
    onQuizComplete(userAnswers);
  };
  
  const processNextQuestion = (skipped = false) => {
    const newAnswers = [...userAnswers];
    // Only update answer if not skipped, or if selection was made
    if (!skipped) {
       newAnswers[currentQuestionIndex] = currentSelection;
    } // if skipped, it remains null
    
    setUserAnswers(newAnswers);
    setCurrentSelection(null);

    if (isLastQuestion) {
      onQuizComplete(newAnswers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const handleNext = () => {
    if (currentSelection === null || (Array.isArray(currentSelection) && currentSelection.length === 0)) {
        alert("Please provide an answer before proceeding.");
        return;
    }
    processNextQuestion(false);
  };
  
  const handleSkip = () => {
    processNextQuestion(true);
  };

  const handleSelection = (value: number) => {
    if (currentQuestion.questionType === QuestionType.SINGLE_CHOICE) {
      setCurrentSelection([value]);
    } else if (currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE) {
      const current = Array.isArray(currentSelection) ? currentSelection : [];
      const newSelection = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      setCurrentSelection(newSelection);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercentage = ((currentQuestionIndex) / questions.length) * 100;
  
  const renderOptions = () => {
    switch(currentQuestion.questionType) {
        case QuestionType.SINGLE_CHOICE:
        case QuestionType.MULTIPLE_CHOICE:
            if (!currentQuestion.options) return <p className="text-red-500">Error: Options not provided for this question.</p>;
            const isMultiple = currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE;
            return currentQuestion.options.map((option, index) => {
                const isSelected = Array.isArray(currentSelection) && currentSelection.includes(index);
                return (
                    <button key={index} onClick={() => handleSelection(index)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-start ${
                        isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-500 ring-2 ring-indigo-500'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                    >
                        <div className={`flex-shrink-0 h-6 w-6 rounded-${isMultiple ? 'md' : 'full'} border-2 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400'} flex items-center justify-center mr-4 mt-1`}>
                           {isSelected && <CheckCircleIcon className="w-4 h-4 text-white"/>}
                        </div>
                        <div className="flex-1">
                            <LatexRenderer className={isSelected ? 'text-indigo-800 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-200'}>
                                {option}
                            </LatexRenderer>
                        </div>
                    </button>
                )
            })
        case QuestionType.NUMERICAL:
            return (
                <div>
                    <label htmlFor="numerical-answer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Answer:</label>
                    <input
                        id="numerical-answer"
                        type="number"
                        step="any"
                        value={typeof currentSelection === 'number' ? currentSelection : ''}
                        onChange={(e) => setCurrentSelection(e.target.value === '' ? null : parseFloat(e.target.value))}
                        className="block w-full max-w-sm p-3 rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg"
                        placeholder="Enter numerical answer"
                    />
                </div>
            )
        default: return null;
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Question {currentQuestionIndex + 1} of {questions.length}</p>
                {timeLeft !== null && (
                  <div className={`flex items-center gap-2 text-sm font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-gray-600 dark:text-gray-300'}`}>
                      <TimerIcon className="w-5 h-5"/>
                      <span>{formatTime(timeLeft)}</span>
                  </div>
                )}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">
            <LatexRenderer>{currentQuestion.question}</LatexRenderer>
          </div>
          
          <div className="space-y-4">{renderOptions()}</div>

          <div className="mt-8 flex justify-end items-center gap-4">
            <button
              onClick={handleSkip}
              className="px-6 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {isLastQuestion ? 'Finish' : 'Skip'}
            </button>
            <button
              onClick={handleNext}
              disabled={currentSelection === null || (Array.isArray(currentSelection) && currentSelection.length === 0)}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
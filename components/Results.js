import React from 'react';
import type { QuizQuestion } from '../types.js';
import { QuestionType } from '../types.js';
import { CheckCircleIcon, XCircleIcon } from './icons.js';
import LatexRenderer from './LatexRenderer.js';

interface ResultsProps {
  questions: QuizQuestion[];
  userAnswers: (number[] | number | null)[];
  onRestart: () => void;
}

const Results: React.FC<ResultsProps> = ({ questions, userAnswers, onRestart }) => {
  const calculateScore = () => {
    let totalScore = 0;
    questions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      if (userAnswer === null || userAnswer === undefined) {
        // Skipped questions get 0 points, not negative.
        return;
      }

      switch (q.questionType) {
        case QuestionType.SINGLE_CHOICE:
          if (Array.isArray(userAnswer) && q.correctAnswerIndices && userAnswer[0] === q.correctAnswerIndices[0]) {
            totalScore += 4;
          } else {
            totalScore -= 1;
          }
          break;
        
        case QuestionType.NUMERICAL:
          if (typeof userAnswer === 'number' && userAnswer === q.numericalAnswer) {
            totalScore += 4;
          }
          // No negative marking for incorrect numerical in this scheme.
          break;

        case QuestionType.MULTIPLE_CHOICE:
          if (Array.isArray(userAnswer) && q.correctAnswerIndices) {
            const userSelections = new Set(userAnswer);
            const correctSelections = new Set(q.correctAnswerIndices);
            let anyWrongSelected = false;
            let correctSelectedCount = 0;

            userSelections.forEach(ans => {
              if (correctSelections.has(ans)) {
                correctSelectedCount++;
              } else {
                anyWrongSelected = true;
              }
            });
            
            if (!anyWrongSelected) {
                if (correctSelectedCount === correctSelections.size && userSelections.size === correctSelections.size) {
                    totalScore += 4; // All correct options selected
                } else {
                    totalScore += correctSelectedCount; // Partial marking
                }
            }
            // If any wrong answer is selected, score for this question is 0.
          }
          break;
        
        case QuestionType.SUBJECTIVE:
            // Subjective questions are not auto-graded.
            break;
      }
    });
    return totalScore;
  };
  
  const totalPossibleScore = questions.reduce((acc, q) => {
      return q.questionType !== QuestionType.SUBJECTIVE ? acc + 4 : acc;
  }, 0);

  const score = calculateScore();
  const scorePercentage = totalPossibleScore > 0 ? Math.round((Math.max(0, score) / totalPossibleScore) * 100) : 0;
  
  const isAnswerCompletelyCorrect = (question: QuizQuestion, userAnswer: number[] | number | null): boolean => {
    if (userAnswer === null || userAnswer === undefined) return false;
    switch(question.questionType) {
        case QuestionType.SINGLE_CHOICE:
            return Array.isArray(userAnswer) && question.correctAnswerIndices ? userAnswer[0] === question.correctAnswerIndices[0] : false;
        case QuestionType.NUMERICAL:
            return userAnswer === question.numericalAnswer;
        case QuestionType.MULTIPLE_CHOICE:
            const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : []);
            const correctSet = new Set(question.correctAnswerIndices || []);
            if (userSet.size !== correctSet.size) return false;
            for (let item of userSet) {
                if (!correctSet.has(item)) return false;
            }
            return true;
        default:
          return false;
    }
  };

  const renderAnswerResult = (question: QuizQuestion, userAnswer: number[] | number | null, index: number) => {
      const isCorrect = isAnswerCompletelyCorrect(question, userAnswer);

      return (
        <div key={index} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6">
            <div className="flex items-start">
            <div className="mr-4 mt-1">
                {isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
            </div>
            <div className="flex-1">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    <LatexRenderer>{`${index + 1}. ${question.question}`}</LatexRenderer>
                </div>
                {question.questionType !== QuestionType.NUMERICAL && question.questionType !== QuestionType.SUBJECTIVE && (
                     <div className="space-y-2">
                        {question.options?.map((option, optionIndex) => {
                            const isUserAnswer = Array.isArray(userAnswer) && userAnswer.includes(optionIndex);
                            const isCorrectAnswer = question.correctAnswerIndices?.includes(optionIndex);
                            let optionClass = 'border-gray-300 dark:border-gray-600';
                            if (isCorrectAnswer) {
                                optionClass = 'border-green-500 bg-green-50 dark:bg-green-900/50';
                            } else if (isUserAnswer) {
                                optionClass = 'border-red-500 bg-red-50 dark:bg-red-900/50';
                            }
                            return (
                                <div key={optionIndex} className={`p-3 rounded-lg border ${optionClass}`}>
                                    <LatexRenderer className="text-gray-700 dark:text-gray-300">{option}</LatexRenderer>
                                </div>
                            );
                        })}
                    </div>
                )}
                 {question.questionType === QuestionType.NUMERICAL && (
                    <div className="space-y-2">
                         <div className={`p-3 rounded-lg border ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/50' : 'border-red-500 bg-red-50 dark:bg-red-900/50'}`}>
                            <strong>Your Answer: </strong>{userAnswer ?? 'Not Answered'}
                         </div>
                         <div className="p-3 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-700">
                            <strong>Correct Answer: </strong>{question.numericalAnswer}
                         </div>
                    </div>
                )}
                {userAnswer === null && question.questionType !== QuestionType.SUBJECTIVE && (
                     <div className="p-3 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/50">
                        <strong>Your Answer: </strong> Not Answered
                     </div>
                )}
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="font-bold text-gray-800 dark:text-gray-200">Explanation:</p>
                    <LatexRenderer className="text-gray-600 dark:text-gray-400">
                        {question.explanation}
                    </LatexRenderer>
                </div>
            </div>
            </div>
        </div>
      )
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden mb-6">
        <div className="p-6 sm:p-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Quiz Results</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">You scored</p>
            <div className="my-4">
                <div className={`mx-auto w-32 h-32 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center text-white ${scorePercentage >= 70 ? 'bg-green-500' : scorePercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    <span className="text-4xl sm:text-5xl font-bold">{scorePercentage}%</span>
                    <span className="text-lg font-semibold">{score} / {totalPossibleScore}</span>
                </div>
            </div>
            <p className="text-lg text-gray-800 dark:text-gray-200">Review your answers below.</p>
            <button
                onClick={onRestart}
                className="mt-6 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Create Another Quiz
            </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, index) => renderAnswerResult(q, userAnswers[index], index))}
      </div>
    </div>
  );
};

export default Results;
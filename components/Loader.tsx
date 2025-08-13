import React from 'react';
import { SparklesIcon } from './icons.tsx';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <SparklesIcon className="w-16 h-16 text-indigo-500 animate-pulse" />
      <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Processing with AI</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
};

export default Loader;
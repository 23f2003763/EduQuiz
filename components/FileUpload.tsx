import React, { useState, useCallback } from 'react';
import { UploadIcon, BookOpenIcon, DocumentTextIcon, SettingsIcon, TimerIcon, SparklesIcon } from './icons.tsx';
import type { QuizConfig } from '../types.ts';
import { QuestionType, Exam } from '../types.ts';

interface QuizConfigProps {
  onStartQuizGeneration: (config: QuizConfig, base64Images: string[]) => void;
  disabled: boolean;
}

declare const pdfjsLib: any;

const QuizConfigComponent: React.FC<QuizConfigProps> = ({ onStartQuizGeneration, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [numPages, setNumPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const [config, setConfig] = useState<QuizConfig>({
    pageRange: { start: 1, end: 1 },
    difficulty: 'Medium',
    numQuestions: 5,
    questionTypes: [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE],
    timerMinutes: 10,
    topics: '',
    source: 'document',
    examType: Exam.JEE_MAINS,
  });

  const handleFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setIsProcessing(true);
    setConfig(p => ({...p, source: 'document'}));

    const resetState = () => {
        setPdfDoc(null);
        setPdfFileName('');
        setNumPages(0);
        setIsProcessing(false);
    };

    try {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = (e.target?.result as string).split(',')[1];
                if (base64) {
                    const imgConfig: QuizConfig = {
                        ...config,
                        pageRange: { start: 1, end: 1 },
                        numQuestions: 5,
                        questionTypes: [QuestionType.SINGLE_CHOICE],
                    };
                    onStartQuizGeneration(imgConfig, [base64]);
                }
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs`;
            }
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setConfig(prev => ({ ...prev, pageRange: { start: 1, end: pdf.numPages } }));
            setPdfFileName(file.name);
            setIsProcessing(false);
        } else {
            alert('Please upload a valid image (JPG, PNG) or PDF file.');
            resetState();
        }
    } catch (error) {
        console.error("Error loading file: ", error);
        alert("Sorry, there was an error processing that file.");
        resetState();
    }
  }, [onStartQuizGeneration, config]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isProcessing) return;
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, [disabled, isProcessing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isProcessing) return;
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile, disabled, isProcessing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };
  
  const handleGenerate = async () => {
    setIsProcessing(true);
    try {
        let base64Images: string[] = [];
        if (config.source === 'document') {
            if (!pdfDoc) {
                alert("Please upload a document first.");
                setIsProcessing(false);
                return;
            }
            const { start, end } = config.pageRange;
            const pagesToRender = Array.from({ length: (end - start + 1) }, (_, i) => start + i);
            
            for (const pageNum of pagesToRender) {
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context!, viewport }).promise;
                base64Images.push(canvas.toDataURL('image/jpeg').split(',')[1]);
            }
        }
        // For PYQ source, base64Images will be empty, and the service will handle it.
        onStartQuizGeneration(config, base64Images);

    } catch(error) {
        console.error("Error processing request: ", error);
        alert("Failed to process your request. Please check settings and try again.");
        setIsProcessing(false);
    }
  };

  const updateConfig = (key: keyof QuizConfig, value: any) => {
      setConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const handleQuestionTypeChange = (type: QuestionType) => {
      const newTypes = config.questionTypes.includes(type)
          ? config.questionTypes.filter(t => t !== type)
          : [...config.questionTypes, type];
      if (newTypes.length > 0) {
          updateConfig('questionTypes', newTypes);
      } else {
          alert("You must select at least one question type.");
      }
  };

  const resetView = () => {
      setPdfDoc(null);
      setNumPages(0);
      setPdfFileName('');
  };

  const renderInitialView = () => (
    <div className="w-full max-w-2xl mx-auto text-center">
      <BookOpenIcon className="mx-auto h-16 w-16 text-indigo-500" />
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">EduQuiz AI Creator</h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Generate a quiz from a document, or create one from a bank of previous year questions.
      </p>
      <div className="mt-10 flex flex-col items-center">
         <button onClick={() => updateConfig('source', 'pyq')} className="mb-4 w-full max-w-sm px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center gap-2">
            <SparklesIcon className="w-6 h-6"/>
            Generate from PYQs
        </button>
        <p className="text-gray-500 dark:text-gray-400 my-2">OR</p>
        <form className="w-full" onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
            <label
            htmlFor="dropzone-file"
            className={`relative flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 ${dragActive ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-500'}`}
            >
            {dragActive && <div className="absolute inset-0 z-10" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}></div>}
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click to upload document</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, JPG</p>
            </div>
            <input id="dropzone-file" type="file" className="hidden" accept="image/*,application/pdf" onChange={handleChange} disabled={disabled || isProcessing} />
            </label>
            {isProcessing && <p className="mt-4 text-indigo-500 animate-pulse">Loading File...</p>}
        </form>
      </div>
    </div>
  );
  
  const renderConfigView = () => (
    <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl mx-auto">
        <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
            <div className="flex items-center justify-center gap-3">
                {config.source === 'document' ? <DocumentTextIcon className="h-12 w-12 text-indigo-500"/> : <SparklesIcon className="h-12 w-12 text-indigo-500"/>}
                <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">Configure Your Quiz</h2>
            </div>
            <p className="mt-1 text-md text-gray-600 dark:text-gray-400 truncate px-4" title={pdfFileName}>
                {config.source === 'document' ? `${pdfFileName} (${numPages} pages)` : `Source: ${config.examType} PYQs`}
            </p>
        </div>

        <div className="space-y-6">
            {config.source === 'document' && (
                <div>
                    <label className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Page Range</label>
                    <div className="flex items-center gap-4">
                        <input type="number" value={config.pageRange.start} onChange={e => setConfig(p => ({...p, pageRange: {...p.pageRange, start: Math.max(1, Number(e.target.value))}}))} min="1" max={numPages} className="w-full text-center p-2 rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600"/>
                        <span>to</span>
                        <input type="number" value={config.pageRange.end} onChange={e => setConfig(p => ({...p, pageRange: {...p.pageRange, end: Math.min(numPages, Number(e.target.value))}}))} min="1" max={numPages} className="w-full text-center p-2 rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600"/>
                        <button onClick={() => setConfig(p => ({...p, pageRange: {start: 1, end: numPages}}))} className="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800">All</button>
                    </div>
                </div>
            )}
            
            {config.source === 'pyq' && (
                <div>
                    <label htmlFor="examType" className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Exam</label>
                    <select id="examType" value={config.examType} onChange={e => updateConfig('examType', e.target.value as Exam)} className="w-full p-2 rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                        {Object.values(Exam).map((exam) => <option key={exam} value={exam}>{exam}</option>)}
                    </select>
                </div>
            )}

            <div>
                <label className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
                    {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                        <button key={d} onClick={() => updateConfig('difficulty', d)} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${config.difficulty === d ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'}`}>{d}</button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Question Types</label>
                <div className="flex flex-wrap gap-3">
                    {Object.values(QuestionType).map((type) => (
                        <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={config.questionTypes.includes(type)} onChange={() => handleQuestionTypeChange(type)} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            {type.replace('_', ' ')}
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <label htmlFor="topics" className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Focus Topics (optional)</label>
                <input type="text" id="topics" value={config.topics} onChange={e => updateConfig('topics', e.target.value)} placeholder="e.g., Photosynthesis, Newton's Laws" className="w-full p-2 rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="numQuestions" className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Questions</label>
                    <input type="number" id="numQuestions" value={config.numQuestions} onChange={e => updateConfig('numQuestions', Math.max(1, Number(e.target.value)))} min="1" max="20" className="w-full p-2 rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600"/>
                </div>
                <div>
                    <label htmlFor="timer" className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Timer (minutes, 0 for none)</label>
                    <input type="number" id="timer" value={config.timerMinutes} onChange={e => updateConfig('timerMinutes', Math.max(0, Number(e.target.value)))} min="0" className="w-full p-2 rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600"/>
                </div>
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button onClick={handleGenerate} disabled={disabled || isProcessing} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2">
                <SparklesIcon className="w-5 h-5"/>
                {isProcessing ? 'Generating...' : 'Generate Quiz'}
            </button>
            <button onClick={resetView} disabled={disabled || isProcessing} className="w-full sm:w-auto px-6 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Back
            </button>
        </div>
    </div>
  );

  return (pdfDoc || config.source === 'pyq') ? renderConfigView() : renderInitialView();
};

export default QuizConfigComponent;
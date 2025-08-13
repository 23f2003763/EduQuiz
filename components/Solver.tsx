import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import LatexRenderer from './LatexRenderer';
import { SparklesIcon } from './icons';

interface SolverProps {
  chat: Chat;
  documentImages: string[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Solver: React.FC<SolverProps> = ({ chat, documentImages }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        let responseStream;
        const currentInput = input; // Capture input before clearing

        if (isFirstMessage && documentImages.length > 0) {
            const imageParts = documentImages.map(img => ({ inlineData: { data: img, mimeType: 'image/jpeg' } }));
            const parts = [
                { text: "Here is the document context for my questions." },
                ...imageParts,
                { text: `My first question is: ${currentInput}` }
            ];
            responseStream = await chat.sendMessageStream({ message: parts });
            setIsFirstMessage(false);
        } else {
            responseStream = await chat.sendMessageStream({ message: currentInput });
        }
        
        let currentModelMessage = '';
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        for await (const chunk of responseStream) {
            currentModelMessage += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'model', text: currentModelMessage };
                return newMessages;
            });
        }
    } catch (error) {
        console.error("Solver error:", error);
        const errorMessage: Message = { role: 'model', text: "Sorry, I encountered an error. Please try again." };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[75vh] bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                <LatexRenderer>{msg.text}</LatexRenderer>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'model' && (
             <div className="flex justify-start">
              <div className="max-w-lg p-3 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 animate-pulse text-indigo-500"/>
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 p-3 rounded-lg border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Solver;
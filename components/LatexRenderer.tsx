import React, { useRef, useEffect } from 'react';

declare global {
    interface Window {
        renderMathInElement?: (element: HTMLElement, options?: object) => void;
        katex?: any;
    }
}

interface LatexRendererProps {
  children: string;
  className?: string;
}

const LatexRenderer: React.FC<LatexRendererProps> = ({ children, className }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Pre-process the string to fix common AI formatting errors
  const cleanLatexString = (str: string) => {
    if (!str) return '';
    // This regex replaces escaped dollar signs like `\$` with a normal `$`
    // and handles some other common spacing issues.
    return str.replace(/\\\$/g, '$').replace(/\\ /g, ' ');
  };

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    
    // Set the cleaned content
    element.innerHTML = cleanLatexString(children);

    const render = () => {
        try {
            if (window.renderMathInElement) {
                window.renderMathInElement(element, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            }
        } catch (error) {
            console.error("KaTeX rendering error:", error);
            // If rendering fails, reset to plain text to avoid a broken UI
            element.textContent = children;
        }
    };
    
    // Poll for the KaTeX script to be ready
    let attempts = 0;
    const tryRender = () => {
      if (window.renderMathInElement && window.katex) {
        render();
      } else if (attempts < 50) { // Wait up to 5 seconds
        attempts++;
        setTimeout(tryRender, 100);
      } else {
        console.error("KaTeX script did not load in time. Showing raw text.");
        // Fallback to show the raw text if KaTeX fails to load
        element.textContent = children;
      }
    };

    tryRender();

  }, [children]);

  return <div ref={contentRef} className={className}></div>;
};

export default LatexRenderer;
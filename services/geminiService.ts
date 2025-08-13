import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { QuizQuestion, QuizConfig } from '../types.ts';
import { QuestionType } from '../types.ts';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "The question. It MUST be LaTeX formatted using $...$ for inline and $$...$$ for display math if it contains mathematical expressions.",
      },
      questionType: {
        type: Type.STRING,
        enum: [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE, QuestionType.NUMERICAL, QuestionType.SUBJECTIVE],
        description: "The type of question.",
      },
      options: {
        type: Type.ARRAY,
        description: "An array of 4 possible answers for SINGLE_CHOICE or MULTIPLE_CHOICE questions. MUST be LaTeX formatted if needed.",
        items: { type: Type.STRING },
      },
      correctAnswerIndices: {
        type: Type.ARRAY,
        description: "Array of 0-based indices of the correct answers from the 'options' array. Contains one index for SINGLE_CHOICE, one or more for MULTIPLE_CHOICE.",
        items: { type: Type.INTEGER },
      },
      numericalAnswer: {
          type: Type.NUMBER,
          description: "The correct numerical answer for NUMERICAL questions."
      },
      explanation: {
        type: Type.STRING,
        description: "A detailed, step-by-step explanation of how to arrive at the correct answer. Format all mathematical equations, formulas, or scientific notation using standard LaTeX syntax. IMPORTANT: Do NOT escape dollar signs, e.g., use '$E=mc^2$' instead of '\\$E=mc^2\\$'.",
      },
    },
    required: ["question", "questionType", "explanation"],
  },
};

export const generateQuizFromContent = async (base64Images: string[], config: QuizConfig): Promise<QuizQuestion[]> => {
  const imageParts = base64Images.map(img => ({
    inlineData: {
      data: img,
      mimeType: 'image/jpeg',
    },
  }));
  
  const pyqInstruction = config.source === 'pyq' 
    ? `The user wants questions from Previous Year Questions (PYQs) for the ${config.examType} exam. If you have access to this data, generate relevant PYQs. If not, generate high-quality mock questions that match the style, difficulty, and syllabus of the ${config.examType} exam.`
    : `The user has provided a document. Generate questions based on its content.`;


  const textPart = {
    text: `Analyze the provided educational content. Based on the following configuration, generate a challenging quiz.

Configuration:
- Source: ${config.source}
- Exam Focus (if PYQ): ${config.examType || 'N/A'}
- Difficulty: ${config.difficulty}
- Number of Questions: ${config.numQuestions}
- Question Types to Include: ${config.questionTypes.join(', ')}
- Specific Topics to Focus On: ${config.topics || "General content"}

Instructions:
1.  ${pyqInstruction}
2.  Generate exactly ${config.numQuestions} questions.
3.  Adhere to the requested difficulty level.
4.  For each question, strictly follow the provided JSON schema.
5.  IMPORTANT: Format ALL mathematical notation using standard LaTeX syntax (e.g., $...$ for inline). DO NOT escape the dollar sign delimiters (e.g., use '$x^2$' NOT '\\$x^2\\$').
6.  For 'explanation', provide a detailed, step-by-step solution.
7.  For 'SINGLE_CHOICE', provide one index in 'correctAnswerIndices'.
8.  For 'MULTIPLE_CHOICE', provide one or more indices in 'correctAnswerIndices'.
9.  For 'NUMERICAL', provide the answer in 'numericalAnswer' and omit 'options' and 'correctAnswerIndices'.
10. For 'SUBJECTIVE' questions, omit 'options', 'correctAnswerIndices', and 'numericalAnswer'. The explanation should serve as the model answer.
11. Ensure options are never blank for choice-based questions.`,
  };
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [...imageParts, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        temperature: 0.5,
      },
    });

    const jsonText = response.text.trim();
    const quizData = JSON.parse(jsonText);

    if (!Array.isArray(quizData) || quizData.length === 0) {
        throw new Error("API returned an empty or invalid quiz. The document might not have enough content for the selected options.");
    }

    return (quizData as QuizQuestion[]).filter(q => q.question && q.questionType);

  } catch (error) {
    console.error("Error generating quiz from Gemini:", error);
    let errorMessage = "Failed to generate quiz. The AI model might be unable to process the document with the current settings.";
    if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};

export const createChat = (): Chat => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are a helpful, general-purpose academic tutor called 'EduQuiz AI Solver'.
            - If the user provides a document, you can use it for context to answer questions about it.
            - However, you are also a general AI assistant and can answer questions on any academic topic.
            - When solving problems, provide a detailed, step-by-step solution.
            - IMPORTANT: Format ALL mathematical and scientific notation using LaTeX syntax. Do not escape dollar signs.`
        }
    });
    return chat;
}
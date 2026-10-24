import axios from "axios";

import { apiClient } from "../../../core/network/apiClient";

export interface ChatbotSource {
  document: string;
  page: number;
  similarity: number; // never shown to students
}

export interface ChatbotAnswer {
  answer: string;
  was_answered: boolean;
  sources: ChatbotSource[];
}

export const MAX_QUESTION_LENGTH = 500;

export async function askChatbot(question: string): Promise<ChatbotAnswer> {
  const { data } = await apiClient.post<ChatbotAnswer>("/chatbot/ask/", { question });
  return data;
}

export function chatbotErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 429) return "You're asking too fast. Please wait a minute and try again.";
    if (status === 503) return "The assistant is busy right now. Please try again in a little while.";
    if (status === 401) return "Your login has expired. Please sign in again.";
    if (!error.response) return "Couldn't reach the server. Check your connection.";
  }
  return "Something went wrong. Please try again.";
}

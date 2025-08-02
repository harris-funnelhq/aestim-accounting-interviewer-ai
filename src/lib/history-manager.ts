/**
 * Defines the structure for a single message part in the conversation history.
 * This matches the format expected by the Gemini API.
 */
export interface MessagePart {
  text: string;
}

/**
 * Defines the structure for a single item in the conversation history.
 */
export interface HistoryItem {
  role: 'user' | 'model';
  parts: MessagePart[];
}

const HISTORY_STORAGE_KEY = 'aestim-interview-history';

/**
 * A utility object to manage the conversation history in localStorage.
 * This allows the conversation state to persist even if the user refreshes the page.
 */
export const historyManager = {
  /**
   * Retrieves the conversation history from localStorage.
   * @returns An array of HistoryItem objects, or an empty array if none is found.
   */
  get: (): HistoryItem[] => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
      console.error("Failed to retrieve history from localStorage:", error);
      return [];
    }
  },

  /**
   * Saves the conversation history to localStorage.
   * @param history The array of HistoryItem objects to save.
   */
  set: (history: HistoryItem[]): void => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to localStorage:", error);
    }
  },

  /**
   * Clears the conversation history from localStorage.
   */
  clear: (): void => {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear history from localStorage:", error);
    }
  }
};
# Aestim AI Accounting Interviewer: Project Documentation

This document provides a comprehensive overview of the Aestim AI Interviewer project, detailing its architecture from the backend services to the frontend user interface.

---

## Phase 1: Core Backend (Python & Flask)

The backend is a Python application using the Flask framework to serve API endpoints. Its primary responsibility is to communicate with the Google Vertex AI (Gemini) and manage the interview logic.

-   **`app.py`**: The main server file. It initializes the Flask app, sets up CORS, and defines all API endpoints.
-   **`.env` File**: Used for configuration. It must contain the `GCP_PROJECT_ID` and `GCP_LOCATION` for the Vertex AI service to function.
-   **Key Endpoints**:
    -   `POST /chat/accounting`: This is the main endpoint for the interview. It receives the chat history and the user's latest message, communicates with the Gemini model, and returns the AI's next question.
    -   `POST /chat/accounting/results`: This endpoint receives the full interview transcript and uses a multi-agent system to generate a detailed performance evaluation.

---

## Phase 2: The AI's "Brain" (System Prompts)

The behavior, personality, and rules of the AI are defined in plain text system prompt files. This allows for easy modification of the AI's logic without changing Python code.

-   **`accounting_prompt.txt`**: The "Production Mode" prompt. This is the master instruction set for the AI, defining its assertive persona, the dynamic "Insight Engine" for adapting to candidate performance, and the strict JSON schemas for all five allowed question types.

-   **`accounting_test_prompt.txt`**: The "Test Mode" prompt. This is a simplified instruction set that tells the AI to ignore its complex persona and instead ask one question of each type in a fixed, sequential order (`normal` -> `formula_entry` -> `value_entry` -> `mcq` -> `sjt`).

-   **The `mode` Parameter**: The `/chat/accounting` endpoint accepts a `mode` parameter in its JSON body.
    -   `"mode": "prod"`: Uses the main `accounting_prompt.txt`.
    -   `"mode": "test"`: Uses the simplified `accounting_test_prompt.txt`.

---

## Phase 3: Frontend Architecture (React + Vite)

The frontend is a modern single-page application built with React and Vite, using TypeScript for type safety.

-   **`src/pages/Interview.tsx`**: This is the most important component. It acts as the central orchestrator for the entire interview experience. It manages:
    -   **State**: The full conversation `history`, the current `mode` ('test' or 'prod'), and loading/speaking states.
    -   **API Communication**: Contains the `sendChatMessage` function that calls the backend.
    -   **View Logic**: Determines whether to show the `ConversationPanel` or the `InteractiveQuestionPanel`.

-   **`src/components/InteractiveQuestionPanel.tsx`**: This component acts as a "router." It receives the `problem` object from the AI's response and renders the correct interactive task component based on the `taskType` field.

-   **Interactive Task Components**: Each of the allowed interactive task types has a corresponding React component responsible for rendering its UI:
    -   `FormulaEntryTask.tsx`
    -   `ValueEntryTask.tsx`
    -   `McqTask.tsx`
    -   `SjtTask.tsx`

---

## Phase 4: The Interview Flow & Data Handling

The user experience is driven by a clear, cyclical flow of data.

1.  **User Input**: The user speaks or types a message. `AudioControls.tsx` captures this and calls `sendChatMessage` in `Interview.tsx`.
2.  **API Call**: `sendChatMessage` sends the current `history` and the new message to the backend, including the active `mode`.
3.  **AI Response**: The backend returns a JSON object containing the AI's raw response (e.g., `{"aiMessage": "{\"response\": \"...\", \"type\": \"...\"}"}`).
4.  **JSON Parsing**: The frontend logic in `Interview.tsx` carefully parses the `aiMessage` to extract the structured JSON object within.
5.  **State Update**: The new AI message is added to the `history` state.
6.  **Conditional Rendering**:
    -   If the `type` is `normal`, the `ConversationPanel` displays the new message.
    -   If the `type` is `interactive`, the `isInteractiveQuestion` state is set to true, and the `problem` object is passed to the `InteractiveQuestionPanel`.
7.  **Termination Check**: After every response, the frontend checks if the message contains the `[END_INTERVIEW]` signal. If it does, it uses `react-router-dom`'s `navigate` function to redirect the user to the
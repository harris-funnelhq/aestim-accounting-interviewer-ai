# Aestim AI Accounting Interviewer: Project Documentation

This document provides a comprehensive overview of the Aestim AI Interviewer project, detailing its architecture from the backend services to the frontend user interface.

---

## Phase 1: Core Backend (Python & Flask)

The backend is built using Python and Flask, providing a robust and flexible server-side solution. Key components include:

- **User Authentication**: Secure login and registration system for users.
- **API Development**: RESTful APIs to handle requests from the frontend, including user management, interview management, and task handling.
- **Database Integration**: Connection to a database (e.g., PostgreSQL) for persistent data storage, using an ORM like SQLAlchemy for database operations.
- **AI Integration**: Incorporation of OpenAI's API for AI-driven task generation and evaluation.

## Phase 2: The AI's "Brain" (System Prompts)

The AI's functionality is driven by a series of carefully crafted prompts that define its behavior and the nature of the tasks it generates. These prompts are organized into categories:

- **General Prompts**: Define the AI's role, capabilities, and the structure of its responses.
- **Task-Specific Prompts**: Tailored prompts for each task type, guiding the AI in generating relevant problems and evaluating user responses.

## Phase 3: Frontend Architecture (React + Vite)

The frontend is developed using React, a popular JavaScript library for building user interfaces, and Vite, a modern build tool that provides a fast and efficient development experience. Key aspects include:

- **Component-Based Structure**: The UI is built as a tree of reusable components, each managing its own state and rendering logic.
- **Routing**: React Router is used for navigating between different views, such as the login page, interview dashboard, and task views.
- **State Management**: Context API or a state management library like Redux is used for managing global state, such as user authentication status and interview progress.
- **Styling**: CSS modules or a CSS-in-JS solution like styled-components for scoped and dynamic styling.

## Phase 4: The Interview Flow & Data Handling

The interview process is designed to be interactive and adaptive, with the AI guiding the candidate through a series of tasks. Key elements include:

- **Dynamic Task Generation**: Based on the candidate's profile and progress, the AI generates and presents tasks in real-time.
- **Interactive UI Components**: Custom components for each task type, providing the necessary interactivity (e.g., grids, forms, buttons).
- **Data Validation and Error Handling**: Ensuring that user inputs are valid and providing helpful feedback in case of errors.
- **Progress Tracking**: Saving the candidate's progress and responses, allowing for a seamless and continuous interview experience.

---

## Phase 5: Future Development Roadmap (Expanded Task Types)

This section outlines the planned enhancements for Aestim, focusing on the implementation of more advanced and specialized interactive task types. The current, simplified version of the application uses five core types. The following tasks represent the next logical steps in expanding the assessment's depth and breadth.

Each task described below includes its purpose, the required frontend UI/UX, and the specific JSON schema the AI will need to produce.

### A. Task Type: `data_validation`

*   **Purpose**: To test a candidate's attention to detail and their ability to spot errors, inconsistencies, or anomalies in financial data sets, a core skill for auditing and financial analysis.

*   **UI/UX Requirements**: The frontend will render a table of data (e.g., a sales ledger, an expense report). The user must examine the data and identify the single row that contains an error (e.g., incorrect calculation, wrong date, duplicate entry). The rows should be clickable, and upon selecting a row, a "Submit" button becomes active.

*   **JSON Schema**:
    ```json
    {
      "response": "string",
      "type": "interactive",
      "problem": {
        "taskType": "data_validation",
        "data": [
          ["string", ...],
          ["any", ...]
        ]
      }
    }
    ```

*   **Sample JSON Response**:
    ````json
    {
      "response": "Review the following expense report carefully. Identify and select the single entry that contains a calculation error.",
      "type": "interactive",
      "problem": {
        "taskType": "data_validation",
        "data": [
          ["Date", "Employee", "Amount", "GST (10%)", "Total"],
          ["2025-07-15", "A. Smith", 100.00, 10.00, 110.00],
          ["2025-07-16", "B. Jones", 50.00, 5.00, 55.00],
          ["2025-07-18", "C. Lee", 75.00, 7.50, 87.50],
          ["2025-07-19", "D. Ray", 120.00, 12.00, 132.00]
        ]
      }
    }
    ````

### B. Task Type: `bank_reconciliation`

*   **Purpose**: To assess a candidate's ability to perform one of the most fundamental accounting procedures: comparing a company's cash records to its bank statement and identifying discrepancies.

*   **UI/UX Requirements**: The UI must display two tables side-by-side: one for the "Company's Books" and one for the "Bank Statement." Each row in both tables will have a checkbox. The user must select the checkboxes corresponding to all the items that are causing the discrepancy between the two statements (e.g., outstanding checks, deposits in transit).

*   **JSON Schema**:
    ```json
    {
      "response": "string",
      "type": "interactive",
      "problem": {
        "taskType": "bank_reconciliation",
        "book_data": [["string", ...], ["any", ...]],
        "bank_data": [["string", ...], ["any", ...]]
      }
    }
    ```

*   **Sample JSON Response**:
    ````json
    {
      "response": "Reconcile the following cash book with the bank statement. Select all items that represent reconciling differences.",
      "type": "interactive",
      "problem": {
        "taskType": "bank_reconciliation",
        "book_data": [
          ["Date", "Description", "Amount"],
          ["01-Aug", "Check #101", -500],
          ["05-Aug", "Deposit", 2000],
          ["15-Aug", "Check #102", -1200]
        ],
        "bank_data": [
          ["Date", "Description", "Amount"],
          ["06-Aug", "Deposit", 2000],
          ["20-Aug", "Bank Fee", -50]
        ]
      }
    }
    ````

### C. Task Type: `document_analysis`

*   **Purpose**: To evaluate a candidate's ability to read and extract key information from unstructured or semi-structured documents like invoices, purchase orders, or contracts.

*   **UI/UX Requirements**: The component will display a block of plain text representing the document. Below this text, a series of labeled input fields will be shown. The user must read the document and type the correct information into the corresponding fields.

*   **JSON Schema**:
    ```json
    {
      "response": "string",
      "type": "interactive",
      "problem": {
        "taskType": "document_analysis",
        "document_text": "string",
        "fields": ["string", ...]
      }
    }
    ```

*   **Sample JSON Response**:
    ````json
    {
      "response": "Please review the following supplier invoice and extract the required information into the fields below.",
      "type": "interactive",
      "problem": {
        "taskType": "document_analysis",
        "document_text": "INVOICE\nTo: Apex Solutions\nFrom: Stellar Supplies Inc.\nInvoice #: INV-2025-883\nDate: 25-Jul-2025\nAmount Due: $4,590.00\nDue Date: 24-Aug-2025",
        "fields": ["Invoice Number", "Vendor Name", "Amount Due", "Due Date"]
      }
    }
    ````

### D. Task Type: `grid_entry`

*   **Purpose**: To test skills that require filling out multi-row, multi-column data, such as preparing a series of adjusting journal entries or a simple financial statement schedule.

*   **UI/UX Requirements**: The UI will render an interactive grid or table. The headers are defined by the AI, as is the number of empty rows. Each cell in the grid will be an input field, allowing the user to construct a full table of data.

*   **JSON Schema**:
    ```json
    {
      "response": "string",
      "type": "interactive",
      "problem": {
        "taskType": "grid_entry",
        "columns": ["string", ...],
        "rows": "number"
      }
    }
    ```

*   **Sample JSON Response**:
    ````json
    {
      "response": "At year-end, the following adjustments are needed: 1. Accrued salaries of $5,000. 2. Depreciation of $10,000. Please prepare the necessary adjusting journal entries in the grid below.",
      "type": "interactive",
      "problem": {
        "taskType": "grid_entry",
        "columns": ["Date", "Account", "Debit", "Credit"],
        "rows": 4
      }
    }
    ````
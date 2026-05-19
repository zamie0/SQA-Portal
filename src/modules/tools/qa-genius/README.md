# QA Genius

QA Genius is the AI-assisted test case generator in the SQA Portal. It turns requirements, user stories, URS clauses, API contracts, or readable requirement files into structured QA test cases that can be reviewed, copied, or exported as CSV.

## What It Does

- Generates QA test cases from pasted requirement text.
- Supports Functional, API, Security, Performance, and Automation test types.
- Lets users choose Low, Medium, or High priority.
- Generates 3, 5, 8, 10, 15, or 20 test cases.
- Reads TXT, MD, CSV, JSON, and XML files directly into the prompt.
- Allows PDF, DOC, and DOCX attachment awareness, but users should paste extracted requirement text for accurate generation.
- Displays results in a formal QA test case table.
- Supports copying generated results and exporting them to CSV.

## Main Files

```text
src/modules/tools/qa-genius/
  pages/
    qa-genius-page.tsx      # Main QA Genius generator UI
    library-page.tsx        # Placeholder/library page
    history-page.tsx        # Placeholder/history page

src/app/api/tools/qa-genius/generate/
  route.ts                  # Gemini-backed generation API route
```

## Routes

- `/tools/qa-genius` - main generator page
- `/tools/qa-genius/library` - library page
- `/tools/qa-genius/history` - history page
- `/api/tools/qa-genius/generate` - POST endpoint used by the generator UI

## Environment Variables

QA Genius uses Gemini through the server-side API route. Add one of these API keys to `.env.local`:

```env
QAGENIUS_GEMINI_API_KEY=
GEMINI_API_KEY=
```

`QAGENIUS_GEMINI_API_KEY` is preferred for QA Genius. If it is not set, the API route falls back to `GEMINI_API_KEY`.

Optional model configuration:

```env
QAGENIUS_GEMINI_MODEL=
GEMINI_MODEL=
```

Model selection order:

1. `QAGENIUS_GEMINI_MODEL`
2. `GEMINI_MODEL`
3. Default model: `gemma-3-12b-it`

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the QA Genius page:

```text
http://localhost:3000/tools/qa-genius
```

## API Request

`POST /api/tools/qa-genius/generate`

```json
{
  "requirement": "User must be able to reset a forgotten password using a verified email address.",
  "testType": "Functional",
  "priority": "Medium",
  "maxTestCases": 5
}
```

The frontend also sends compatibility fields named `type` and `maxCases`, but the API route validates `requirement`, `testType`, `priority`, and `maxTestCases`.

## API Response

```json
{
  "testCases": [
    {
      "id": "TC-001",
      "title": "Verify password reset request with registered email",
      "preconditions": "User account exists and email service is available.",
      "steps": [
        "Navigate to the login page.",
        "Select forgot password.",
        "Enter a registered email address.",
        "Submit the request."
      ],
      "expectedResult": "The system sends a password reset link to the registered email address.",
      "priority": "Medium"
    }
  ]
}
```

## Output Format In The UI

The page normalizes generated test cases into this display structure:

- TC ID
- Test Scenario
- Objective
- Preconditions
- Test Procedure
- Expected Results
- Priority
- Category

CSV export includes:

- TC ID
- Test Scenario
- Objective
- Test Procedure
- Expected Results

## Error Handling

The API route handles common generation failures:

- Missing or invalid request payload
- Missing Gemini API key
- Invalid or unavailable Gemini model
- Gemini quota or rate limit errors
- Temporary Gemini 503/504 errors with retry
- Gemini responses that are not parseable JSON arrays

The frontend shows toast notifications and inline retry messages when generation, upload, copy, or export actions fail.

## Current Limitations

- PDF, DOC, and DOCX files are not parsed directly by the browser UI. Attach them only as context and paste the important requirement text into the input.
- Generated content should be reviewed by an SQA engineer before being used as approved test documentation.
- Library and history pages currently exist as separate module pages, but persistence for generated test cases is not implemented in the QA Genius module.

## Development Notes

- Keep UI changes in `src/modules/tools/qa-genius/pages/qa-genius-page.tsx`.
- Keep generation behavior and Gemini error handling in `src/app/api/tools/qa-genius/generate/route.ts`.
- The generator expects Gemini to return raw JSON only. The backend still cleans common markdown fences and extracts JSON array candidates as a defensive fallback.
- Maximum generated test cases are clamped between 1 and 20 on the server.

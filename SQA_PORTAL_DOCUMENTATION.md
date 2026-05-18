# SQA Portal System Documentation

## 1. System Overview

SQA Portal is a web-based Software Quality Assurance workspace built with Next.js, React, TypeScript, MongoDB, and AI-assisted testing tools. The system helps QA teams manage testing work, generate test cases, run automation checks, plan performance tests, and use SQA Copilot as an intelligent assistant for software testing workflows.

The portal is designed as a central platform for:

- Test automation project management
- RPA and automation workflow support
- AI-generated test case creation
- Performance testing preparation and execution
- QA support through SQA Copilot
- Admin user management and approval workflows
- Help, FAQ, tutorial, and support pages

## 2. Core Modules

### Dashboard

The dashboard provides quick access to the main SQA Portal areas, including tools, projects, testing workspaces, and system shortcuts.

### Project Management

The project area is used to organize QA work by project. It supports project catalog views, project workspaces, test-related information, and links to execution or automation activities.

### Testbeds

The testbed module manages testing environments. QA teams can use this area to organize environment details such as systems under test, URLs, and infrastructure notes.

### Tools Hub

The Tools Hub provides access to the main testing tools available in the portal:

- ORCA
- QA Genius
- QE Automation Hub
- Performance Testing

### Admin Module

The admin module supports administrative workflows such as user approval, reset handling, role visibility, and system management.

### Help and Support

The help area includes documentation-style pages, FAQ, tutorials, contact information, and SQA Copilot.

## 3. SQA Copilot

SQA Copilot is the AI assistant inside the portal. It helps users with software testing, QA workflows, automation planning, test case generation, performance testing guidance, debugging, and tool recommendations.

### Current SQA Copilot Capabilities

- Answer QA-related questions
- Explain testing concepts
- Suggest testing approaches
- Analyze pasted logs or requirements
- Accept uploaded files, images, text files, code files, PDFs, and audio files
- Recommend suitable portal tools based on the user request
- Provide floating permission prompts for tool navigation
- Ask the user for permission before opening a tool page
- Route explicit agentic testing requests to a backend agent workflow

### Tool Recommendation Bubbles

When SQA Copilot identifies that a user should use a specific tool, it shows a floating bubble below the AI reply.

Available bubbles:

- QA Genius
- QE Automation Hub
- Performance Test

The bubble does not automatically navigate. It asks for permission first. The user must click `Allow` before SQA Copilot opens the selected tool page.

This design keeps the user in control and prevents unexpected screen navigation.

## 4. Available Tools

### QA Genius

QA Genius is used to generate structured test cases from requirements.

Current capabilities:

- Generate test cases from requirement text
- Select test type and priority
- Configure the number of generated test cases
- Produce structured outputs with:
  - Test case ID
  - Title
  - Preconditions
  - Steps
  - Expected result
  - Priority
- Copy or export generated test cases

Typical use cases:

- Writing manual test cases
- Creating regression test scenarios
- Converting requirements into QA test coverage
- Preparing test documentation

### QE Automation Hub

QE Automation Hub supports automation testing workflows and Robot Framework execution support.

Current capabilities:

- Automation workspace access
- Robot Framework script support
- Basic website availability checks through backend automation
- Optional login-flow automation inputs
- Execution result summaries when Robot Framework is available on the machine

Typical use cases:

- Automation planning
- Robot Framework script execution
- Basic website health checks
- Automation project workflow support

### Performance Test

Performance Test supports JMeter-based performance testing workflows.

Current capabilities:

- JMeter test plan generation
- HTTP method and request configuration
- Virtual user, ramp-up, and duration configuration
- Performance result parsing when JMeter is installed
- Summary metrics such as:
  - Samples
  - Failures
  - Error rate
  - Average response time
  - P90, P95, and P99 response time
  - Throughput

Typical use cases:

- Load testing
- Stress testing
- Response time checks
- Throughput validation
- Performance report preparation

### ORCA

ORCA is positioned as a smart test orchestration area for future agent and swarm-based testing workflows.

Current capabilities:

- Tool workspace access
- Agent and orchestration concept pages
- Foundation for future autonomous testing coordination

## 5. Current Agentic AI MVP

The system now includes an early Agentic AI testing workflow through SQA Copilot.

When the user asks Copilot to perform agentic testing, run all tests, or do testing for a target URL, Copilot can route the request to a backend agent endpoint.

Current endpoint:

```text
POST /api/copilot/agent
```

### Current Agent Workflow

The MVP agent can coordinate approved backend actions only:

1. Generate test cases using QA Genius
2. Run a Robot Framework availability check using QE Automation Hub support
3. Run a JMeter performance test using Performance Test support, if JMeter is installed

Example user request:

```text
Use agentic AI to do all testing for http://127.0.0.1:3000/help/chat
```

Example result:

- QA Genius generates test cases
- Robot Framework checks whether the target page responds successfully
- JMeter attempts a performance test
- If JMeter is not installed, the system reports setup required instead of failing silently

### Current Agent Safety Rules

- The agent only uses whitelisted backend actions
- The agent does not execute arbitrary user commands
- The agent reports setup issues clearly
- The agent requires a valid HTTP or HTTPS target URL for live execution tools
- The user must grant permission before Copilot navigates to tool pages

## 6. System Requirements

### Runtime

- Node.js
- npm
- Next.js
- MongoDB
- Docker Desktop, recommended for local MongoDB

### Environment Variables

Required local environment values:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=sqa-portal
```

Optional QA Genius-specific values:

```env
QAGENIUS_GEMINI_API_KEY=
QAGENIUS_GEMINI_MODEL=
```

## 7. Local Startup Guide

Start Docker Desktop.

Start MongoDB:

```bash
docker start sqa-portal-mongo
```

If the MongoDB container does not exist yet:

```bash
docker run --name sqa-portal-mongo -p 27017:27017 -d mongo:7
```

Install dependencies:

```bash
npm install
```

Seed the database:

```bash
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

Open the system:

```text
http://localhost:3000
```

Check database status:

```text
http://localhost:3000/api/database/status
```

Expected response:

```json
{"status":"connected","database":"sqa-portal"}
```

## 8. Current Limitations

- Full browser control is not yet implemented.
- Tool navigation requires user permission through the floating bubble.
- Robot Framework execution requires Robot Framework to be installed and available on PATH.
- JMeter execution requires Apache JMeter to be installed and available on PATH.
- Agentic AI currently coordinates existing backend routes rather than performing complete autonomous browser control.
- Test execution results are returned in chat but are not yet stored as full historical agent runs.
- Advanced multi-step reasoning, retries, tool memory, and test evidence collection are planned future improvements.

## 9. Future Plan: Agentic AI for Full Automation

The future plan is to evolve SQA Copilot from an assistant into a controlled Agentic AI testing orchestrator.

### Phase 1: Agent Planning

Planned capabilities:

- Understand user testing goals
- Identify required test types
- Select suitable tools automatically
- Ask clarifying questions when the target, credentials, or test scope is missing
- Produce a test execution plan before running anything

### Phase 2: Permission-Based Tool Control

Planned capabilities:

- Ask user permission before opening tools
- Ask user permission before running tests
- Show clear action previews such as:
  - Tool to be opened
  - Target URL
  - Test type
  - Estimated execution steps
- Allow the user to approve or cancel each action

### Phase 3: Full Tool Orchestration

Planned capabilities:

- Generate test cases in QA Genius
- Convert selected test cases into automation scripts
- Run Robot Framework tests through QE Automation Hub
- Run JMeter tests through Performance Test
- Collect results from all tools
- Summarize pass/fail status
- Recommend next steps

### Phase 4: Browser and Screen Automation

Planned capabilities:

- Controlled browser automation after user approval
- Navigate to selected tools automatically
- Fill forms using user-approved data
- Trigger test generation or execution
- Capture screenshots and evidence
- Stop automation immediately if the user cancels

Important safety requirement:

The agent should never control the screen without explicit user permission.

### Phase 5: Test Evidence and Reporting

Planned capabilities:

- Store agent run history
- Save generated test cases
- Save Robot Framework output
- Save JMeter summaries
- Attach screenshots and logs
- Generate final QA execution reports
- Export reports as CSV, PDF, or Markdown

### Phase 6: Multi-Agent Testing

Planned capabilities:

- Separate specialist agents:
  - Test Case Agent
  - Automation Agent
  - Performance Agent
  - Defect Analysis Agent
  - Report Agent
- Coordinate agents through ORCA-style orchestration
- Run parallel testing workflows
- Merge results into one QA summary

## 10. Target Future Agentic Workflow

Example future user request:

```text
Test this login page completely: https://example.com/login
```

Expected future behavior:

1. SQA Copilot asks permission to plan testing.
2. SQA Copilot identifies required tests:
   - Functional login test cases
   - Negative login tests
   - Robot Framework automation
   - JMeter login performance test
3. SQA Copilot asks permission to open and control tools.
4. User clicks Allow.
5. SQA Copilot opens QA Genius and generates test cases.
6. SQA Copilot opens QE Automation Hub and runs automation checks.
7. SQA Copilot opens Performance Test and runs JMeter.
8. SQA Copilot collects results.
9. SQA Copilot produces a final report with:
   - Test cases generated
   - Automation results
   - Performance metrics
   - Risks found
   - Recommended next actions

## 11. Recommended Next Development Tasks

High-priority next steps:

- Add an agent approval modal before executing backend actions
- Store agent run history in MongoDB
- Add a visible Agent Run panel in SQA Copilot
- Add structured action cards for each tool execution
- Add JMeter installation/setup documentation
- Add Robot Framework setup documentation
- Add report export for agent results

Medium-priority next steps:

- Add tool-specific configuration forms in Copilot
- Add credentials handling with masking
- Add test run status updates
- Add screenshots and evidence upload
- Add retry and recovery logic

Long-term next steps:

- Add browser control with explicit approval
- Add multi-agent orchestration through ORCA
- Add CI/CD integration
- Add scheduled agent testing
- Add defect creation workflow

## 12. Summary

SQA Portal currently provides a strong foundation for AI-assisted software testing. The system includes SQA Copilot, QA Genius, QE Automation Hub, Performance Test, ORCA, project management, admin controls, and MongoDB-backed portal functionality.

The first Agentic AI MVP has been introduced through SQA Copilot. It can coordinate approved testing actions, generate test cases, run basic automation checks, and attempt performance testing when the required local tools are installed.

The future direction is to evolve SQA Copilot into a full permission-based testing agent that can plan, execute, monitor, and report on end-to-end QA workflows while keeping the user in control.

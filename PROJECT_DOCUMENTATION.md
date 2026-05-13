# QE Automation Hub

## Project Title

QE Automation Hub

## Project Description

QE Automation Hub is a modern web-based dashboard designed for quality engineering teams to manage test automation projects, RPA bots, execution schedules, results, and team collaboration from a single unified workspace.

---

## Table of Contents

1. Introduction
   - Purpose of the project
   - Objectives
2. System Overview
   - General description of the system
   - Key features
3. System Design / Architecture
   - Explanation of how the system works
   - Components and structure
4. Technical Documentation
   - Technologies used
   - Code structure
   - System workflow and data model
5. Installation Guide
   - Prerequisites
   - Step-by-step setup instructions
6. User Guide
   - How to use the system
   - Features explanation
7. Process / Workflow
   - How the system operates step-by-step
8. Conclusion
   - Summary of the project
   - Future improvements
9. Appendix
   - File structure summary
   - Route mapping
   - UI component references
   - Data model references

---

## 1. Introduction

### Purpose of the project

The purpose of QE Automation Hub is to provide a single interface for quality engineering professionals to manage, monitor, and execute test automation and robotic process automation workflows. It is built for distributed teams that need visibility into project status, execution results, schedules, and collaboration.

### Objectives

- Provide a modern dashboard for automation project management.
- Support both test automation and RPA project types.
- Offer navigation through projects, runs, schedules, and settings.
- Make it easy to review results and monitor automation health.
- Provide a reusable UI design with high usability.
- Enable developers to extend the platform easily with TypeScript and React.

---

## 2. System Overview

### General description of the system

QE Automation Hub is a Next.js application built with React, TypeScript, and MongoDB-backed API routes. It is structured around project management and reporting for quality engineering work.

The application presents a navigation sidebar, dashboard view, project listing, project detail pages with multiple tabs, run history, schedule calendar, and settings panel.

### Key features

- Dashboard overview with metrics, pass/fail trends, and activity.
- Project list with filtering, search, and status summaries.
- Project detail pages with tabs for overview, test cases, APIs, scripts, mobile, web, execution, results, files, discussion, and settings.
- Run history with run statistics and filtering options.
- Schedule page with a weekly view of upcoming automation runs.
- Settings page for workspace and user preferences.
- Help content with AI assistant, FAQ, tutorial, and contact links.
- Reusable Radix UI-based components for consistent design.
- MongoDB-backed authentication, users, roles, permissions, admin approvals, profile updates, email/password changes, and password reset requests.
- Mock data and local client-side project/tool handling still exist for workspace areas that have not been wired to MongoDB yet.

---

## 3. System Design / Architecture

### Explanation of how the system works

QE Automation Hub works as a browser-based frontend that renders different views based on route state. The routing system loads data for each page and renders content inside a top-level layout wrapper called `Shell`.

Every page is represented by a route definition under `src/routes`. The router maps URL paths to components and optionally provides loader and error components.

Typical user interactions include:

- Navigating between dashboard, projects, runs, schedule, help, and settings.
- Opening a project detail to view project-specific tabs.
- Switching tabs inside a project to see cases, APIs, scripts, mobile settings, etc.
- Triggering actions like run execution, schedule creation, or settings updates.

### Components and structure

The application structure is organized as:

- `src/app`: Active Next.js App Router URLs, layouts, and API routes.
- `src/modules`: Feature-owned implementation folders.
- `src/modules/projects`: Project pages and project workspace components.
- `src/modules/tools`: Tool-specific modules such as Orca, QA Genius, QE, and Performance.
- `src/modules/portal`: Portal modules such as admin, projects, testbeds, and tools.
- `src/shared/components/layout/Shell.tsx`: Main layout with persistent sidebar and profile menu.
- `src/shared/components/ui/*`: Reusable UI primitives built on Radix UI.
- `src/shared/lib/mock-data.ts`: Mock project data and sample object definitions.
- `src/shared/lib/user-projects.ts`: User project persistence and tab configuration.
- `src/shared/lib/notifications.ts`: Notification sample data.
- `src/shared/lib/utils.ts`: Utility functions and class name helpers.
- `src/shared/hooks/use-mobile.tsx`: Mobile viewport detection hook.
- `src/routes`, `src/router.tsx`, and `src/routeTree.gen.ts`: Legacy TanStack routing artifacts.
- `src/styles.css`: Global CSS and theme customizations.

### Architecture patterns

- Single-page application (SPA) with client-side routing.
- Modular component-based design with reusable UI building blocks.
- Separation of layout (`Shell`) from page content.
- Route-level data loading and error handling.
- Mock data used for demonstration, with infrastructure ready for backend integration.
- Local storage event tick mechanism for project tabs and persistence.
- Responsive UI that supports desktop and larger tablet layouts.

---

## 4. Technical Documentation

### Technologies used

- React 19
- TypeScript
- Next.js 15
- MongoDB
- Tailwind CSS v4
- Radix UI
- Recharts
- React Hook Form
- Zod
- Lucide React icons
- Prettier and ESLint

### Code structure (high-level explanation)

#### Root files

- `package.json`: Contains scripts, dependencies, and devDependencies.
- `next.config.mjs`: Next.js configuration.
- `tsconfig.json`: TypeScript configuration.
- `eslint.config.js`: ESLint rules.
- `README.md`: Project overview and commands.
- `Dockerfile`: Container build instructions.
- `vercel.json`: Deployment configuration.

#### Application entrypoints

- `src/app`: Active Next.js App Router route entrypoints.
- `src/app/api`: Active API route handlers.
- `src/router.tsx`: Legacy TanStack router configuration.
- `src/routeTree.gen.ts`: Legacy generated route tree.
- `src/styles.css`: Global CSS definitions and theme tokens.

#### Layout and navigation

- `src/shared/components/layout/Shell.tsx`: Sidebar navigation, help menu, profile menu, and layout wrapper.
- `src/shared/components/StatusBadge.tsx`: Reusable badge for status display.

#### UI primitives

- `src/shared/components/ui/*`: Shared UI components for forms, buttons, dialogs, navigation, tables, and more.

#### Project view components

- `src/app/projects/[projectId]/page.tsx`: Thin route entrypoint for project detail.
- `src/modules/projects/pages/project-detail-page.tsx`: Project detail page with tab switching and project data resolution.
- `src/modules/projects/components/OverviewTab.tsx`: Displays project metrics and trends.
- `src/modules/projects/components/CasesTab.tsx`: Manages test cases.
- `src/modules/projects/components/ApiTab.tsx`: Displays API endpoints and health.
- `src/modules/projects/components/MobileTab.tsx`: Mobile device and build management.
- `src/modules/projects/components/WebTab.tsx`: Web automation and suites.
- `src/modules/projects/components/ExecutionTab.tsx`: Execution history.
- `src/modules/projects/components/ResultsTab.tsx`: Detailed test results.
- `src/modules/projects/components/RpaTab.tsx`: RPA flow builder.
- `src/modules/projects/components/DiscussionTab.tsx`: Team collaboration.
- `src/modules/projects/components/SettingsTab.tsx`: Project-specific settings.
- `src/modules/projects/components/FilesTab.tsx`: File explorer for project assets.
- `src/modules/projects/components/CustomTabContent.tsx`: Placeholder content for dynamic tabs.

#### Routes

- `src/routes/__root.tsx`: Root route with layout wrapper.
- `src/routes/index.tsx`: Main dashboard route.
- `src/routes/projects.tsx`: Project list route.
- `src/routes/runs.tsx`: Runs history route.
- `src/routes/schedule.tsx`: Schedule route.
- `src/routes/settings.tsx`: Workspace settings route.
- `src/routes/help.*.tsx`: Help pages for chat, contact, FAQ, tutorial.
- `src/routes/notifications.tsx`: Notification center.
- `src/routes/profile.tsx`: User profile route.

### Database or system workflow

#### Data model overview

The current system uses MongoDB for core account and admin data. Project/tool workspace data is still partially backed by mock data or browser storage while feature APIs are being completed.

MongoDB collections include:

- `users`
- `roles`
- `permissions`
- `password_resets`
- `projects`
- `project_members`
- `tools`
- `project_tools`
- `files`
- `gallery_items`
- `forum_threads`
- `forum_messages`
- `meetings`
- `copilot_chats`
- `copilot_attachments`
- `sonarqube_configs`
- `sonarqube_scans`
- `sonarqube_issues`
- `audit_logs`

Workspace models include:

- Project
- Test Case
- Script
- RPA Flow
- Run Record
- API Endpoint
- Mobile Device
- Mobile Build
- Environment
- Test Suite
- Discussion Post

#### Request and state workflow

1. User navigates to a route.
2. The router loads any required data via route loaders.
3. The component renders using MongoDB-backed API data where available, and mock/local data for areas not yet wired.
4. UI state updates happen through API calls, React component state, or local storage depending on the feature area.
5. Actions such as switching tabs or opening dialogs update local UI state.

#### Typical project page workflow

- Load project from `mock-data.ts` or local user projects until the project APIs are wired to MongoDB.
- Determine enabled tabs for project type.
- Render the `Shell` around page content.
- Render tab navigation buttons.
- Render active tab component.
- Update page metadata and error handlers as needed.

---

## 5. Installation Guide

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- A code editor such as Visual Studio Code
- Git (optional) for cloning
- A modern browser for local development

### Setup instructions

#### 1. Clone repository

```bash
git clone <repository-url>
cd "QE Automation Hub"
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Configure environment

Create `.env.local` from `.env.example` and make sure MongoDB is running.

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=sqa-portal
GEMINI_API_KEY=
GEMINI_MODEL=
```

#### 4. Seed MongoDB

```bash
npm run db:seed
```

This creates the MongoDB collections, base roles, permissions, and the demo admin account.

#### 5. Run development server

```bash
npm run dev
```

Open the browser at the URL shown in the terminal, usually `http://localhost:3000`.

#### 6. Build for production

```bash
npm run build
```

#### 7. Run production build locally

```bash
npm run start
```

#### 8. Lint the code

```bash
npm run lint
```

#### 9. Format the codebase

```bash
npm run format
```

### Environment variables

This repository requires MongoDB for the current auth/admin flow. Store local secrets in `.env.local`.

### Deployment notes

- This app is compatible with Vercel deployment.
- Use `npm run build` to create production assets.
- Configure `MONGODB_URI`, `MONGODB_DB`, `GEMINI_API_KEY`, and `GEMINI_MODEL` in the deployment environment.

---

## 6. User Guide

### How to use the system

The system is designed for two main user roles:

- Quality engineer / automation owner
- Team member / viewer

#### Dashboard

The Dashboard is the entry point. It shows:

- Overview metrics
- Recent activity
- Trending success rates
- Quick links to active projects

Use the navigation sidebar to move between:

- Dashboard
- Projects
- Runs
- Schedule
- Settings
- Help

#### Projects

The Projects page lists available projects. For each project card, you can see:

- Project type (Test Automation or RPA)
- Project status and pass rate
- Number of cases and team members

Click a project to open its detail page.

#### Project Detail Tabs

Each project opens with a tabbed interface. The tabs typically include:

- Overview
- Test Cases
- API Testing
- Scripts
- Mobile
- Web & Suites
- Execution
- Results
- Files
- Discussion
- Settings

Switch tabs to inspect project data and take actions.

#### Runs

The Runs page shows a list of executions across all projects. It is useful to:

- Review historical runs
- Compare pass/fail numbers
- Identify recurring failures

#### Schedule

The Schedule page presents a weekly view of scheduled automation. It helps you:

- Monitor upcoming runs
- See which projects are scheduled
- Check next run countdowns

#### Settings

The Settings page allows workspace management:

- Update team roles
- Configure integrations
- Manage notification preferences
- Edit project defaults

#### Help section

Use the Help menu for:

- AI Assistant
- FAQ
- Tutorial
- Contact support

### Features explanation

#### Project Overview

In the Overview tab, you can see:

- Summary counters
- Success trend charts
- Recent runs
- Project activity feed

This tab is ideal for managers who need a high-level view.

#### Test Cases

In the Cases tab, you can review test cases by:

- Priority
- Status
- Last run date
- Linked scripts or APIs

This tab is ideal for test planners and execution coordinators.

#### API Testing

The API tab contains endpoints and recent health checks. It is valuable for API testers and back-end validation.

#### Scripts

The Scripts tab stores automation scripts, including sample content for frameworks such as Selenium, Cypress, Playwright, Robot Framework, Python, and JavaScript.

#### Mobile and Web

Mobile and Web tabs contain device management, build artifacts, and automation suite configuration.

#### Execution and Results

The Execution tab shows run history. The Results tab shows detailed outcomes, logs, and attachments.

#### RPA

The RPA tab is specific to robotic process automation workflows. Use it to view flows, schedules, and run status.

#### Discussion

The Discussion tab is for collaboration. Team members can post comments, link cases, or discuss results.

#### Files

The Files tab stores artifacts, screenshots, logs, and support documents.

#### Settings

Use Settings to control project and workspace options, including what tabs are enabled for a given project.

---

## 7. Process / Workflow

### System operation flow

The system operates in the following flow:

1. User opens the application.
2. The router determines the requested path.
3. Next.js pages and API routes fetch MongoDB, mock, or persisted data depending on the feature area.
4. The `Shell` wraps the page content with navigation.
5. The requested page content renders.
6. User interacts with UI controls.
7. Component state updates and UI re-renders.
8. Local storage updates may persist user project configuration.

### Project creation and management workflow

1. Open the Projects page.
2. Select a project card or create a new project entry.
3. Enter project metadata such as name, description, and type.
4. Configure tabs and workflow settings.
5. Use the Overview tab to validate metrics.
6. Add or update test cases, API endpoints, scripts, mobile devices, or RPA flows.
7. Schedule automation runs and track results.

### Execution workflow

1. From a project or runs page, choose an execution trigger.
2. Execute manually or review scheduled run details.
3. The run generates a record with pass, fail, and skipped counts.
4. Results are stored and displayed in the Results tab.
5. Use the Discussion tab to collaborate on failed or flaky cases.

### Scheduling workflow

1. Open the Schedule page.
2. Review the weekly calendar and next run details.
3. Identify projects with scheduled automations.
4. Adjust timing or settings as needed.
5. Confirm the schedule and monitor future run status.

### Collaboration workflow

1. Use the Help sidebar to access AI Assistant or FAQ.
2. Post discussion entries in the Discussion tab.
3. Link posts to specific test cases, APIs, or runs.
4. Share project progress with team members.
5. Update workspace settings for role-based access.

---

## 8. Conclusion

### Summary of the project

QE Automation Hub is a polished quality engineering interface for managing automation projects and results. It combines project tracking, execution history, RPA orchestration, API testing, and team collaboration under a modern, scalable interface.

### Future improvements

Potential future improvements include:

- Backend API integration for real data persistence.
- Authentication and role-based access control.
- Real-time updates and live notifications.
- Enhanced mobile/responsive support.
- Custom dashboard widgets and reporting.
- Exportable test reports and analytics.
- Integration with CI/CD systems and test runners.
- Built-in script editing and version control.

---

## 9. Appendix

### File structure summary

- `bunfig.toml`
- `Dockerfile`
- `package.json`
- `README.md`
- `tsconfig.json`
- `vite.config.ts`
- `vercel.json`
- `wrangler.jsonc`
- `src/router.tsx`
- `src/routeTree.gen.ts`
- `src/styles.css`
- `src/app/*`
- `src/modules/*`
- `src/shared/components/layout/Shell.tsx`
- `src/shared/components/StatusBadge.tsx`
- `src/modules/projects/components/*`
- `src/shared/components/ui/*`
- `src/shared/hooks/use-mobile.tsx`
- `src/shared/lib/*`
- `src/routes/*`

### Route mapping

- `/` — Dashboard
- `/projects` — Projects list
- `/projects/$projectId` — Project detail page with tabs
- `/runs` — Runs history
- `/schedule` — Schedule view
- `/settings` — Workspace settings
- `/help/chat` — AI Assistant
- `/help/faq` — FAQ page
- `/help/tutorial` — Tutorial page
- `/help/contact` — Contact page
- `/notifications` — Notification center
- `/profile` — User profile

### UI component reference

The app uses Radix UI primitives wrapped in local component files under `src/shared/components/ui`.

Common UI elements:

- Buttons
- Cards
- Alerts
- Dialogs
- Dropdown menus
- Forms and inputs
- Pagination
- Sidebar
- Tables
- Tabs
- Tooltips

### Data model references

#### Project object

- `id`
- `name`
- `description`
- `type`
- `color`
- `initials`
- `cases`
- `passRate`
- `lastRun`
- `members`
- `scripts`
- `flows`
- `testCases`
- `runs`
- `apis`
- `devices`
- `builds`
- `environments`
- `suites`
- `discussions`
- `flaky`
- `coverage`
- `trend`

#### Test case object

- `id`
- `title`
- `steps`
- `expected`
- `priority`
- `status`
- `lastRun`
- `durationMs`
- `tags`
- `linkedApi`
- `linkedScript`
- `attachments`

#### Run record object

- `id`
- `name`
- `date`
- `duration`
- `passed`
- `failed`
- `skipped`
- `trigger`

### Sample commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run db:seed`
- `npm run lint`
- `npm run format`

---

## Notes

This documentation is intended to serve both developers and end users with a complete overview of QE Automation Hub. It summarizes the current repository structure, user flows, and technical foundations.

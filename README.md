# 10xCards

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/wiktorpagacz/10x-project)
[![Version](https://img.shields.io/badge/version-0.0.1-blue)](https://github.com/wiktorpagacz/10x-project)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Table of Contents
- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description
10xCards is a web application that automates the creation of educational flashcards using artificial intelligence. By generating flashcards from user-supplied text (between 1,000 and 10,000 characters), the app reduces the time and effort required for manual flashcard creation. Integrated with a spaced repetition system, 10xCards enhances learning efficiency by allowing users to review, edit, and manage AI-generated flashcards, while also supporting manual creation for custom entries.

## Tech Stack
- **Frontend:**
  - Astro 5 – Modern web framework for fast, content-focused websites
  - React 19 – UI library for interactive components
  - TypeScript 5 – Enhances code quality with static typing
  - Tailwind CSS 4 – Utility-first CSS framework for styling
  - Shadcn/ui – Accessible and opinionated React component library

- **Backend:**
  - Supabase – PostgreSQL database and authentication

- **AI Integration:**
  - Openrouter.ai – Connects to various AI models (OpenAI, Anthropic, Google, etc.) for flashcard generation

- **CI/CD & Hosting:**
  - GitHub Actions – Continuous integration and delivery
  - DigitalOcean – Hosts the application using Docker

- **Testing:**
  - Vitest – Unit and integration testing framework
  - Playwright/Cypress – End-to-end (E2E) browser automation
  - Apache JMeter/k6 – Performance and load testing
  - Lighthouse – Frontend performance and accessibility audits
  - OWASP ZAP – Security vulnerability scanning
  - axe DevTools – Accessibility testing (WCAG 2.1 Level AA)
  - NVDA/JAWS – Screen reader testing

## Getting Started Locally

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/wiktorpagacz/10x-project.git
   cd 10x-project
   ```

2. **Set Node Version:**
   Ensure you are using Node v22.14.0 (as specified in `.nvmrc`):
   ```bash
   nvm use
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. **Build for Production:**
   ```bash
   npm run build
   ```

6. **Preview the Production Build:**
   ```bash
   npm run preview
   ```

## Available Scripts
- **`npm run dev`** – Starts the development server.
- **`npm run build`** – Compiles the project for production.
- **`npm run preview`** – Previews the production build locally.
- **`npm run lint`** – Runs ESLint to analyze code quality.
- **`npm run lint:fix`** – Automatically fixes fixable linting errors.
- **`npm run format`** – Formats the codebase using Prettier.

### Testing Scripts
- **`npm test`** – Runs unit tests in watch mode.
- **`npm run test:ui`** – Opens Vitest UI for interactive testing.
- **`npm run test:coverage`** – Generates code coverage report.
- **`npm run test:e2e`** – Runs end-to-end tests with Playwright.
- **`npm run test:e2e:ui`** – Opens Playwright UI for interactive E2E testing.
- **`npm run test:e2e:debug`** – Runs E2E tests in debug mode.
- **`npm run test:e2e:codegen`** – Records browser interactions to generate tests.

For complete testing documentation, see [TESTING.md](TESTING.md).

## Project Scope
The MVP of 10xCards includes:
- **Flashcard Generation via AI:** Automatically generating flashcards from text input.
- **User Management:** Registration, login, and password management.
- **Flashcard Review and Curation:** Options to accept, edit, or reject AI-suggested flashcards.
- **Manual Flashcard Creation:** Ability to add flashcards manually.
- **Flashcard Collection Management:** View, edit, delete, and search saved flashcards.
- **Spaced Repetition Integration:** Scheduling accepted flashcards for review based on an optimized algorithm.
- **Event Logging:** Tracking key system events for performance analysis.
- **Basic Security Measures:** Implementation of authentication, authorization, and input validation.

## Project Status
The project is currently in the MVP stage with core functionalities implemented. Future improvements will focus on enhanced flashcard types, more robust user interactions, and additional educational integrations.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

# Composite Actions

This directory contains reusable GitHub Actions that are shared across multiple workflows in this project.

## Available Actions

### 1. `setup-node-deps`
**Purpose:** Sets up Node.js environment and installs npm dependencies with caching.

**Usage:**
```yaml
- name: Setup Node.js and install dependencies
  uses: ./.github/actions/setup-node-deps
```

**What it does:**
- Reads Node.js version from `.nvmrc` file
- Sets up Node.js with npm cache
- Installs dependencies using `npm ci`

### 2. `run-linter`
**Purpose:** Runs ESLint to check code quality.

**Usage:**
```yaml
- name: Run linter
  uses: ./.github/actions/run-linter
```

**What it does:**
- Executes `npm run lint`
- Fails the workflow if linting errors are found

### 3. `run-unit-tests`
**Purpose:** Runs unit tests with coverage collection.

**Usage:**
```yaml
- name: Run unit tests
  uses: ./.github/actions/run-unit-tests
```

**What it does:**
- Executes `npm run test:coverage`
- Uploads coverage artifacts to GitHub Actions
- Artifacts are retained for 7 days

**Outputs:**
- `coverage-path`: Path to the coverage directory (`coverage/`)

## Benefits of Composite Actions

1. **Code Reusability:** Common steps are defined once and reused across multiple workflows
2. **Maintainability:** Changes to common steps only need to be made in one place
3. **Consistency:** Ensures all workflows use the same configuration for common tasks
4. **Readability:** Workflows are cleaner and easier to understand

## Used In

These composite actions are currently used in:
- `.github/workflows/pull-request.yml` - PR validation workflow
- `.github/workflows/master.yml` - Master branch CI workflow

## Adding New Actions

To add a new composite action:

1. Create a new directory under `.github/actions/`
2. Add an `action.yml` file with the action definition
3. Use `composite` as the `runs.using` value
4. Document the action in this README
5. Reference it in your workflows using `./.github/actions/your-action-name`

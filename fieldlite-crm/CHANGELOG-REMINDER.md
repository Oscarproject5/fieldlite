# Documentation Update Reminder System
## Keep Your Docs Fresh & Accurate

**Last Updated:** 2025-09-29
**Version:** 1.0.0

---

## Purpose

This file serves as a **central checkpoint** to ensure documentation stays synchronized with codebase changes. When you make significant changes, check this file to know what documentation needs updating.

---

## Quick Reference: What to Update When

### 🔧 When You Add a New Feature
**Update:**
- [ ] [plan.md](./plan.md) - Mark feature as completed in checklist
- [ ] [PRD.md](./PRD.md) - Update feature status or scope
- [ ] [codebase.md](./codebase.md) - Document new files, components, API routes
- [ ] [architecture.md](./architecture.md) - If it introduces new patterns or decisions

**Example:** Adding estimate generation feature
- Update plan.md: Check off "Estimates & proposal generation"
- Update codebase.md: Document estimate-related components and API routes
- Update PRD.md: Move from "In Development" to "Completed"

---

### 🗄️ When You Change the Database Schema
**Update:**
- [ ] [codebase.md](./codebase.md) - Update "Database Tables" section
- [ ] [architecture.md](./architecture.md) - If it affects data architecture
- [ ] [plan.md](./plan.md) - Note any schema migrations completed

**Example:** Adding `equipment` table
- Document new table structure in codebase.md
- Note equipment tracking feature progress in plan.md
- Update architecture.md if it introduces new multi-tenant patterns

---

### 🔌 When You Add a New API Route
**Update:**
- [ ] [codebase.md](./codebase.md) - Add to "API Routes" section
- [ ] [codebase.md](./codebase.md) - Update "Key Files & Components" if it's a major endpoint

**Example:** Adding `/api/estimates/create`
- Document endpoint, method, parameters in codebase.md
- Link to related components (estimate form, etc.)

---

### 🏗️ When You Refactor or Redesign
**Update:**
- [ ] [codebase.md](./codebase.md) - Update file locations and structure
- [ ] [architecture.md](./architecture.md) - Document new patterns or decisions
- [ ] [plan.md](./plan.md) - Note technical debt addressed

**Example:** Refactoring communication hub to use WebSockets
- Update architecture.md with new realtime architecture
- Update codebase.md with new component structure
- Add decision log entry in architecture.md

---

### 🔒 When You Change Authentication or Security
**Update:**
- [ ] [architecture.md](./architecture.md) - Update "Security Architecture" section
- [ ] [codebase.md](./codebase.md) - Document new auth patterns

**Example:** Adding OAuth with Google
- Document OAuth flow in architecture.md
- Update auth routes in codebase.md

---

### 🔗 When You Add External Integrations
**Update:**
- [ ] [architecture.md](./architecture.md) - Document integration architecture
- [ ] [codebase.md](./codebase.md) - Document API routes and components
- [ ] [PRD.md](./PRD.md) - Update feature status if it was planned

**Example:** Adding Stripe payment processing
- Document Stripe integration in architecture.md
- Add payment API routes to codebase.md
- Update PRD.md to mark payment processing as completed

---

### 📱 When You Add New Pages or Routes
**Update:**
- [ ] [codebase.md](./codebase.md) - Add to directory structure
- [ ] [plan.md](./plan.md) - Update navigation or feature checklist

**Example:** Adding `/reports/analytics` page
- Document in codebase.md directory structure
- Note analytics feature progress in plan.md

---

### 🎨 When You Change UI Components or Patterns
**Update:**
- [ ] [codebase.md](./codebase.md) - Document new component patterns
- [ ] [architecture.md](./architecture.md) - If it's a significant architectural change

**Example:** Switching from Radix Dialog to Headless UI Modal
- Update tech stack in architecture.md
- Update component documentation in codebase.md

---

### 🚀 When You Deploy Major Changes
**Update:**
- [ ] [plan.md](./plan.md) - Update sprint focus and completed tasks
- [ ] [CHANGELOG-REMINDER.md](./CHANGELOG-REMINDER.md) - Add entry to Recent Changes

**Example:** Deploying Phase 1 MVP
- Update all feature checkboxes in plan.md
- Note deployment in Recent Changes section below

---

## Documentation Update Checklist

Use this checklist whenever you complete a major change:

### Step 1: Identify What Changed
- [ ] New feature added?
- [ ] Database schema modified?
- [ ] New API route created?
- [ ] External integration added?
- [ ] Refactoring or redesign?
- [ ] Security or auth changes?

### Step 2: Update Relevant Docs
- [ ] [plan.md](./plan.md) - Updated?
- [ ] [PRD.md](./PRD.md) - Updated?
- [ ] [codebase.md](./codebase.md) - Updated?
- [ ] [architecture.md](./architecture.md) - Updated?
- [ ] [CHANGELOG-REMINDER.md](./CHANGELOG-REMINDER.md) - Entry added?

### Step 3: Update Timestamps
- [ ] Updated "Last Updated" date in modified docs
- [ ] Committed changes with clear message

### Step 4: Communication (If Team)
- [ ] Notified team of documentation updates
- [ ] Linked to docs in PR description

---

## Recent Changes Log

Track major changes and corresponding documentation updates here.

### 2025-09-29: Documentation System Created
**What Changed:**
- Created comprehensive documentation system
- Added plan.md, PRD.md, codebase.md, architecture.md, CHANGELOG-REMINDER.md

**Documentation Updated:**
- ✅ All initial documentation created
- ✅ Documentation system established

**Notes:**
- This is the baseline for all future documentation updates

---

### Template for Future Entries

```
### YYYY-MM-DD: Brief Description of Change
**What Changed:**
- Bullet point description of changes
- Include new features, refactors, integrations, etc.

**Documentation Updated:**
- ✅ plan.md - [specific section updated]
- ✅ codebase.md - [specific section updated]
- ✅ architecture.md - [specific section updated]
- ⏭️ PRD.md - [no update needed because...]

**Notes:**
- Any important context, decisions, or gotchas
- Link to PR or commit: #123

**Affected Sections:**
- [Link to specific section in docs that was updated]
```

---

## Automation Ideas (Future)

### Pre-Commit Hook
**Idea:** Check if significant files changed, remind developer to update docs

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if database schema changed
if git diff --cached --name-only | grep -q "supabase/migrations"; then
  echo "⚠️  Database schema changed!"
  echo "📝 Remember to update codebase.md (Database Tables section)"
  echo "📝 Consider updating architecture.md if data model changed"
  echo ""
fi

# Check if new API routes added
if git diff --cached --name-only | grep -q "app/api/.*route.ts"; then
  echo "⚠️  API routes changed!"
  echo "📝 Remember to update codebase.md (API Routes section)"
  echo ""
fi

# Check if package.json changed (new dependencies)
if git diff --cached --name-only | grep -q "package.json"; then
  echo "⚠️  Dependencies changed!"
  echo "📝 Consider updating architecture.md (Technology Choices)"
  echo ""
fi
```

### GitHub Action (Future)
**Idea:** Check if docs were updated in the same PR as code changes

```yaml
name: Documentation Check
on: pull_request

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Check if docs updated
        run: |
          # If code changed but docs didn't, post comment reminder
          if git diff --name-only origin/main | grep -q "app/\|components/\|lib/"; then
            if ! git diff --name-only origin/main | grep -q "\.md$"; then
              echo "::warning ::Code changed but no .md files updated. Did you forget to update docs?"
            fi
          fi
```

### Documentation Linter (Future)
**Idea:** Check for broken links, outdated dates, TODOs

```bash
# Example: Check for broken internal links
grep -r "\[.*\](\.\/.*\.md)" *.md | while read line; do
  file=$(echo $line | cut -d: -f1)
  link=$(echo $line | grep -o "(\.\/.*\.md)" | tr -d '()')
  if [ ! -f "$link" ]; then
    echo "❌ Broken link in $file: $link"
  fi
done
```

---

## Documentation Best Practices

### 1. Write Docs as You Code
**Don't wait until the end.** Update docs incrementally as you work.

**Why?**
- Fresh in your mind (you remember why you made decisions)
- Less overwhelming (small updates vs. massive doc overhaul)
- Easier for code reviewers to understand your changes

---

### 2. Use Clear, Descriptive Commit Messages
**Bad:** "Update docs"
**Good:** "docs: Add estimate generation API to codebase.md"

**Format:**
```
docs: Brief description of what was documented

- Updated codebase.md with estimate API routes
- Added estimate feature to plan.md checklist
- Documented estimate data model in codebase.md

Relates to: Feature/estimate-generation (#42)
```

---

### 3. Link Between Docs
**Create a web of documentation.** Link related sections across files.

**Example:**
```markdown
For more details on multi-tenancy, see [architecture.md - Multi-Tenancy](./architecture.md#multi-tenancy-strategy).
```

---

### 4. Keep It Scannable
**Use headings, lists, and tables.** Avoid walls of text.

**Good:**
```markdown
### Key Features
- Feature 1: Brief description
- Feature 2: Brief description
- Feature 3: Brief description
```

**Bad:**
```markdown
This system has many features including feature 1 which does X and feature 2 which does Y and also feature 3 that handles Z...
```

---

### 5. Include Code Examples
**Show, don't just tell.** Include relevant code snippets.

```markdown
### Example: Fetching Contacts

\```typescript
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', tenantId)
\```
```

---

### 6. Explain the "Why"
**Don't just document what the code does, explain why decisions were made.**

**Bad:** "We use Zustand for state management."
**Good:** "We use Zustand for state management because it has minimal boilerplate compared to Redux, works great with React Server Components, and is TypeScript-first."

---

### 7. Regular Reviews
**Schedule time to review docs.** At least monthly, check:
- Are there outdated sections?
- Are there broken links?
- Are there new features not documented?
- Are there questions in issues that docs should answer?

---

## FAQ

### Q: Do I need to update docs for every single code change?
**A:** No, only for **significant changes**:
- New features or major functionality
- Changes to data models or API contracts
- New external integrations
- Architectural changes or refactors
- New patterns or conventions

Small bug fixes, typo fixes, or minor UI tweaks don't need doc updates.

---

### Q: What if I'm not sure which doc to update?
**A:** Use this guide:
- **Big picture / product changes:** [PRD.md](./PRD.md)
- **Roadmap / sprint progress:** [plan.md](./plan.md)
- **Code structure / how to find things:** [codebase.md](./codebase.md)
- **Technical decisions / architecture:** [architecture.md](./architecture.md)
- **Track your update here:** [CHANGELOG-REMINDER.md](./CHANGELOG-REMINDER.md)

---

### Q: What if the docs get out of sync with code?
**A:** It happens! When you notice:
1. Open an issue titled "Docs out of sync: [area]"
2. Tag it with `documentation` label
3. Fix it as soon as possible (or assign to someone)
4. Consider why it happened and how to prevent it (automated checks?)

---

### Q: Should I update docs before or after merging PR?
**A:** **Before.** Documentation updates should be part of the PR.

**Why?**
- Reviewers can see the full context of your changes
- Ensures docs are never out of sync with code
- Documents are versioned with the code they describe

---

### Q: How detailed should documentation be?
**A:** Balance between **too sparse** and **too verbose.**

**Too sparse:** "Added estimates feature."
**Too verbose:** "The estimates feature uses a React component called EstimateForm which imports useState from React and uses a form with inputs for title, description, and line items. Each line item has..."

**Just right:** "Added estimate generation feature with EstimateForm component. See [codebase.md - Estimates](./codebase.md#estimates) for component details and API endpoints."

---

## Conclusion

**Good documentation is a gift to your future self** (and your teammates). It takes a few extra minutes now, but saves hours of confusion later.

### Remember:
- ✅ Update docs as you code, not after
- ✅ Use this checklist for every major change
- ✅ Link related documentation together
- ✅ Explain the "why", not just the "what"
- ✅ Keep docs scannable and easy to navigate

---

**Questions about documentation? Create an issue or reach out to the team!**
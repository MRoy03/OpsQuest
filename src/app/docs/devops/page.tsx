import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

// ── Boilerplate Code Constants ────────────────────────────────────────────────

const GIT_CONFIG = `[user]
  name  = Your Name
  email = you@company.com

[core]
  editor       = code --wait
  autocrlf     = input          # use 'true' on Windows
  excludesFile = ~/.gitignore_global

[pull]
  rebase = true                 # git pull = fetch + rebase (avoids merge commits)

[push]
  default = current             # push current branch to same-name remote

[alias]
  st   = status
  co   = checkout
  br   = branch -a
  lg   = log --oneline --graph --all --decorate
  undo = reset HEAD~1 --mixed
  save = stash push -m
  sync = pull --rebase --autostash

[init]
  defaultBranch = main

[merge]
  ff = no                       # always create a merge commit`

const GIT_GITIGNORE = `# Node.js / Next.js
node_modules/
.next/
dist/
build/
out/

# Environment / secrets — NEVER commit these
.env
.env.local
.env.*.local
*.pem
*.key
secrets.json

# Editor
.vscode/settings.json
.vscode/launch.json
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-error.log*
pnpm-debug.log*

# Testing
coverage/
.nyc_output/
*.lcov

# Terraform / IaC
*.tfstate
*.tfstate.backup
.terraform/
.terraform.lock.hcl
*.tfvars        # contains env-specific values
!example.tfvars # keep the template

# Docker
.dockerignore   # only if accidental double-add
docker-compose.override.yml

# OS
.DS_Store
desktop.ini`

const GITHUB_PR_TEMPLATE = `## Summary
<!-- One sentence: what does this PR do? -->

## Changes
- [ ] feat / fix / refactor / chore — delete others
- Bullet the specific changes made

## Testing
- [ ] Unit tests added / updated
- [ ] Manually tested in dev environment
- [ ] Screenshots attached (required for UI changes)

## Checklist
- [ ] Code follows project style conventions
- [ ] No secrets or credentials committed
- [ ] No debug console.log() remaining
- [ ] Documentation updated if needed
- [ ] Dependent PRs merged / listed below

## Related Issues
Closes #<issue-number>`

const GITHUB_CODEOWNERS = `# CODEOWNERS — auto-assign reviewers to PRs
# Pattern: glob  owner(s)  (GitHub username or @org/team)
# ─────────────────────────────────────────────────────────

# Global fallback — catches anything not matched below
*                        @org/engineering-lead

# Frontend
/src/app/                @org/frontend-team
/src/components/         @org/frontend-team

# API & Backend
/src/app/api/            @org/backend-team

# Infrastructure / CI / CD
/.github/                @org/devops
/terraform/              @org/devops
Dockerfile               @org/devops
docker-compose*.yml      @org/devops

# Docs
/docs/                   @org/docs-team
*.md                     @org/docs-team`

const GITLAB_PIPELINE = `stages:
  - build
  - test
  - deploy

variables:
  NODE_ENV:   production
  IMAGE_NAME: \$CI_REGISTRY_IMAGE:\$CI_COMMIT_SHORT_SHA

# ── Build ───────────────────────────────────────────────────────────────────
build:docker:
  stage: build
  image: docker:26
  services:
    - docker:26-dind
  before_script:
    - echo \$CI_REGISTRY_PASSWORD | docker login \$CI_REGISTRY -u \$CI_REGISTRY_USER --password-stdin
  script:
    - docker build -t \$IMAGE_NAME .
    - docker push \$IMAGE_NAME
  only:
    - main
    - /^release\\/.*/

# ── Test ────────────────────────────────────────────────────────────────────
test:unit:
  stage: test
  image: node:20-alpine
  cache:
    key: \$CI_COMMIT_REF_SLUG
    paths: [node_modules/]
  before_script:
    - npm ci --prefer-offline
  script:
    - npm run lint
    - npm test -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    expire_in: 1 week

# ── Deploy: Staging ─────────────────────────────────────────────────────────
deploy:staging:
  stage: deploy
  image: bitnami/kubectl:latest
  environment:
    name: staging
    url: https://staging.myapp.com
  before_script:
    - echo "\$KUBE_CONFIG" | base64 -d > /tmp/kubeconfig
    - export KUBECONFIG=/tmp/kubeconfig
  script:
    - kubectl set image deployment/myapp myapp=\$IMAGE_NAME -n staging
    - kubectl rollout status deployment/myapp -n staging
  only: [main]

# ── Deploy: Production (manual approval) ────────────────────────────────────
deploy:production:
  stage: deploy
  environment:
    name: production
    url: https://myapp.com
  when: manual
  only: [tags]
  script:
    - kubectl set image deployment/myapp myapp=\$IMAGE_NAME -n production
    - kubectl rollout status deployment/myapp -n production`

const GHA_NODEJS_CI = `name: CI — Build & Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test -- --ci --coverage

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_APP_URL: \${{ vars.NEXT_PUBLIC_APP_URL }}

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        if: always()
        with:
          token: \${{ secrets.CODECOV_TOKEN }}`

const GHA_DOCKER_PUSH = `name: Docker Build & Push (GHCR)

on:
  push:
    branches: [main]
    tags: ["v*.*.*"]

env:
  REGISTRY:   ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags & labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags:   \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to:   type=gha,mode=max`

const GHA_AZURE_DEPLOY = `name: Deploy to Azure Web App

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production     # requires manual approval in Settings → Environments

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install & Build
        run: |
          npm ci
          npm run build
        env:
          NEXT_PUBLIC_APP_URL: \${{ vars.NEXT_PUBLIC_APP_URL }}

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: \${{ secrets.AZURE_CREDENTIALS }}
          # Create service principal: az ad sp create-for-rbac --sdk-auth

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name:  my-azure-webapp-name
          slot-name: production
          package:   .

      - name: Azure logout
        if: always()
        run: az logout`

const GHA_TERRAFORM = `name: Terraform Plan & Apply

on:
  push:
    branches: [main]
    paths: ["terraform/**"]
  pull_request:
    paths: ["terraform/**"]

permissions:
  contents:      read
  pull-requests: write

jobs:
  terraform:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: terraform

    env:
      ARM_CLIENT_ID:       \${{ secrets.ARM_CLIENT_ID }}
      ARM_CLIENT_SECRET:   \${{ secrets.ARM_CLIENT_SECRET }}
      ARM_SUBSCRIPTION_ID: \${{ secrets.ARM_SUBSCRIPTION_ID }}
      ARM_TENANT_ID:       \${{ secrets.ARM_TENANT_ID }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "~1.8"

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format Check
        run: terraform fmt -check

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan

      - name: Terraform Apply (main branch only)
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply -auto-approve tfplan`

// ── Doc Data ──────────────────────────────────────────────────────────────────

const DEVOPS_DOCS = [
  {
    id: 'git',
    title: 'Git — Version Control Fundamentals',
    icon: '🌿',
    color: 'green',
    sections: [
      {
        heading: 'Core Daily Commands',
        steps: [
          'git clone <url>                                       — Clone a repository locally',
          'git status                                            — Show working tree & staged changes',
          'git add .                                             — Stage all changed files',
          'git add -p                                            — Stage changes interactively (patch mode)',
          'git commit -m "feat: add user auth"                  — Commit with conventional message',
          'git push origin main                                  — Push current branch to remote',
          'git pull --rebase origin main                        — Pull & rebase (avoids unnecessary merge commits)',
          'git fetch --all --prune                              — Fetch all remotes, remove stale branches',
        ],
      },
      {
        heading: 'Branching & Merging',
        steps: [
          'git checkout -b feature/OPS-123-add-auth             — Create & switch to new branch',
          'git branch -a                                         — List all local + remote branches',
          'git merge feature/my-feature --no-ff                 — Merge with a merge commit',
          'git rebase main                                       — Rebase current branch onto main',
          'git cherry-pick <sha>                                — Apply a specific commit to current branch',
          'git branch -d feature/my-feature                     — Delete local branch',
          'git push origin --delete feature/my-feature          — Delete remote branch',
          'git stash push -m "WIP: login form"                  — Stash uncommitted work with label',
          'git stash pop                                         — Restore latest stash',
        ],
      },
      {
        heading: 'Undoing Mistakes',
        steps: [
          'git restore --staged <file>                          — Unstage file (keep changes in working dir)',
          'git restore <file>                                   — Discard working dir changes for file',
          'git reset HEAD~1                                     — Undo last commit (keep changes staged)',
          'git reset --hard HEAD~1                              — Undo last commit and discard all changes',
          'git revert <sha>                                     — Safely undo a commit (creates new commit)',
          'git reflog                                           — See all recent HEAD movements — ultimate safety net',
          'git log --oneline --graph --all                      — Visual branch/commit history',
          'git diff HEAD                                        — Show all uncommitted changes vs HEAD',
        ],
      },
      {
        heading: 'Global .gitconfig Boilerplate',
        code: GIT_CONFIG,
      },
      {
        heading: 'Project .gitignore Boilerplate (Node.js / Next.js)',
        code: GIT_GITIGNORE,
      },
      {
        heading: 'Conventional Commit Message Format',
        items: [
          { label: 'feat:',             path: 'feat: add password reset email flow' },
          { label: 'fix:',              path: 'fix: resolve null pointer in user lookup' },
          { label: 'chore:',            path: 'chore: update dependencies to latest stable' },
          { label: 'docs:',             path: 'docs: add API endpoint documentation' },
          { label: 'refactor:',         path: 'refactor: extract auth middleware to own module' },
          { label: 'test:',             path: 'test: add unit tests for payment service' },
          { label: 'ci:',               path: 'ci: add GitHub Actions workflow for prod deploy' },
          { label: 'BREAKING CHANGE:',  path: 'feat!: redesign user API — update all clients before upgrading' },
        ],
      },
      {
        heading: 'Troubleshooting Common Git Errors',
        steps: [
          '"Permission denied (publickey)": ssh-keygen -t ed25519 -C "you@email.com" → add ~/.ssh/id_ed25519.pub to GitHub Settings → SSH Keys',
          '"Failed to push: tip of your branch is behind": git pull --rebase origin main → resolve conflicts → git push',
          '"CONFLICT — both modified: file.txt": open file → resolve <<<<< markers → git add file.txt → git rebase --continue',
          '"Detached HEAD state": git checkout main to return to a branch',
          '"Large file rejected by remote": git reset HEAD~1 → add file to .gitignore → commit → push (or use git-lfs for large binaries)',
          'Wrong user committing: git config user.email "correct@email.com" → git commit --amend --reset-author',
        ],
      },
    ],
  },
  {
    id: 'github',
    title: 'GitHub — Repository Management & Collaboration',
    icon: '🐙',
    color: 'purple',
    sections: [
      {
        heading: 'Repository Setup Checklist',
        steps: [
          'Create repo → Initialize with README + .gitignore (choose language template) + License',
          'Settings → Branches → Add rule: require PR reviews, require status checks before merge, block force-push',
          'Settings → Secrets → Actions: add CI/CD secrets (AZURE_CREDENTIALS, CODECOV_TOKEN, etc.)',
          'Add .github/CODEOWNERS → auto-assigns reviewers based on file paths',
          'Add .github/pull_request_template.md → enforces consistent PR descriptions',
          'Settings → Actions → General → Workflow permissions → Read and write (for automated PRs)',
          'Settings → Pages: enable GitHub Pages for hosting documentation (optional)',
        ],
      },
      {
        heading: 'GitHub CLI (gh) Essential Commands',
        steps: [
          'gh auth login                                         — Authenticate with your GitHub account',
          'gh repo clone owner/repo                             — Clone a repository',
          'gh pr create --fill                                  — Create PR (auto-fills title/body from commits)',
          'gh pr list                                           — List all open pull requests',
          'gh pr checkout 42                                    — Check out PR #42 locally for review',
          'gh pr merge 42 --squash --delete-branch             — Squash-merge PR and delete source branch',
          'gh issue create --title "Bug: ..." --label bug      — Create a new issue',
          'gh release create v1.2.0 --generate-notes           — Create release with auto-generated changelog',
          'gh workflow run deploy.yml -f environment=staging    — Manually trigger a workflow with input',
        ],
      },
      {
        heading: 'Pull Request Template (.github/pull_request_template.md)',
        code: GITHUB_PR_TEMPLATE,
      },
      {
        heading: 'CODEOWNERS File (.github/CODEOWNERS)',
        code: GITHUB_CODEOWNERS,
      },
      {
        heading: 'Branch Naming Convention',
        items: [
          { label: 'Feature',          path: 'feature/OPS-123-add-user-auth' },
          { label: 'Bug Fix',          path: 'fix/OPS-456-null-pointer-in-login' },
          { label: 'Hotfix (prod)',     path: 'hotfix/critical-payment-processing-bug' },
          { label: 'Release',          path: 'release/v2.1.0' },
          { label: 'Chore / Deps',     path: 'chore/update-node-20-dependencies' },
          { label: 'Docs',             path: 'docs/update-api-reference-guide' },
        ],
      },
      {
        heading: 'Troubleshooting GitHub Issues',
        steps: [
          'Actions not triggering on push: check .github/workflows/ exists, YAML is valid (lint with actionlint), branch name matches "branches:" list exactly',
          'Required status check blocking merge: Settings → Branches → required check name must EXACTLY match the workflow job id (case-sensitive)',
          'GITHUB_TOKEN cannot write packages: Settings → Actions → General → Workflow permissions → Read and write',
          'GitHub Pages not updating: Actions tab → Pages Build → check errors; verify branch/folder in Settings → Pages',
          'Secret not found in workflow: secret names are case-sensitive; secrets set at org level need "Inherited" flag; cannot start with GITHUB_',
          'gh CLI "403 Forbidden": run gh auth logout then gh auth login --scopes repo,read:org',
        ],
      },
    ],
  },
  {
    id: 'gitlab',
    title: 'GitLab — CI/CD & DevSecOps Platform',
    icon: '🦊',
    color: 'amber',
    sections: [
      {
        heading: 'GitLab CI/CD Core Concepts',
        content: 'GitLab CI/CD is driven by .gitlab-ci.yml at the repo root. Pipelines have stages → jobs. Variables live in Settings → CI/CD → Variables (masked for secrets). Runners execute jobs — use shared GitLab-hosted runners or register your own. Environments enable review apps and protected deployments with approval gates.',
      },
      {
        heading: 'Node.js App Pipeline Boilerplate (.gitlab-ci.yml)',
        code: GITLAB_PIPELINE,
      },
      {
        heading: 'Merge Request Workflow',
        steps: [
          'git push origin feature/my-feature → GitLab shows "Create Merge Request" button automatically',
          'Set MR target branch (main), Assignees, Reviewers, Milestone, and Labels',
          'Enable "Delete source branch when MR is accepted" in the MR options',
          'Add "closes #123" in description → linked issue auto-closes on merge',
          'Settings → Merge Requests → Squash commits on merge (recommended for clean history)',
          'Required checks: pipeline passes + code owner approval + no unresolved threads',
          'Use "Draft:" prefix in MR title to prevent accidental early merge',
        ],
      },
      {
        heading: 'CI/CD Variables & Secrets',
        items: [
          { label: 'Group-level secret',   path: 'Group → Settings → CI/CD → Variables → Add Variable (masked = true)' },
          { label: 'Project-level secret', path: 'Project → Settings → CI/CD → Variables → Add Variable (type: File for kubeconfig/certs)' },
          { label: 'Use in job',           path: 'script:\n  - echo $MY_SECRET_VAR   # set in Settings, never in .gitlab-ci.yml' },
          { label: 'GitLab Registry login', path: 'docker login $CI_REGISTRY -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD' },
          { label: 'Predefined CI vars',   path: '$CI_COMMIT_SHA  $CI_COMMIT_REF_NAME  $CI_PIPELINE_ID  $CI_PROJECT_PATH' },
        ],
      },
      {
        heading: 'Self-Hosted Runner Setup',
        steps: [
          'Admin → CI/CD → Runners → New instance runner → Copy registration token',
          'gitlab-runner register --url https://gitlab.com --token <TOKEN> --executor docker --docker-image alpine',
          'gitlab-runner install && gitlab-runner start   — Install and start as a system service',
          'Add tags to runner (linux, docker, prod) → reference in .gitlab-ci.yml with: tags: [linux, docker]',
          'gitlab-runner verify                           — Check connectivity and health of all registered runners',
          'gitlab-runner list                             — List all registered runners on this host',
        ],
      },
      {
        heading: 'Troubleshooting GitLab CI',
        steps: [
          'Pipeline "pending" forever: no runner matches job tags → Settings → CI/CD → Runners → check runner tags',
          'Docker-in-Docker (dind) fails: add services: [docker:26-dind] and set DOCKER_TLS_CERTDIR: "" in variables',
          '"Image not found": check registry URL correctness, docker login called in before_script, tag exists',
          'Artifacts not available in next stage: add artifacts: paths: [dist/] in the producing job',
          '"Variable not found": check masked/protected settings match job requirements (protected vars only available on protected branches)',
          '"deploy: manual" job blocked: environment requires Maintainer+ approval — check Settings → CI/CD → Environments → Protected environments',
        ],
      },
    ],
  },
  {
    id: 'github-actions',
    title: 'GitHub Actions CI/CD',
    icon: '⚡',
    color: 'cyan',
    sections: [
      {
        heading: 'Workflow Anatomy & Key Concepts',
        content: 'Workflows live in .github/workflows/*.yml. They trigger on events (push, pull_request, schedule, workflow_dispatch). A workflow contains jobs; each job runs on a runner (ubuntu-latest by default). Jobs have steps that either use pre-built Actions (uses:) or run shell commands (run:). Secrets inject via ${{ secrets.NAME }}. Variables (non-secret config) inject via ${{ vars.NAME }}.',
      },
      {
        heading: 'Trigger Types Reference',
        items: [
          { label: 'Push to branch',      path: 'on:\n  push:\n    branches: [main, develop]' },
          { label: 'Pull Request',         path: 'on:\n  pull_request:\n    branches: [main]\n    types: [opened, synchronize, reopened]' },
          { label: 'Manual dispatch',      path: 'on:\n  workflow_dispatch:\n    inputs:\n      environment:\n        type: choice\n        options: [staging, production]\n        required: true' },
          { label: 'Scheduled (cron)',     path: 'on:\n  schedule:\n    - cron: "0 2 * * 1"  # Every Monday at 2am UTC' },
          { label: 'Tag push',             path: 'on:\n  push:\n    tags: ["v*.*.*"]' },
          { label: 'Called from another',  path: 'on:\n  workflow_call:\n    inputs:\n      environment:\n        type: string' },
        ],
      },
      {
        heading: 'Node.js / Next.js CI Pipeline Boilerplate',
        code: GHA_NODEJS_CI,
      },
      {
        heading: 'Docker Build & Push to GHCR Boilerplate',
        code: GHA_DOCKER_PUSH,
      },
      {
        heading: 'Deploy to Azure Web App Boilerplate',
        code: GHA_AZURE_DEPLOY,
      },
      {
        heading: 'Terraform Plan & Apply Boilerplate',
        code: GHA_TERRAFORM,
      },
      {
        heading: 'Secrets & Variables Best Practices',
        steps: [
          'Secrets: Settings → Secrets → Actions → New — use for passwords, tokens, private keys (never shown again)',
          'Variables: Settings → Variables → Actions → New — use for non-sensitive config like API URLs, app names',
          'Environment secrets: Settings → Environments → production → Add secret — scoped to that environment only',
          'Organization secrets: can be shared across repos (granular access control available)',
          'GITHUB_TOKEN: auto-created per run — scope it with permissions: { contents: read, packages: write } etc.',
          'Never use ${{ secrets.X }} in run: directly where it could be logged — pass via env: block instead',
        ],
      },
      {
        heading: 'Troubleshooting GitHub Actions',
        steps: [
          'Workflow not triggering: check .github/workflows/ folder exists, YAML is valid, branch name matches on.push.branches exactly',
          'Secret not available: names are case-sensitive; cannot start with GITHUB_; check repo vs org scope',
          'GITHUB_TOKEN write permissions: Settings → Actions → General → Workflow permissions → Read and write',
          'Docker push 403: log in first with docker/login-action; IMAGE_NAME must be lowercase',
          'Cache miss every run: ensure cache key includes lock file hash — key: ${{ hashFiles("**/package-lock.json") }}',
          'azure/login fails: AZURE_CREDENTIALS must be valid service principal JSON; create with: az ad sp create-for-rbac --sdk-auth --role Contributor',
          'Self-hosted runner offline: check runner status on machine, restart service: sudo ./svc.sh start',
        ],
      },
    ],
  },
  {
    id: 'docker',
    title: 'Docker & Containers',
    icon: '🐳',
    color: 'cyan',
    sections: [
      {
        heading: 'Essential Docker Commands',
        steps: [
          'docker build -t myapp:1.0 .                          — Build image from Dockerfile',
          'docker run -d -p 8080:80 --name mycontainer myapp:1.0  — Run container in background',
          'docker ps / docker ps -a                             — List running / all containers',
          'docker logs mycontainer -f                           — Stream container logs',
          'docker exec -it mycontainer bash                     — Get shell inside container',
          'docker stop mycontainer && docker rm mycontainer     — Stop and remove container',
          'docker image prune -a                                — Remove unused images',
          'docker-compose up -d / docker-compose down           — Start/stop compose services',
        ],
      },
      {
        heading: 'Troubleshooting Container Issues',
        steps: [
          'Container exits immediately: docker logs <container> — Check for startup errors',
          'Port already in use: lsof -i :8080 or netstat -tulpn | grep 8080 → kill conflicting process',
          'Out of disk space: docker system prune -af — Remove all unused containers, images, networks',
          'Container cannot reach internet: check docker network and DNS: --dns 8.8.8.8',
          'Permission denied on volume: use correct UID in Dockerfile or chown the directory',
          'Image pull fails: docker login registry.domain.com — Authenticate first',
        ],
      },
      {
        heading: 'Dockerfile Best Practices',
        steps: [
          'Use specific base image tags: FROM node:20-alpine3.18 (not :latest)',
          'Layer order: COPY package.json → RUN npm install → COPY . . (for cache efficiency)',
          'Run as non-root user: RUN adduser --disabled-password appuser && USER appuser',
          'Use .dockerignore to exclude node_modules, .git, .env files',
          'Multi-stage build: FROM node:20 AS builder ... FROM node:20-alpine (smaller final image)',
          'Set WORKDIR early: WORKDIR /app (avoid relative path confusion)',
        ],
      },
    ],
  },
  {
    id: 'kubernetes',
    title: 'Kubernetes / AKS (Azure Kubernetes Service)',
    icon: '☸️',
    color: 'purple',
    sections: [
      {
        heading: 'Essential kubectl Commands',
        steps: [
          'kubectl get pods -n <namespace> -o wide              — List pods with node/IP info',
          'kubectl describe pod <podname> -n <ns>               — Full pod details and events',
          'kubectl logs <podname> -n <ns> -f --previous         — Stream logs (--previous for crashed)',
          'kubectl exec -it <pod> -n <ns> -- bash               — Shell into running pod',
          'kubectl apply -f deployment.yaml                     — Apply manifest file',
          'kubectl rollout restart deployment/<name> -n <ns>    — Rolling restart deployment',
          'kubectl get events -n <ns> --sort-by=.metadata.creationTimestamp — Recent cluster events',
          'kubectl top nodes / kubectl top pods                 — Resource usage overview',
        ],
      },
      {
        heading: 'Troubleshooting: Pod CrashLoopBackOff',
        steps: [
          'kubectl describe pod <podname> → check Events section for reason',
          'kubectl logs <podname> --previous → see logs from last crashed instance',
          'Common causes: wrong environment variable/config, missing secret, failing liveness probe',
          'Check resource limits: if OOMKilled → increase memory limit in deployment spec',
          'Check init containers: kubectl describe pod → InitContainers section',
          'If image pull error: verify image name/tag and imagePullSecret is configured correctly',
        ],
      },
      {
        heading: 'AKS-Specific Tasks',
        items: [
          { label: 'Scale Node Pool', path: 'az aks nodepool scale --cluster-name myaks -g myRG --name nodepool1 --node-count 5' },
          { label: 'Get Credentials', path: 'az aks get-credentials --resource-group myRG --name myAKS' },
          { label: 'Enable AGIC (Ingress)', path: 'Portal: AKS → Networking → HTTP application routing / Azure Application Gateway Ingress → Enable' },
          { label: 'View Node Health', path: 'Portal → AKS → Node pools → Select pool → Health tab' },
          { label: 'Enable ACR Integration', path: 'az aks update -n myAKS -g myRG --attach-acr myACR' },
        ],
      },
    ],
  },
  {
    id: 'terraform',
    title: 'Terraform / Infrastructure as Code',
    icon: '🏗️',
    color: 'green',
    sections: [
      {
        heading: 'Core Terraform Workflow',
        steps: [
          'terraform init          — Download providers and initialize backend',
          'terraform plan          — Preview changes (what will be created/modified/destroyed)',
          'terraform apply         — Apply infrastructure changes (confirm with "yes")',
          'terraform destroy       — Destroy ALL managed resources (use carefully!)',
          'terraform state list    — List resources in state file',
          'terraform import        — Import existing resource into state',
          'terraform output        — Show output values from the current state',
        ],
      },
      {
        heading: 'Best Practices',
        steps: [
          'Always run "terraform plan" before "apply" — review changes carefully',
          'Use remote state (Azure Storage, Terraform Cloud, S3) — never commit .tfstate to git',
          'Use workspaces or folder-per-environment for dev/staging/prod separation',
          'Lock provider versions: required_providers { azurerm = { version = "~> 3.85" } }',
          'Use terraform.tfvars for environment-specific variables — add to .gitignore',
          'Tag all resources with standard tags: environment, owner, cost-center, project',
          'Use modules for reusable components (VNet, VM, AKS)',
        ],
      },
      {
        heading: 'Troubleshooting Terraform Errors',
        steps: [
          'Error: Insufficient permissions → Check the service principal/identity has Contributor or Owner role',
          'State lock error → another process is running; use terraform force-unlock <lockId> if stale',
          'Resource already exists → import it: terraform import azurerm_resource_group.rg /subscriptions/xxx/resourceGroups/myRG',
          'Cycle error → circular dependency detected; use explicit depends_on to break the cycle',
          'Provider not found → run terraform init again to download updated providers',
        ],
      },
    ],
  },
  {
    id: 'monitoring',
    title: 'Production Monitoring & Observability',
    icon: '📈',
    color: 'green',
    sections: [
      {
        heading: 'Monitoring Stack Overview',
        content: 'Modern observability follows the three pillars: Metrics (Prometheus/Azure Monitor), Logs (Log Analytics/ELK/Loki), Traces (Application Insights/Jaeger/OpenTelemetry). Dashboards (Grafana/Azure Dashboards). Alerts route to PagerDuty/OpsGenie/Teams.',
      },
      {
        heading: 'Prometheus + Grafana (Common Setup)',
        steps: [
          'helm install prometheus prometheus-community/kube-prometheus-stack',
          'kubectl port-forward svc/prometheus-grafana 3000:80 → login admin/prom-operator',
          'Add AlertManager rules: create PrometheusRule CRD with alert expressions and thresholds',
          'Key alerts to configure: NodeNotReady, PodCrashLoopBackOff, HighCPUUsage, DiskSpaceLow, ErrorRateHigh',
          'Use recording rules for expensive queries: precompute aggregations for dashboard efficiency',
        ],
      },
      {
        heading: 'Incident Response Workflow',
        steps: [
          'Alert fires → On-call engineer acknowledges in PagerDuty/OpsGenie',
          'Open dashboard → Check Grafana/Azure Monitor for the affected service metrics',
          'Check logs: kubectl logs / Log Analytics KQL query to find error pattern',
          'Identify blast radius: which users/services are affected?',
          'Mitigation first: rollback deployment, scale up, failover to healthy region',
          'Root cause analysis (RCA): after incident, document timeline, cause, and prevention actions',
          'Update runbook with new findings to reduce MTTR for future incidents',
        ],
      },
    ],
  },
]

export default function DevOpsPage() {
  return (
    <>
      <TopBar title="Cloud Infrastructure & DevOps" subtitle="Git, GitHub, GitLab, GitHub Actions, Docker, Kubernetes, Terraform — engineering reference" />
      <div className="page-content grid-bg">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={DEVOPS_DOCS} />
        </div>
      </div>
    </>
  )
}

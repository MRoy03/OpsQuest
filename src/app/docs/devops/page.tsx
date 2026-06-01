import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

const DEVOPS_DOCS = [
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
    id: 'github-actions',
    title: 'GitHub Actions CI/CD',
    icon: '⚡',
    color: 'amber',
    sections: [
      {
        heading: 'Key Concepts',
        content: 'GitHub Actions automates build, test, and deploy workflows. Workflows are YAML files in .github/workflows/. Triggers: push, pull_request, schedule, workflow_dispatch. Runners: GitHub-hosted (ubuntu-latest) or self-hosted. Secrets stored in repo/org Settings → Secrets.',
      },
      {
        heading: 'Common Workflow Patterns',
        items: [
          { label: 'Build & Test on PR', path: 'on: pull_request → jobs: test → steps: checkout, setup-node, npm install, npm test' },
          { label: 'Deploy to Azure (Web App)', path: 'on: push (main) → azure/login → azure/webapps-deploy → publish-profile secret' },
          { label: 'Build & Push Docker to ACR', path: 'docker/login-action → docker/build-push-action → image: myacr.azurecr.io/myapp:${{ github.sha }}' },
          { label: 'Terraform Apply', path: 'hashicorp/setup-terraform → terraform init → terraform plan → terraform apply -auto-approve' },
          { label: 'Environment Approvals', path: 'Settings → Environments → + New environment → Add required reviewers → Reference in workflow: environment: production' },
        ],
      },
      {
        heading: 'Troubleshooting: Workflow Failing',
        steps: [
          'Click the failing job in the Actions tab — expand each step to find the error',
          'Authentication errors: verify secrets are set correctly (Settings → Secrets → Actions)',
          'Permission errors on GITHUB_TOKEN: workflow permissions → set write permissions in Settings → Actions',
          'Docker push fails: verify ACR credentials, check if ACR admin is enabled or service principal is used',
          'Self-hosted runner offline: check runner machine, run ./run.sh or restart service',
          'Flaky tests: use retry logic or isolate the test; check for race conditions in parallel jobs',
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
          'Deploy Prometheus with helm: helm install prometheus prometheus-community/kube-prometheus-stack',
          'Access Grafana: kubectl port-forward svc/prometheus-grafana 3000:80 → login admin/prom-operator',
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
      <TopBar title="Cloud Infrastructure & DevOps" subtitle="Docker, Kubernetes, Terraform, CI/CD, Monitoring — engineering reference" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={DEVOPS_DOCS} />
        </div>
      </div>
    </>
  )
}

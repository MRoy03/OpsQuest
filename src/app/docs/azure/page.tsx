import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

const AZURE_DOCS = [
  {
    id: 'azure-vms',
    title: 'Azure Virtual Machines',
    url: 'portal.azure.com → Virtual machines',
    icon: '🖥️',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'Azure Virtual Machines (IaaS) give full control over the OS, storage, and networking. You are billed per second for compute when a VM is running; deallocating stops billing for compute. Key operations include start/stop/deallocate, resize, snapshot, disk management, and extensions.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'List All VMs', path: 'portal.azure.com → Virtual machines → All VMs in subscription' },
          { label: 'Start / Stop / Restart VM', path: 'Virtual machines → Select VM → Overview → Start / Stop / Restart buttons' },
          { label: 'Deallocate VM (stop compute billing)', path: 'Virtual machines → Select VM → Overview → Stop (this deallocates and releases the compute host)' },
          { label: 'Resize VM (change SKU)', path: 'Virtual machines → Select VM → Settings → Size → Select new size → Resize (VM will restart)' },
          { label: 'Create OS Disk Snapshot', path: 'Virtual machines → Select VM → Disks → Click OS disk name → + Create snapshot → Set name and type' },
          { label: 'Attach New Data Disk', path: 'Virtual machines → Select VM → Disks → + Create and attach a new disk → Set size, SKU → Save' },
          { label: 'Detach Data Disk', path: 'Virtual machines → Select VM → Disks → Click detach icon next to data disk → Save' },
          { label: 'Run Command on VM', path: 'Virtual machines → Select VM → Operations → Run command → RunPowerShellScript (Windows) or RunShellScript (Linux)' },
          { label: 'Reset Admin Password', path: 'Virtual machines → Select VM → Support + troubleshooting → Reset password → Enter new credentials' },
          { label: 'Enable Boot Diagnostics', path: 'Virtual machines → Select VM → Diagnostics → Boot diagnostics → Enable with managed storage → Save' },
          { label: 'View Boot Diagnostics Screenshot', path: 'Virtual machines → Select VM → Support + troubleshooting → Boot diagnostics → View screenshot' },
          { label: 'Serial Console Access', path: 'Virtual machines → Select VM → Support + troubleshooting → Serial console → Connect' },
          { label: 'Enable Auto-Shutdown Schedule', path: 'Virtual machines → Select VM → Operations → Auto-shutdown → Enable → Set time and notification email' },
        ],
      },
      {
        heading: 'Start, Stop & Deallocate via Azure CLI',
        steps: [
          'az vm start --resource-group MyRG --name MyVM — Start a stopped/deallocated VM',
          'az vm stop --resource-group MyRG --name MyVM — Stop and deallocate VM (stops compute billing)',
          'az vm restart --resource-group MyRG --name MyVM — Graceful restart',
          'az vm deallocate --resource-group MyRG --name MyVM — Explicit deallocate (equivalent to portal Stop)',
          'az vm list --resource-group MyRG --query "[].{Name:name, State:powerState}" --output table -- List VMs and their power states',
          'az vm list-sizes --location eastus --output table — Show all available VM SKUs in a region',
          'az vm resize --resource-group MyRG --name MyVM --size Standard_D4s_v5 — Resize to new SKU',
          'az vm show --resource-group MyRG --name MyVM --query "hardwareProfile.vmSize" --output tsv — Check current VM size',
        ],
      },
      {
        heading: 'Disk Management & Snapshots',
        steps: [
          'az snapshot create --resource-group MyRG --name MyOSDiskSnap --source /subscriptions/<sub-id>/resourceGroups/MyRG/providers/Microsoft.Compute/disks/MyVM_OsDisk — Create snapshot',
          'az disk create --resource-group MyRG --name RestoredOsDisk --source MyOSDiskSnap --location eastus — Create new disk from snapshot',
          'az vm disk attach --resource-group MyRG --vm-name MyVM --name MyDataDisk --size-gb 256 --sku Premium_LRS --new — Attach new 256 GiB Premium SSD',
          'az vm disk detach --resource-group MyRG --vm-name MyVM --name MyDataDisk — Detach data disk',
          'az disk update --resource-group MyRG --name MyDisk --size-gb 512 — Expand disk size online (data disk) or offline (OS disk)',
          'After OS disk expand on Windows: Disk Management → right-click C: → Extend Volume → Finish',
          'After OS disk expand on Linux: sudo growpart /dev/sda 1 && sudo resize2fs /dev/sda1 — Extend partition and filesystem',
          "az disk list --resource-group MyRG --query \"[?diskState=='Unattached'].{Name:name, SizeGB:diskSizeGb}\" --output table — Find orphaned (unattached) disks to save cost",
        ],
      },
      {
        heading: 'VM Extensions',
        steps: [
          'az vm extension set --resource-group MyRG --vm-name MyVM --name CustomScriptExtension --publisher Microsoft.Compute --version 1.10 --settings \'{"fileUris":["https://stor.blob.core.windows.net/scripts/setup.sh"],"commandToExecute":"bash setup.sh"}\' — Run custom script on VM',
          'az vm extension set --resource-group MyRG --vm-name MyVM --name MicrosoftMonitoringAgent --publisher Microsoft.EnterpriseCloud.Monitoring --settings \'{"workspaceId":"<wsId>"}\' --protected-settings \'{"workspaceKey":"<wsKey>"}\' — Install Log Analytics agent (MMA)',
          'az vm extension set --resource-group MyRG --vm-name MyVM --name AzureMonitorWindowsAgent --publisher Microsoft.Azure.Monitor — Install Azure Monitor Agent (AMA) on Windows',
          'az vm extension list --resource-group MyRG --vm-name MyVM --output table — List all installed extensions',
          'az vm extension delete --resource-group MyRG --vm-name MyVM --name CustomScriptExtension — Remove an extension',
        ],
      },
      {
        heading: 'Troubleshooting: VM Not Starting / RDP-SSH Failure',
        steps: [
          'Check VM status in portal: Virtual machines → Select VM → Overview → Status (Running, Stopped, Failed)',
          'Review Activity Log for recent errors: Virtual machines → Select VM → Activity log → Filter by "Failed" status',
          'Enable Boot Diagnostics and view screenshot for OS-level errors at startup',
          'Use Serial Console for emergency console-level access without network: Support + troubleshooting → Serial console',
          'For RDP issues (port 3389): verify NSG inbound rule allows TCP 3389 from your IP, check public IP is assigned',
          'For SSH issues (port 22): verify NSG allows TCP 22, check SSH key pair, try az vm repair create for offline disk repair',
          'az vm redeploy --resource-group MyRG --name MyVM — Move VM to new physical host (fixes platform-level failures)',
          'az vm boot-diagnostics get-boot-log --resource-group MyRG --name MyVM — Download boot log text',
          'Use Azure Bastion for browser-based RDP/SSH without exposing public ports: Bastion → Connect to VM',
        ],
      },
    ],
  },
  {
    id: 'azure-networking',
    title: 'Azure Networking',
    url: 'portal.azure.com → Virtual networks / NSGs / Load balancers',
    icon: '🌐',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content:
          'Azure networking covers Virtual Networks (VNets), Network Security Groups (NSGs), VNet Peering, Load Balancers, Application Gateway (with WAF), VPN Gateway (S2S/P2S), and Private Endpoints. Proper networking design is foundational to security and performance in Azure.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create Virtual Network', path: 'Virtual networks → + Create → Set name, region, address space (e.g. 10.0.0.0/16) → Add subnets' },
          { label: 'Add Subnet to VNet', path: 'Virtual networks → Select VNet → Subnets → + Subnet → Name, address range (e.g. 10.0.1.0/24)' },
          { label: 'Create NSG', path: 'Network security groups → + Create → Select RG and region' },
          { label: 'Add NSG Inbound Rule', path: 'Network security groups → Select NSG → Inbound security rules → + Add → Source, destination, port, protocol, action, priority' },
          { label: 'Associate NSG to Subnet', path: 'Network security groups → Select NSG → Subnets → + Associate → Select VNet and subnet' },
          { label: 'View Effective Security Rules on VM', path: 'Virtual machines → Select VM → Networking → Effective security rules' },
          { label: 'Configure VNet Peering', path: 'Virtual networks → Select VNet → Peerings → + Add → Enter remote VNet ID, enable Allow forwarded traffic → Add' },
          { label: 'Create Public Load Balancer', path: 'Load balancers → + Create → Standard tier → Frontend IP → Backend pool (VMs) → Health probe → LB rule → Create' },
          { label: 'Create Application Gateway', path: 'Application gateways → + Create → Tier (Standard v2 / WAF v2) → Frontend (public IP) → Backend pool → HTTP settings → Listener → Routing rule' },
          { label: 'Create VPN Gateway', path: 'Virtual network gateways → + Create → Type: VPN → SKU (VpnGw1+) → Select VNet → Create public IP → Create (takes ~45 min)' },
          { label: 'Create Private Endpoint', path: 'Private endpoints → + Create → Select resource type → Target sub-resource → VNet/subnet → DNS integration → Create' },
          { label: 'Enable NSG Flow Logs', path: 'Network Watcher → NSG flow logs → Select NSG → Enable → Choose storage account and retention → Save' },
          { label: 'Run IP Flow Verify', path: 'Network Watcher → IP flow verify → Select VM, direction, source/dest IP, port, protocol → Check' },
        ],
      },
      {
        heading: 'NSG Rules via CLI',
        steps: [
          'az network nsg create --resource-group MyRG --name MyNSG --location eastus — Create NSG',
          'az network nsg rule create --resource-group MyRG --nsg-name MyNSG --name AllowRDP --priority 100 --protocol Tcp --destination-port-range 3389 --source-address-prefix <your-IP>/32 --access Allow --direction Inbound — Allow RDP from specific IP',
          'az network nsg rule create --resource-group MyRG --nsg-name MyNSG --name AllowHTTPS --priority 110 --protocol Tcp --destination-port-range 443 --access Allow --direction Inbound — Allow HTTPS',
          'az network nsg rule create --resource-group MyRG --nsg-name MyNSG --name DenyAllInbound --priority 4000 --access Deny --direction Inbound --protocol "*" --source-address-prefix "*" --destination-port-range "*" — Default deny-all',
          'az network nsg rule list --resource-group MyRG --nsg-name MyNSG --output table — List all rules',
          'az network vnet subnet update --resource-group MyRG --vnet-name MyVNet --name MySubnet --network-security-group MyNSG — Associate NSG to subnet',
        ],
      },
      {
        heading: 'VNet Peering & VPN Gateway',
        steps: [
          'az network vnet peering create --resource-group MyRG --name VNet1ToVNet2 --vnet-name VNet1 --remote-vnet VNet2 --allow-vnet-access --allow-forwarded-traffic — Create peering from VNet1 to VNet2',
          'az network vnet peering create --resource-group MyRG --name VNet2ToVNet1 --vnet-name VNet2 --remote-vnet VNet1 --allow-vnet-access --allow-forwarded-traffic — Create reverse peering (required)',
          'Verify both peering states show "Connected" before routing traffic between VNets',
          'az network vnet-gateway create --resource-group MyRG --name MyVpnGW --location eastus --vnet MyVNet --gateway-type Vpn --vpn-type RouteBased --sku VpnGw1 --public-ip-address MyGWPIP — Create VPN Gateway',
          'az network local-gateway create --resource-group MyRG --name OnPremGW --location eastus --gateway-ip-address <on-prem-public-ip> --address-prefixes 192.168.0.0/24 — Define on-premises network gateway',
          'az network vpn-connection create --resource-group MyRG --name AzureToOnPrem --vnet-gateway1 MyVpnGW --local-gateway2 OnPremGW --shared-key <SharedKey123> — Create S2S VPN connection',
          'az network vpn-connection show --resource-group MyRG --name AzureToOnPrem --query "connectionStatus" --output tsv — Check VPN connection status',
        ],
      },
      {
        heading: 'Private Endpoints & DNS',
        steps: [
          'az network private-endpoint create --resource-group MyRG --name MyPE --vnet-name MyVNet --subnet PrivateSnet --private-connection-resource-id /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.Sql/servers/MySqlServer --group-id sqlServer --connection-name MyPEConn — Create private endpoint for SQL Server',
          'az network private-dns zone create --resource-group MyRG --name "privatelink.database.windows.net" — Create Private DNS Zone',
          'az network private-dns link vnet create --resource-group MyRG --zone-name "privatelink.database.windows.net" --name MyDNSLink --virtual-network MyVNet --registration-enabled false — Link DNS zone to VNet',
          'az network private-endpoint dns-zone-group create --resource-group MyRG --endpoint-name MyPE --name MyZoneGroup --private-dns-zone "privatelink.database.windows.net" --zone-name sqlZone — Auto-register PE IP in DNS zone',
          'Test resolution from VM: nslookup mysqlserver.database.windows.net — should return a 10.x.x.x private IP, not a public IP',
        ],
      },
      {
        heading: 'Troubleshooting: Connectivity Issues',
        steps: [
          'Check effective NSG rules first: Virtual machines → Networking → Effective security rules — see combined NIC + subnet NSG rules',
          'Use IP Flow Verify: Network Watcher → IP flow verify → enter source VM, direction, source/dest IP and port → confirms Allow or Deny with rule name',
          'Use Next Hop: Network Watcher → Next hop → find routing path for specific traffic',
          'az network watcher show-next-hop --resource-group MyRG --vm MyVM --source-ip 10.0.0.4 --dest-ip 10.1.0.4 — CLI next hop check',
          'Peering not working: verify "Allow forwarded traffic" is enabled on both sides, check address spaces do not overlap',
          'VPN tunnel down: check shared key matches on both sides, verify on-premises firewall allows IKE/IPSec (UDP 500, 4500)',
          'Enable NSG Flow Logs and Traffic Analytics to visualize actual traffic patterns and denied flows',
        ],
      },
    ],
  },
  {
    id: 'azure-aad',
    title: 'Azure Active Directory / Microsoft Entra ID',
    url: 'entra.microsoft.com  |  portal.azure.com → Microsoft Entra ID',
    icon: '🔐',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'Microsoft Entra ID (formerly Azure Active Directory) is the cloud identity and access management service. It manages users, groups, application registrations, conditional access policies, Privileged Identity Management (PIM), and MFA. It integrates with all Azure services, Microsoft 365, and thousands of third-party SaaS apps via SAML, OIDC, and OAuth 2.0.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create New User', path: 'Entra ID → Users → + New user → Create new user → Display name, UPN, auto-generate password → Create' },
          { label: 'Bulk Create Users (CSV)', path: 'Entra ID → Users → Bulk operations → Bulk create → Download CSV template → Fill and upload' },
          { label: 'Create Security Group', path: 'Entra ID → Groups → + New group → Security → Assigned membership → Add members → Create' },
          { label: 'Create Dynamic Group', path: 'Entra ID → Groups → + New group → Security → Dynamic User → + Add dynamic query (e.g. department Equals Engineering)' },
          { label: 'Assign Azure RBAC Role to User', path: 'Subscription or Resource Group → Access control (IAM) → + Add role assignment → Select role → Select user or group → Review + assign' },
          { label: 'Register Application (OAuth/OIDC)', path: 'Entra ID → App registrations → + New registration → Name, supported account types, redirect URI → Register' },
          { label: 'Create Client Secret for App', path: 'App registrations → Select app → Certificates & secrets → Client secrets → + New client secret → Set expiry → Save value immediately' },
          { label: 'Configure Conditional Access Policy', path: 'Entra ID → Security → Conditional Access → + New policy → Assignments (users, apps) → Conditions → Grant → Session → Create' },
          { label: 'Enable / Configure PIM', path: 'Entra ID → Identity Governance → Privileged Identity Management → Azure AD roles → Manage → Settings → Require MFA and justification' },
          { label: 'Enable Self-Service Password Reset', path: 'Entra ID → Users → Password reset → Properties → Enable SSPR → All or Selected → Save' },
          { label: 'View Sign-in Logs', path: 'Entra ID → Monitoring & health → Sign-in logs → Filter by user, date, status, app' },
          { label: 'View Audit Logs', path: 'Entra ID → Monitoring & health → Audit logs → Filter by Service, Activity, Target' },
          { label: 'Reset User MFA Registration', path: 'Entra ID → Users → Select user → Authentication methods → Require re-register multifactor authentication' },
        ],
      },
      {
        heading: 'User & Group Management CLI',
        steps: [
          'az ad user create --display-name "Jane Smith" --user-principal-name janesmith@contoso.com --password TempP@ss123 --force-change-password-next-sign-in true — Create user',
          'az ad user show --id janesmith@contoso.com --query "{UPN:userPrincipalName, AccountEnabled:accountEnabled, ObjectId:id}" --output json — Show user details',
          'az ad user update --id janesmith@contoso.com --account-enabled false — Disable user account',
          'az ad user delete --id janesmith@contoso.com — Delete user (goes to deleted users, recoverable for 30 days)',
          'az ad group create --display-name "DevOpsTeam" --mail-nickname "DevOpsTeam" — Create security group',
          'az ad group member add --group DevOpsTeam --member-id <user-object-id> — Add user to group',
          'az ad group member list --group DevOpsTeam --output table — List group members',
          'az role assignment create --assignee janesmith@contoso.com --role "Contributor" --scope /subscriptions/<sub-id>/resourceGroups/MyRG — Grant Contributor RBAC on a resource group',
          'az role assignment list --assignee janesmith@contoso.com --output table — List all RBAC assignments for user',
        ],
      },
      {
        heading: 'App Registrations & Service Principals',
        steps: [
          'az ad app create --display-name "MyServiceApp" --sign-in-audience AzureADMyOrg — Register application in Entra ID',
          'az ad sp create --id <app-id> — Create service principal associated with the app',
          'az ad app credential reset --id <app-id> --append --years 2 — Generate new client secret (valid 2 years — copy the password from output immediately)',
          'az ad sp credential list --id <sp-object-id> --output table — List service principal credentials and expiry dates',
          'az role assignment create --assignee <sp-object-id> --role "Storage Blob Data Contributor" --scope /subscriptions/<sub-id>/resourceGroups/MyRG/providers/Microsoft.Storage/storageAccounts/myaccount — Assign specific resource role to SP',
          'az ad app permission add --id <app-id> --api 00000003-0000-0000-c000-000000000000 --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope — Add Microsoft Graph User.Read permission',
          'az ad app permission admin-consent --id <app-id> — Grant admin consent for API permissions',
        ],
      },
      {
        heading: 'Conditional Access & PIM Setup',
        steps: [
          'Navigate to Entra ID → Security → Conditional Access → + New policy',
          'Assignments → Users: target specific users, groups, or roles (exclude break-glass accounts)',
          'Target resources: All cloud apps OR specific apps (e.g., Azure Portal, Salesforce)',
          'Conditions → Locations: exclude trusted IPs (e.g., corporate network ranges)',
          'Conditions → Device platforms: restrict to Windows/iOS/Android if needed',
          'Conditions → Sign-in risk: require MFA if risk is Medium or High',
          'Grant: "Require multifactor authentication" AND "Require device to be marked as compliant"',
          'Session: Sign-in frequency every 8 hours, persistent browser session for managed devices',
          'Enable PIM for Global Admin: PIM → Azure AD roles → Global Administrator → Settings → Require MFA, require justification, set max activation to 4 hours',
          'PIM activation by users: PIM → My roles → Eligible assignments → Activate → MFA + reason',
        ],
      },
      {
        heading: 'Troubleshooting: Sign-in & Access Issues',
        steps: [
          'Check sign-in logs: Entra ID → Sign-in logs → Filter by user → Expand failed entry → Failure reason + error code',
          'AADSTS50076: MFA required — user must complete MFA setup at aka.ms/mfasetup or admin resets via Authentication methods',
          'AADSTS50105: User not assigned to app role — Enterprise Applications → App → Users and groups → + Add user/group',
          'AADSTS53003: Conditional Access policy blocking — review "Applied conditional access policies" on the sign-in log entry',
          'AADSTS700016: Application not found in tenant — verify App Registration exists and correct tenant is selected',
          'For guest/B2B access: verify invitation was accepted, account is in active state, guest is added to required groups',
          'az ad user show --id user@contoso.com --query "accountEnabled" --output tsv — Confirm account is enabled',
          'Check license assignment: Entra ID → Users → Select user → Licenses — ensure required licenses are assigned',
        ],
      },
    ],
  },
  {
    id: 'azure-appservice',
    title: 'Azure App Service',
    url: 'portal.azure.com → App Services',
    icon: '🌍',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content:
          'Azure App Service is a fully managed PaaS for hosting web apps, REST APIs, and mobile backends. Supports .NET, Node.js, Java, Python, PHP, Ruby, and Docker containers. Key features: zero-downtime deployment slots, custom domains, free managed SSL, auto-scale rules, application settings (env vars), and built-in CI/CD from GitHub/Azure DevOps.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create Web App', path: 'App Services → + Create → Web App → Subscription, RG, name, runtime stack, OS, region → App Service Plan (SKU) → Review + create' },
          { label: 'Create Deployment Slot', path: 'App Services → Select app → Deployment → Deployment slots → + Add slot → Name (e.g. staging) → Clone settings from production → Add' },
          { label: 'Swap Deployment Slots', path: 'App Services → Select app → Deployment slots → Swap → Source: staging, Target: production → Review changes → Swap' },
          { label: 'Add Custom Domain', path: 'App Services → Select app → Custom domains → + Add custom domain → Enter domain → Validate CNAME/A record → Add' },
          { label: 'Add SSL Certificate (Managed, Free)', path: 'App Services → Select app → Certificates → + Add certificate → Create App Service Managed Certificate → Select hostname → Validate → Create' },
          { label: 'Bind SSL to Custom Domain', path: 'App Services → Select app → Custom domains → Select hostname → Add binding → Select certificate → SNI SSL → Add' },
          { label: 'Enforce HTTPS Only', path: 'App Services → Select app → Custom domains → HTTPS Only → On' },
          { label: 'Configure Auto-Scale Rules', path: 'App Services → Select app → Scale out (App Service plan) → Custom autoscale → Add rule → Metric (CPU%), threshold, scale action' },
          { label: 'Set Application Settings (Env Vars)', path: 'App Services → Select app → Environment variables → App settings → + Add → Name, Value → Apply' },
          { label: 'Set Slot-Specific Settings', path: 'App Services → Select app → Environment variables → App settings → Edit setting → Check "Deployment slot setting" → Apply' },
          { label: 'View Live Log Stream', path: 'App Services → Select app → Monitoring → Log stream → Real-time application logs' },
          { label: 'Enable Application Insights', path: 'App Services → Select app → Settings → Application Insights → Turn on → Select/create AI resource → Apply' },
        ],
      },
      {
        heading: 'Create & Deploy Web App via CLI',
        steps: [
          'az group create --name MyAppRG --location eastus — Create resource group',
          'az appservice plan create --name MyAppPlan --resource-group MyAppRG --sku P1v3 --is-linux -- Create Linux Premium v3 App Service Plan',
          'az webapp create --resource-group MyAppRG --plan MyAppPlan --name my-unique-webapp-name --runtime "NODE:20-lts" — Create Node.js 20 web app',
          'az webapp deployment source config-zip --resource-group MyAppRG --name my-unique-webapp-name --src ./app.zip — Deploy zip package',
          'az webapp config appsettings set --resource-group MyAppRG --name my-unique-webapp-name --settings NODE_ENV=production API_BASE_URL=https://api.contoso.com — Set env vars',
          'az webapp log tail --resource-group MyAppRG --name my-unique-webapp-name — Stream live logs to terminal',
          'az webapp restart --resource-group MyAppRG --name my-unique-webapp-name — Restart app',
          'az webapp show --resource-group MyAppRG --name my-unique-webapp-name --query "defaultHostName" --output tsv — Get app URL',
        ],
      },
      {
        heading: 'Deployment Slots Workflow',
        steps: [
          'az webapp deployment slot create --resource-group MyAppRG --name my-unique-webapp-name --slot staging --configuration-source my-unique-webapp-name — Create staging slot cloned from production',
          'Deploy and test new version to staging: https://my-unique-webapp-name-staging.azurewebsites.net',
          'Ensure slot-specific settings (DB connection, API keys) are set as "Deployment slot settings" so they do NOT swap',
          'az webapp deployment slot swap --resource-group MyAppRG --name my-unique-webapp-name --slot staging --target-slot production — Zero-downtime swap to production',
          'If issues arise: run the swap command again to revert (old production is in staging, ready to swap back)',
          'Warm-up tip: enable Application Initialization in Configuration → General settings to warm up staging before swap',
        ],
      },
      {
        heading: 'Custom Domain & SSL',
        steps: [
          'Get verification ID: App Services → Select app → Custom domains → Custom Domain Verification ID — copy this value',
          'At your DNS provider: add CNAME record: app.contoso.com → my-unique-webapp-name.azurewebsites.net',
          'At your DNS provider: add TXT record: asuid.app.contoso.com → <verification ID from portal>',
          'az webapp config hostname add --resource-group MyAppRG --webapp-name my-unique-webapp-name --hostname app.contoso.com — Add domain via CLI',
          'Add free managed certificate: Certificates → + Add certificate → Create App Service Managed Certificate → Select app.contoso.com → Create',
          'Bind cert to domain: Custom domains → app.contoso.com → Add binding → Select managed certificate → SNI SSL → Add',
          'Enforce HTTPS: Custom domains → HTTPS Only → On',
          'For wildcard SSL: import a PFX cert (Certificates → Import) and bind to *.contoso.com — requires Standard tier or above',
        ],
      },
      {
        heading: 'Troubleshooting: App Errors & Performance',
        steps: [
          'Check live log stream: App Services → Monitoring → Log stream — watch for 5xx errors and stack traces in real time',
          'Enable detailed error logging: Configuration → General settings → Detailed error messages: On, Failed request tracing: On',
          'Check App Service Plan resource usage: App Service Plan → Metrics → CPU percentage, Memory percentage — is plan undersized?',
          'Identify slow requests: Application Insights → Performance → Slowest operations → Drill into specific traces',
          'Kudu advanced debugging console: App Services → Advanced Tools → Go → Debug console → CMD → browse /home/LogFiles/',
          'Common 503 causes: app stopped, App Service Plan quota hit (Free/Shared has CPU limits), app crashing on startup',
          'az webapp log download --resource-group MyAppRG --name my-unique-webapp-name — Download log bundle as zip',
          'Check health check failures: App Services → Monitoring → Health check → Verify endpoint returns 200 within 2 minutes',
        ],
      },
    ],
  },
  {
    id: 'azure-sql',
    title: 'Azure SQL Database',
    url: 'portal.azure.com → SQL databases',
    icon: '🗄️',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'Azure SQL Database is a fully managed PaaS relational database built on SQL Server. Two purchasing models: DTU (bundled compute + storage, simpler pricing) and vCore (independent compute/storage scaling, required for Serverless, Hyperscale, and Elastic Pools). Automated backups (7–35 day retention), geo-replication, auto-failover groups, and Advanced Threat Protection are built-in.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create SQL Server & Database', path: 'SQL databases → + Create → Select subscription, RG → Create new server (name, admin login, region) → Set DB name, compute + storage tier → Review + create' },
          { label: 'Configure Server Firewall Rules', path: 'SQL servers → Select server → Security → Networking → Firewall rules → + Add client IP or + Add firewall rule → Save' },
          { label: 'Allow Azure Services Access', path: 'SQL servers → Select server → Security → Networking → Allow Azure services and resources to access this server → On → Save' },
          { label: 'View Query Performance Insight', path: 'SQL databases → Select DB → Intelligent Performance → Query Performance Insight → Top resource consuming queries' },
          { label: 'Enable Automatic Tuning', path: 'SQL databases → Select DB → Intelligent Performance → Automatic tuning → Enable: CREATE INDEX, DROP INDEX, FORCE LAST GOOD PLAN' },
          { label: 'Restore Database to Point in Time', path: 'SQL databases → Select DB → Overview → Restore → Select point in time → Set target server and DB name → Review + create' },
          { label: 'Configure Long-Term Backup Retention', path: 'SQL servers → Select server → Data management → Backups → Retention policies → Select DB → Set weekly/monthly/yearly LTR periods' },
          { label: 'Create Read Replica (Geo-Replication)', path: 'SQL databases → Select DB → Data management → Replicas → + Create replica → Select target region and server → Create' },
          { label: 'Create Auto-Failover Group', path: 'SQL servers → Select server → Data management → Failover groups → + Add group → Name, secondary server, add DBs → Create' },
          { label: 'Scale vCores or DTUs', path: 'SQL databases → Select DB → Compute + storage → Change tier, service objective, or vCores → Apply' },
          { label: 'Query Editor (Portal)', path: 'SQL databases → Select DB → Query editor (preview) → Login with SQL auth or AD auth → Run queries' },
          { label: 'Enable Microsoft Defender for SQL', path: 'SQL servers → Select server → Security → Microsoft Defender for SQL → Enable → Configure storage and email alerts' },
        ],
      },
      {
        heading: 'Create SQL Database via CLI',
        steps: [
          'az sql server create --resource-group MyRG --name myuniquesqlsrv --location eastus --admin-user sqladmin --admin-password SecureP@ss123! — Create logical SQL server',
          'az sql db create --resource-group MyRG --server myuniquesqlsrv --name MyDB --edition GeneralPurpose --family Gen5 --capacity 4 --compute-model Provisioned --backup-storage-redundancy Geo — Create 4-vCore General Purpose DB with geo-redundant backups',
          'az sql db create --resource-group MyRG --server myuniquesqlsrv --name MyDB --service-objective S3 — Create DTU-based Standard S3 database (100 DTUs)',
          'az sql db create --resource-group MyRG --server myuniquesqlsrv --name MyServerlessDB --edition GeneralPurpose --family Gen5 --capacity 4 --compute-model Serverless --auto-pause-delay 60 -- Create serverless DB (auto-pauses after 60 min idle)',
          'az sql server firewall-rule create --resource-group MyRG --server myuniquesqlsrv --name AllowMyIP --start-ip-address 203.0.113.10 --end-ip-address 203.0.113.10 — Allow specific client IP',
          'az sql db show --resource-group MyRG --server myuniquesqlsrv --name MyDB --query "{status:status, sku:sku, currentSku:currentSku}" -- Show DB status and current SKU',
        ],
      },
      {
        heading: 'DTU vs vCore Model',
        content:
          'DTU (Database Transaction Unit): Basic (5 DTU, 2 GB), Standard S0–S12 (10–3000 DTU, up to 1 TB), Premium P1–P15 (125–4000 DTU, up to 4 TB). DTU bundles compute + I/O + memory into one unit — simple but less flexible. vCore: General Purpose (balanced, 2–128 vCores, up to 4 TB), Business Critical (local SSD, 3–4 high-availability replicas, in-memory OLTP), Hyperscale (up to 100 TB, fast backups, named replicas). vCore enables: Serverless (auto-scale + auto-pause), Elastic Pools (shared resources across DBs), Azure Hybrid Benefit (use existing SQL Server licenses for up to 55% savings). Recommendation: use vCore General Purpose for most production workloads, Business Critical for latency-sensitive OLTP, Hyperscale for very large databases.',
      },
      {
        heading: 'Backup, Restore & Geo-Failover',
        steps: [
          'Point-in-time restore: SQL databases → Select DB → Restore → Choose restore point → New DB name → Create',
          'az sql db restore --resource-group MyRG --server myuniquesqlsrv --name MyDB-Restored --dest-name MyDB-Restored --edition GeneralPurpose --family Gen5 --capacity 4 --time "2026-06-01T10:00:00Z" — PITR via CLI',
          'az sql failover-group create --name MyFOG --resource-group MyRG --server myuniquesqlsrv --partner-server myuniquesqlsrv-secondary --add-db MyDB --failover-policy Automatic — Create auto-failover group (set secondary server in another region first)',
          'az sql failover-group set-primary --name MyFOG --resource-group MyRG --server myuniquesqlsrv-secondary -- Force failover to secondary (use for DR testing or actual failover)',
          'Always use the failover group listener endpoint in connection strings: Server=tcp:MyFOG.database.windows.net,1433 — this automatically follows the primary',
          'Recovery after failover: after resolving primary region issues, fail back by running set-primary pointing to original server',
        ],
      },
      {
        heading: 'Troubleshooting: Connection & Performance',
        steps: [
          'Cannot connect (error 40615 / 40197): verify firewall rule includes your client IP or Azure services are allowed',
          'Connection string format: Server=tcp:myuniquesqlsrv.database.windows.net,1433;Initial Catalog=MyDB;User ID=sqladmin;Password=<pwd>;Encrypt=True;TrustServerCertificate=False',
          'High DTU / CPU: Query Performance Insight → top consuming queries → optimize with indexes or query rewrites',
          'View active blocking: SELECT blocking_session_id, session_id, wait_type, sql_handle FROM sys.dm_exec_requests WHERE blocking_session_id <> 0 — run in Query Editor',
          'Find missing indexes: SELECT * FROM sys.dm_db_missing_index_details ORDER BY avg_total_user_cost * avg_user_impact * (user_seeks + user_scans) DESC — top missing index recommendations',
          'Error 40501 (throttling): reduce connection count, implement connection pooling (max pool size), or scale up service tier',
          'Deadlocks: enable Deadlock extended event, query sys.event_log in Azure SQL for deadlock graphs',
        ],
      },
    ],
  },
  {
    id: 'azure-storage',
    title: 'Azure Storage',
    url: 'portal.azure.com → Storage accounts',
    icon: '🗂️',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content:
          'Azure Storage provides four storage types: Blob (unstructured objects, ideal for media, backups, logs), File (SMB/NFS managed file shares), Queue (message delivery between components), and Table (schemaless NoSQL). Redundancy options: LRS (3 copies, 1 datacenter), ZRS (3 availability zones), GRS (LRS + async secondary region), GZRS (ZRS + async secondary), RA-GRS/RA-GZRS (GRS/GZRS + read access to secondary).',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create Storage Account', path: 'Storage accounts → + Create → Name (globally unique, 3-24 lowercase alphanumeric), region, performance (Standard/Premium), redundancy → Review + create' },
          { label: 'Create Blob Container', path: 'Storage accounts → Select account → Data storage → Containers → + Container → Name, public access level (Private/Blob/Container) → Create' },
          { label: 'Upload File to Blob', path: 'Storage accounts → Containers → Select container → Upload → Select files → Set access tier → Upload' },
          { label: 'Generate Container SAS Token', path: 'Storage accounts → Containers → Select container → right-click → Generate SAS → Set permissions, expiry, IP range → Generate SAS token and URL' },
          { label: 'Generate Account-Level SAS', path: 'Storage accounts → Select account → Security + networking → Shared access signature → Set allowed services, resource types, permissions, expiry → Generate SAS' },
          { label: 'Create Azure File Share', path: 'Storage accounts → Select account → Data storage → File shares → + File share → Name, quota (GiB), tier (Transaction optimized/Hot/Cool) → Create' },
          { label: 'Mount File Share on Windows VM', path: 'File shares → Select share → Connect → Windows → Copy PowerShell mount script → Run on VM as administrator' },
          { label: 'Configure Lifecycle Management', path: 'Storage accounts → Data management → Lifecycle management → + Add rule → Filter (prefix, blob type) → Action (tier to Cool/Archive at X days, delete at Y days)' },
          { label: 'Enable Immutable Blob Storage', path: 'Containers → Select container → Access policy → + Add policy → Time-based retention policy (days) OR Legal hold → Save' },
          { label: 'Configure Soft Delete for Blobs', path: 'Storage accounts → Data management → Data protection → Enable soft delete for blobs → Set retention days (1–365) → Save' },
          { label: 'Change Replication Type', path: 'Storage accounts → Data management → Redundancy → Select new redundancy option (LRS/ZRS/GRS/GZRS) → Save' },
          { label: 'Configure Private Endpoint', path: 'Storage accounts → Security + networking → Networking → Private endpoint connections → + Add → Select sub-resource (blob/file) → VNet, subnet, DNS → Create' },
        ],
      },
      {
        heading: 'Storage Operations via CLI & AzCopy',
        steps: [
          'az storage account create --resource-group MyRG --name myuniquestorageacc --location eastus --sku Standard_GZRS --kind StorageV2 --enable-hierarchical-namespace false — Create GZRS general-purpose v2 account',
          'az storage container create --account-name myuniquestorageacc --name mycontainer --auth-mode login — Create container using Azure AD auth',
          'az storage blob upload --account-name myuniquestorageacc --container-name mycontainer --name docs/report.pdf --file ./report.pdf --auth-mode login — Upload file',
          'az storage blob list --account-name myuniquestorageacc --container-name mycontainer --output table --auth-mode login — List blobs in container',
          'az storage blob download --account-name myuniquestorageacc --container-name mycontainer --name docs/report.pdf --file ./downloaded-report.pdf --auth-mode login — Download blob',
          'azcopy copy "./localfolder/*" "https://myuniquestorageacc.blob.core.windows.net/mycontainer/" --recursive -- Bulk upload folder with AzCopy (fastest method)',
          'azcopy sync "./localfolder" "https://myuniquestorageacc.blob.core.windows.net/mycontainer" --recursive --delete-destination=true — Sync local folder to blob (deletes removed files)',
          'az storage blob set-tier --account-name myuniquestorageacc --container-name mycontainer --name archive/old.bak --tier Archive --auth-mode login — Move blob to Archive tier',
        ],
      },
      {
        heading: 'SAS Tokens (Shared Access Signatures)',
        steps: [
          'az storage account generate-sas --account-name myuniquestorageacc --permissions rw --resource-types sco --services b --expiry 2027-01-01T00:00:00Z --https-only --output tsv — Account-level SAS (read+write blobs, containers, services)',
          'az storage blob generate-sas --account-name myuniquestorageacc --container-name mycontainer --name report.pdf --permissions r --expiry 2026-12-31 --https-only --output tsv — Read-only SAS for single blob',
          'Construct download URL: https://myuniquestorageacc.blob.core.windows.net/mycontainer/report.pdf?<sas-token>',
          'User Delegation SAS (most secure — uses Entra ID credentials): az storage blob generate-sas --as-user --auth-mode login ... — does not use storage account key',
          'Store SAS tokens in Azure Key Vault — never hardcode in source code or config files',
          'Revoke SAS: rotate the storage account key (invalidates all SAS tokens signed with that key) — or use stored access policies for individual revocation',
        ],
      },
      {
        heading: 'Lifecycle Management & Immutable Storage',
        content:
          'Lifecycle management policy example: move blobs not accessed in 30 days to Cool tier, 90 days to Archive, delete after 365 days. Archive tier requires rehydration before access (up to 15 hours for standard, 1 hour for high-priority — billed accordingly). Immutable storage supports WORM (Write Once Read Many) compliance. Two policy types: Time-based retention (locked after configuring — cannot modify/delete blobs until retention period expires) and Legal hold (indefinite hold, released manually). Required for SEC 17a-4, FINRA, CFTC compliance. Container-level policy cannot be shortened once locked. Consider blob versioning + soft delete together for layered data protection without immutability cost.',
      },
      {
        heading: 'Troubleshooting: Access & Performance',
        steps: [
          'Error 403 AuthorizationFailure: SAS token may be expired, wrong permissions, or account key rotated — generate new SAS',
          'Error 403 PublicAccessNotPermitted: storage account has public blob access disabled — use SAS, managed identity, or storage key authentication',
          'Error 409 BlobAlreadyExists with overwrite=false: add --overwrite true to AzCopy or set If-None-Match: * header',
          'Slow large uploads: use AzCopy with --block-size-mb 100 --parallel-level 8 for parallel block uploads',
          'File share mount error 53 (network path not found): ensure TCP port 445 outbound is open — many ISPs block 445; use VPN or Private Endpoint',
          'az storage account show --name myuniquestorageacc --query "{primaryLocation:primaryLocation, statusOfPrimary:statusOfPrimary, secondaryLocation:secondaryLocation}" — Check account geo-replication status',
          'Monitor storage metrics: Storage account → Monitoring → Metrics → Transactions, Availability, E2E Latency — set alerts on these',
        ],
      },
    ],
  },
  {
    id: 'azure-keyvault',
    title: 'Azure Key Vault',
    url: 'portal.azure.com → Key vaults',
    icon: '🔑',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'Azure Key Vault securely manages secrets (passwords, connection strings, API keys), encryption keys (RSA, EC, AES via HSM), and certificates (X.509). All access is audited. Supports Vault Access Policies (legacy) and Azure RBAC (recommended). Integrates with App Service, AKS, Functions, and VMs via Managed Identity — no credentials in code.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create Key Vault', path: 'Key vaults → + Create → Select RG, name (globally unique, 3-24 chars), region → Standard (software) or Premium (HSM) → Soft delete retention (7–90 days) → Review + create' },
          { label: 'Create / Update Secret', path: 'Key vaults → Select vault → Objects → Secrets → + Generate/Import → Name (e.g. DatabasePassword), Value, optional content type and expiry → Create' },
          { label: 'Retrieve Secret Value', path: 'Key vaults → Objects → Secrets → Select secret → Current version → Show Secret Value button' },
          { label: 'Create / Import Certificate', path: 'Key vaults → Objects → Certificates → + Generate/Import → Generate (self-signed or via CA) or Import PFX → Set policy → Create' },
          { label: 'Configure Certificate Issuance Policy', path: 'Certificates → Select cert → Issuance policy → Validity period, Key type, Key size, Lifetime action (email or auto-renew at X% of lifetime)' },
          { label: 'Create Encryption Key', path: 'Key vaults → Objects → Keys → + Generate/Import → RSA or EC type, key size → Set activation/expiry dates → Create' },
          { label: 'Assign RBAC Role (Recommended)', path: 'Key vaults → Select vault → Access control (IAM) → + Add role assignment → Key Vault Secrets Officer (manage) or Secrets User (read) → Select user/managed identity → Assign' },
          { label: 'Add Access Policy (Legacy)', path: 'Key vaults → Select vault → Access policies → + Create → Select permissions (Get, List, Set, Delete) → Select principal → Review + create' },
          { label: 'Enable Purge Protection', path: 'Key vaults → Select vault → Properties → Soft delete → Already enabled → Purge protection → Enable (IRREVERSIBLE — prevents forced deletion of vault and objects)' },
          { label: 'Configure Diagnostic Settings', path: 'Key vaults → Select vault → Monitoring → Diagnostic settings → + Add → AuditEvent logs → Send to Log Analytics workspace' },
          { label: 'Recover Deleted Secret', path: 'Key vaults → Objects → Secrets → Manage deleted secrets → Select secret → Recover' },
          { label: 'Configure Private Endpoint', path: 'Key vaults → Select vault → Security → Networking → Private endpoint connections → + Create → Select VNet/subnet → DNS integration → Create' },
        ],
      },
      {
        heading: 'Key Vault CLI Operations',
        steps: [
          'az keyvault create --resource-group MyRG --name myuniquekeyvault --location eastus --enable-rbac-authorization true --retention-days 90 -- Create vault with RBAC auth and 90-day soft-delete retention',
          'az keyvault secret set --vault-name myuniquekeyvault --name DatabasePassword --value "SuperSecure@Pass123" --expires 2028-01-01T00:00:00Z — Create secret with expiry',
          'az keyvault secret show --vault-name myuniquekeyvault --name DatabasePassword --query "value" --output tsv — Retrieve secret value',
          'az keyvault secret list --vault-name myuniquekeyvault --output table — List all secret names (does not reveal values)',
          'az keyvault secret set-attributes --vault-name myuniquekeyvault --name DatabasePassword --enabled false — Disable a secret version',
          'az keyvault key create --vault-name myuniquekeyvault --name MyEncKey --kty RSA --size 4096 --ops encrypt decrypt wrapKey unwrapKey — Create 4096-bit RSA key',
          'az keyvault certificate import --vault-name myuniquekeyvault --name MyCert --file ./mycert.pfx --password <pfx-password> — Import PFX certificate',
          'az keyvault secret list-deleted --vault-name myuniquekeyvault --output table — List soft-deleted secrets',
          'az keyvault secret recover --vault-name myuniquekeyvault --name DatabasePassword — Recover deleted secret',
        ],
      },
      {
        heading: 'RBAC vs Access Policies',
        content:
          'Access Policies (legacy): assign permissions per principal directly on the vault. A single policy covers all secrets/keys/certs in the vault — no fine-grained scope. Built-in RBAC roles (recommended): Key Vault Administrator (full control), Key Vault Certificates Officer (manage certs), Key Vault Crypto Officer (manage keys), Key Vault Secrets Officer (manage secrets), Key Vault Secrets User (read secrets only). RBAC enables PIM just-in-time access, Conditional Access, and subscription-level role assignments. Enable RBAC at vault creation with --enable-rbac-authorization true. To migrate an existing vault: portal → Properties → Permission model → Azure role-based access control → Save.',
      },
      {
        heading: 'Managed Identity Integration',
        steps: [
          'Enable system-assigned managed identity on App Service: App Services → Select app → Settings → Identity → System assigned → Status: On → Save → Note the Object ID',
          'Enable on VM: Virtual machines → Select VM → Settings → Identity → System assigned → On → Save',
          'az keyvault role assignment create --role "Key Vault Secrets User" --scope /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.KeyVault/vaults/myuniquekeyvault --assignee <managed-identity-object-id> — Grant read access to managed identity',
          'App Service Key Vault reference syntax: @Microsoft.KeyVault(SecretUri=https://myuniquekeyvault.vault.azure.net/secrets/DatabasePassword/) — use in Application Settings value field',
          'Verify reference resolved: App Services → Environment variables → check Status icon next to setting — green tick = resolved, red = error (check identity and RBAC)',
          'In application code: use DefaultAzureCredential() from Azure SDK — automatically picks up managed identity, no credentials needed in code',
        ],
      },
      {
        heading: 'Troubleshooting: Access Denied & Certificate Issues',
        steps: [
          'Error "Caller is not authorized to perform action on resource": check RBAC assignment exists, vault uses RBAC mode (not access policies), and assignment scope is correct',
          'Error "Secret not found": name is case-sensitive, check if secret was deleted (Manage deleted secrets → Recover if within retention period)',
          'Error "Request limit exceeded": Key Vault is throttled at 2000 requests/10 seconds per vault — implement caching in application, reduce polling frequency',
          'Certificate expired in App Service: Key vaults → Certificates → Select cert → New version or Renew → After renewal, App Services → Certificates → Sync',
          'App Service Key Vault reference shows error: verify managed identity has "Key Vault Secrets User" role, secret name and URI are correct, vault is in same tenant',
          'Private endpoint DNS: if vault is behind private endpoint, client must resolve via Private DNS zone (privatelink.vaultcore.azure.net) — verify DNS link exists for the VNet',
        ],
      },
    ],
  },
  {
    id: 'azure-monitor',
    title: 'Azure Monitor & Log Analytics',
    url: 'portal.azure.com → Monitor  |  Log Analytics workspaces',
    icon: '📊',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content:
          'Azure Monitor is the unified observability platform collecting metrics (numerical time-series) and logs (structured/unstructured records) from all Azure resources. Log Analytics workspaces store log data queryable with KQL (Kusto Query Language). Azure Monitor Alerts trigger on metric thresholds or log query results. Workbooks provide interactive reports. Action Groups route notifications to email, SMS, webhook, Azure Function, or ITSM.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create Log Analytics Workspace', path: 'Log Analytics workspaces → + Create → Select RG, name, region → Review + create' },
          { label: 'Enable Diagnostics on a Resource', path: 'Any Azure resource → Monitoring → Diagnostic settings → + Add diagnostic setting → Select log categories and metrics → Destination: Log Analytics workspace → Save' },
          { label: 'Run KQL Query', path: 'Log Analytics workspaces → Select workspace → Logs → Enter query in editor → Run (Shift+Enter)' },
          { label: 'View Metrics for a Resource', path: 'Any resource → Monitoring → Metrics → Select metric (CPU, Requests, etc.) → Adjust time range and aggregation' },
          { label: 'Create Metric Alert Rule', path: 'Monitor → Alerts → + Create → Alert rule → Select resource → Condition (signal type: Metrics) → Configure threshold → Action group → Review + create' },
          { label: 'Create Log Search Alert Rule', path: 'Monitor → Alerts → + Create → Alert rule → Select Log Analytics workspace → Condition: Custom log search → Enter KQL → Set threshold → Action group' },
          { label: 'Create Action Group', path: 'Monitor → Alerts → Action groups → + Create → Add actions: Email/SMS, Push notification, Voice, Webhook, Azure Function, Logic App, Automation Runbook, ITSM' },
          { label: 'Create Azure Monitor Dashboard', path: 'Monitor → Dashboards → + New dashboard → Name it → + Add tile → Pin from Metrics or Charts' },
          { label: 'Create Workbook', path: 'Monitor → Workbooks → + New → Add: Text (Markdown), Queries (KQL), Metrics, Parameters, Links → Save → Share' },
          { label: 'Enable VM Insights', path: 'Virtual machines → Select VM → Monitoring → Insights → Enable → Select Log Analytics workspace → Enable' },
          { label: 'View Service Health', path: 'Monitor → Service Health → Service issues, Planned maintenance, Health advisories → Set up Service Health Alerts' },
          { label: 'View Resource Health', path: 'Monitor → Service Health → Resource health → Filter by resource type and subscription → View availability history' },
        ],
      },
      {
        heading: 'Essential KQL Queries',
        steps: [
          'AzureActivity | where ActivityStatusValue == "Failure" | summarize count() by OperationNameValue, ResourceGroup | order by count_ desc — Top failed Azure control-plane operations',
          'Heartbeat | summarize LastCall=max(TimeGenerated) by Computer | where LastCall < ago(15m) | order by LastCall asc — VMs that stopped sending heartbeat (agent down or VM offline)',
          'Perf | where ObjectName == "Processor" and CounterName == "% Processor Time" | summarize AvgCPU=avg(CounterValue) by Computer, bin(TimeGenerated, 5m) | where AvgCPU > 80 | order by TimeGenerated desc — VMs with sustained CPU over 80%',
          'SecurityEvent | where EventID == 4625 | summarize FailedLogins=count() by Account, IpAddress | where FailedLogins > 10 | order by FailedLogins desc — Brute-force login attack detection (Event 4625 = failed logon)',
          'AzureDiagnostics | where ResourceType == "APPLICATIONGATEWAYS" and httpStatus_d >= 500 | summarize Errors=count() by requestUri_s, httpStatus_d | order by Errors desc — App Gateway 5xx errors by URI',
          'StorageBlobLogs | where OperationName == "DeleteBlob" and StatusCode == 200 | project TimeGenerated, CallerIpAddress, Uri, AuthenticationType — Successful blob deletions audit trail',
          'KubePodInventory | where ContainerStatus == "waiting" | summarize count() by Namespace, Name, ContainerStatusReason — AKS pods stuck in waiting state (e.g. ImagePullBackOff)',
          'requests | where success == false | summarize FailCount=count() by name, resultCode | order by FailCount desc — Application Insights: failed HTTP requests by endpoint',
          'Usage | summarize TotalGB=sum(Quantity)/1000 by DataType | order by TotalGB desc — Top log tables by ingestion volume (for cost optimization)',
        ],
      },
      {
        heading: 'Creating Alerts & Action Groups via CLI',
        steps: [
          'az monitor action-group create --resource-group MyRG --name OpsAlertGroup --short-name OAG --action email OnCallAdmin oncall@contoso.com --action sms AdminPhone 1 5551234567 — Create action group with email and SMS',
          'az monitor metrics alert create --resource-group MyRG --name HighCPUAlert --scopes /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.Compute/virtualMachines/MyVM --condition "avg Percentage CPU > 90" --window-size 5m --evaluation-frequency 1m --severity 2 --action OpsAlertGroup --description "VM CPU over 90% for 5 minutes" — CPU metric alert',
          'az monitor metrics alert create --resource-group MyRG --name AppAvailabilityAlert --scopes /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.Web/sites/MyApp --condition "avg Availability < 99" --window-size 5m --severity 1 --action OpsAlertGroup — App Service availability alert',
          'Set meaningful alert descriptions including runbook links and escalation contacts',
          'Test action group: Monitor → Alerts → Action groups → Select group → Test → Select sample alert type → Send test notification',
        ],
      },
      {
        heading: 'Workbooks & Dashboards',
        steps: [
          'Browse gallery templates: Monitor → Workbooks → Gallery — built-in workbooks for VMs, AKS, Azure SQL, App Service, Security, Cost',
          'Create parameterized workbook: + New → Add Parameters step → Add TimeRange parameter (type: Time range picker) → reference as {TimeRange} in KQL queries',
          'Add KQL query block: + Add → Query → enter KQL using TimeRange parameter, select visualization (Grid, Bar chart, Line chart, Map)',
          'Save and share: Save → select subscription and RG → access level (Public within tenant or specific users)',
          'Pin to Azure Dashboard: click pin icon on any Metrics chart or Workbook visualization → select target dashboard',
          'Export workbook as JSON template: Edit → toolbar → Download → version control in Git for team sharing',
        ],
      },
      {
        heading: 'Troubleshooting: Missing Logs & Alert Failures',
        steps: [
          'Logs not in workspace: verify Diagnostic Settings exist on the resource AND target workspace matches — check Settings → Active status',
          'VM agent logs missing: verify Log Analytics agent (MMA) or newer Azure Monitor Agent (AMA) is installed and running: Virtual machines → Extensions → check agent status',
          'az vm extension show --resource-group MyRG --vm-name MyVM --name MicrosoftMonitoringAgent --query "provisioningState" — Check MMA provisioning state',
          'Alert not firing: run the KQL query manually in Log Analytics → confirm it returns results → check threshold and aggregation period match expectations',
          'Alert fired but no email received: Monitor → Alerts → Select fired alert → Action groups tab → verify delivery status; check spam folder; validate email in action group',
          'High ingestion costs: run Usage query (see KQL section) to find top tables → reduce verbose diagnostic log categories (e.g., disable verbose SQL audit logs or storage metrics)',
          'Data cap reached: Log Analytics workspace → Usage and estimated costs → Daily cap → Increase or remove cap during incidents',
        ],
      },
    ],
  },
  {
    id: 'azure-aks',
    title: 'Azure Kubernetes Service (AKS)',
    url: 'portal.azure.com → Kubernetes services',
    icon: '☸️',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'AKS is a managed Kubernetes service where Azure manages the control plane (API server, etcd, scheduler) at no cost. You pay only for worker nodes. Key integrations: Azure Container Registry (ACR) for images, Application Gateway Ingress Controller (AGIC), Azure Monitor for Containers, Entra ID for RBAC, Key Vault CSI driver for secrets, and cluster autoscaler for automatic node scaling.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create AKS Cluster', path: 'Kubernetes services → + Create → Kubernetes cluster → Basics (name, region, k8s version, node count) → Node pools → Networking → Integrations (ACR, Monitor) → Review + create' },
          { label: 'Add Node Pool', path: 'Kubernetes services → Select cluster → Settings → Node pools → + Add node pool → Name, VM size, OS, node count, mode (User/System) → Add' },
          { label: 'Scale Node Pool Manually', path: 'Kubernetes services → Select cluster → Node pools → Select pool → Scale node pool → Set node count → Apply' },
          { label: 'Enable Cluster Autoscaler', path: 'Kubernetes services → Select cluster → Node pools → Select pool → Scale node pool → Autoscale → Enable → Set min/max nodes → Apply' },
          { label: 'Connect kubectl to AKS', path: 'Kubernetes services → Select cluster → Overview → Connect → Copy az aks get-credentials command → Run in terminal' },
          { label: 'Enable AGIC (App Gateway Ingress)', path: 'Kubernetes services → Select cluster → Settings → Networking → Ingress controller → Enable AGIC → Select or create Application Gateway → Save' },
          { label: 'Attach ACR to AKS', path: 'Kubernetes services → Select cluster → Settings → Integrations → Container registry → Select ACR → Save' },
          { label: 'Browse Workloads in Portal', path: 'Kubernetes services → Select cluster → Kubernetes resources → Workloads → Pods, Deployments, DaemonSets, StatefulSets' },
          { label: 'Enable Azure Monitor Container Insights', path: 'Kubernetes services → Select cluster → Monitoring → Insights → Enable → Select Log Analytics workspace → Configure' },
          { label: 'Upgrade AKS Cluster Version', path: 'Kubernetes services → Select cluster → Settings → Cluster configuration → Upgrade → Select target version → Upgrade (control plane first, then node pools)' },
          { label: 'Configure Maintenance Window', path: 'Kubernetes services → Select cluster → Settings → Cluster configuration → Maintenance windows → Set preferred day/time for auto-upgrades' },
        ],
      },
      {
        heading: 'Cluster Creation & kubectl Setup',
        steps: [
          'az group create --name MyAKSRG --location eastus — Create resource group',
          'az aks create --resource-group MyAKSRG --name MyAKSCluster --node-count 3 --node-vm-size Standard_D4s_v5 --enable-managed-identity --enable-addons monitoring --workspace-resource-id /subscriptions/<sub>/resourceGroups/MyRG/providers/Microsoft.OperationalInsights/workspaces/MyWorkspace --generate-ssh-keys --kubernetes-version 1.30 --zones 1 2 3 — Create HA cluster across availability zones with monitoring',
          'az aks get-credentials --resource-group MyAKSRG --name MyAKSCluster — Configure local kubectl with cluster credentials',
          'kubectl get nodes -o wide — Verify all nodes are in Ready state with node IP and OS version',
          'kubectl get pods --all-namespaces — Check all system pods (coredns, kube-proxy, metrics-server) are Running',
          'az aks update --resource-group MyAKSRG --name MyAKSCluster --attach-acr MyACRRegistry — Grant AKS managed identity pull access to ACR',
          'az aks nodepool add --resource-group MyAKSRG --cluster-name MyAKSCluster --name spotpool --node-count 2 --node-vm-size Standard_D4s_v5 --priority Spot --eviction-policy Delete --spot-max-price -1 --node-taints kubernetes.azure.com/scalesetpriority=spot:NoSchedule — Add Spot node pool for cost savings',
        ],
      },
      {
        heading: 'Essential kubectl Commands',
        steps: [
          'kubectl get pods -n <namespace> -o wide — List pods with status, restarts, node placement',
          'kubectl describe pod <pod-name> -n <namespace> — Detailed pod status: conditions, events, resource limits, probe failures',
          'kubectl logs <pod-name> -n <namespace> -f — Stream live logs from running container',
          'kubectl logs <pod-name> -n <namespace> --previous — Logs from the last crashed container instance',
          'kubectl exec -it <pod-name> -n <namespace> -- /bin/sh — Interactive shell inside running container',
          'kubectl rollout status deployment/<deployment-name> -n <namespace> — Monitor rolling update progress',
          'kubectl rollout undo deployment/<deployment-name> -n <namespace> — Roll back to previous ReplicaSet',
          'kubectl rollout history deployment/<deployment-name> -n <namespace> — View rollout revision history',
          'kubectl top nodes — CPU and memory usage per node (requires metrics-server add-on)',
          'kubectl top pods -n <namespace> — CPU and memory usage per pod',
          'kubectl scale deployment <deployment-name> --replicas=5 -n <namespace> — Manual scale to 5 replicas',
          'kubectl apply -f deployment.yaml — Apply or update resources from YAML manifest',
          'kubectl delete pod <pod-name> -n <namespace> — Force pod restart (deployment controller recreates it)',
          'kubectl get events --sort-by=.lastTimestamp -n <namespace> — View recent events chronologically',
        ],
      },
      {
        heading: 'AGIC Ingress & ACR Integration',
        steps: [
          'az network application-gateway create --resource-group MyAKSRG --name MyAppGW --location eastus --sku WAF_v2 --public-ip-address MyAppGwPIP --vnet-name AKSVNet --subnet AppGWSnet --capacity 2 — Create WAF v2 Application Gateway for AGIC',
          'az aks enable-addons --resource-group MyAKSRG --name MyAKSCluster --addons ingress-appgw --appgw-id /subscriptions/<sub>/resourceGroups/MyAKSRG/providers/Microsoft.Network/applicationGateways/MyAppGW — Enable AGIC add-on on existing cluster',
          'az acr create --resource-group MyAKSRG --name myaksregistry --sku Standard --location eastus — Create Azure Container Registry',
          'az acr build --registry myaksregistry --image myapp:v1.0.0 . — Build Docker image and push to ACR (no local Docker needed)',
          'kubectl create secret docker-registry acr-pull-secret --docker-server=myaksregistry.azurecr.io --docker-username=<sp-appId> --docker-password=<sp-password> -n myapp-ns — Create pull secret (prefer managed identity --attach-acr instead)',
          'Ingress manifest example annotation: kubernetes.io/ingress.class: azure/application-gateway — required for AGIC to handle the Ingress resource',
        ],
      },
      {
        heading: 'Troubleshooting: Pods & Cluster Issues',
        steps: [
          'Pod stuck in Pending: kubectl describe pod <name> → Events section → "Insufficient cpu/memory" means node has no capacity → scale up node pool or enable cluster autoscaler',
          'Pod in CrashLoopBackOff: kubectl logs <pod> --previous → read the crash reason: OOM kill, startup error, failed probe → fix app config or increase resource limits',
          'ImagePullBackOff: verify ACR is attached to cluster (az aks update --attach-acr), image tag exists (az acr repository show-tags --name myaksregistry --repository myapp)',
          'Nodes in NotReady state: kubectl describe node <node-name> → check Conditions: DiskPressure, MemoryPressure, or network issue → cordon and drain then delete/replace node',
          'kubectl cordon <node-name> — Prevent new pods from scheduling on this node',
          'kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data — Safely evict all pods from node before maintenance',
          'Service not accessible externally: kubectl get svc → check EXTERNAL-IP assigned → verify AGIC/LB rules → check NSG allows port from internet',
          'az aks show --resource-group MyAKSRG --name MyAKSCluster --query "agentPoolProfiles[].{name:name, count:count, vmSize:vmSize, provisioningState:provisioningState}" — Check node pool status',
        ],
      },
    ],
  },
  {
    id: 'azure-cost',
    title: 'Azure Cost Management',
    url: 'portal.azure.com → Cost Management + Billing',
    icon: '💰',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'Azure Cost Management provides full visibility into cloud spend, forecasting, and budget enforcement across subscriptions, resource groups, and tags. Key tools: Cost Analysis (breakdown by service, resource, tag, location), Budgets (spend alerts), Azure Advisor (rightsizing and idle resource recommendations), Reservations and Savings Plans (1–3 year commitments for up to 72% discount), and Export (CSV to storage for BI tools).',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'View Cost Analysis', path: 'Cost Management + Billing → Cost Management → Cost analysis → Select scope → View by: Service, Resource, Resource group, Tag, Location → Adjust date range' },
          { label: 'View Daily / Monthly Trend', path: 'Cost Management → Cost analysis → View: Daily costs or Accumulated costs → Identify cost spikes' },
          { label: 'Create Budget & Alert', path: 'Cost Management → Budgets → + Add → Scope (subscription or RG) → Budget amount, period (monthly) → Alert conditions (e.g. 80%, 100%, 120% forecasted) → Action group → Create' },
          { label: 'View Azure Advisor Cost Recommendations', path: 'Advisor → Cost → View all recommendations → Sort by Annual savings → Apply recommendation' },
          { label: 'Purchase Reservation', path: 'Cost Management + Billing → Reservations → + Add → Product type (VMs, SQL, Cosmos DB, Storage) → Select SKU, region → Scope (Shared or Single subscription) → Term (1 or 3 year) → Purchase' },
          { label: 'View Reservation Utilization', path: 'Cost Management + Billing → Reservations → Select reservation → Utilization % graph → Identify underutilization → Exchange or return if needed' },
          { label: 'Export Cost Data to Storage', path: 'Cost Management → Exports → + Add → Export type (Daily/Monthly/One-time) → Dataset (actual or amortized) → Select storage account → Schedule → Create' },
          { label: 'View Forecast', path: 'Cost Management → Cost analysis → View: Forecast → Shows projected spend for current period and next 30 days' },
          { label: 'Apply Tags to Resources', path: 'Resource group or resource → Tags → Add key:value pairs (e.g. Environment:Production, Department:Engineering, CostCenter:CC-001) → Apply' },
          { label: 'Enforce Mandatory Tags via Policy', path: 'Policy → Assignments → + Assign policy → Require a tag and its value on resources → Scope → Tag name → Enforcement mode: Deny → Assign' },
          { label: 'Enable Auto-Shutdown on Dev VMs', path: 'Virtual machines → Select VM → Operations → Auto-shutdown → Enable → Set time → Notification email → Save' },
        ],
      },
      {
        heading: 'Cost Analysis & Budgets via CLI',
        steps: [
          'az consumption budget list --output table — List existing budgets in current subscription',
          'az consumption budget create --budget-name MonthlyProdBudget --amount 10000 --time-grain Monthly --start-date 2026-06-01 --end-date 2027-06-01 --resource-group ProdRG --category Cost — Create $10,000 monthly budget for a resource group',
          'az advisor recommendation list --category Cost --output table — List all Advisor cost recommendations',
          "az advisor recommendation list --category Cost --query \"[?impact=='High'].{shortDescription:shortDescription.problem, impactedValue:impactedValue}\" --output table — High-impact cost recommendations with savings",
          'az consumption reservation summary list --reservation-order-id <order-id> --grain daily --output table — View daily reservation utilization',
          'az tag update --resource-id /subscriptions/<sub-id>/resourceGroups/ProdRG --operation Merge --tags Environment=Production Department=Engineering CostCenter=CC-001 Owner=teamlead@contoso.com — Apply cost allocation tags to RG',
        ],
      },
      {
        heading: 'Reservations & Azure Savings Plans',
        content:
          'Azure Reservations: 1 or 3-year commitment for specific resource types in a specific region and SKU. Discounts vs pay-as-you-go: VMs up to 72%, SQL Database up to 65%, Cosmos DB up to 65%. Scope: Single subscription (applies only to matching resources in one sub) or Shared (pools across all subs in billing enrollment — more flexible). Best practice: analyze 30-day Cost Analysis → identify consistently running resources (VMs, SQL DBs) → purchase reservations for those. Azure Savings Plans for Compute: flexible $X/hour commitment for 1–3 years covering VMs across any region, any size, AKS nodes, App Service, Functions. Savings Plans give ~65% discount and are more flexible than VM reservations. Exchange or return reservations within 12 months (total cap $50,000/year). Check utilization monthly — underutilized reservations waste money.',
      },
      {
        heading: 'Tagging Strategy for Cost Allocation',
        steps: [
          'Define a standard tag taxonomy: Environment (prod/staging/dev/test), Department, Project, Owner, CostCenter',
          'Enforce at policy level: Policy → + Assign → "Require a tag and its value" → Effect: Deny — blocks resource creation without the required tag',
          'Auto-inherit from RG: Policy → "Inherit a tag from the resource group if missing" → tag name → Effect: Modify — adds missing tags from RG to child resources',
          'az resource list --tag Environment=Production --query "[].{Name:name, Type:type, RG:resourceGroup}" --output table — List all production-tagged resources',
          'Cost allocation by tag: Cost Management → Cost analysis → Group by: Tag → Select tag key (e.g. CostCenter) → View spend per cost center',
          'Export and use in Power BI: Cost Management → Exports → Create monthly amortized export → Connect Power BI to storage account → Build chargeback reports',
        ],
      },
      {
        heading: 'Troubleshooting: Unexpected Costs & Budget Overruns',
        steps: [
          'Find cost spike day: Cost Management → Cost analysis → Daily view → Find spike date → Group by Service to identify which service caused it',
          'Drill down: change scope to resource group or add Tag filter to narrow down the offending resources',
          "az disk list --query \"[?diskState=='Unattached'].{Name:name, RG:resourceGroup, SizeGB:diskSizeGb, SKU:sku.name}\" --output table — Find unattached managed disks (often left after VM deletion)",
          'az network public-ip list --query "[?ipConfiguration==null].{Name:name, RG:resourceGroup, SKU:sku.name}" --output table — Find unassociated public IPs (standard SKU billed even when idle)',
          'Deallocated VMs still incur disk storage and public IP charges — delete unused VMs completely or stop public IPs',
          'Budget alert not triggering: verify action group email is valid, check alert condition threshold is not set too high (e.g. 120% forecasted vs actual)',
          'Reservation underutilized: Cost Management → Reservations → View utilization → if consistently below 70%, exchange for a different SKU/region or return partial quantity',
        ],
      },
    ],
  },
]

export default function AzurePage() {
  return (
    <>
      <TopBar
        title="Microsoft Azure Guide"
        subtitle="Virtual Machines, Networking, Entra ID, App Service, SQL, Storage, Key Vault, Monitor, AKS, Cost Management"
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={AZURE_DOCS} />
        </div>
      </div>
    </>
  )
}

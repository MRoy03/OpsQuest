import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

const AZURE_DOCS = [
  {
    id: 'azure-vms',
    title: 'Azure Virtual Machines',
    url: 'portal.azure.com → Virtual Machines',
    icon: '🖥️',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content: 'Azure VMs provide scalable, on-demand compute. Supports Windows and Linux. Managed via Azure Portal, CLI, or PowerShell. Key concepts: SKU sizes, availability zones, managed disks, NSGs.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Create a VM', path: 'Portal → Virtual Machines → + Create → Azure Virtual Machine → Configure: size, OS, region, auth' },
          { label: 'Resize VM', path: 'VM → Settings → Size → Select new size → Resize (causes restart)' },
          { label: 'Connect via RDP', path: 'VM → Connect → RDP → Download .rdp file → Open with Remote Desktop' },
          { label: 'Connect via SSH', path: 'VM → Connect → SSH → Copy SSH command → Run in terminal' },
          { label: 'Add Data Disk', path: 'VM → Settings → Disks → + Create and attach a new disk → Configure and save' },
          { label: 'Extend Disk', path: 'Stop VM → Disks → Select disk → Size → Increase → Save → Start VM → Extend partition in OS' },
          { label: 'Create Snapshot', path: 'Disks → Select disk → + Create snapshot → Name and create' },
        ],
      },
      {
        heading: 'Troubleshooting: VM Not Starting',
        steps: [
          'Check activity log for errors: VM → Activity log → Look for failure messages',
          'Review boot diagnostics: VM → Support + troubleshooting → Boot diagnostics → Enable and view screenshot',
          'Try "Redeploy" to move VM to a new host: VM → Support + troubleshooting → Redeploy + reapply',
          'Check subscription quota: Subscriptions → Usage + quotas → Filter by compute',
          'If disk error: detach data disk and try booting → reconnect after fix',
          'Restore from snapshot or backup if corrupted: VM → Backup → Restore',
        ],
      },
      {
        heading: 'Troubleshooting: Cannot RDP/SSH',
        steps: [
          'Verify NSG rules allow port 3389 (RDP) or 22 (SSH) from your IP: VM → Networking → Inbound port rules',
          'Use Just-in-Time (JIT) VM access: VM → Configuration → Enable JIT access',
          'Run Network Watcher connectivity check: Network Watcher → Connection troubleshoot',
          'Check if VM agent is running: VM → Extensions + applications → IaaS Diagnostics',
          'Reset SSH/RDP credentials: VM → Support + troubleshooting → Reset password',
          'Try Azure Bastion for browser-based access without public IP',
        ],
      },
    ],
  },
  {
    id: 'azure-networking',
    title: 'Azure Networking (VNet, NSG, DNS)',
    url: 'portal.azure.com → Networking',
    icon: '🌐',
    color: 'cyan',
    sections: [
      {
        heading: 'Key Concepts',
        content: 'VNet (Virtual Network) is the private network in Azure. Subnets segment the VNet. NSG (Network Security Group) controls inbound/outbound traffic. Route Tables control traffic routing. VNet Peering connects VNets. Azure DNS provides name resolution.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Create VNet', path: 'Portal → Virtual Networks → + Create → Define address space (e.g. 10.0.0.0/16) and subnets' },
          { label: 'Add NSG Rule', path: 'Network Security Groups → Select NSG → Inbound/Outbound rules → + Add → Set priority, port, protocol, action' },
          { label: 'Enable VNet Peering', path: 'VNet → Peerings → + Add → Select remote VNet → Configure bidirectional traffic' },
          { label: 'Create Private DNS Zone', path: 'Private DNS Zones → + Create → Enter zone name → Link to VNet' },
          { label: 'View Effective Routes', path: 'VM → Networking → Network interface → Effective routes' },
          { label: 'Test Connectivity', path: 'Network Watcher → Connection troubleshoot → Source VM → Destination IP/FQDN → Test' },
        ],
      },
      {
        heading: 'Troubleshooting: Cannot Reach Resource in VNet',
        steps: [
          'Check NSG rules on both source and destination: Look for deny rules on port/protocol',
          'Verify route table — ensure 0.0.0.0/0 or specific route points to correct next hop',
          'Run Network Watcher → IP flow verify: checks if packet is allowed/denied by NSG',
          'Check if VNet peering is connected and traffic forwarding is enabled',
          'Verify private DNS zone is linked to the VNet',
          'For internet connectivity: ensure subnet has route to Internet and no forced tunnel blocks it',
        ],
      },
    ],
  },
  {
    id: 'azure-monitor',
    title: 'Azure Monitor & Alerts',
    url: 'portal.azure.com → Monitor',
    icon: '📊',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content: 'Azure Monitor collects metrics, logs, and traces from Azure resources. Log Analytics stores query-able log data. Application Insights monitors apps. Alerts trigger on thresholds. Dashboards visualize infrastructure health.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Create Alert Rule', path: 'Monitor → Alerts → + Create → Alert rule → Select resource → Condition (metric/log) → Action group (email/SMS) → Create' },
          { label: 'Query Logs (KQL)', path: 'Monitor → Logs → Select workspace → Enter KQL query, e.g.: Heartbeat | summarize LastCall=max(TimeGenerated) by Computer' },
          { label: 'View Resource Metrics', path: 'Resource → Metrics → Select metric (CPU, Memory, etc.) → Adjust time range' },
          { label: 'Create Dashboard', path: 'Dashboard → + New → Add tiles from metrics/charts → Share with team' },
          { label: 'Enable Diagnostic Settings', path: 'Resource → Diagnostic settings → + Add → Choose logs/metrics → Send to Log Analytics workspace' },
        ],
      },
      {
        heading: 'Key KQL Queries for Troubleshooting',
        steps: [
          'Failed sign-ins: SigninLogs | where ResultType != 0 | summarize count() by UserPrincipalName',
          'VM availability: Heartbeat | summarize LastHeartbeat=max(TimeGenerated) by Computer | where LastHeartbeat < ago(5m)',
          'High CPU VMs: Perf | where ObjectName == "Processor" and CounterName == "% Processor Time" | where CounterValue > 90',
          'Storage errors: StorageBlobLogs | where StatusCode >= 400 | project TimeGenerated, OperationName, StatusCode, CallerIpAddress',
          'App exceptions: exceptions | summarize count() by type | order by count_ desc',
        ],
      },
    ],
  },
  {
    id: 'azure-storage',
    title: 'Azure Storage & Blob',
    url: 'portal.azure.com → Storage accounts',
    icon: '💾',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content: 'Azure Storage provides Blob (unstructured object storage), File Share (SMB/NFS), Table (NoSQL), and Queue storage. Access tiers: Hot, Cool, Archive. SAS tokens provide scoped, time-limited access.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Create Storage Account', path: 'Storage accounts → + Create → Set name, region, performance (Standard/Premium), redundancy (LRS/GRS/ZRS)' },
          { label: 'Create Container / Upload Blob', path: 'Storage account → Containers → + Container → Open → Upload files' },
          { label: 'Generate SAS Token', path: 'Storage account / Container / Blob → Shared access signature → Set permissions and expiry → Generate SAS' },
          { label: 'Mount Azure File Share', path: 'Storage account → File shares → Select share → Connect → Copy PowerShell/Linux mount command' },
          { label: 'Enable Lifecycle Management', path: 'Storage account → Data management → Lifecycle management → + Add rule → Define tier transition rules' },
        ],
      },
      {
        heading: 'Troubleshooting: Access Denied to Blob Storage',
        steps: [
          'Check Storage Account network settings: Networking → Allow access from → Ensure your IP/VNet is allowed',
          'Verify IAM role: Storage account → Access control (IAM) → Check user has Storage Blob Data Contributor or similar',
          'If using SAS: check expiry time, allowed services, resource types, and IP restrictions',
          'Check if public access is disabled: Containers → Access level must be set appropriately',
          'Review activity logs: Monitor → Activity log → Filter by storage account → Look for AuthorizationFailed events',
        ],
      },
    ],
  },
]

export default function AzurePage() {
  return (
    <>
      <TopBar title="Microsoft Azure Guide" subtitle="VMs, Networking, Monitor, Storage — comprehensive Azure reference" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={AZURE_DOCS} />
        </div>
      </div>
    </>
  )
}

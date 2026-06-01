import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

const MS365_DOCS = [
  {
    id: 'exchange',
    title: 'Exchange Online Admin Center',
    url: 'admin.exchange.microsoft.com',
    icon: '📧',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content: 'The Exchange Admin Center (EAC) manages email flow, mailboxes, distribution groups, shared mailboxes, and transport rules for your Microsoft 365 organization.',
      },
      {
        heading: 'Accessing the Exchange Admin Center',
        steps: [
          'Go to admin.microsoft.com and sign in with Global or Exchange Admin credentials',
          'Navigate to Admin Centers → Exchange, or go directly to admin.exchange.microsoft.com',
          'Use the left navigation: Recipients, Mail Flow, Organization, Protection, Reports',
        ],
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Create Shared Mailbox', path: 'Recipients → Mailboxes → + Add a shared mailbox' },
          { label: 'Set Auto-Reply / Out of Office', path: 'Recipients → Mailboxes → Select user → Mail settings → Automatic replies' },
          { label: 'Create Distribution Group', path: 'Recipients → Groups → + New → Distribution list' },
          { label: 'View Message Trace', path: 'Mail flow → Message trace → New trace → Filter by sender/recipient/date' },
          { label: 'Configure Spam Policy', path: 'Protection → Anti-spam → Edit inbound spam filter policy' },
          { label: 'Manage Mail Flow Rules', path: 'Mail flow → Rules → + Create a rule' },
        ],
      },
      {
        heading: 'Troubleshooting: Email Not Received',
        steps: [
          'Run a Message Trace: Mail flow → Message trace → Enter recipient address and date range',
          'Check delivery status — look for errors: "550 5.1.1 User unknown", "Quarantined", "Delivered"',
          'If quarantined: Protection → Quarantine → Search for message → Release',
          'If rejected: check mail flow rules that might be blocking the sender',
          'Check the sender\'s mail server for delivery reports and NDR codes',
          'Verify mailbox is not over quota: Recipients → Mailboxes → Select user → Storage used',
        ],
      },
      {
        heading: 'Troubleshooting: Cannot Send Emails',
        steps: [
          'Check if the account is licensed: Microsoft 365 Admin Center → Users → Active users → Licenses',
          'Verify outbound connector settings if using hybrid or external relay',
          'Check if the account is blocked: Security → Review → Restricted users',
          'Run connectivity tests at testconnectivity.microsoft.com',
          'Review NDR error codes — common: 550 (user not found), 521 (domain blocked)',
        ],
      },
    ],
  },
  {
    id: 'identity',
    title: 'Microsoft Entra ID (Azure AD)',
    url: 'entra.microsoft.com',
    icon: '🔐',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content: 'Microsoft Entra ID (formerly Azure Active Directory) is the cloud identity platform for managing users, groups, applications, conditional access, and MFA across Microsoft 365 and Azure.',
      },
      {
        heading: 'Accessing Entra ID Admin Center',
        steps: [
          'Navigate to entra.microsoft.com or aad.portal.azure.com',
          'Sign in with Global Administrator or User Administrator role',
          'Navigation areas: Identity → Users, Groups, Applications, External Identities, Protection',
        ],
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Reset User Password', path: 'Identity → Users → Select user → Reset password' },
          { label: 'Disable/Enable MFA', path: 'Identity → Users → Per-user MFA → Select user → Disable/Enable' },
          { label: 'View Sign-in Logs', path: 'Identity → Monitoring & health → Sign-in logs' },
          { label: 'Configure Conditional Access', path: 'Protection → Conditional Access → + New policy' },
          { label: 'Register App (OAuth)', path: 'Applications → App registrations → + New registration' },
          { label: 'Assign User to Group', path: 'Identity → Groups → Select group → Members → + Add members' },
        ],
      },
      {
        heading: 'Troubleshooting: User Cannot Sign In',
        steps: [
          'Check sign-in logs: Identity → Monitoring → Sign-in logs → Filter by user',
          'Look for failure reason — "Conditional Access policy", "MFA required", "Account disabled"',
          'If Conditional Access blocked: review the policy conditions (location, device compliance, app)',
          'If MFA issue: re-register MFA at aka.ms/mfasetup or admin can reset via Users → Authentication methods',
          'Check if account is locked: Users → Select user → Account → Sign in status',
          'Verify license is assigned: Users → Select user → Licenses',
        ],
      },
      {
        heading: 'Troubleshooting: App Access Denied',
        steps: [
          'Verify the app is assigned to the user/group: Enterprise Applications → App → Users and groups',
          'Check if Conditional Access policy is blocking: Sign-in logs → View policy details',
          'For SSO issues: Enterprise Applications → App → Single sign-on → Test SAML/OIDC',
          'Review app permissions: App registrations → App → API permissions',
          'Check if admin consent is needed: API permissions → Grant admin consent',
        ],
      },
    ],
  },
  {
    id: 'defender',
    title: 'Microsoft Defender Admin Center',
    url: 'security.microsoft.com',
    icon: '🛡️',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content: 'Microsoft Defender XDR (security.microsoft.com) consolidates endpoint security (Defender for Endpoint), email security (Defender for Office 365), identity protection (Defender for Identity), and threat hunting.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'View Security Incidents', path: 'Incidents & alerts → Incidents → Sort by severity' },
          { label: 'Run Antivirus Scan', path: 'Assets → Devices → Select device → Run antivirus scan' },
          { label: 'Quarantine Email', path: 'Email & collaboration → Review → Quarantine' },
          { label: 'Block Sender/Domain', path: 'Email & collaboration → Policies → Tenant allow/block lists' },
          { label: 'View Attack Surface', path: 'Endpoints → Vulnerability management → Dashboard' },
          { label: 'Enable Safe Links', path: 'Email & collaboration → Policies & rules → Threat policies → Safe Links' },
        ],
      },
      {
        heading: 'Responding to a Security Alert',
        steps: [
          'Go to security.microsoft.com → Incidents & alerts → Incidents',
          'Open the incident and review the attack timeline and affected entities',
          'Take action on affected device: Isolate device, Collect investigation package',
          'Review affected emails: Email & collaboration → Explorer → search for malicious messages',
          'Remediate findings: approve auto-remediation or take manual actions',
          'Write incident report and update remediation status when resolved',
        ],
      },
    ],
  },
  {
    id: 'intune',
    title: 'Microsoft Intune / Endpoint Manager',
    url: 'intune.microsoft.com',
    icon: '💻',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content: 'Microsoft Intune (endpoint.microsoft.com) is the MDM/MAM solution for managing Windows, macOS, iOS, and Android devices. Deploy apps, enforce compliance, and control configurations remotely.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Enroll Windows Device', path: 'Devices → Windows → Enrollment → Autopilot or manual enrollment' },
          { label: 'Deploy App', path: 'Apps → All apps → + Add → Select app type → Assign to group' },
          { label: 'Create Compliance Policy', path: 'Devices → Compliance → + Create policy → Select platform' },
          { label: 'Remote Wipe Device', path: 'Devices → All devices → Select device → Wipe' },
          { label: 'View Device Status', path: 'Devices → All devices → Select device → Hardware / Compliance' },
          { label: 'Push Configuration Profile', path: 'Devices → Configuration → + Create → Select template' },
        ],
      },
      {
        heading: 'Troubleshooting: Device Not Compliant',
        steps: [
          'Check device compliance status: Devices → All devices → Device compliance tab',
          'Review which policy is failing and what setting is out of compliance',
          'Force sync on device: Devices → Select device → Sync',
          'Check if required app is installed: Apps → Monitor → App install status',
          'Review Conditional Access impact: if non-compliant, user may lose app access',
          'Check MDM logs on Windows device: Event Viewer → Applications and Services → Microsoft → Windows → DeviceManagement-Enterprise-Diagnostics-Provider',
        ],
      },
    ],
  },
]

export default function MS365Page() {
  return (
    <>
      <TopBar title="Microsoft 365 Admin Centers" subtitle="Exchange, Identity, Security, Intune — complete admin reference" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={MS365_DOCS} />
        </div>
      </div>
    </>
  )
}

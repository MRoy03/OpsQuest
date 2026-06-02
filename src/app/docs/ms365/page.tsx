import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

interface DocEntry {
  id: string
  title: string
  url?: string
  icon: string
  color: 'cyan' | 'purple' | 'amber' | 'green'
  sections: Array<{
    heading: string
    content?: string
    steps?: string[]
    items?: Array<{ label: string; path: string }>
  }>
}

const MS365_DOCS: DocEntry[] = [
  {
    id: 'm365-admin-center',
    title: 'Microsoft 365 Admin Center',
    url: 'admin.microsoft.com',
    icon: '⚙️',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content:
          'The Microsoft 365 Admin Center is the primary hub for managing users, licenses, domains, and org-wide settings. It provides a health dashboard, message center for upcoming changes, service request tracking, and a unified view across all M365 workloads. Admins can access individual admin centers (Exchange, Teams, SharePoint, etc.) from the left navigation under "Show all" → Admin centers.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create New User', path: 'admin.microsoft.com → Users → Active users → + Add a user → Fill display name, username, domain, auto-generate or set password → Assign license → Optional settings (roles, profile info) → Finish' },
          { label: 'Bulk Add Users (CSV)', path: 'Users → Active users → … (More actions) → Import multiple users → Download template CSV → Fill required fields → Upload file → Assign licenses → Finish' },
          { label: 'Delete a User', path: 'Users → Active users → Select user → Delete user → Confirm → User goes to Deleted users (retained 30 days before permanent removal)' },
          { label: 'Restore Deleted User', path: 'Users → Deleted users → Select user → Restore user → Review username/license → Restore → Note temporary password' },
          { label: 'Reset User Password', path: 'Users → Active users → Select user → Key icon (Reset password) → Auto-generate or custom → Require change on first sign-in → Reset → Email or note password' },
          { label: 'Assign Licenses to User', path: 'Users → Active users → Select user → Licenses and apps tab → Check/uncheck license products → Toggle individual apps within a license → Save changes' },
          { label: 'Bulk Assign Licenses', path: 'Users → Active users → Filter/select multiple users → … (More actions) → Manage product licenses → Replace/Add licenses → Save changes' },
          { label: 'Add/Verify a Domain', path: 'Settings → Domains → + Add domain → Enter domain name → Verify ownership (TXT or MX record at your DNS registrar) → Continue setup → Add DNS records for M365 services → Verify' },
          { label: 'Set Primary Domain', path: 'Settings → Domains → Select domain → Set as default → Confirm' },
          { label: 'View Service Health Dashboard', path: 'Health → Service health → View all services status → Click any service for incident details and updates → Subscribe to email notifications' },
          { label: 'Read Message Center', path: 'Health → Message center → Filter by service or major change type → Mark as read/archive → Preferences → Email digest settings' },
          { label: 'Open a Service Request', path: 'Support → New service request → Describe issue → Review suggested articles → Contact support → Choose phone or chat → Submit ticket' },
          { label: 'View Microsoft 365 Usage Reports', path: 'Reports → Usage → Select report (Email activity, Teams usage, SharePoint site usage, etc.) → Change date range (7/30/90/180 days)' },
          { label: 'Configure Password Expiration Policy', path: 'Settings → Org settings → Security & privacy → Password expiration policy → Set passwords to never expire OR define expiry in days → Save' },
          { label: 'Manage Org Settings', path: 'Settings → Org settings → Services tab → Adjust per-service settings (Cortana, Microsoft Forms, Viva Insights) → Security & privacy tab → Bing search, password expiry policy' },
          { label: 'Set Up Multi-Factor Authentication (Legacy per-user)', path: 'Users → Active users → Multi-factor authentication (top bar link) → Select users → Enable/Enforce MFA → Note: prefer Conditional Access MFA over per-user MFA for full control' },
        ],
      },
      {
        heading: 'Create User and Assign License — Step by Step',
        steps: [
          'Navigate to admin.microsoft.com → sign in with Global Admin or User Admin credentials',
          'Go to Users → Active users → click + Add a user button',
          'Enter First name, Last name, Display name, and Username (e.g. jsmith@contoso.com)',
          'Choose auto-generate password or set a custom password → check "Require this user to change password on first sign-in"',
          'Click Next → Product licenses → Select location (country) → toggle on required license (e.g. Microsoft 365 E3) → expand to enable/disable specific apps',
          'Click Next → Optional settings → set Job title, Department, Phone, Manager if needed → assign admin role if required',
          'Click Next → Review → Finish adding → Note or send the credentials to the user',
          'After creation, confirm the user appears in Active users with correct license shown',
        ],
      },
      {
        heading: 'Domain Setup and DNS Records',
        steps: [
          'Go to Settings → Domains → + Add domain → enter your domain name (e.g. contoso.com) → Continue',
          'Choose verification method: Add a TXT record OR Add an MX record at your DNS registrar',
          'Copy the TXT value (e.g. MS=msXXXXXXXX) and add it as a TXT record in your DNS provider with TTL 3600',
          'Return to admin center → Verify → DNS propagation may take up to 48 hours (usually under 30 minutes)',
          'After verification, add required DNS records: MX (mail routing), CNAME autodiscover, SPF TXT, and optionally DKIM CNAME records',
          'If using M365 DNS hosting: select "Add DNS records for me" and provide DNS provider login credentials',
          'If managing DNS manually: copy each required record from the portal and add at your registrar',
          'Final check: Settings → Domains → Select domain → status should show "Healthy"',
        ],
      },
      {
        heading: 'Troubleshooting: Common Admin Center Issues',
        steps: [
          'User cannot sign in after creation: verify license is assigned and active, check sign-in status is not blocked (Users → select user → Account tab → Sign-in status)',
          'License assignment failing: confirm sufficient license seats are available (Billing → Licenses → check available count) — purchase additional seats if at limit',
          'Domain verification failing: ensure TXT record has propagated — test with nslookup -type=TXT contoso.com or use mxtoolbox.com/TXTLookup',
          'User not receiving emails after domain setup: verify MX record points to contoso-com.mail.protection.outlook.com and old MX records are removed',
          'Admin center showing "Something went wrong": try a different browser, clear cache, or use a private browsing window — also check Health → Service health for active incidents',
          'Cannot assign certain admin roles: only Global Admins can assign other Global Admin roles — use least-privilege roles (User Admin, Exchange Admin) where possible',
          'Deleted user not visible in Deleted users: if more than 30 days have passed the account is permanently deleted — contact Microsoft support within 30 days to request recovery',
        ],
      },
    ],
  },
  {
    id: 'exchange-online',
    title: 'Exchange Online Admin Center',
    url: 'admin.exchange.microsoft.com',
    icon: '📧',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'Exchange Online Admin Center (EAC) is the management portal for all email functionality in Microsoft 365. It covers mailbox management (user, shared, room, equipment), distribution groups, mail flow rules (transport rules), connectors, anti-spam, anti-malware, DMARC/DKIM/SPF, message trace for troubleshooting, and quarantine management. The modern EAC at admin.exchange.microsoft.com replaces the classic EAC.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'View / Edit User Mailbox Properties', path: 'admin.exchange.microsoft.com → Recipients → Mailboxes → Select user → Edit (pencil icon) → General, Email addresses, Mailbox features, Mail flow settings' },
          { label: 'Create Shared Mailbox', path: 'Recipients → Shared mailboxes → + Add shared mailbox → Display name, email address → Create → Add members (who can send from/access it) → Close' },
          { label: 'Add Full Access to Shared Mailbox', path: 'Recipients → Shared mailboxes → Select mailbox → Edit → Mailbox delegation → Full Access → + → Select users → Save' },
          { label: 'Add Send As Permission', path: 'Recipients → Mailboxes → Select user mailbox → Mailbox delegation → Send As → + → Select delegate user → Save' },
          { label: 'Create Distribution Group', path: 'Recipients → Groups → + Add group → Distribution list → Name, alias, email address → Set owners → Add members → Privacy settings → Create' },
          { label: 'Create Mail-Enabled Security Group', path: 'Recipients → Groups → + Add group → Mail-enabled security → Name, alias → Owners → Members → Create' },
          { label: 'Create Room Mailbox', path: 'Recipients → Resources → + Add resource → Room → Display name, email, capacity, location → Booking options (auto-accept, max duration) → Create' },
          { label: 'Create Equipment Mailbox', path: 'Recipients → Resources → + Add resource → Equipment → Display name, email → Booking options → Create' },
          { label: 'Enable Online Archive (In-Place Archive)', path: 'Recipients → Mailboxes → Select user → Others tab → Archive mailbox → Enable archive' },
          { label: 'Set Mailbox Size / Quota Limits', path: 'Recipients → Mailboxes → Select user → Mailbox storage → Set issue warning, prohibit send, prohibit send/receive quotas in GB → Save' },
          { label: 'Set Auto-Reply / Out of Office for Mailbox', path: 'Recipients → Mailboxes → Select user → Mail settings → Automatic replies → Enable → Set internal and external reply messages' },
          { label: 'Run Message Trace', path: 'Mail flow → Message trace → + New message trace → Set sender/recipient/date range/delivery status → Next → Search → View results and expand each entry for details' },
          { label: 'Create Mail Flow Rule (Transport Rule)', path: 'Mail flow → Rules → + Add a rule → Select condition template OR "Apply to all messages" → Add conditions → Add actions (add disclaimer, redirect, reject) → Set enforcement mode → Save' },
          { label: 'Create Inbound Connector', path: 'Mail flow → Connectors → + Add connector → Connection from: Partner organization or Your organization\'s email server → Configure TLS/IP restrictions → Save' },
          { label: 'Configure Anti-Spam Policies', path: 'Email security → Policies & rules → Threat policies → Anti-spam → Default policy or + Create policy → Spam/bulk/phishing thresholds → Actions (move to junk, quarantine) → Save' },
          { label: 'Manage Quarantine', path: 'Email security → Review → Quarantine → Filter by quarantine reason (spam, phishing, malware) → Select message → Preview or Release → Release to recipients or submit false positive to Microsoft' },
          { label: 'Enable DKIM for a Domain', path: 'Email security → Policies & rules → Threat policies → Email authentication settings → DKIM → Select domain → Enable → Copy CNAME records → Add to DNS → Rotate keys after propagation' },
          { label: 'Block Sender or Domain (Tenant Block List)', path: 'Email security → Policies & rules → Threat policies → Tenant Allow/Block Lists → Senders tab → + Block → Enter email address or domain → Set expiry → Add' },
          { label: 'View Restricted Users (Blocked from Sending)', path: 'Email security → Review → Restricted entities → Find accounts blocked for sending spam → Remove restriction after securing account' },
        ],
      },
      {
        heading: 'Message Trace — Troubleshoot Missing Emails',
        steps: [
          'Navigate to admin.exchange.microsoft.com → Mail flow → Message trace → + Start a trace',
          'Enter the sender email address and/or recipient email address (at least one required)',
          'Set Date range: last hour, last 24 hours, last 7 days, or custom (up to 90 days — extended traces available for older messages)',
          'Optionally filter by Delivery status: All / Delivered / Failed / Pending / Expanded / Filtered as spam / Unknown',
          'Click Search — results appear sorted by date/time',
          'Click on any message entry to expand → review Status, Event details (submit, receive, transfer, deliver, fail, quarantine)',
          'Check the final event: "Delivered" means it reached the mailbox; "FilteredAsSpam" means spam filter blocked it; "Failed" shows the SMTP error code',
          'For quarantined messages: Email security → Quarantine → search by recipient → preview and release if legitimate',
          'For external delivery failures: check the NDR bounce code — 550 5.1.1 = recipient does not exist, 550 5.7.1 = policy rejection',
        ],
      },
      {
        heading: 'DKIM / DMARC / SPF Setup',
        steps: [
          'SPF: add DNS TXT record on your domain → "v=spf1 include:spf.protection.outlook.com -all" — authorizes M365 to send on behalf of your domain',
          'DKIM Step 1: admin.exchange.microsoft.com → Email security → Threat policies → Email authentication settings → DKIM → Select domain → Enable',
          'DKIM Step 2: copy the two CNAME records shown (selector1._domainkey and selector2._domainkey) → add both at your DNS registrar',
          'DKIM Step 3: wait for DNS propagation (up to 48 hours) → return to DKIM settings → click Enable again → status changes to Enabled',
          'DMARC: add DNS TXT record: _dmarc.contoso.com → "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@contoso.com; pct=100" — start with p=none for monitoring, then move to p=quarantine, then p=reject',
          'Verify all three: send a test email to mail-tester.com or use mxtoolbox.com/diagnostic → check SPF pass, DKIM pass, DMARC pass',
          'Rotate DKIM keys annually: DKIM settings → Select domain → Rotate DKIM keys → confirm → alternates between selector1 and selector2',
        ],
      },
      {
        heading: 'Mail Flow Rules — Common Examples',
        steps: [
          'Block external email spoofing internal display name: Rules → + Add rule → Sender is outside the org AND From display name contains [Company Name] → Action: Prepend subject with [EXTERNAL] or Reject message',
          'Add legal disclaimer to outbound: Rules → condition: Sender is inside the org → Action: Apply disclaimer → enter HTML disclaimer text → Fallback: Wrap → Save',
          'Block auto-forwarding to external: Rules → condition: Message type = Auto-forward AND Sender is inside org → Action: Reject with message "Auto-forwarding to external addresses is prohibited"',
          'Encrypt emails to specific partner domain: Rules → Recipient domain is partner.com → Action: Apply Office 365 Message Encryption and rights protection → Select OME template → Save',
          'Bypass spam filter for trusted sender IP: Rules → condition: Sender IP is [x.x.x.x/32] → Action: Set the spam confidence level (SCL) to -1 (bypass spam filtering)',
          'Compliance BCC archiving: Rules → condition: Sender is inside org → Action: BCC message to compliance@contoso.com → set higher priority than other rules',
          'Test rules safely: set Mode to "Test without Policy Tips" first to verify rule matches before enforcing in production',
        ],
      },
      {
        heading: 'Troubleshooting: Common Exchange Online Issues',
        steps: [
          'Email going to Junk on recipient side: check SPF, DKIM, DMARC are all passing — use message trace to confirm MX routing and inspect message headers',
          'Cannot send to external domain (NDR 550 5.7.64): transport rule may be blocking — check Mail flow → Rules for any rule with reject action matching your message',
          'Shared mailbox not receiving email: verify the email address is correct, not blocked, and there is no forwarding rule redirecting messages away',
          'Distribution group not working: verify group exists in Recipients → Groups, check who can send to the group (Members only vs Everyone), check if moderation is enabled',
          'Outlook not connecting to mailbox: check Autodiscover DNS CNAME — autodiscover.contoso.com → autodiscover.outlook.com — verify with nslookup or testconnectivity.microsoft.com',
          'Room mailbox not accepting bookings: Resources → select room → Booking options — verify Auto-accept is on, check conflicts with existing bookings, verify user has permission to book',
          'Account restricted from sending (suspected spam): Email security → Review → Restricted entities → Remove restriction → then reset password and check for mail forwarding rules',
        ],
      },
    ],
  },
  {
    id: 'entra-id',
    title: 'Microsoft Entra ID (Azure AD)',
    url: 'entra.microsoft.com',
    icon: '🔐',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content:
          'Microsoft Entra ID (formerly Azure Active Directory) is the cloud identity platform underpinning Microsoft 365, Azure, and thousands of SaaS integrations. It manages users, groups, Conditional Access policies, MFA, Self-Service Password Reset (SSPR), Privileged Identity Management (PIM), application registrations, enterprise SSO, and sign-in risk monitoring. Security Defaults or Conditional Access should be configured in every tenant.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create New User', path: 'entra.microsoft.com → Users → All users → + New user → Create new user → Fill UPN, display name, password → Assign groups and roles → Create' },
          { label: 'Bulk Create Users (CSV)', path: 'Users → All users → Bulk operations → Bulk create → Download CSV template → Fill required columns (UPN, display name, etc.) → Upload → Monitor results' },
          { label: 'Disable / Enable User Account', path: 'Users → All users → Select user → Properties → Edit → Account status: Disabled/Enabled → Save' },
          { label: 'Create Security Group', path: 'Groups → All groups → + New group → Security → Assigned membership → Add owners → Add members → Create' },
          { label: 'Create Microsoft 365 Group', path: 'Groups → All groups → + New group → Microsoft 365 → Name, alias, privacy (Public/Private) → Add owners/members → Create' },
          { label: 'Create Dynamic Group (Auto-membership)', path: 'Groups → + New group → Membership type: Dynamic User → + Add dynamic query → e.g. department Equals "Engineering" → Save → Validate → Create' },
          { label: 'Configure Conditional Access Policy', path: 'Protection → Conditional Access → + New policy → Name → Assignments: Users/Groups, Cloud apps → Conditions: Locations, Device platforms, Sign-in risk → Grant: Require MFA / Compliant device → Session controls → Enable policy: On → Create' },
          { label: 'Enable MFA via Security Defaults', path: 'Overview → Properties → Manage Security defaults → Security defaults: Enabled → Save (suitable for orgs without P1 license)' },
          { label: 'Configure SSPR (Self-Service Password Reset)', path: 'Protection → Password reset → Properties → Self-service password reset enabled: All or Selected → Authentication methods tab: set required methods (email, phone, authenticator app) → Registration: require on sign-in → Save' },
          { label: 'Configure PIM (Privileged Identity Management)', path: 'Identity Governance → Privileged Identity Management → Microsoft Entra roles → Manage → Select role (e.g. Global Administrator) → Settings → Require MFA, require justification, max activation duration → Update' },
          { label: 'Register an Application', path: 'Applications → App registrations → + New registration → Name, supported account types, redirect URI → Register → Note Application (client) ID and Tenant ID' },
          { label: 'Create Client Secret for App', path: 'App registrations → Select app → Certificates & secrets → Client secrets → + New client secret → Description, expires → Add → Copy value immediately (shown only once)' },
          { label: 'Add API Permissions to App', path: 'App registrations → Select app → API permissions → + Add permission → Microsoft Graph → Delegated or Application → Select permissions → Add → Grant admin consent' },
          { label: 'Configure Enterprise App SSO (SAML)', path: 'Applications → Enterprise applications → Select app → Single sign-on → SAML → Download Federation Metadata XML → Configure Identifier, Reply URL, Attribute mappings → Test SSO' },
          { label: 'Add Named Location (Trusted IPs)', path: 'Protection → Conditional Access → Named locations → + IP ranges location → Name → Add IP ranges (e.g. 203.0.113.0/24 for office network) → Mark as trusted → Create' },
          { label: 'Create Break-Glass Emergency Access Account', path: 'Users → + New user → Use non-federated domain (.onmicrosoft.com) → Strong random password → No MFA → Assign Global Admin → Exclude from ALL Conditional Access policies → Store credentials in physical safe' },
          { label: 'Review Sign-in Logs', path: 'Monitoring & health → Sign-in logs → Filter by user, date, app, status → Click failed entry → Failure reason, Error code, Applied CA policies, Client info' },
          { label: 'Review Audit Logs', path: 'Monitoring & health → Audit logs → Filter by Service (Core directory, PIM), Activity type, Date range → Export to CSV or stream to Log Analytics' },
          { label: 'Reset User MFA Registration', path: 'Users → All users → Select user → Authentication methods → Require re-register multifactor authentication → user prompted at next sign-in' },
          { label: 'View Identity Protection Risk Detections', path: 'Protection → Identity Protection → Risk detections → Filter by risk level (High, Medium, Low) → Click detection for details → Dismiss or Confirm compromise' },
        ],
      },
      {
        heading: 'Conditional Access — Require MFA for All Users',
        steps: [
          'Navigate to entra.microsoft.com → Protection → Conditional Access → + New policy',
          'Name: "Require MFA for All Users"',
          'Assignments → Users: Include "All users" → Exclude: add break-glass accounts and service accounts that cannot do MFA',
          'Target resources: Cloud apps → Include "All cloud apps"',
          'Conditions: Locations → Exclude "All trusted locations" (optional — to skip MFA from office network)',
          'Grant → Grant access → Require multifactor authentication → Select',
          'Enable policy: set to "Report-only" first to review impact in Sign-in logs before going live',
          'After review in Report-only mode: check Monitoring → Insights and reporting → CA insights to see affected users',
          'Switch policy to "On" → Save → communicate to users that MFA enrollment is required at aka.ms/mfasetup',
        ],
      },
      {
        heading: 'PIM — Just-in-Time Admin Access Setup',
        steps: [
          'Enable PIM: Identity Governance → Privileged Identity Management → Manage → if first time, click "Discover roles" to see existing permanent assignments',
          'Convert permanent Global Admin to eligible: PIM → Microsoft Entra roles → Assignments → Active assignments → select user → Remove active → Add eligible assignment instead',
          'Configure role settings: PIM → Manage → Settings → Select "Global Administrator" → Require MFA on activation → Require justification → Require approval (add approvers) → Maximum activation duration: 4 hours → Update',
          'User activates role: PIM → My roles → Eligible assignments → Global Administrator → Activate → Enter justification → Complete MFA → Wait for approval if configured',
          'Monitor activations: PIM → Audit history → Filter by role and date → Review who activated what and when',
          'Set up access reviews: Identity Governance → Access reviews → + New access review → Scope: roles in PIM → Reviewers: selected people or managers → Frequency: quarterly → Start review',
        ],
      },
      {
        heading: 'Troubleshooting: Sign-in and Access Errors',
        steps: [
          'AADSTS50076 "MFA required": user needs to complete MFA setup → send them to aka.ms/mfasetup → or admin resets at Users → select user → Authentication methods → Require re-register multifactor authentication',
          'AADSTS53003 "Conditional Access policy blocking": open failed sign-in log → "Conditional Access" tab → see which policy blocked → check if user/device meets requirements or update policy exclusions',
          'AADSTS50105 "User not assigned to application": Enterprise applications → select app → Users and groups → + Add user/group → assign the user or their group',
          'AADSTS700016 "Application not found in tenant": verify the app registration exists → check Application ID is correct → for multi-tenant apps verify admin consent is granted',
          'AADSTS50020 "User account from identity provider does not exist": verify UPN domain matches a verified domain, or federation/guest invitation issues',
          'Account locked: Users → select user → Account tab → Sign-in status → set to Allowed → also check Identity Protection for risk detections that may have locked the account',
          'Sign-in logs not showing long history: requires Azure AD P1 license for 30-day retention — free tier keeps 7 days → stream to Log Analytics workspace for longer retention',
        ],
      },
    ],
  },
  {
    id: 'teams-admin',
    title: 'Microsoft Teams Admin Center',
    url: 'admin.teams.microsoft.com',
    icon: '💬',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'The Teams Admin Center manages Teams and channel policies, meeting and calling configurations, voice routing (Direct Routing and Calling Plans), phone number assignment, Teams Rooms, live events, app management, and guest access. Policies follow a hierarchy: Global (org-wide default) policies apply unless a specific named policy is assigned to a user or group. Always create named policies and assign to groups rather than modifying the Global policy.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'View and Manage Teams', path: 'admin.teams.microsoft.com → Teams → Manage teams → Search and select team → View channels, members, settings → Edit team name/description/privacy' },
          { label: 'Create a New Team', path: 'Teams → Manage teams → + Add → Enter team name, description, privacy (Private/Public/Org-wide) → Add owners → Create' },
          { label: 'Archive a Team', path: 'Teams → Manage teams → Select team → Archive → Optionally make SharePoint site read-only → Archive (members can still read content but cannot post)' },
          { label: 'Delete a Team', path: 'Teams → Manage teams → Select team → Delete → Confirm → Restore within 30 days: Teams → Deleted teams → Restore' },
          { label: 'Configure Meeting Policy', path: 'Meetings → Meeting policies → + Add (do not modify Global) → Set options: recording, transcription, lobby bypass, chat, screen sharing, anonymous join → Save → Assign to users/groups' },
          { label: 'Set Meeting Lobby Bypass', path: 'Meetings → Meeting policies → Select policy → Who can bypass the lobby → Everyone / People in my org / People invited / Organizer only → Save' },
          { label: 'Enable/Disable Meeting Recording', path: 'Meetings → Meeting policies → Select policy → Recording & transcription → Allow cloud recording → On/Off → Save' },
          { label: 'Configure Messaging Policy', path: 'Messaging → Messaging policies → + Add policy → Enable/disable: Giphys, memes, stickers, URL previews, read receipts, priority messages, voice messages → Save → Assign' },
          { label: 'Configure Calling Policy', path: 'Voice → Calling policies → + Add policy → Private calls, voicemail, call forwarding, simultaneous ring, busy on busy → Save → Assign to users' },
          { label: 'Assign Phone Number to User', path: 'Voice → Phone numbers → select unassigned number → Edit → Assign to user → Search user → Emergency location → Apply' },
          { label: 'Configure Voice Routing Policy (Direct Routing)', path: 'Voice → Voice routing policies → + Add → Name → Add PSTN usage records → Save → Assign to Direct Routing users' },
          { label: 'Allow/Block Teams App Org-Wide', path: 'Teams apps → Manage apps → Search for app → click app name → Status → Allowed or Blocked → Save' },
          { label: 'Create App Permission Policy', path: 'Teams apps → Permission policies → + Add → Allow Microsoft apps / third-party apps / custom apps (specific or all) → Save → Assign to users' },
          { label: 'Configure Guest Access', path: 'Users → Guest access → Guest access: On → Allow/restrict guest capabilities: calling, meeting, messaging features → Save' },
          { label: 'Manage Teams Rooms Devices', path: 'Teams devices → Teams Rooms on Windows/Android → Select device → View health, software versions, meeting history → Restart remotely → Assign configuration profile' },
          { label: 'Configure Live Events Policy', path: 'Meetings → Live events policies → + Add or edit → Who can schedule → Recording options → Transcription → Save → Assign' },
          { label: 'View Call Analytics for a User', path: 'Users → Manage users → Select user → Meetings & calls tab → Select specific meeting or call → View audio/video quality metrics, packet loss, jitter' },
        ],
      },
      {
        heading: 'Teams Meeting Policies — Key Settings',
        steps: [
          'Navigate to admin.teams.microsoft.com → Meetings → Meeting policies → + Add to create a new policy',
          'Name policy descriptively (e.g. "Standard-Employee-MeetingPolicy" or "Executive-HighSecurity")',
          'General settings: Allow Meet Now in channels → On; Allow Outlook add-in → On; Allow channel meeting scheduling → On',
          'Audio & video: Allow transcription → On; Allow cloud recording → On; Recording storage: OneDrive/SharePoint; Mode for IP audio/video → Outgoing and incoming',
          'Content sharing: Screen sharing mode → Entire screen; Allow participant to give or request control → On; Allow PowerPoint Live → On',
          'Participants & guests: Automatically admit people → People in my org and guests; Allow dial-in users to bypass lobby → Off',
          'Save policy → Assign to users: Teams admin center → Users → select users → Policies tab → Edit → Meeting policy → select new policy → Apply',
          'Assign via PowerShell to a group: Grant-CsTeamsMeetingPolicy -PolicyName "Standard-Employee-MeetingPolicy" -Group "SG-AllEmployees"',
        ],
      },
      {
        heading: 'Direct Routing and Phone Number Assignment',
        steps: [
          'Prerequisites: Teams Phone license assigned to users; Direct Routing SBC registered OR Microsoft Calling Plan purchased',
          'Assign Teams Phone license: M365 Admin Center → Users → select user → Licenses → enable Teams Phone Standard → Save',
          'Assign phone number (Calling Plan): admin.teams.microsoft.com → Voice → Phone numbers → select available number → Assign to user → select user → set emergency location → Apply',
          'For Direct Routing — create PSTN usage records: Voice → Voice routing policies → + Add PSTN usage → name and add routes',
          'Create voice route: Voice → Direct Routing → Voice routes → + Add → Name, priority, number pattern (regex e.g. ^\\+1 for North America), assign PSTN usages → Save',
          'Assign voice routing policy to user: Users → Manage users → select user → Policies tab → Voice routing policy → assign named policy',
          'Verify: user makes a test call from Teams client → check Voice → PSTN call records for success/failure and SIP error codes',
          'Troubleshoot Direct Routing SBC: Voice → Direct Routing → SBCs → check connectivity status is Online → review SBC vendor logs for SIP 4xx/5xx error codes',
        ],
      },
      {
        heading: 'Troubleshooting: Teams Issues',
        steps: [
          'Poor meeting quality: run call analytics: Users → Manage users → select user → Meetings & calls → select meeting → review audio/video quality, packet loss, jitter metrics',
          'Policy not applying to user: Users → Manage users → select user → Policies tab → verify correct policy names — policy assignment can take up to 1 hour to propagate',
          'Guest cannot access team: verify Guest access is enabled org-wide → verify user accepted the invitation → check if Conditional Access blocks guest sign-in → verify guest is added as team member',
          'Teams app blocked for users: Teams apps → Manage apps → search for app → verify status is Allowed → check app permission policies assigned to the user',
          'Phone calls not working (Direct Routing): Voice → Direct Routing → SBCs → check online status → Voice → PSTN call records → filter for failures → check SIP error codes (403 Forbidden, 503 Service Unavailable)',
          'Teams Room not signing in: verify resource account has Teams Rooms license, has Exchange mailbox, shows in Teams admin center → on device re-enter credentials or use Remote Provisioning from Teams admin center',
          'Teams channels not visible to user: check if team is archived (Teams → Manage teams → filter Archived) → check channel moderation settings → verify user is a member of the team',
        ],
      },
    ],
  },
  {
    id: 'sharepoint-admin',
    title: 'SharePoint Admin Center',
    url: 'tenant-admin.sharepoint.com',
    icon: '📁',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content:
          'The SharePoint Admin Center manages all SharePoint Online site collections, including creation, deletion, permissions, storage quotas, external sharing settings, hub site registration, content types, and migration. Every Microsoft 365 Group and Teams team automatically creates a backing SharePoint site. SharePoint serves as the document library backend for Teams file sharing. Key admin tasks: managing site permissions, controlling external sharing, setting storage limits, configuring hub sites, and running the SharePoint Migration Tool.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'View All Sites', path: 'tenant-admin.sharepoint.com → Sites → Active sites → View/filter/sort all site collections by URL, storage used, last activity, template type' },
          { label: 'Create New Team Site', path: 'Sites → Active sites → + Create → Team site (Microsoft 365 Group backed) → Fill name, URL, language → Create' },
          { label: 'Create Communication Site', path: 'Sites → Active sites → + Create → Communication site → Site name, description, language → Select design template (Topic, Showcase, Blank) → Finish' },
          { label: 'Delete a Site Collection', path: 'Sites → Active sites → Select site → Delete → Confirm → Site goes to Deleted sites (retained 93 days)' },
          { label: 'Restore Deleted Site', path: 'Sites → Deleted sites → Select site → Restore → Site returns to active sites with all content intact' },
          { label: 'Manage Site Admins', path: 'Sites → Active sites → Select site → Membership (people icon) → Site admins → + Add → Enter user or group → Save' },
          { label: 'Set Site Storage Quota', path: 'Sites → Active sites → Select site → Storage → Edit → Set custom quota in GB → Save' },
          { label: 'Register Site as Hub Site', path: 'Sites → Active sites → Select site → Hub → Register as hub site → Enter hub name → Save' },
          { label: 'Associate Site to Hub', path: 'Sites → Active sites → Select site → Hub → Associate to hub → Select hub site → Save' },
          { label: 'Configure Org-Wide External Sharing', path: 'Policies → Sharing → SharePoint sharing level: Anyone / New and existing guests / Existing guests / Only people in your org → Also set OneDrive sharing level → Save' },
          { label: 'Configure Per-Site External Sharing', path: 'Sites → Active sites → Select site → Sharing → Sharing level for this site → Set more restrictive than org level if needed → Save' },
          { label: 'View and Revoke Sharing Links', path: 'SharePoint site → Documents library → Manage access → Links tab → Review Anonymous, Company-wide, Specific people links → Revoke as needed' },
          { label: 'Manage Content Types (Tenant Gallery)', path: 'Content services → Content type gallery → + Create content type → Name, parent type, group → Add columns → Publish to sites' },
          { label: 'Configure Device-Based Access Control', path: 'Policies → Access control → Unmanaged devices → Allow full access / Allow limited web-only access / Block access → Save → Requires Entra ID CA integration' },
          { label: 'View Site Usage and Storage Breakdown', path: 'Sites → Active sites → Sort by Storage used → Or select site → Storage tab to see breakdown by document library' },
        ],
      },
      {
        heading: 'Site Permissions Best Practices',
        steps: [
          'Navigate to the site collection → Site settings (gear icon) → Site permissions → or from SharePoint Admin Center → Sites → select site → Membership',
          'Use default permission groups: Visitors (read), Members (contribute), Owners (full control) — do not break inheritance unless absolutely necessary',
          'Add individual users: Site permissions → Share site → enter user email → select permission level → Share',
          'Use Entra ID security groups as members of SharePoint groups — manage membership centrally in Entra ID rather than adding individuals to SharePoint groups',
          'Check unique permissions (broken inheritance): Site settings → Site permissions → Show data at site and library level → review libraries with unique permissions',
          'Remove external user access: Site settings → Site permissions → External sharing → Manage external users → Remove individual guest users',
          'Audit sharing links regularly: Documents library → Manage access → Links tab → review and revoke anonymous or company-wide links older than 90 days',
        ],
      },
      {
        heading: 'External Sharing Configuration',
        steps: [
          'Navigate to SharePoint Admin Center → Policies → Sharing',
          '"Anyone" (most permissive): allows anonymous links — no sign-in required — use only if required for external collaboration',
          '"New and existing guests": guests must sign in or create Microsoft account — tracked and auditable — recommended for most organizations',
          '"Existing guests only": only guests already in Entra ID directory can access — most controlled guest sharing',
          '"Only people in your org": no external sharing at all — maximum restriction',
          'Set link defaults: Default link type → Specific people; Default link permission → View (not Edit) — reduces accidental oversharing',
          'Set link expiration: Anyone links expire after X days (e.g. 30); restrict domains to allow only specific partner domains',
          'Audit external sharing: M365 Admin Center → Reports → Usage → SharePoint → Site usage → check sharing metrics',
        ],
      },
      {
        heading: 'SharePoint Migration Tool (SPMT)',
        steps: [
          'Download SPMT from microsoft.com/en-us/download/details.aspx?id=55234 — install on Windows machine with network access to source files',
          'Launch SPMT → Sign in with SharePoint admin credentials → Start your first migration',
          'Select source: File share (local or UNC path), SharePoint on-premises, or OneDrive/SharePoint Online',
          'Select destination: enter target SharePoint Online site URL and document library',
          'Run assessment scan first: identifies files with long paths (over 400 chars), special characters, large files → fix issues before migration',
          'Set migration options: file version limits, preserve permissions, send email notification on completion → Start migration',
          'Monitor progress in SPMT → view detailed report per file (Success / Skipped / Failed with reason)',
          'Post-migration: spot-check files in destination → test user access → update bookmarks and links → decommission source after confirmation period',
        ],
      },
      {
        heading: 'Troubleshooting: SharePoint Issues',
        steps: [
          'Access denied to site: check user is in correct SharePoint group or Entra ID group → verify external sharing settings if user is a guest → check if Conditional Access blocks unmanaged devices',
          'Site not appearing in SharePoint home or search: new sites take up to 24 hours to index → verify site has not been hidden from search (Site settings → Search and offline availability → Indexing)',
          'Storage quota exceeded: Sites → select site → Storage → increase quota → or clean up large files → enable version limits at library level (Library settings → Versioning → set major version limit to 50)',
          'External sharing link not working: link may have expired → re-share → verify recipient is not blocked by domain restrictions → check if guest MFA Conditional Access is blocking sign-in',
          'Broken inheritance causing permission issues: use "Check permissions" at site collection level → enter user email → see all permission paths → identify the problematic unique permission',
          'SPMT errors — path too long: file path over 400 characters → rename folders to shorten → special characters (* : < > ? / \\) → rename files → retry during off-hours',
          'Hub navigation not updating: hub site changes propagate within hours → trigger manually by publishing the hub site home page → verify site is properly associated to hub',
        ],
      },
    ],
  },
  {
    id: 'microsoft-defender',
    title: 'Microsoft Defender (XDR)',
    url: 'security.microsoft.com',
    icon: '🛡️',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'Microsoft Defender XDR (Extended Detection and Response) at security.microsoft.com unifies Defender for Endpoint (EDR for devices), Defender for Office 365 (Safe Links, Safe Attachments, anti-phishing), Defender for Identity (on-premises AD monitoring), and Defender for Cloud Apps (CASB). Key workflows: monitor Secure Score, investigate Incidents, hunt threats with Advanced Hunting (KQL), manage email security policies, onboard devices to EDR, and run automated investigation and response.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'View Secure Score', path: 'security.microsoft.com → Secure score → Current score and improvement actions → Filter by product (Identity, Devices, Apps) → Click action for recommended implementation steps' },
          { label: 'Investigate Active Incidents', path: 'Incidents & alerts → Incidents → Sort by severity → Select incident → View attack story, impacted entities, evidence, timeline, alerts → Assign to analyst → Set status' },
          { label: 'Review and Triage Alerts', path: 'Incidents & alerts → Alerts → Filter by category, severity, service source → Select alert → View details, entity page, related events → Take action or Suppress' },
          { label: 'Use Threat Explorer (Email)', path: 'Email & collaboration → Explorer → Select view: Malware / Phish / All email → Filter by sender, subject, recipient, date → Select messages → Actions: Soft delete, Hard delete, Move to inbox' },
          { label: 'Configure Safe Links Policy', path: 'Email & collaboration → Policies & rules → Threat policies → Safe Links → + Create policy → Name → Users/Groups/Domains → Enable URL scanning for email/Teams/Office apps → Block malicious URLs on click → Save' },
          { label: 'Configure Safe Attachments Policy', path: 'Email & collaboration → Policies & rules → Threat policies → Safe Attachments → + Create policy → Name → Users/Groups/Domains → Action: Block / Dynamic Delivery / Replace → Enable redirect → Save' },
          { label: 'Configure Anti-Phishing Policy', path: 'Email & collaboration → Policies & rules → Threat policies → Anti-phishing → + Create → Impersonation protection: protected users (VIPs), protected domains → Enable mailbox intelligence → Actions for impersonation attempts → Save' },
          { label: 'Manage Email Quarantine', path: 'Email & collaboration → Review → Quarantine → Filter by reason (malware, high confidence phish, spam) → Preview → Release to recipients → Submit false positive to Microsoft' },
          { label: 'Onboard Device to MDE (Windows)', path: 'Settings → Endpoints → Device management → Onboarding → Windows 10/11 → Download onboarding package → Run .cmd as administrator on device → Verify in Devices list within 10 minutes' },
          { label: 'Isolate Compromised Device', path: 'Assets → Devices → Select device → Device actions → Isolate device → Enter justification → Confirm → Device loses all network connectivity except to Defender portal' },
          { label: 'Run Antivirus Scan on Device', path: 'Assets → Devices → Select device → Device actions → Run antivirus scan → Quick scan or Full scan → Confirm → View scan results in device timeline' },
          { label: 'Run Advanced Hunting Query', path: 'Hunting → Advanced hunting → New query → Write KQL query against 30-day tables (DeviceEvents, EmailEvents, etc.) → Run → Review results → + Create detection rule from query' },
          { label: 'Add File Hash to Block List (IOC)', path: 'Settings → Endpoints → Indicators → File hashes → + Add item → Enter SHA256 hash → Action: Block and remediate → Title and description → Save' },
          { label: 'Configure Attack Surface Reduction Rules', path: 'Endpoints → Configuration management → Endpoint security policies → + Create policy → Windows 10/11 → Attack surface reduction rules → Enable rules in Audit mode first → Review 30 days → Switch to Block mode' },
        ],
      },
      {
        heading: 'Respond to Phishing Email Incident',
        steps: [
          'Open incident: Incidents & alerts → Incidents → filter "Phishing" category → open incident',
          'Review attack story graph: identifies initial phishing email, URL clicks, account compromises, and lateral movement',
          'Find all affected recipients: Email & collaboration → Explorer → Phish view → filter by sender domain/subject',
          'Remove phishing emails: select all copies across mailboxes → Actions → Soft delete (moves to Deleted Items) or Hard delete (removes from all mailboxes) → Confirm',
          'Check who clicked the link: Explorer → URL clicks tab → identify users → prioritize for investigation',
          'For users who clicked: Entra ID → Sign-in logs → check for suspicious sign-in → Identity Protection → review risk detections',
          'Reset passwords for compromised accounts: Entra ID → Users → Reset password → require change on next sign-in → revoke all sessions',
          'Check for malicious forwarding rules: Exchange Admin Center → Mailboxes → select affected user → Email forwarding → disable any suspicious forwarding',
          'Submit phishing email: Email & collaboration → Submissions → + Submit → Phish → paste message ID or upload EML → Submit to Microsoft for analysis',
        ],
      },
      {
        heading: 'Advanced Hunting — Example KQL Queries',
        steps: [
          'DeviceLogonEvents | where LogonType == "Interactive" | where IsLocalAdmin == true | where AccountDomain != DeviceName | summarize count() by AccountName, DeviceName | order by count_ desc — Local admin logons from domain accounts (lateral movement indicator)',
          'EmailEvents | where DeliveryAction == "Blocked" | summarize count() by SenderFromAddress, RecipientEmailAddress, Subject | order by count_ desc — Top blocked emails by sender',
          'DeviceProcessEvents | where FileName =~ "powershell.exe" | where ProcessCommandLine has_any ("-EncodedCommand", "-enc", "IEX", "Invoke-Expression", "DownloadString") | project Timestamp, DeviceName, AccountName, ProcessCommandLine | order by Timestamp desc — Suspicious PowerShell execution',
          'IdentityLogonEvents | where LogonType == "Failed" | summarize FailCount=count() by AccountUpn, IPAddress | where FailCount > 10 | order by FailCount desc — Brute force attempts (more than 10 failed logons per IP)',
          'EmailAttachmentInfo | where FileType has_any ("exe","vbs","js","lnk","bat","cmd") | join EmailEvents on NetworkMessageId | project Timestamp, RecipientEmailAddress, FileName, FileType, SenderFromAddress, Subject — Emails with executable attachments',
        ],
      },
      {
        heading: 'Troubleshooting: Defender Issues',
        steps: [
          'Device not appearing after onboarding: wait 10 minutes → verify onboarding script ran as admin and returned exit code 0 → check Windows Event Viewer → Application → look for MsSense or DiagTrack service errors',
          'Safe Links not scanning URLs: verify Safe Links policy covers the user → check if URL is in the "Do not rewrite the following URLs" allow list → verify policy is not in Off mode',
          'False positive file blocked by MDE: Assets → Devices → find device → Device timeline → find block event → copy SHA256 → Settings → Endpoints → Indicators → + Add → File → enter hash → Allow → Add note',
          'Anti-phishing not catching impersonation: verify protected users list includes VIP email addresses → check if sender domain is in allowed senders list → review mailbox intelligence settings',
          'Secure Score action not updating: some improvements require 24 hours to reflect → verify the action was completed correctly per the guidance in the action detail page',
          'Alert fatigue / too many low-value alerts: tune alert thresholds → suppress known-good alerts with suppression rules → customize detection rules → prioritize by MITRE ATT&CK tactic (Initial Access, Execution, Persistence are highest priority)',
        ],
      },
    ],
  },
  {
    id: 'intune-endpoint-manager',
    title: 'Microsoft Intune / Endpoint Manager',
    url: 'intune.microsoft.com',
    icon: '💻',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content:
          'Microsoft Intune provides Mobile Device Management (MDM) and Mobile Application Management (MAM) for Windows, macOS, iOS, Android, and Linux. Key capabilities: device enrollment, compliance policies (mark devices compliant/non-compliant for Conditional Access enforcement), configuration profiles (deploy OS and security settings at scale), application deployment, BitLocker encryption management, Windows Autopilot for zero-touch provisioning, and MAM app protection policies for BYOD scenarios without full device enrollment.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'View All Enrolled Devices', path: 'intune.microsoft.com → Devices → All devices → Filter by OS, compliance state, ownership (Corporate/Personal) → Select device for details' },
          { label: 'Configure MDM Enrollment Scope', path: 'Devices → Enroll devices → Windows enrollment → Automatic enrollment → MDM user scope: All or Some (add group) → MAM user scope → Save' },
          { label: 'Enroll Windows Device Manually', path: 'On device: Settings → Accounts → Access work or school → + Connect → Sign in with M365 account → MDM enrollment triggered automatically if user is in MDM scope' },
          { label: 'Create Device Compliance Policy', path: 'Devices → Compliance → + Create policy → Select platform (Windows/iOS/Android/macOS) → Configure rules: require BitLocker, min OS version, require password, no jailbreak → Assignments → Select groups → Create' },
          { label: 'View Device Compliance Status', path: 'Devices → Monitor → Compliance status → View compliant vs non-compliant count → Select non-compliant device → Compliance tab → See failed rules and reasons' },
          { label: 'Create Configuration Profile', path: 'Devices → Configuration → + Create → New policy → Platform → Profile type (Device restrictions, Wi-Fi, VPN, Certificate, Endpoint protection) → Configure settings → Assignments → Create' },
          { label: 'Deploy Microsoft 365 Apps', path: 'Apps → All apps → + Add → Microsoft 365 Apps for Windows 10 and later → Configure suite: Word, Excel, PowerPoint, Outlook, Teams → Assign to "All Devices" or group → Add' },
          { label: 'Deploy Custom Win32 App', path: 'Apps → All apps → + Add → Windows app (Win32) → Upload .intunewin file → Configure detection rules → Assign → Add' },
          { label: 'Remote Wipe Device', path: 'Devices → All devices → Select device → … → Wipe (factory reset, removes all data including personal) or Retire (removes company data only, leaves personal data) → Confirm' },
          { label: 'Enable BitLocker via Endpoint Security', path: 'Endpoint security → Disk encryption → + Create policy → Windows 10/11 → BitLocker → Enable BitLocker for OS drives: Required → Encryption method: XTS-AES 256-bit → Assign → Create' },
          { label: 'View BitLocker Recovery Keys', path: 'Devices → All devices → Select device → Recovery keys → View BitLocker recovery key (requires Key Vault Administrator or appropriate Intune admin role)' },
          { label: 'Set Up Windows Autopilot', path: 'Devices → Enrollment → Windows enrollment → Deployment profiles → + Create profile → Configure OOBE → Assign to device group → Register hardware IDs: Devices → Enrollment → Windows Autopilot → Import CSV' },
          { label: 'Configure MAM App Protection Policy (BYOD)', path: 'Apps → App protection policies → + Create policy → iOS/iPadOS or Android → Name → Apps: target managed apps (Outlook, Teams, Edge) → Data protection, access requirements, conditional launch → Assignments → Create' },
          { label: 'Run Remote Actions on Device', path: 'Devices → select device → … menu → Sync (force check-in), Restart, Collect diagnostics, Locate device, Run remediation script, Fresh start (Windows)' },
        ],
      },
      {
        heading: 'Create Windows Compliance Policy — Key Settings',
        steps: [
          'Navigate to intune.microsoft.com → Devices → Compliance → Policies → + Create policy → Platform: Windows 10 and later → Next',
          'Device Health: Require BitLocker → Yes; Require Secure Boot → Yes; Require code integrity → Yes',
          'Device Properties: Minimum OS version → 10.0.19045 (Win10 22H2) or higher as needed',
          'System Security: Require password → Yes; Minimum length → 8 characters; Complex password → Yes; Inactivity before lock → 15 minutes',
          'Microsoft Defender for Endpoint: Machine risk score → Low (blocks enrollment from High/Medium risk devices)',
          'Actions for noncompliance: Mark as non-compliant immediately → Send email to user (1 day later) → optional: Retire device (90 days)',
          'Assignments → Include: Entra ID group "SG-AllManagedDevices" → Review + Create',
          'Pair with Conditional Access in Entra ID: require device compliance for access to cloud apps → non-compliant devices blocked from Exchange/SharePoint/Teams',
        ],
      },
      {
        heading: 'Windows Autopilot — Zero-Touch Provisioning',
        steps: [
          'Obtain hardware hash CSV from new device: run PowerShell as admin → Install-Script -Name Get-WindowsAutoPilotInfo → Get-WindowsAutoPilotInfo -OutputFile "C:\\AutoPilot-Hash.csv"',
          'Upload hash: intune.microsoft.com → Devices → Enrollment → Windows Autopilot → Import → upload CSV → sync takes ~15 minutes',
          'Create deployment profile: Devices → Enrollment → Windows enrollment → Deployment profiles → + Create profile → Windows PC',
          'OOBE settings: Deployment mode → User-driven; Join type → Microsoft Entra ID joined (cloud-only) or Hybrid Azure AD joined (on-prem AD)',
          'Skip screens: Privacy settings → Yes; License agreement → Yes; Change account setup options → Yes',
          'Assign profile to device group or All Autopilot devices',
          'Create Enrollment Status Page: Devices → Enrollment → Enrollment status page → + Create → Block device use until required apps installed → assign same group',
          'User powers on new device → connects to internet → signs in with M365 credentials → OOBE completes automatically → Intune pushes all profiles and apps → device ready to use without IT touching the machine',
        ],
      },
      {
        heading: 'App Protection Policy (MAM) for BYOD',
        steps: [
          'Navigate to Apps → App protection policies → + Create policy → Select iOS/iPadOS (repeat for Android separately)',
          'Name: "BYOD-iOS-AppProtection" → Next',
          'Apps: Select public apps → Add Microsoft Outlook, Microsoft Teams, Microsoft Edge, Microsoft OneDrive → Next',
          'Data protection: Backup org data to iTunes/iCloud → Block; Send org data to other apps → Policy managed apps only; Receive data from other apps → Policy managed apps only; Restrict cut/copy/paste → Policy managed apps with paste in; Screen capture → Block (Android)',
          'Access requirements: PIN for access → Require; PIN type → Numeric; Attempts before reset → 5; Biometric instead of PIN → Allow; Recheck access after inactivity → 30 minutes',
          'Conditional launch: Offline grace period → 720 hours then Wipe; Jailbroken/rooted devices → Wipe; Min app version for Outlook → warn or block below minimum version',
          'Assignments → Include: All users or BYOD user group → Create',
          'Users only need to sign in with M365 account within each managed app — no full device enrollment required → company data protected within managed app boundary',
        ],
      },
      {
        heading: 'Troubleshooting: Intune Device Issues',
        steps: [
          'Device not enrolling: verify MDM scope includes the user → verify user has Intune license → check Entra ID join status on device: Settings → Accounts → Access work or school → should show connected',
          'Compliance policy not applying: force sync: Devices → select device → Sync → wait 5-10 minutes → Compliance tab for updated status',
          'Configuration profile not applying: Devices → select device → Device configuration → check profile state (Success/Pending/Error) → click profile for specific error details and failed settings',
          'App deployment failing: Devices → select device → Apps → find app → Installation status and error code → 0x87D1041C = app not compatible with device OS version',
          'BitLocker key not escrowing to Intune: verify "Save BitLocker recovery information to Azure AD" is in BitLocker policy → Devices → Recovery keys → if blank, re-push policy → review device configuration status',
          'Autopilot failing at enrollment: check internet connectivity to *.manage.microsoft.com → verify hardware hash was uploaded → check Enrollment Status Page logs at %windir%\\temp\\IntuneManagementExtension.log',
          'MAM policy not working on personal device: verify app protection policy is assigned → user must sign in with work account in each managed app → check App protection status: Apps → Monitor → App protection status → select user',
        ],
      },
    ],
  },
  {
    id: 'microsoft-purview',
    title: 'Microsoft Purview (Compliance)',
    url: 'compliance.microsoft.com',
    icon: '⚖️',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'Microsoft Purview (formerly Microsoft 365 Compliance Center) provides data governance, risk, and compliance capabilities. Key features: Data Loss Prevention (DLP) to prevent sharing of sensitive data, Sensitivity Labels for classification and encryption, Retention Labels and Policies for information lifecycle management, eDiscovery for legal hold and content search, Communication Compliance for monitoring regulated communications, Audit Log for forensic investigation, and Information Barriers for ethical walls between departments.',
      },
      {
        heading: 'Portal Navigation',
        items: [
          { label: 'Create DLP Policy (from template)', path: 'compliance.microsoft.com → Solutions → Data loss prevention → Policies → + Create policy → Choose template (Financial, Medical, GDPR, etc.) → Name → Locations → Configure rules → Actions → Create' },
          { label: 'Create Custom DLP Rule', path: 'DLP → Policies → select policy → Edit → Rules → + Create rule → Conditions: content contains sensitive info type → Actions: restrict access, send incident report, notify user → User notification message → Save' },
          { label: 'View DLP Policy Matches and Reports', path: 'DLP → Reports → DLP policy matches → Filter by policy, location, severity → Click event for details and review whether override was granted' },
          { label: 'Create Sensitivity Label', path: 'Solutions → Information protection → Labels → + Create a label → Name, display name, description → Scope: Items/Groups/Sites → Encryption settings → Content marking (header/footer/watermark) → Auto-labeling → Finish' },
          { label: 'Publish Sensitivity Labels (Label Policy)', path: 'Information protection → Label policies → + Create a policy → Select labels to publish → Choose users/groups → Policy settings (require label, default label) → Name policy → Publish' },
          { label: 'Create Retention Policy', path: 'Solutions → Records management → Retention policies → + New retention policy → Name → Locations (Exchange, SharePoint, OneDrive, Teams) → Retention settings: retain for X years → Keep or delete at end → Publish' },
          { label: 'Create Retention Label', path: 'Records management → Retention labels → + Create a label → Name → Retention settings: retain for / delete after / mark as record → Create → Publish or auto-apply' },
          { label: 'Auto-Apply Retention Label', path: 'Records management → Retention labels → Select label → Auto-apply label → Apply to content containing sensitive info OR specific keyword → Locations → Review and create' },
          { label: 'Start eDiscovery Case', path: 'Solutions → eDiscovery → Standard or Premium → + Create a case → Name → Add case members → Open case → Use Holds, Searches, Exports tabs' },
          { label: 'Place Content on Legal Hold', path: 'eDiscovery → select case → Holds tab → + Create hold → Name → Locations (Exchange mailboxes, SharePoint sites, Teams) → Query conditions (optional) → Create hold' },
          { label: 'Run Content Search (eDiscovery)', path: 'eDiscovery → select case → Searches tab → + New search → Locations → Keywords, date ranges, file types → Run → Review statistics → Preview results → Export' },
          { label: 'Export eDiscovery Results', path: 'eDiscovery → select case → select search → Actions → Export → Choose export options (deduplication, format) → Export → Download via eDiscovery Export Tool' },
          { label: 'View Audit Log', path: 'Solutions → Audit → New search → Date range → Activities (Deleted file, Added member to group, Changed permission) → Users → File/folder → Search → Export as CSV' },
          { label: 'Configure Communication Compliance', path: 'Solutions → Communication compliance → Policies → + Create policy → Choose template (Detect inappropriate text, Regulatory compliance) → Supervision scope → Reviewers → Create' },
          { label: 'Create Information Barrier Policy', path: 'Solutions → Information barriers → Policies → + Create policy → Name → Segment (e.g. Investment Banking) → Block segment (e.g. Retail Trading) → Apply policies → Activate' },
        ],
      },
      {
        heading: 'Create DLP Policy for Credit Card Numbers — Step by Step',
        steps: [
          'Navigate to compliance.microsoft.com → Solutions → Data loss prevention → Policies → + Create policy',
          'Start from template: Financial → U.S. Financial Data → Next',
          'Name: "Protect Credit Card Numbers - Outbound" → add description → Next',
          'Locations: Exchange email On, SharePoint sites On, OneDrive On, Teams messages On → Next',
          'Configure policy settings → Create or customize advanced DLP rules → + Create rule',
          'Rule conditions: Content contains → Sensitive info types → Credit Card Number → Confidence: High → Instance count: 1 to Any',
          'Actions: Restrict access → Encrypt email in Microsoft 365 locations (or Block everyone except content owner)',
          'User notification: notify user with email and in-app policy tip → customize message: "This message may contain credit card data. Do not share externally."',
          'User override: allow business justification override → require written justification → log override to audit log',
          'Incident reports: send alert to compliance admin when rule matches → severity High',
          'Save rule → Next → Test in simulation mode for 7 days → review DLP reports → then turn policy On',
        ],
      },
      {
        heading: 'Sensitivity Labels — Classification and Encryption',
        steps: [
          'Plan label taxonomy: Public → Internal → Confidential → Highly Confidential (with sub-labels if needed, e.g. Confidential-Legal, Confidential-Finance)',
          'Create label: Information protection → Labels → + Create a label → Name: "Highly Confidential" → Scope: Items (Files & emails) → Next',
          'Encryption: Encrypt emails and files → Assign permissions now → Add users/groups → Permissions: Co-Author for team, Viewer for others → Content expires: Never or set date → Next',
          'Content marking: Add header "HIGHLY CONFIDENTIAL" → Add footer with legal text → Add watermark → Next',
          'Auto-labeling: if content contains SSN or financial data → automatically apply this label → set simulation mode first → Next',
          'Review and create → Publish label in a label policy: Label policies → + Create a policy → select labels → assign to all users → require label → set default label for documents → Publish',
          'Test: in Office apps (Word, Outlook) → verify label picker shows labels → apply Highly Confidential → verify encryption and markings appear',
          'Review label usage: Information protection → Overview → label usage dashboard shows adoption metrics',
        ],
      },
      {
        heading: 'eDiscovery — Legal Hold Workflow',
        steps: [
          'Receive legal hold request: identify custodians (employees involved), date range, relevant content types',
          'Create case: eDiscovery → Premium (or Standard) → + Create a case → Name with case number → Add lawyers as members → Create → Open case',
          'Add custodian holds: Holds tab → + Add custodian holds → Search employee by name → Verify Exchange and OneDrive locations → Create hold',
          'Non-custodial holds: Holds tab → + Create hold → Non-custodial → add specific SharePoint sites or shared mailboxes → Apply hold',
          'Confirm hold is applied: Holds tab status shows "On" → custodians receive email notification',
          'Run searches: Searches tab → + New search → Keywords and date range → Locations: custodian data sources → Run → Review statistics → Add to review set',
          'Export: review set → Export → choose format (PST for email, original files) → download with eDiscovery Export Tool → provide to legal team',
          'Release hold when no longer needed: Holds tab → select hold → Delete hold → items are no longer held (data not deleted immediately, standard retention policies apply)',
        ],
      },
      {
        heading: 'Troubleshooting: Compliance Issues',
        steps: [
          'DLP policy not detecting sensitive data: verify sensitive info type confidence level is correct → test with DLP simulation mode → check if content is encrypted (DLP cannot scan encrypted content without appropriate license)',
          'Retention policy not applying to Teams messages: Teams retention requires Teams location to be selected — not covered by Exchange location → verify Teams (messages) is enabled in policy locations',
          'Sensitivity label not showing in Office apps: verify label policy is published and assigned to the user → sync takes up to 24 hours → user must sign in to M365-connected Office apps → verify Office version is current',
          'Audit log search returning no results: check if the activity type is selected in the filter → some admin activities have up to 24-hour logging delay → verify audit logging is enabled: Audit → Audit log status',
          'eDiscovery export failing: verify you are using the eDiscovery Export Tool (not browser download) → check you have Reviewer role in the case → large exports may take hours → check export job status',
          'Information barrier policy not enforced: verify policies are Applied (not Draft) → barriers take 24 hours to fully apply → verify users are properly segmented via Entra ID attributes',
        ],
      },
    ],
  },
]

export default function MS365Page() {
  return (
    <>
      <TopBar
        title="Microsoft 365 Admin Guide"
        subtitle="Exchange Online, Entra ID, Teams, SharePoint, Defender, Intune, Purview, and M365 Admin Center"
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={MS365_DOCS} />
        </div>
      </div>
    </>
  )
}

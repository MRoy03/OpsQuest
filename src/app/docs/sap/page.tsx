import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

const SAP_DOCS = [
  {
    id: 'sap-overview',
    title: 'SAP S/4HANA Public Cloud — Overview',
    url: 'your-tenant.s4hana.ondemand.com',
    icon: '🏢',
    color: 'amber',
    sections: [
      {
        heading: 'Architecture Overview',
        content: 'SAP S/4HANA Public Cloud is a SaaS ERP delivered by SAP on a multi-tenant cloud infrastructure. It is updated quarterly by SAP with no infrastructure management required from customers. Access is via the SAP Fiori Launchpad. Business Configuration (BTP) handles customization. Side-by-side extensions run on SAP BTP.',
      },
      {
        heading: 'Key Roles',
        items: [
          { label: 'IT Administrator', path: 'Manages users, authorizations, business roles, integration, and system monitoring' },
          { label: 'Key User', path: 'Configures business processes using Business Configuration apps — no ABAP required' },
          { label: 'Business User', path: 'Operates within Fiori Launchpad with assigned business roles' },
          { label: 'Support User', path: 'Has access to monitor jobs, application logs, and raise SAP incidents' },
        ],
      },
    ],
  },
  {
    id: 'sap-fiori',
    title: 'SAP Fiori Launchpad Administration',
    url: '/ui#Shell-home',
    icon: '🎯',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content: 'Fiori Launchpad is the entry point for all S/4HANA users. It provides tile-based navigation to business apps. IT Admins control which tiles appear per role using Launchpad Designer and Business Role management.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Assign App to Role', path: 'Fiori Launchpad → Launchpad Designer → Catalogs → Add app tile → Assign to Group and Catalog → Assign Catalog to Business Role' },
          { label: 'Create Business Role', path: 'SAP Fiori → Maintain Business Roles app → + New → Define role and assign business catalogs' },
          { label: 'Assign User to Role', path: 'Maintain Business Users app → Select user → Assign Business Roles → + Add roles' },
          { label: 'Manage Space/Page', path: 'My Home → Edit Mode → Create new Page → Add Section → Assign tiles from catalog' },
          { label: 'View User Activity', path: 'SAP HANA Cockpit or system monitoring apps for user session data' },
        ],
      },
      {
        heading: 'Troubleshooting: App/Tile Not Visible',
        steps: [
          'Verify user has the correct Business Role assigned: Maintain Business Users → Check roles',
          'Confirm the Business Catalog containing the app is assigned to the Business Role',
          'Check if the app tile is added to a Catalog and Group in Launchpad Designer',
          'Verify IAM authorization: Maintain Business Roles → Access Categories → Check field-level restrictions',
          'Clear browser cache and reload Fiori Launchpad',
          'Check if the user is assigned to the correct plant/company code/organizational unit if required by the app',
        ],
      },
      {
        heading: 'Troubleshooting: Fiori App Error / Crash',
        steps: [
          'Open Application Logs app: search for errors related to the app function and user',
          'Check the app\'s communication arrangement: Maintain Communication Arrangements → Verify setup',
          'Review job/background task if app triggers async processing: Application Jobs app',
          'If a UI5 JS error: open browser console (F12) → check for JavaScript exceptions or network failures',
          'Raise an incident to SAP via the Support Portal if standard config is correct and error persists',
        ],
      },
    ],
  },
  {
    id: 'sap-users',
    title: 'User & Authorization Management',
    icon: '👥',
    color: 'amber',
    sections: [
      {
        heading: 'User Management in SAP S/4HANA Cloud',
        content: 'Users in S/4HANA Public Cloud are managed via the Identity Authentication Service (IAS) and SAP BTP. The Maintain Business Users app links IAS identities to SAP business roles and organizational assignments.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Create New User', path: 'SAP Identity Authentication Service (IAS) admin console → Users → + Add user → Set email, name, user type → Send activation email' },
          { label: 'Link User to SAP System', path: 'Maintain Business Users app → + New → Enter User ID → Assign business roles and valid-from date' },
          { label: 'Reset Password', path: 'IAS Admin Console → Users → Select user → Password → Send Reset Email' },
          { label: 'Lock / Unlock User', path: 'Maintain Business Users → Select user → Lock user (sets validity end date to today)' },
          { label: 'Configure MFA', path: 'IAS Admin Console → Applications → S/4HANA → Authenticating Identity Provider → Risk-Based Authentication → Add MFA rule' },
        ],
      },
      {
        heading: 'Troubleshooting: Authorization Error (No Authorization)',
        steps: [
          'Note the exact authorization object and field values from the error popup',
          'Open the Maintain Business Roles app → Find the user\'s role → Check restriction types',
          'If using restriction type "Unrestricted" for the required access: confirm and republish role',
          'Use Authorization Trace (transaction SU53 not available in cloud — use Application Logs instead)',
          'Check if the issue is field-level restriction: e.g. user can see Sales Orders only for their org unit',
          'For missing apps/features: add the required Business Catalog to the Business Role',
        ],
      },
    ],
  },
  {
    id: 'sap-integration',
    title: 'Integration Suite & APIs',
    url: 'SAP Integration Suite on BTP',
    icon: '🔗',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content: 'SAP Integration Suite (on BTP) is used to connect S/4HANA with external systems. Communication Arrangements define inbound/outbound APIs. SAP provides pre-built integration packages in the Integration Content Catalog.',
      },
      {
        heading: 'Common Tasks',
        items: [
          { label: 'Create Communication System', path: 'Maintain Communication Systems app → + New → Define hostname, auth method (OAuth/Basic) → Save' },
          { label: 'Create Communication Arrangement', path: 'Maintain Communication Arrangements → + New → Select scenario → Link to Communication System → Configure' },
          { label: 'Set Up OData API Access', path: 'Communication Arrangement → Select OData service scenario → Generate credentials → Use in external system' },
          { label: 'Monitor Integration Errors', path: 'SAP Integration Suite → Monitor → Message Processing → Filter by status "Failed" → View error details' },
        ],
      },
      {
        heading: 'Troubleshooting: Integration Failing',
        steps: [
          'Check Message Monitor in Integration Suite: are messages failing? Note error category (Authorization, Technical)',
          'Verify credentials in Communication Arrangement are valid and not expired',
          'Check if the API endpoint is correct — S/4HANA may have updated URLs after a quarterly upgrade',
          'Test the OData API directly using Postman or API Explorer with the generated credentials',
          'Review firewall/IP allowlist: external system must be reachable from BTP runtime',
          'Raise an SAP support message at support.sap.com if the issue is in SAP-delivered iFlow',
        ],
      },
    ],
  },
]

export default function SAPPage() {
  return (
    <>
      <TopBar title="SAP S/4HANA Public Cloud" subtitle="Fiori, Users, Authorization, Integration — complete admin reference" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={SAP_DOCS} />
        </div>
      </div>
    </>
  )
}

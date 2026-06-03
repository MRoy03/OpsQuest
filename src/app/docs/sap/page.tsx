import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

const SAP_DOCS = [
  {
    id: 'sap-overview',
    title: 'SAP S/4HANA Public Cloud — Overview & Architecture',
    url: 'your-tenant.s4hana.ondemand.com',
    icon: '🏢',
    color: 'cyan',
    sections: [
      {
        heading: 'Architecture Overview',
        content:
          'SAP S/4HANA Public Cloud is a fully managed SaaS ERP delivered on SAP\'s multi-tenant cloud infrastructure. SAP handles all infrastructure, database (SAP HANA), and application patching — customers receive quarterly feature releases automatically. All configuration is done through Business Configuration apps (no ABAP customizing) using a fit-to-standard methodology. Side-by-side extensions and integrations run on SAP Business Technology Platform (BTP). The Universal Journal (table ACDOCA) unifies FI, CO, and logistics postings into a single data model, eliminating reconciliation between modules.',
      },
      {
        heading: 'Deployment & Tenants',
        content:
          'Each customer receives a three-system landscape: Development (DEV), Quality/Test (QA), and Production (PRD). Changes flow via the Business Configuration Transport Management — there is no classical ABAP Workbench or CTS. All tenants share the same SAP-managed codebase, so only SAP-supported configuration is possible. Customer-specific logic is implemented via BTP extensions using side-by-side or in-app extensibility (key user tools).',
      },
      {
        heading: 'Key Personas',
        items: [
          { label: 'IT Administrator', path: 'Manages users via IAS, configures business roles, sets up communication arrangements, monitors background jobs and system health' },
          { label: 'Key User / Business Configuration Expert', path: 'Configures business processes using Business Configuration apps — no ABAP required; manages org structure, document types, number ranges' },
          { label: 'Business User', path: 'Operates within Fiori Launchpad with role-based tile access; enters transactions, approves workflows, views analytics' },
          { label: 'Support / Basis Consultant', path: 'Monitors application logs, manages background jobs, handles integration errors, raises SAP incidents via support.sap.com' },
          { label: 'Integration Developer', path: 'Builds and monitors integration flows in SAP Integration Suite on BTP; manages communication systems and arrangements' },
        ],
      },
      {
        heading: 'Fiori Launchpad Entry Points',
        items: [
          { label: 'Fiori Launchpad', path: 'https://<tenant>.s4hana.ondemand.com/ui#Shell-home' },
          { label: 'Business Configuration', path: 'Fiori → Business Configuration app → Scope & Organization → Project-based configuration' },
          { label: 'SAP BTP Cockpit', path: 'https://cockpit.btp.cloud.sap → Manage subaccounts, services, integration suite' },
          { label: 'SAP Identity Authentication Service', path: 'https://<tenant>.accounts.ondemand.com/admin → User lifecycle, MFA, SSO policies' },
          { label: 'SAP Support Portal', path: 'https://support.sap.com → Incidents, SAP Notes, Knowledge Base' },
          { label: 'SAP Me (My Experiences)', path: 'https://me.sap.com → Contract, user management delegation, system data' },
        ],
      },
      {
        heading: 'Quarterly Upgrade Checklist',
        steps: [
          'Review SAP release notes in the What\'s New Viewer (help.sap.com/whats-new) for your release date',
          'Check the Simplification List for any deprecated features or mandatory configuration activities',
          'Run pre-upgrade consistency checks in Business Configuration if provided by SAP',
          'Validate all active integration flows in Integration Suite after upgrade weekend',
          'Test critical business processes in QA tenant (SAP upgrades QA first, then PRD ~2 weeks later)',
          'Review any new mandatory Business Catalogs that need to be assigned to existing roles',
          'Communicate downtime windows to users (typically Saturday night maintenance windows)',
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
        content:
          'SAP Fiori Launchpad is the single entry point for all S/4HANA Public Cloud users. It provides a tile-based homepage where each tile launches a Fiori app (transactional, analytical, or factsheet). IT Admins control the available tiles using Launchpad Designer and Business Role management. Spaces and Pages replace the older Launchpad Designer groups in newer releases — Pages contain Sections with tiles organized by business area.',
      },
      {
        heading: 'Key Admin Apps',
        items: [
          { label: 'Maintain Business Roles', path: 'Fiori Launchpad → Search "Maintain Business Roles" → Create/edit roles, assign catalogs, set restrictions' },
          { label: 'Maintain Business Users', path: 'Fiori Launchpad → Search "Maintain Business Users" → Link IAS users to roles and org assignments' },
          { label: 'Launchpad Designer', path: 'Fiori Launchpad → Launchpad Designer → Manage Catalogs, Groups, and tile visibility' },
          { label: 'Manage Launchpad Settings', path: 'Settings (gear icon) → Appearance, language, time zone, accessibility settings per user' },
          { label: 'Display Technical Information', path: 'Any Fiori app → Shift+Alt+P → Shows App ID, Component, ABAP Program (for support)' },
        ],
      },
      {
        heading: 'Assign an App/Tile to a Business Role',
        steps: [
          'Open "Maintain Business Roles" app and search for or create the target role',
          'Go to "Assigned Business Catalogs" tab → click "Add" → search for the catalog containing the app',
          'Save the role — the catalog and its apps are now available to all users with this role',
          'If using Spaces/Pages: open "Manage Launchpad Spaces" → assign the space to the business role',
          'Navigate to "Manage Launchpad Pages" → verify the tile appears in the correct page/section',
          'Test by logging in as a user with the role or using "Simulate Navigation" in Launchpad Designer',
        ],
      },
      {
        heading: 'Create and Configure a Business Role',
        steps: [
          'Open "Maintain Business Roles" → click "+" to create a new role → enter Role ID and Description',
          'On "Assigned Business Catalogs" tab → "Add" → search and select all required catalogs for the role\'s function',
          'On "Access Categories" tab → review Write/Read/Value restrictions; set "Unrestricted" unless field-level restriction is needed',
          'If restricting by organizational unit (company code, plant, sales org): add restriction rules under the catalog\'s restriction type',
          'Save and activate the role → assign it to users via "Maintain Business Users"',
          'Document the role\'s purpose and catalog list for future audit and SOD review',
        ],
      },
      {
        heading: 'Manage Spaces and Pages (New Launchpad)',
        steps: [
          'Open "Manage Launchpad Spaces" app → click "Create" to define a new space for a business area',
          'Add pages to the space: each page represents a group of related tasks (e.g., "Accounts Payable", "Purchasing")',
          'Within each page, create Sections and assign tile catalogs to populate tiles',
          'Assign the space to one or more Business Roles under "Assigned Business Roles" tab',
          'Preview the space layout using the "Preview" button before assigning to production roles',
          'Publish changes — users with the role will see the new space on their Fiori home page',
        ],
      },
      {
        heading: 'Troubleshooting: App/Tile Not Visible',
        steps: [
          'Confirm the user\'s Business Roles: Maintain Business Users → select user → check "Assigned Business Roles" tab',
          'Verify the Business Catalog containing the app is assigned to those roles: Maintain Business Roles → Assigned Business Catalogs',
          'Check if the tile exists in Launchpad Designer under the correct catalog (not just a group)',
          'Validate IAM restrictions: Maintain Business Roles → Access Categories → ensure no overly narrow restriction blocks the app',
          'Clear browser cache (Ctrl+Shift+Delete) or try a different browser/incognito session',
          'Check org assignments: some apps require the user to be assigned to a specific plant, company code, or sales org',
          'Use "Display Technical Information" (Shift+Alt+P) to capture the App ID and search in Manage Business Catalogs',
          'Raise an internal change request if a catalog needs to be added to a role following SOD review',
        ],
      },
      {
        heading: 'Troubleshooting: Fiori App Error or Crash',
        steps: [
          'Note the exact error message — press F12 (browser console) to capture any JavaScript errors or failed network requests',
          'Open "Application Logs" app → filter by user, date, and relevant object type to find backend errors',
          'Check if a Communication Arrangement is needed: some apps call APIs that require explicit setup',
          'Verify the user has not hit an authorization restriction: check Application Logs for AUTH_FAILED or access denied messages',
          'If the error appeared after a quarterly upgrade: check SAP release notes and known issues in the SAP Community',
          'Try running the same process in QA tenant to isolate data vs. configuration issues',
          'Raise an incident at support.sap.com with: screenshots, error messages, App ID (from Shift+Alt+P), and steps to reproduce',
        ],
      },
    ],
  },
  {
    id: 'sap-users',
    title: 'User & Authorization Management',
    icon: '👥',
    color: 'green',
    sections: [
      {
        heading: 'User Management Architecture',
        content:
          'SAP S/4HANA Public Cloud uses a layered identity model. SAP Identity Authentication Service (IAS) is the central user directory — it stores user records, manages passwords, enforces MFA, and handles SSO via SAML 2.0 or OIDC. IAS identities are then replicated or linked to SAP S/4HANA via the "Maintain Business Users" Fiori app, where business roles and organizational assignments are made. Corporate identity providers (Azure AD, Okta, etc.) can be connected to IAS as upstream IdPs for corporate SSO.',
      },
      {
        heading: 'User Lifecycle Apps',
        items: [
          { label: 'IAS Admin Console', path: 'https://<tenant>.accounts.ondemand.com/admin → Create/edit/delete users, manage groups, configure authentication policies' },
          { label: 'Maintain Business Users', path: 'S/4HANA Fiori → Search "Maintain Business Users" → Link IAS users, assign roles and org units, set validity dates' },
          { label: 'Maintain Business Roles', path: 'S/4HANA Fiori → "Maintain Business Roles" → Create roles, assign catalogs, define field-level restrictions' },
          { label: 'Download Business Role Templates', path: 'SAP Help Portal → Role templates for standard job functions (e.g., Accounts Payable Accountant, Purchaser)' },
          { label: 'Identity Provisioning Service', path: 'BTP Cockpit → Identity Provisioning → Configure source/target systems for automated user sync from HR or Active Directory' },
        ],
      },
      {
        heading: 'Create a New User End-to-End',
        steps: [
          'In IAS Admin Console: Users → "Add User" → Enter first name, last name, email address, user type (Employee/Customer)',
          'Set the initial password policy or click "Send Activation Email" to let the user set their own password',
          'If corporate SSO is configured: the user logs in with corporate credentials — IAS handles the federation automatically',
          'In S/4HANA Fiori, open "Maintain Business Users" → "+" → Enter the user\'s IAS ID or email',
          'Assign the appropriate Business Roles based on the user\'s job function',
          'Set the validity period (Valid From / Valid To dates) — mandatory for audit compliance',
          'Assign organizational units if the user\'s role requires plant, company code, or sales org restrictions',
          'Save and inform the user of their Fiori Launchpad URL and login credentials',
        ],
      },
      {
        heading: 'Reset Password and MFA',
        steps: [
          'IAS Admin Console → Users → search for the user → click on their name',
          'Under "Password" section → "Reset Password" → choose "Send Reset Link by Email" or "Set Temporary Password"',
          'For MFA reset: scroll to "Two-Factor Authentication" section → "Remove Device" to clear the user\'s authenticator app registration',
          'Inform the user to re-enroll MFA on next login if your policy requires it',
          'For locked accounts (too many failed attempts): IAS Console → User → "Unlock User" button',
          'If SSO is used via corporate IdP: password resets are managed in the corporate directory (Azure AD, etc.) — not IAS',
        ],
      },
      {
        heading: 'Segregation of Duties (SOD)',
        steps: [
          'Define SOD rules based on your company\'s internal controls (e.g., PO creator cannot also be GR poster)',
          'Use SAP Access Control (if licensed) or maintain a manual SOD matrix per role',
          'When assigning multiple roles to a user, check each role\'s catalogs against the SOD matrix before saving',
          'Review user role assignments quarterly as part of User Access Reviews — export from Maintain Business Users',
          'For sensitive roles (e.g., full FI posting, vendor creation): implement workflow-based role approval in IAS or BTP',
          'Document all SOD exceptions with business justification and sign-off from the data owner',
        ],
      },
      {
        heading: 'Troubleshooting: Authorization / No Authorization Error',
        steps: [
          'Note the exact error text — it usually contains the Authorization Object name and field values required',
          'In "Maintain Business Roles" → find the user\'s assigned role → click the relevant Business Catalog',
          'Check "Access Categories": if "Write" or "Read" access is set to "No Access" or restricted, adjust accordingly',
          'Check restriction types: if the role restricts by company code or plant, the user may lack access to the specific org unit',
          'Compare against a working user with the same role to identify differences in role configuration',
          'Open "Application Logs" app and search for AUTHORIZATION or AUTH_CHECK entries for the user and time of error',
          'If the fix requires adding a new catalog to a role: submit a change request, document SOD impact, then apply in DEV → transport to PRD',
        ],
      },
    ],
  },
  {
    id: 'sap-fico',
    title: 'FICO — Financial Accounting & Controlling',
    icon: '💰',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content:
          'SAP FICO in S/4HANA Public Cloud combines Financial Accounting (FI) and Management Accounting (CO) into a unified module built on the Universal Journal (table ACDOCA). All financial postings — GL, AP, AR, Asset Accounting, and Controlling — write to a single journal entry table, eliminating the need for reconciliation between FI and CO. The module supports multi-currency, parallel accounting (IFRS, US GAAP), and real-time financial reporting through embedded analytics.',
      },
      {
        heading: 'Key Fiori Apps — Financial Accounting',
        items: [
          { label: 'Post General Journal Entries', path: 'Fiori → "Post General Journal Entries" → Manual GL postings with account assignment' },
          { label: 'Manage Journal Entries', path: 'Fiori → "Manage Journal Entries" → View, display, reverse GL postings' },
          { label: 'Post Outgoing Payments', path: 'Fiori → "Post Outgoing Payments" → Clear vendor open items and process payments' },
          { label: 'Post Incoming Payments', path: 'Fiori → "Post Incoming Payments" → Clear customer open items' },
          { label: 'Create Supplier Invoice', path: 'Fiori → "Create Supplier Invoice" → MIRO equivalent for AP invoice entry' },
          { label: 'Manage Supplier Line Items', path: 'Fiori → "Manage Supplier Line Items" → View AP open and cleared items (FBL1N equivalent)' },
          { label: 'Manage Customer Line Items', path: 'Fiori → "Manage Customer Line Items" → View AR open and cleared items (FBL5N equivalent)' },
          { label: 'Manage Fixed Assets', path: 'Fiori → "Manage Fixed Assets" → Asset master data, acquisitions, retirements (AS01/AS02/AS03 equivalent)' },
          { label: 'Post Asset Acquisition', path: 'Fiori → "Post Asset Acquisition" → Capitalize assets (ABZON equivalent)' },
          { label: 'Schedule General Ledger Jobs', path: 'Fiori → "Schedule General Ledger Jobs" → Period-end accruals, balance carryforward' },
        ],
      },
      {
        heading: 'Key Fiori Apps — Controlling',
        items: [
          { label: 'Manage Cost Centers', path: 'Fiori → "Manage Cost Centers" → Create/edit cost center master data (KS01/KS02)' },
          { label: 'Manage Profit Centers', path: 'Fiori → "Manage Profit Centers" → Create/edit profit center master data (KE51/KE52)' },
          { label: 'Cost Center Actuals', path: 'Fiori → "Cost Centers — Actuals" → Actual costs per cost center with drill-down' },
          { label: 'Internal Order Management', path: 'Fiori → "Manage Internal Orders" → Create, plan, and settle internal orders (KO01/KO02)' },
          { label: 'Plan Cost Centers', path: 'Fiori → "Plan Cost Centers" → Enter plan values for cost centers per period' },
          { label: 'Allocation Run', path: 'Fiori → "Run Assessment Cycle" or "Run Distribution Cycle" → CO allocations (KSU5/KSV5)' },
        ],
      },
      {
        heading: 'Post a Manual GL Journal Entry',
        steps: [
          'Open "Post General Journal Entries" app from Fiori Launchpad',
          'Enter the Company Code, Posting Date, and Document Type (e.g., SA for GL posting)',
          'Add line items: select GL Account, enter Debit/Credit amount, add Cost Center or Profit Center if required',
          'Enter a document reference and document header text for audit trail',
          'Simulate the posting to check for balance and account assignment errors before saving',
          'Post the document — note the FI Document Number for reference',
          'Verify in "Manage Journal Entries" that the posting appears correctly with all assignments',
        ],
      },
      {
        heading: 'AP Invoice Processing (Create Supplier Invoice)',
        steps: [
          'Open "Create Supplier Invoice" app → enter Supplier ID, Invoice Date, Posting Date, and Amount',
          'Select the reference Purchase Order if this is a PO-based invoice (3-way match will apply)',
          'System proposes line items from the PO; verify quantities and amounts match the physical invoice',
          'Enter the Tax Code applicable in your jurisdiction — verify tax amount calculated by system',
          'Check for any GR/IR discrepancies — system will flag if goods receipt quantity does not match invoice quantity',
          'Save the invoice — a parked document can be reviewed before final posting if workflow is configured',
          'After posting, process payment via "Post Outgoing Payments" or through the payment run (F110 equivalent)',
        ],
      },
      {
        heading: 'Asset Accounting — Capitalize an Asset',
        steps: [
          'Create the asset master: "Manage Fixed Assets" → "Create" → enter Asset Class, Description, Cost Center, and useful life',
          'Post the acquisition: "Post Asset Acquisition" → enter Asset Number, Amount, GL Account (asset clearing account), and document date',
          'Alternatively, if asset was received via PO/GR: GR posting in MM automatically capitalizes the asset if asset number is in the PO',
          'Verify depreciation key and useful life are correct on the asset master — these drive automatic depreciation runs',
          'Run depreciation at month-end: "Post Depreciation Run" app → select company code and period → execute in test mode first',
          'After test mode confirms correct depreciation amounts, run in production mode to post actual depreciation documents',
        ],
      },
      {
        heading: 'Period-End Closing Checklist',
        steps: [
          'Complete all open goods receipts and invoice verifications before closing the MM period',
          'Run foreign currency revaluation: "Revalue Open Items in Foreign Currency" app',
          'Post accruals and deferrals for any recurring journal entries',
          'Run allocation cycles: "Run Assessment Cycle" for overhead cost allocations to cost objects',
          'Post depreciation: "Post Depreciation Run" → select current period → verify amounts → post',
          'Reconcile GR/IR account: "Manage GR/IR Account" app → clear any outstanding items',
          'Run profit center adjustment: "Run Profit Center Adjustment" if profit centers are used for P&L',
          'Close the accounting period: "Close Fiscal Year Period" or "Schedule Closing Operations" app',
          'Generate trial balance and run financial statements for controller sign-off',
          'Open the next accounting period only after all postings in current period are complete',
        ],
      },
      {
        heading: 'Troubleshooting: Posting Period Not Open',
        steps: [
          'Error message: "Posting period MMM/YYYY is not open for account type S/K/A"',
          'Open "Manage Accounting Periods" app → check if the current period is open for the relevant account type',
          'Account types: A = Asset, K = Vendor, D = Customer, S = G/L accounts, M = Materials',
          'If the period is closed: check with the finance controller whether it can be reopened',
          'For special period postings (period 13–16): ensure the special period is explicitly opened in the period table',
          'After opening the period, re-attempt the posting — no document changes are needed',
        ],
      },
      {
        heading: 'Troubleshooting: Document Posting Errors',
        steps: [
          'Balance not zero: verify all debit and credit amounts sum to zero — check all line items',
          'Account not defined: the GL account may not exist in the chart of accounts or may be blocked — check in "Manage GL Accounts"',
          'Cost center required: the GL account requires a CO assignment — add Cost Center or Internal Order to the line item',
          'Profit center derivation error: ensure profit center is either entered manually or derived from cost center assignment',
          'Tax code invalid: the tax code may not be configured for the company code or country — check in Business Configuration',
        ],
      },
    ],
  },
  {
    id: 'sap-mm',
    title: 'MM — Materials Management',
    icon: '📦',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'Materials Management in S/4HANA Public Cloud covers the procure-to-pay process: from purchase requisition through purchase order, goods receipt, and invoice verification. MM is tightly integrated with FI (for automatic account determination and GR/IR postings), CO (for cost object assignment), and QM (for quality inspections at goods receipt). The module uses the MIGO, ME21N, MIRO equivalents delivered as Fiori apps in the cloud.',
      },
      {
        heading: 'Key Fiori Apps',
        items: [
          { label: 'Manage Purchase Requisitions', path: 'Fiori → "Manage Purchase Requisitions" → Create, edit, and approve PRs (ME51N/ME52N/ME53N equivalent)' },
          { label: 'Create Purchase Orders', path: 'Fiori → "Create Purchase Orders" → Convert PR to PO, set vendor and delivery details (ME21N equivalent)' },
          { label: 'Manage Purchase Orders', path: 'Fiori → "Manage Purchase Orders" → Track, edit, confirm, and close POs' },
          { label: 'Post Goods Receipt', path: 'Fiori → "Post Goods Receipt for Purchase Order" → Receive goods against a PO (MIGO GR equivalent)' },
          { label: 'Create Supplier Invoice', path: 'Fiori → "Create Supplier Invoice" → 3-way match invoice verification (MIRO equivalent)' },
          { label: 'Manage Stock — Single Material', path: 'Fiori → "Stock — Single Material" → View stock levels by plant, storage location (MMBE equivalent)' },
          { label: 'Post Goods Issue/Transfer', path: 'Fiori → "Post Goods Movements" → Goods issue, transfer posting, return to vendor' },
          { label: 'Manage Material Documents', path: 'Fiori → "Manage Material Documents" → View and reverse GR/GI documents (MB51/MBST equivalent)' },
          { label: 'Manage Vendor Master', path: 'Fiori → "Manage Business Partners" → Create/edit vendor master (BP transaction equivalent)' },
          { label: 'Manage Material Master', path: 'Fiori → "Manage Product Master Data" → Create and extend materials to plants and storage locations' },
        ],
      },
      {
        heading: 'Create a Purchase Requisition',
        steps: [
          'Open "Manage Purchase Requisitions" → click "Create"',
          'Select the Document Type (e.g., NB for Standard PR) and enter the Purchasing Group and Purchasing Org',
          'Add line items: enter Material Number (or short text for non-stock), quantity, unit of measure, delivery date, and plant',
          'Assign the cost object: Cost Center (for expense items) or WBS Element / Internal Order (for project-related purchases)',
          'Add the preferred vendor if already known — this becomes a source of supply for the PO',
          'Save the PR — it routes for approval via workflow if value thresholds are exceeded',
          'Monitor approval status in "Manage Purchase Requisitions" → the PR status changes to "Approved" when all approvals are done',
        ],
      },
      {
        heading: 'Create and Release a Purchase Order',
        steps: [
          'Open "Create Purchase Orders" → enter Vendor, Purchasing Org, Purchasing Group, and Company Code',
          'Copy from approved Purchase Requisition: "Add from Requisitions" button → select the relevant PR lines',
          'Verify price, quantity, delivery date, and payment terms — adjust if needed',
          'Add a Goods Receipt indicator (GR-based IV) for 3-way match with supplier invoices',
          'Set the Account Assignment category (K = Cost Center, P = Project, blank = Stock purchase)',
          'Save the PO — the PO number is generated and can be sent to the vendor via output (email/EDI)',
          'If release strategy is configured: the PO routes for manager approval before being sent to vendor',
        ],
      },
      {
        heading: 'Post a Goods Receipt (GR)',
        steps: [
          'Open "Post Goods Receipt for Purchase Order" → enter the Purchase Order number',
          'System loads all open PO lines — verify the delivered quantity matches the delivery note',
          'Select the storage location where goods will be stored',
          'If quality inspection is active: goods are posted to inspection stock (Q stock) — QM team must complete usage decision before goods are available',
          'Enter the vendor delivery note number and document date for traceability',
          'Check the account determination preview — system shows the GL accounts that will be posted',
          'Post the GR — a material document and FI document are created simultaneously',
          'Verify in "Manage Material Documents" that the GR is posted and in "Stock — Single Material" that stock has increased',
        ],
      },
      {
        heading: 'Invoice Verification (3-Way Match)',
        steps: [
          'Open "Create Supplier Invoice" → enter Vendor, Invoice Date, Posting Date, and Invoice Amount',
          'Select the reference PO number — system proposes delivery quantities and PO prices for matching',
          'Compare the proposed amounts with the physical supplier invoice — adjust quantities if a partial invoice',
          'System checks: PO quantity (ordered), GR quantity (received), Invoice quantity — flags discrepancies with tolerance warnings',
          'Verify and enter the correct Tax Code for the invoice',
          'If amounts are within tolerance: post the invoice directly — creates FI document with vendor credit and GR/IR debit',
          'If outside tolerance: block the invoice for payment — enter a payment block reason and route for resolution',
          'After all 3-way match conditions are met, process payment via payment run',
        ],
      },
      {
        heading: 'Stock Overview and Inventory Management',
        steps: [
          'Check stock: "Stock — Single Material" → enter Material and Plant → view unrestricted, quality inspection, blocked, and transit stock',
          'For all materials at a plant: "Stock Overview" → filter by plant and storage location → export to Excel for reconciliation',
          'Transfer stock between storage locations: "Post Goods Movements" → Movement Type 311 (Transfer within plant)',
          'Transfer stock between plants: use Stock Transfer Order (STO) process — create STO in "Manage Purchase Orders" with Document Type UB',
          'Post a scrapping/write-off: "Post Goods Movements" → Movement Type 551 → enter quantity and cost center for expense',
          'Run physical inventory: "Create Physical Inventory Documents" → post count results → run inventory difference postings',
        ],
      },
      {
        heading: 'Troubleshooting: GR Posting Errors',
        steps: [
          'Movement type not allowed: verify the PO item category and account assignment type support GR posting',
          'Material not extended to plant: "Manage Product Master Data" → extend the material to the receiving plant',
          'Storage location does not exist: create it in Business Configuration → Organizational Structure → Storage Locations',
          'GR blocked due to QM: quality inspection lot must be completed and usage decision posted before stock is available',
          'Price variance too high: check standard price vs. PO price — investigate if price difference is expected or data error',
          'GR quantity exceeds PO quantity: enable tolerance or update PO quantity before posting remaining GR',
        ],
      },
    ],
  },
  {
    id: 'sap-sd',
    title: 'SD — Sales & Distribution',
    icon: '🚚',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content:
          'SAP SD in S/4HANA Public Cloud covers the order-to-cash business process: from sales order creation through delivery, goods issue, billing, and customer payment. The module integrates with MM (for availability check and goods issue), FI (for billing and receivables), and CO (for revenue assignment to profit centers). Pricing is controlled by the condition technique — condition records determine prices, discounts, surcharges, and taxes based on customer, material, and sales area combinations.',
      },
      {
        heading: 'Key Fiori Apps',
        items: [
          { label: 'Create Sales Orders', path: 'Fiori → "Create Sales Orders" → Enter customer, material, quantity, delivery date (VA01 equivalent)' },
          { label: 'Manage Sales Orders', path: 'Fiori → "Manage Sales Orders" → View, edit, confirm, and reject sales orders (VA02/VA03)' },
          { label: 'Create Outbound Deliveries', path: 'Fiori → "Create Outbound Deliveries" → Delivery processing from sales order (VL01N equivalent)' },
          { label: 'Manage Outbound Deliveries', path: 'Fiori → "Manage Outbound Deliveries" → Pick, pack, and post goods issue (PGI)' },
          { label: 'Create Billing Documents', path: 'Fiori → "Create Billing Documents" → Bill delivered orders and generate invoices (VF01 equivalent)' },
          { label: 'Manage Billing Documents', path: 'Fiori → "Manage Billing Documents" → View, cancel, and release billing documents to accounting' },
          { label: 'Manage Prices — Material', path: 'Fiori → "Manage Prices — Material" → Create and edit condition records for material pricing (VK11 equivalent)' },
          { label: 'Manage Customer Credit', path: 'Fiori → "Manage Customer Credit Accounts" → Review credit exposure and credit limits' },
          { label: 'Release Blocked Sales Orders', path: 'Fiori → "Manage Credit-Blocked Sales Documents" → Review and release credit-blocked orders (VKM3/VKM5)' },
          { label: 'Display Customer Balances', path: 'Fiori → "Manage Customer Line Items" → AR open items and payment status' },
        ],
      },
      {
        heading: 'Create a Sales Order',
        steps: [
          'Open "Create Sales Orders" → select Order Type (OR = Standard Order) → enter Sales Organization, Distribution Channel, and Division',
          'Enter the Sold-to Party (customer number) — system defaults Bill-to and Ship-to from customer master',
          'Enter the requested delivery date — system performs availability check (ATP) against stock or planned receipts',
          'Add line items: Material Number, Order Quantity, and confirm the unit of measure',
          'Review pricing: the Pricing tab shows all condition types (base price, discounts, surcharges, taxes) — verify the net amount',
          'Check the credit status: if customer is on credit hold, a warning or block appears — resolve before proceeding',
          'Save the sales order — an SO number is generated; confirm it to the customer',
        ],
      },
      {
        heading: 'Create Delivery and Post Goods Issue',
        steps: [
          'Once the sales order delivery date is reached (or immediately for rush orders): open "Create Outbound Deliveries"',
          'Enter the shipping point and select the sales order — system creates a delivery document',
          'Confirm the delivery quantity — if partial delivery is needed, reduce the quantity accordingly',
          'Pick confirmation: enter the storage location and confirm picking is complete',
          'Pack goods if serial number or handling unit management is required',
          'Post Goods Issue (PGI): opens "Manage Outbound Deliveries" → select delivery → "Post Goods Issue" button',
          'PGI reduces inventory in MM and creates a GI material document — the order status changes to "Delivered"',
          'Billing due list is updated — the delivery is now ready for billing',
        ],
      },
      {
        heading: 'Create and Release a Billing Document',
        steps: [
          'Open "Create Billing Documents" → system shows billing due list — select deliveries or services to bill',
          'Review the billing document: verify customer, amounts, pricing, and tax codes',
          'For credit memos: use billing type G2 and reference the original billing document number',
          'Save the billing document — it is in "Not Transferred to Accounting" status if not yet released',
          'Release to accounting: select the billing document → "Release to Accounting" → system creates FI document (customer debit, revenue credit)',
          'Print or email the invoice to the customer using the output management configuration',
          'Monitor open AR items in "Manage Customer Line Items" — follow up on overdue invoices',
        ],
      },
      {
        heading: 'Manage Pricing Conditions',
        steps: [
          'Open "Manage Prices — Material" → select Condition Type (e.g., PR00 for base price)',
          'Enter the key combination: Sales Org / Distribution Channel / Material → enter the price and currency',
          'Set validity dates for the condition record — expired records are automatically inactive',
          'For customer-specific pricing: select a condition type with customer/material key and enter the special price',
          'For discounts: use condition type K007 (customer discount) or K004 (material discount)',
          'After saving, test by creating a new sales order — pricing procedure should pick up the new condition record',
          'If pricing does not update on existing orders: use "Update Pricing" in the sales order conditions tab',
        ],
      },
      {
        heading: 'Troubleshooting: Credit Block on Sales Order',
        steps: [
          'Order is blocked with reason "Credit check failed": go to "Manage Credit-Blocked Sales Documents"',
          'Review customer\'s credit exposure: "Manage Customer Credit Accounts" → check credit limit, current exposure, and overdue AR',
          'Options: (1) Release the block if the order is within acceptable risk — click "Release"; (2) Increase the credit limit if business justifies it; (3) Request prepayment from customer before releasing',
          'Credit limit increase: "Manage Customer Credit Accounts" → edit credit limit → save (requires authorization)',
          'Inform the customer and sales team of the block reason and resolution path',
          'For customers with frequent credit issues: consider setting payment terms to prepayment or requiring bank guarantee',
        ],
      },
      {
        heading: 'Troubleshooting: Pricing Errors on Sales Order',
        steps: [
          'No price found: check if a valid condition record exists for the material/customer/sales area combination',
          'Open "Manage Prices — Material" → search for the relevant condition type and key — verify validity dates',
          'If condition record exists but price is wrong: check the pricing procedure assigned to the order type and customer pricing procedure',
          'Manual price entry: if automatic pricing cannot be resolved, users with authorization can enter a manual price on the order',
          'Tax code not determined: check the tax classification on the material master and customer master — both must be set correctly',
          'For billing price discrepancy: ensure no manual changes were made at delivery level — compare sales order vs. billing document pricing',
        ],
      },
    ],
  },
  {
    id: 'sap-qm',
    title: 'QM — Quality Management',
    icon: '✅',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'Quality Management in S/4HANA Public Cloud integrates with MM (GR inspection), PP (in-process inspection), and SD (customer returns). When a material has a quality plan (inspection plan) assigned, the system automatically creates an Inspection Lot at goods receipt or production confirmation. The QM inspector records results against the characteristics defined in the inspection plan and posts a Usage Decision to release or reject the stock. Quality Notifications are used to document defects, complaints, and corrective actions.',
      },
      {
        heading: 'Key Fiori Apps',
        items: [
          { label: 'Manage Inspection Lots', path: 'Fiori → "Manage Inspection Lots" → View all open and closed lots, access results recording (QA32/QA33 equivalent)' },
          { label: 'Record Inspection Results', path: 'Fiori → "Record Inspection Results" → Enter characteristic values for a lot (QE01/QE51N equivalent)' },
          { label: 'Post Usage Decision', path: 'Fiori → "Post Usage Decision" → Accept (unrestricted), reject (blocked/scrap), or partially accept stock (QA11 equivalent)' },
          { label: 'Manage Quality Notifications', path: 'Fiori → "Manage Quality Notifications" → Create and process defect notifications (QM01/QM02/QM03)' },
          { label: 'Manage Inspection Plans', path: 'Fiori → "Manage Inspection Plans" → Create and maintain quality plans with characteristics (QP01/QP02)' },
          { label: 'Quality Certificate Processing', path: 'Fiori → "Process Quality Certificates" → Manage inbound and outbound quality certificates' },
        ],
      },
      {
        heading: 'Process an Inspection Lot at Goods Receipt',
        steps: [
          'When a GR is posted in MM for a quality-managed material, an Inspection Lot is automatically created by the system',
          'Open "Manage Inspection Lots" → filter by "Open" status and today\'s date to find new lots',
          'Select the lot → review the material, vendor, and quantity',
          'Click "Record Results" → the inspection plan characteristics are displayed — enter measured values',
          'For attribute characteristics: select Accepted / Rejected; for variable characteristics: enter numeric values',
          'Save the results — the system evaluates against acceptance criteria and flags failed characteristics',
          'Post Usage Decision: "Post Usage Decision" → select UD Code (e.g., A = Accept → Unrestricted, R = Reject → Block)',
          'If accepted: stock moves from Quality Inspection to Unrestricted use automatically',
          'If rejected: stock moves to Blocked stock — initiate a Quality Notification for corrective action',
        ],
      },
      {
        heading: 'Create a Quality Notification',
        steps: [
          'Open "Manage Quality Notifications" → click "Create" → select notification type (Q1 = Customer Complaint, Q2 = Internal, Q3 = Vendor)',
          'Enter the defect description, material, quantity affected, and the source (vendor, production order, etc.)',
          'Assign tasks: add corrective actions as tasks with responsible person and due date',
          'If the defect is vendor-related: link the notification to the vendor and purchase order for 8D reporting',
          'Process the notification through its status flow: Open → In Process → Completed',
          'Document root cause and preventive actions in the notification long text',
          'Close the notification when all tasks are completed and verified',
          'Use notification analytics to identify recurring defects by material, vendor, or production line',
        ],
      },
      {
        heading: 'Manage Inspection Plans',
        steps: [
          'Open "Manage Inspection Plans" → select the plant → click "Create"',
          'Enter material number, inspection type (01 = GR from vendor, 04 = Goods receipt from production), and plant',
          'Add inspection operations — each operation groups related characteristics (e.g., Visual, Dimensional, Chemical)',
          'For each characteristic: define the short text, control indicators (destructive, quantitative/qualitative), and specification limits',
          'Set the sampling procedure: define sample size (fixed or calculated based on lot size) and acceptance criteria',
          'Assign the inspection plan usage and status → save and activate the plan',
          'Test by posting a GR for the material — verify the inspection lot is created with the correct plan version',
        ],
      },
      {
        heading: 'Troubleshooting: Inspection Lot Not Created at GR',
        steps: [
          'Check the material master: QM view must be maintained with Inspection Type 01 active for the plant',
          'Verify an active inspection plan exists for the material and plant with the correct inspection type',
          'Check inspection type 01 is activated in QM configuration under Business Configuration',
          'If GR was posted before the plan was created: manually create an inspection lot via "Create Inspection Lot" app',
          'Review Application Logs for QM-related errors at the time of the GR posting',
          'Check if the vendor or purchase order info record has a quality info record blocking or skipping inspection',
        ],
      },
      {
        heading: 'Troubleshooting: Stock Stuck in Quality Inspection',
        steps: [
          'Open "Manage Inspection Lots" → find the open lot for the material and batch',
          'Check if results recording is incomplete: all mandatory characteristics must have values before a usage decision can be posted',
          'Post the usage decision even if results are pending (with appropriate authorization) if business urgency requires',
          'If the inspector is unavailable: reassign the lot to another qualified user via notification tasks',
          'For emergencies: a goods movement override (movement type 321 — Transfer from Quality to Unrestricted) can be used with proper authorization and documented justification',
          'After releasing stock, ensure the inspection results and usage decision are completed retroactively for audit purposes',
        ],
      },
    ],
  },
  {
    id: 'sap-pm',
    title: 'PM — Plant Maintenance',
    icon: '🔧',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content:
          'Plant Maintenance in S/4HANA Public Cloud manages all maintenance activities for equipment and facilities. The module covers corrective maintenance (triggered by breakdowns), preventive maintenance (time-based or counter-based plans), and predictive maintenance (via IoT integration with SAP Asset Intelligence Network). Maintenance Orders are the central document that captures costs, confirms work performed, and provides the basis for settlement to cost centers or assets.',
      },
      {
        heading: 'Key Fiori Apps',
        items: [
          { label: 'Manage Technical Objects', path: 'Fiori → "Manage Technical Objects" → Create and maintain Equipment and Functional Location master data (IE01/IE02/IL01)' },
          { label: 'Create Maintenance Notifications', path: 'Fiori → "Create Maintenance Notifications" → Report breakdown, malfunction, or maintenance request (IW21)' },
          { label: 'Manage Maintenance Orders', path: 'Fiori → "Manage Maintenance Orders" → Create, plan, release, confirm, and close maintenance orders (IW31/IW32/IW33)' },
          { label: 'Schedule Maintenance Plans', path: 'Fiori → "Manage Maintenance Plans" → Create and call preventive maintenance plans (IP01/IP10)' },
          { label: 'Confirm Maintenance Order', path: 'Fiori → "Confirm Maintenance Order" → Enter actual work time and completion confirmation (IW41)' },
          { label: 'Maintenance Cost Analysis', path: 'Fiori → "Maintenance Cost Analysis" → Embedded analytics for costs by equipment, plant, and order type' },
        ],
      },
      {
        heading: 'Create Equipment Master Data',
        steps: [
          'Open "Manage Technical Objects" → select "Equipment" → click "Create"',
          'Select Equipment Category (M = Machines, E = Electrical, etc.) and enter a description',
          'On General tab: enter manufacturer, model number, serial number, and construction year',
          'On Location tab: assign the Functional Location (hierarchical location structure) and Plant',
          'On Organization tab: assign the Maintenance Plant, Cost Center, and Company Code',
          'On Structure tab: link to the superior functional location or equipment (for assembly structures)',
          'Activate the equipment — it is now available for maintenance notifications and orders',
          'Create a measuring point if the equipment uses counter-based maintenance (e.g., running hours, production cycles)',
        ],
      },
      {
        heading: 'Process a Corrective Maintenance Order',
        steps: [
          'User reports breakdown: create a Maintenance Notification — enter description, equipment, malfunction start time, and priority',
          'Convert notification to Maintenance Order: from the notification → "Create Order" → select order type PM01 (Corrective)',
          'In the maintenance order: add Operations (work steps) with planned hours, work center, and activity type',
          'Add Components (spare parts) required — system checks stock availability in MM',
          'Release the order: status changes to REL — work center receives the order for execution',
          'Technician performs the work and confirms: "Confirm Maintenance Order" → enter actual hours and completion notes',
          'If spare parts were used: goods issue is posted from the order — MM stock is reduced and costs flow to the order',
          'Technically complete the order (TECO status) → close the notification → settle costs to the assigned cost center',
        ],
      },
      {
        heading: 'Set Up a Preventive Maintenance Plan',
        steps: [
          'Open "Manage Maintenance Plans" → click "Create" → select plan category (Single Cycle or Strategy plan)',
          'Enter a description, maintenance plan category, and scheduling period',
          'Assign the Maintenance Item: link the equipment or functional location to a General Task List (standard work instructions)',
          'For time-based plans: enter the cycle (e.g., every 30 days or 6 months)',
          'For counter-based plans: link to the measuring point and set the counter threshold (e.g., every 500 operating hours)',
          'Set the scheduling parameters: call horizon (how early to create the order before due date) and completion requirement',
          'Schedule the plan: "Call Maintenance Plan" or let the system auto-schedule via background job',
          'Orders are created automatically when the scheduling date falls due — planners review and release them',
        ],
      },
      {
        heading: 'Troubleshooting: Maintenance Order Cost Settlement Errors',
        steps: [
          'Order costs not settling: check the settlement rule on the maintenance order — it must have a cost center or asset as receiver',
          'Run settlement in test mode first: "Settle Maintenance Orders" → simulation → review settlement amounts',
          'If settlement rule is missing: add a settlement rule on the order → Distribution Rule → Cost Center (100%)',
          'Check if the cost center is valid for the posting period and has not been locked',
          'Verify that the FI posting period is open for the settlement period',
          'After fixing: run the actual settlement → verify costs are cleared from the order (balance = 0)',
        ],
      },
      {
        heading: 'Troubleshooting: Maintenance Plan Not Generating Orders',
        steps: [
          'Check the maintenance plan status — it must be active, not deleted or on hold',
          'Verify the "Next Planned Date" in the maintenance plan — if it is in the past, the scheduling background job may not have run',
          'Manually call the plan: "Call Maintenance Plan" → system generates the due order immediately',
          'Check if the background job "PM Maintenance Plan Scheduling" is active and running without errors',
          'Verify the call horizon: if the next due date is too far in the future and the horizon is short, no order will be generated yet',
          'Review the maintenance plan counter update if counter-based — ensure meter readings are being entered regularly',
        ],
      },
    ],
  },
  {
    id: 'sap-basis',
    title: 'BASIS — System Administration in Cloud',
    icon: '⚙️',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'BASIS administration in S/4HANA Public Cloud is fundamentally different from on-premise BASIS. SAP manages the underlying infrastructure, database, and application servers. Customer BASIS/IT admins focus on user management (via IAS), business role administration, background job monitoring, application log analysis, integration setup, and coordinating with SAP support. There is no OS-level access, no ABAP Workbench, and no classical transport management — changes are transported via the SAP Business Configuration Transport Management.',
      },
      {
        heading: 'System Monitoring Apps',
        items: [
          { label: 'Application Logs', path: 'Fiori → "Application Logs" → View system and application-level errors, filter by object, subobject, user, and date' },
          { label: 'Application Jobs', path: 'Fiori → "Application Jobs" → Schedule, monitor, and manage all background jobs' },
          { label: 'Manage Database Statistics', path: 'Not applicable in cloud — SAP manages all HANA statistics and performance optimization' },
          { label: 'System Status', path: 'SAP One Support Launchpad → Incidents and Service Requests → check planned maintenance and outages' },
          { label: 'BTP Cockpit — Health Monitoring', path: 'SAP BTP Cockpit → Subaccount → Cloud Integration → Monitoring → Runtime Status of integration flows' },
          { label: 'Maintain Communication Arrangements', path: 'Fiori → "Maintain Communication Arrangements" → Manage all inbound/outbound API connections' },
          { label: 'Display System Configuration', path: 'Fiori → "Display Technical Landscape" → View system landscape and transport routes' },
        ],
      },
      {
        heading: 'Background Job Management',
        steps: [
          'Open "Application Jobs" app → view all scheduled jobs with status (Scheduled, Running, Completed, Failed)',
          'Filter by "Failed" status to identify jobs needing attention — review error log by clicking the job',
          'To schedule a new job: click "Schedule" → select the job template → set recurrence (immediate, daily, weekly, cron pattern)',
          'For recurring jobs: use the "Job Scheduling" feature with cron-like recurrence patterns available in the template',
          'Cancel a running job: select the job → "Cancel" → confirm — use only if the job is stuck or causing issues',
          'For month-end jobs: schedule all period-end programs (depreciation, allocation, closing) in the correct sequence',
          'Monitor long-running jobs: if a job runs significantly longer than usual, check Application Logs for lock conflicts or data volume issues',
          'Raise an SAP incident if a standard SAP job (e.g., RFUMSV00 for tax returns, RAPOST2000 for depreciation) fails with a program error',
        ],
      },
      {
        heading: 'Transport Management in Cloud Context',
        steps: [
          'S/4HANA Public Cloud uses "Business Configuration Transport Management" — not ABAP CTS',
          'Changes to configuration are made in the Development system → recorded in a transport project',
          'Open "Export Business Configuration" app → select the configuration scope → create an export file',
          'Import the configuration to QA: "Import Business Configuration" app in the QA tenant → select the export file → run import',
          'Test all affected processes in QA before transporting to production',
          'To transport to Production: create an import request in "Import Business Configuration" in the PRD tenant after QA sign-off',
          'SAP Extensions on BTP use the MTA (Multi-Target Application) deployment pipeline — separate from S/4 config transports',
          'Document all configuration changes with change request numbers for audit and rollback reference',
        ],
      },
      {
        heading: 'User Management via IAS',
        steps: [
          'Access IAS Admin Console: https://<tenant>.accounts.ondemand.com/admin → log in with administrator credentials',
          'Create user: Users & Authorizations → User Management → "+" → fill in email, name, user type',
          'Assign groups: assign the user to the relevant IAS group (if groups drive role assignment via Identity Provisioning)',
          'Configure authentication policy: Applications → select S/4HANA app → Authentication & Access → set MFA and password policy',
          'Set up corporate SSO: Applications → select S/4HANA → Conditional Authentication → Corporate Identity Provider',
          'Monitor failed login attempts: Users → select user → Audit Log → review authentication history',
          'For password self-service: configure "Forgot Password" and account activation email templates in IAS',
        ],
      },
      {
        heading: 'Raising SAP Support Incidents',
        steps: [
          'Go to support.sap.com → Log on → Report an Incident',
          'Select the correct component: FI-GL, MM-PUR, SD-BF, QM-PT, PM-WOC, BC-IAM (for authorization), BC-INT (for integration)',
          'Priority: Critical (P1) = system down or major business process stopped; High (P2) = significant impact; Medium (P3) = workaround available; Low (P4) = questions',
          'Include in the incident: system ID, tenant URL, screenshots of the error, exact error message text, steps to reproduce, App ID from Shift+Alt+P',
          'For authorization issues: include the exact authorization object and field values from the error message',
          'Attach Application Log exports if relevant — this significantly speeds up SAP analysis',
          'Monitor incident status and respond to SAP processor\'s questions promptly to avoid SLA delays',
        ],
      },
      {
        heading: 'Troubleshooting: Performance Issues',
        steps: [
          'For slow Fiori app: open browser DevTools (F12) → Network tab → identify slow API calls (>2 seconds)',
          'Check if the performance issue affects all users or a single user — single user issues may be browser/network related',
          'Clear browser cache and cookies → retest',
          'Check SAP service status: SAP One Support → Cloud Availability Center → verify no ongoing system performance incident',
          'For slow analytical reports: check if real-time analysis is being used vs. scheduled data loads — switch to scheduled if possible',
          'For integration timeouts: check the integration flow in BTP → Monitor → verify the target system response time',
          'Raise a performance incident with SAP if the issue is reproducible and not browser/network related',
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
        content:
          'SAP Integration Suite (running on SAP BTP) is the middleware platform for connecting S/4HANA Public Cloud with third-party and on-premise systems. It provides pre-built integration packages (SAP Best Practices) in the Integration Content Catalog, a graphical iFlow designer, and a monitoring dashboard. Communication Arrangements in S/4HANA define which APIs are exposed and to which communication systems. SAP Event Mesh enables event-driven integration using SAP business events (e.g., Sales Order Created, GR Posted).',
      },
      {
        heading: 'Communication Setup Apps',
        items: [
          { label: 'Maintain Communication Systems', path: 'Fiori → "Maintain Communication Systems" → Define external systems with hostname, auth method (OAuth 2.0, Basic, Certificate)' },
          { label: 'Maintain Communication Arrangements', path: 'Fiori → "Maintain Communication Arrangements" → Link communication scenarios (API groups) to communication systems' },
          { label: 'Maintain Communication Users', path: 'Fiori → "Maintain Communication Users" → Technical users for inbound API calls — separate from business users' },
          { label: 'API Explorer in SAP BTP', path: 'BTP Cockpit → API Management → API Explorer → Browse available S/4HANA OData and REST APIs with documentation' },
          { label: 'Integration Suite Monitor', path: 'Integration Suite → Monitor → Message Processing → View integration flow execution status and errors' },
          { label: 'SAP Business Accelerator Hub', path: 'https://api.sap.com → Browse all SAP API specifications, download OData metadata, test APIs' },
        ],
      },
      {
        heading: 'Set Up OData API Access for External System',
        steps: [
          'Identify the required API: browse https://api.sap.com for the S/4HANA Public Cloud API you need (e.g., Sales Order API, Business Partner API)',
          'Open "Maintain Communication Users" → create a technical user with a strong password',
          'Open "Maintain Communication Systems" → create a new system → enter the external system\'s hostname and select inbound auth method',
          'Open "Maintain Communication Arrangements" → click "+ New" → search for the communication scenario matching the API',
          'Select the communication scenario → link to the communication system → note the service URL',
          'In the external system: configure the API endpoint URL and credentials from the communication arrangement',
          'Test the API connection using Postman or the API Test Console in SAP Business Accelerator Hub',
          'Monitor API calls in Application Logs for any authentication or authorization errors',
        ],
      },
      {
        heading: 'Set Up an Integration Flow in SAP Integration Suite',
        steps: [
          'Open SAP Integration Suite on BTP → Design → Integrations → search the Content Catalog for a pre-built package',
          'If using a pre-built package: copy it to your workspace → configure the adapters (sender and receiver endpoints)',
          'For custom iFlows: create a new integration package → add an integration flow → design the flow with sender/receiver adapters, content modifiers, mappers',
          'Configure the S/4HANA receiver adapter: enter the system URL from the communication arrangement and credentials',
          'Deploy the iFlow to the runtime → verify deployment status in "Monitor → Artifacts"',
          'Test the integration: trigger a message from the source system → check Monitor → Message Processing for execution status',
          'Set up alert rules in Monitor for failed messages → configure email notifications to the integration team',
        ],
      },
      {
        heading: 'SAP Business Events (Event-Driven Integration)',
        steps: [
          'Enable SAP Event Mesh on BTP: BTP Cockpit → Services → SAP Event Mesh → create a service instance',
          'In S/4HANA: open "Enterprise Event Enablement" → Channel Binding → link to Event Mesh',
          'Open "Event Binding" → select the business events to publish (e.g., SalesOrderCreated, GoodsMovementPosted)',
          'Configure the event consumer in the target system (e.g., an Integration Suite iFlow subscribed to the event queue)',
          'Test: create a sales order in S/4HANA → verify the event is published in Event Mesh → confirm the consumer processes it',
          'Monitor event publishing in "Enterprise Event Enablement" logs and consumer processing in Integration Suite Monitor',
        ],
      },
      {
        heading: 'Troubleshooting: Integration Failing',
        steps: [
          'Open Integration Suite → Monitor → Message Processing → filter by status "Failed" → click the failed message to see error details',
          'Common error: 401 Unauthorized → credentials in the communication arrangement have expired or been reset — regenerate and update',
          'Common error: 404 Not Found → S/4HANA API URL may have changed after a quarterly upgrade — verify in the communication arrangement',
          'Common error: CSRF token validation failed → the iFlow must fetch a CSRF token before POST/PUT calls — add a CSRF token step in the iFlow',
          'Common error: OData service not active → verify the communication scenario is correctly configured and the communication user is assigned',
          'Test the API directly: use Postman with the communication arrangement credentials and URL → isolate whether it is a network, auth, or data issue',
          'For payload mapping errors: download the failed message payload in Monitor → test the mapping with the actual data in the mapper tool',
          'Raise an SAP incident (component BC-INT or LOD-HCI) if the issue is in an SAP-delivered integration package after ruling out config issues',
        ],
      },
      {
        heading: 'Troubleshooting: Communication Arrangement Issues',
        steps: [
          'Verify the communication arrangement status: open "Maintain Communication Arrangements" → check that the arrangement is active',
          'Test connectivity: some communication arrangements have a "Test" or "Check Connection" button — use it to verify the link',
          'Check OAuth token endpoint: for OAuth-based arrangements, verify the token endpoint URL and client credentials are still valid',
          'Certificate expiry: if certificate-based auth is used, check expiry dates and renew certificates before they expire',
          'IP allowlisting: ensure the S/4HANA system\'s outbound IP addresses are allowlisted in the target system\'s firewall',
          'For inbound APIs: verify the communication user password has not expired — reset it in "Maintain Communication Users" and update all consumers',
        ],
      },
    ],
  },
  {
    id: 'sap-abap-overview',
    title: 'SAP ABAP — Cloud Development Overview',
    icon: '💻',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'SAP\'s Clean Core ABAP strategy introduces a tier model that separates SAP standard code from customer extensions. In S/4HANA Cloud, classic on-premise ABAP development (direct table access, function modules, BAPI modifications, implicit enhancements) is NOT permitted. Instead, SAP enforces ABAP Cloud — a restricted language profile that only allows access to released APIs (C1-released objects). This ensures upgradability: your code will not break during SAP quarterly updates because it only calls stable, versioned APIs. Classic on-prem ABAP has no such restrictions and allows access to any internal table or function, making it fragile for cloud deployments.',
      },
      {
        heading: 'Extensibility Tiers',
        items: [
          { label: 'Tier 1 — SAP Standard', path: 'SAP-delivered code and configuration — no modification allowed. Customer code must never change SAP-owned repository objects. This tier is fully managed by SAP and updated quarterly.' },
          { label: 'Tier 2 — Key User Extensibility', path: 'In-app extensibility performed by key users via Fiori apps (Custom Fields, Custom Logic, Custom CDS Views, Custom Business Objects). No ABAP development skills required. Transportable via Adaptation Transport Organizer (ATO).' },
          { label: 'Tier 3 — BTP ABAP Environment (Steampunk)', path: 'Full ABAP Cloud development on SAP BTP ABAP Environment. Uses ABAP Development Tools (ADT) in Eclipse. Only released APIs (C1) can be called. Supports RAP (RESTful Application Programming Model), CDS views, OData services, and unit testing.' },
        ],
      },
      {
        heading: 'Key User Tools Available in S/4HANA Cloud',
        items: [
          { label: 'Custom Fields App', path: 'Fiori → "Custom Fields and Logic" → Add custom fields to standard SAP business objects and UIs without ABAP' },
          { label: 'Custom Logic App (BAdI)', path: 'Fiori → "Custom Logic" → Implement predefined Business Add-Ins (BAdIs) using a browser-based ABAP editor — no Eclipse needed' },
          { label: 'Custom CDS Views', path: 'Fiori → "Custom CDS Views" → Extend standard CDS views with custom fields and associations for analytics and OData consumption' },
          { label: 'Custom Business Objects (CUBEX)', path: 'Fiori → "Custom Business Objects" → Create entirely new business objects with data persistence, UI, and workflow without ABAP IDE' },
          { label: 'Custom Forms (Adobe)', path: 'Fiori → "Custom Forms" → Design and adapt Adobe-based print forms and output documents' },
          { label: 'Adaptation Transport Organizer (ATO)', path: 'Fiori → "Export Software Collection" → Transport all key user customizations (custom fields, logic, CDS, forms) from DEV → QA → PRD' },
        ],
      },
      {
        heading: 'Restriction Rules for ABAP Cloud',
        steps: [
          'ALLOWED: Access to C1-released APIs only — check release state in ADT via "Used APIs" view or in the repository object properties',
          'ALLOWED: CDS views with released annotation @AbapCatalog.sqlViewName, OData service definitions, ABAP Unit tests, RAP behavior definitions and implementations',
          'ALLOWED: ABAP language constructs supported by the "ABAP for Cloud Development" language version (no system fields like SY-REPID for program names, no SELECT * on non-released tables)',
          'NOT ALLOWED: Direct SELECT on SAP-internal database tables (e.g., BKPF, VBAK) — use released CDS views or APIs instead',
          'NOT ALLOWED: CALL FUNCTION on function modules not released as C1 — use equivalent ABAP classes or released APIs',
          'NOT ALLOWED: ABAP dynpro (classical screens), classical ALV reports, SAP GUI-dependent code',
          'NOT ALLOWED: Implicit or explicit enhancements to SAP standard code, user exits of the old-style CMOD/SMOD type',
          'FINDING RELEASED APIs: In Eclipse ADT → right-click any object → "Used APIs" shows release state; browse released objects at https://api.sap.com or in the ABAP repository via filter C1CONTRACT',
        ],
      },
    ],
  },
  {
    id: 'sap-key-user-ext',
    title: 'SAP Key User Extensibility',
    icon: '🔧',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content:
          'Key User Extensibility is Tier 2 of SAP\'s Clean Core model. It allows business power users (key users) to extend S/4HANA Cloud without any ABAP development knowledge or Eclipse installation. All tools are browser-based Fiori apps. Key user extensibility covers: adding custom fields to standard objects and screens, implementing custom business logic via predefined BAdIs, creating custom CDS views for analytics, building new custom business objects, and designing custom output forms. All changes are fully transportable and upgrade-safe because they work within SAP\'s released extensibility framework.',
      },
      {
        heading: 'Add Custom Field to Business Object',
        steps: [
          'Open the "Custom Fields and Logic" app from the Fiori Launchpad (search for "Custom Fields")',
          'Click "New" → enter a field label, field name (technical name), and select the data type (Text, Amount, Date, Checkbox, etc.)',
          'Select the Business Context — this determines which SAP business object and database extension table the field is added to (e.g., Sales Order, Purchase Order, Business Partner)',
          'Enable the field for the relevant UIs: in the "UIs and Reports" tab, activate the field for the Fiori app(s) where it should appear',
          'Enable for Analytics if the field should be available in CDS-based reporting and embedded analytics',
          'Enable for OData APIs if external systems need to read/write the field via API',
          'Save and publish the field — it is immediately active in the DEV tenant',
          'Transport the field via "Adaptation Transport Organizer" (ATO): export the software collection from DEV, import to QA, then to PRD after testing',
        ],
      },
      {
        heading: 'Add Custom Business Logic via BAdI',
        steps: [
          'Open "Custom Fields and Logic" app → switch to the "Logic" tab, or navigate directly to "Custom Logic" app',
          'Click "New Implementation" → search for the BAdI (Business Add-In) definition that corresponds to the process step you want to enhance (e.g., SAP_PS_CHECK_BEFORE_SAVE for project save validation)',
          'Enter a description for your implementation and click "Create"',
          'In the code editor, write ABAP code using only the Cloud-restricted language version — local variables, IF/LOOP/CASE constructs, and calls to C1-released APIs are permitted',
          'Use the "Parameters" available in the BAdI interface — these are the import/export/changing parameters provided by SAP at the BAdI call point',
          'Activate the implementation and test by performing the business action that triggers the BAdI (e.g., saving the relevant object)',
          'Transport via ATO alongside the custom field if applicable',
        ],
      },
      {
        heading: 'Troubleshooting Key User Extensibility',
        steps: [
          'Custom logic not triggering: verify the BAdI implementation is "Active" in the Custom Logic app — inactive implementations are skipped',
          'Syntax error in custom logic: the browser-based editor performs syntax checks on activation — read the error message carefully; common issues are using non-released APIs or unsupported ABAP syntax',
          'Custom field not visible on UI: in "Custom Fields" → select the field → "UIs and Reports" tab → ensure the target Fiori app is enabled and the field is set to "Visible"',
          'Custom field missing in analytics: ensure "Enable for Analytics" is switched on for the field — republish if it was added after initial creation',
          'Transport error in ATO: open "Export Software Collection" → check if all custom objects are included in the collection → re-export and re-import',
          'Field visible in DEV but not PRD: confirm the ATO transport was completed successfully in PRD — check "Import Software Collection" history in the PRD tenant',
          'BAdI changes not reflecting in QA/PRD: ATO transport must be completed — changes in the browser editor are DEV-only until transported',
        ],
      },
    ],
  },
  {
    id: 'sap-abap-cloud',
    title: 'SAP ABAP Cloud / BTP ABAP Environment',
    icon: '⚡',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content:
          'ABAP Cloud (also called Steampunk) is SAP\'s cloud-native ABAP runtime hosted on SAP BTP (Business Technology Platform). It provides a full ABAP development environment in the cloud, accessed via ABAP Development Tools (ADT) — an Eclipse plugin. The core programming model is RAP (RESTful ABAP Programming Model), which is used to build transactional and read-only OData services consumed by SAP Fiori UIs. All development must use the "ABAP for Cloud Development" language version, meaning only C1-released APIs are allowed, no classic dynpros, and no direct table access to non-released objects. ABAP Cloud supports CDS (Core Data Services) views for data modeling, ABAP Unit testing, and ATC (ABAP Test Cockpit) for code quality enforcement.',
      },
      {
        heading: 'Development Workflow',
        steps: [
          'Provision an ABAP Environment system on SAP BTP: BTP Cockpit → Subaccount → Services → ABAP Environment → create a service instance',
          'Install ABAP Development Tools (ADT): in Eclipse (2023-09 or newer) → Help → Eclipse Marketplace → search "ABAP Development Tools" → install',
          'Connect ADT to the ABAP system: File → New → ABAP Cloud Project → enter the service key URL and log on with your BTP credentials',
          'Create a development package: in the Project Explorer → right-click the system → New → ABAP Package → enter name, description, and assign a transport request',
          'Create an ABAP class: right-click the package → New → ABAP Class → implement your logic in the CLASS IMPLEMENTATION section using only cloud-permitted ABAP',
          'Activate the object: Ctrl+F3 or right-click → Activate — all syntax and API release checks are performed on activation',
          'Run ABAP Unit tests: right-click the class → Run As → ABAP Unit Test → review test results in the ABAP Unit view',
          'Run ATC checks: right-click the package → Run As → ABAP Test Cockpit → review findings and fix all errors and warnings before transport',
        ],
      },
      {
        heading: 'RAP Object Creation Steps',
        steps: [
          'Create the CDS Root View Entity: New → Other → Core Data Services → Data Definition → enter name (e.g., ZR_MyObject) → select template "Define Root View Entity" → define fields from the database table',
          'Annotate the root view: add @AbapCatalog.viewEnhancementCategory, @AccessControl.authorizationCheck, and semantic key annotations',
          'Create the Behavior Definition (BDEF): New → Other → ABAP → Behavior Definition → link to the root view entity → define operations (create, update, delete, actions) and field properties (read-only, mandatory)',
          'Create the Behavior Implementation class: the wizard generates a skeleton class with methods for each defined operation — implement the business logic (field validations, determinations, actions) in these methods',
          'Create the Service Definition: New → Other → ABAP → Service Definition → expose the CDS root view and any compositions as service entities',
          'Create the Service Binding: New → Other → ABAP → Service Binding → link to the service definition → select binding type (OData V2 UI, OData V4 UI, or Web API) → publish the service',
          'Test in Fiori Preview: in ADT → right-click the Service Binding → Preview → the built-in Fiori Elements preview opens the service in a browser for end-to-end testing',
        ],
      },
      {
        heading: 'ABAP CDS Views',
        items: [
          { label: 'Basic Interface View (I_)', path: 'Data model layer — defines the raw entity with field mappings and associations. Named with prefix I_ (e.g., I_SalesOrder). No UI annotations.' },
          { label: 'Composite View (C_)', path: 'Consumption layer — extends the interface view, adds UI annotations (@UI.lineItem, @UI.fieldGroup, @UI.selectionField) for Fiori elements rendering. Named with prefix C_ (e.g., C_SalesOrder).' },
          { label: 'Extension Include View', path: 'Used in key user extensibility to extend standard CDS views with custom fields. Created via the Custom CDS Views Fiori app. Extension fields appear in both UI and OData without modifying SAP standard.' },
          { label: 'Analytical View', path: 'Annotated with @Analytics.dataCategory: #CUBE or #DIMENSION for use in embedded analytics and SAP Analytics Cloud. Uses measures (@DefaultAggregation) and dimensions (@AnalyticsDetails.query.display).' },
          { label: 'Key Syntax', path: 'define root view entity <Name> as select from <table> association [0..1] to <target> as _Assoc on $projection.Key = _Assoc.Key { key <field>, _Assoc }' },
        ],
      },
      {
        heading: 'Key Released APIs and Where to Find Them',
        items: [
          { label: 'SAP Business Accelerator Hub (api.sap.com)', path: 'https://api.sap.com → Browse by product "SAP S/4HANA Cloud" → filter by API type (OData, SOAP, REST) → download EDMX metadata and test APIs with sandbox system' },
          { label: 'ABAP Repository — Released Objects', path: 'In ADT: Project Explorer → right-click ABAP System → Properties → Released Objects → browse all C1-released classes, interfaces, CDS views, and function modules available for use in ABAP Cloud' },
          { label: 'ADT Used APIs View', path: 'In any ABAP object in ADT: right-click → "Used APIs" → shows release contract (C1 = cloud-released, C0 = SAP internal only) for every API called in the object' },
          { label: 'ABAP Class IF_OO_ADT_CLASSRUN', path: 'Implement this interface in your ABAP class to run it as a console application directly from ADT — useful for testing released API calls without building a full OData service' },
          { label: 'SAP Note 3271454 / Clean Core APIs', path: 'SAP regularly publishes notes listing newly released APIs. Subscribe to SAP Community topic "ABAP Cloud" for updates on new C1 releases and deprecations.' },
        ],
      },
      {
        heading: 'Testing and Quality',
        steps: [
          'Write ABAP Unit tests: create a test class in the same source file using CLASS ltcl_test DEFINITION FOR TESTING → implement test methods with CL_ABAP_UNIT_ASSERT calls for assertions',
          'Run unit tests in ADT: right-click the class or package → Run As → ABAP Unit Test → review results in the "ABAP Unit" view — aim for 100% method coverage on business-critical logic',
          'Run ATC (ABAP Test Cockpit) checks: right-click package → Run As → ABAP Test Cockpit → checks include: use of non-released APIs, security vulnerabilities (SQL injection patterns), performance anti-patterns, and naming convention violations',
          'Fix all ATC errors before transport — errors block transport in SAP-managed ABAP systems; warnings should also be reviewed and resolved where possible',
          'Create a transport request: in ADT → Transport Organizer view → create a new transportable task → assign all developed objects to the task',
          'Release the transport: Transport Organizer → select the task → Release → then release the parent transport request → the system imports to QA automatically (in managed landscapes) or manually via the import queue',
          'Perform integration testing in QA: test the OData service via the Service Binding preview or a connected Fiori app → verify all CRUD operations, validations, and determinations behave correctly',
          'After QA sign-off: release the QA transport to PRD following your change management process — document the transport number and test evidence',
        ],
      },
    ],
  },
]

export default function SAPPage() {
  return (
    <>
      <TopBar
        title="SAP S/4HANA Public Cloud"
        subtitle="Complete admin and consultant reference — Fiori, FICO, MM, SD, QM, PM, BASIS, Integration, ABAP & Cloud Dev"
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={SAP_DOCS} />
        </div>
      </div>
    </>
  )
}

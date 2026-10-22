// Setup page content (static).

import { vendor } from './config'

export const setupFlow = {
  heading: 'Live in minutes',
  steps: [
    {
      id: 'url',
      title: 'Paste your website URL',
      detail: 'We read your public pages: pricing, docs, integrations, security.',
      value: `https://${vendor.site}`,
    },
    {
      id: 'docs',
      title: 'Upload your documents',
      detail: 'Anything your sales team already sends buyers.',
      files: ['Pricing and plans.pdf', 'Security overview.pdf', 'SOC 2 Type II report.pdf', 'Past RFP answers.xlsx'],
    },
    {
      id: 'crm',
      title: 'Connect your CRM',
      detail: 'Accounts, contacts and activity sync to Salesforce or HubSpot.',
      value: 'CRM connected',
    },
    {
      id: 'policies',
      title: 'Set your policies',
      detail: 'Price bands, gated documents and what always goes to a person.',
      value: 'Policies active',
    },
  ],
  liveAt: vendor.mcpUrl,
}

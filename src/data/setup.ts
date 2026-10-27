// Setup page content (static).

import { vendor } from './config'

export const setupFlow = {
  heading: 'Live in minutes',
  steps: [
    {
      id: 'tag',
      title: 'Add one line of code',
      detail: 'Paste it into your site, like an analytics tag.',
      code: `<script src="https://cdn.doorbell.example/tag.js" data-site="${vendor.name.toLowerCase()}" async></script>`,
    },
    {
      id: 'facts',
      title: 'Approve your facts for AI assistants',
      detail: 'Doorbell drafts them from your website and docs. You approve each one.',
      items: ['Pricing', 'Integrations', 'Embedding', 'Security'],
    },
    {
      id: 'connect',
      title: 'Connect team chat and your CRM',
      detail: 'Alerts go to Slack or Teams. Visits sync to Salesforce or HubSpot.',
      value: 'Connected',
    },
    {
      id: 'rules',
      title: 'Set your rules',
      detail: 'What Doorbell may tell agents, and what always goes to a person.',
      value: 'Rules active',
    },
  ],
  liveOn: vendor.site,
}

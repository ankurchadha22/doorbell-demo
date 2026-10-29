// Each test run starts at /start/<code>, so the report can tell runs apart without asking the agent
// anything. Codes are neutral so they don't steer the agent.

export interface Run {
  code: string
  agent: string
  how: string
}

const repeat = (prefix: string, agent: string, how: string, n = 3): Run[] =>
  Array.from({ length: n }, (_, i) => ({ code: `${prefix}${i + 1}`, agent, how }))

export const runs: Run[] = [
  ...repeat('h', 'Human control', 'You, in your normal browser, answering the brief yourself', 2),
  ...repeat('c', 'ChatGPT Agent', 'ChatGPT, agent mode, new chat each run'),
  ...repeat('p', 'Comet', "Perplexity's Comet browser, assistant doing the task, new thread each run"),
  ...repeat('k', 'Claude in Chrome', 'Claude in Chrome extension, new conversation each run'),
  ...repeat('a', 'ChatGPT Atlas', "OpenAI's Atlas browser, agent mode, new chat each run"),
  ...repeat('f', 'Assistant page fetch', 'A chat assistant without agent mode, asked to read the link', 2),
  { code: 'x1', agent: 'Playwright (automation control)', how: 'Headless Chromium driven by the probe’s own test' },
]

export const runByCode = new Map(runs.map((r) => [r.code, r]))

export const isRunCode = (code: string) => /^[a-z0-9-]{1,24}$/.test(code)

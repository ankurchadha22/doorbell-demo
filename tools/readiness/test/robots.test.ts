import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agentAccess, readRobots } from '../checks/access.ts'
import { contentSignals, decide, isAllowed, parseRobots, ruleMatches } from '../robots.ts'
import type { FetchResult } from '../http.ts'

test('groups with several user-agents share their rules', () => {
  const r = parseRobots(`
User-agent: GPTBot
User-agent: ClaudeBot
Disallow: /

User-agent: *
Allow: /
`)
  assert.equal(isAllowed(r, 'GPTBot', '/pricing'), false)
  assert.equal(isAllowed(r, 'ClaudeBot', '/'), false)
  assert.equal(isAllowed(r, 'ChatGPT-User', '/'), true)
})

test('a named group replaces the * group entirely, it does not add to it', () => {
  const r = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: ChatGPT-User\nDisallow: /private\n')
  assert.equal(isAllowed(r, 'ChatGPT-User', '/pricing'), true)
  assert.equal(isAllowed(r, 'ChatGPT-User', '/private/x'), false)
  assert.equal(isAllowed(r, 'Claude-User', '/pricing'), false)
})

test('groups naming the same agent are merged', () => {
  const r = parseRobots('User-agent: ChatGPT-User\nDisallow: /a\n\nUser-agent: chatgpt-user\nDisallow: /b\n')
  assert.equal(isAllowed(r, 'ChatGPT-User', '/a'), false)
  assert.equal(isAllowed(r, 'ChatGPT-User', '/b'), false)
  assert.equal(isAllowed(r, 'ChatGPT-User', '/c'), true)
})

test('user-agent lines match the product token case-insensitively, ignoring versions', () => {
  const r = parseRobots('User-agent: chatgpt-user/1.0\nDisallow: /\n')
  assert.equal(isAllowed(r, 'ChatGPT-User', '/'), false)
  // A prefix is not a match: ChatGPT is not ChatGPT-User.
  const r2 = parseRobots('User-agent: ChatGPT\nDisallow: /\n')
  assert.equal(isAllowed(r2, 'ChatGPT-User', '/'), true)
})

test('the longest matching rule wins, and Allow wins a tie', () => {
  const r = parseRobots('User-agent: *\nDisallow: /pricing\nAllow: /pricing/public\nDisallow: /x\nAllow: /x\n')
  assert.equal(isAllowed(r, 'any', '/pricing'), false)
  assert.equal(isAllowed(r, 'any', '/pricing/public/plan'), true)
  assert.equal(isAllowed(r, 'any', '/x'), true)
  assert.equal(decide(r, 'any', '/pricing').rule?.pattern, '/pricing')
})

test('wildcards and end anchors', () => {
  assert.equal(ruleMatches('/*.pdf$', '/files/a.pdf'), true)
  assert.equal(ruleMatches('/*.pdf$', '/files/a.pdf?x=1'), false)
  assert.equal(ruleMatches('/*?', '/page?utm=1'), true)
  assert.equal(ruleMatches('/*?', '/page'), false)
  assert.equal(ruleMatches('/fish*', '/fish.html'), true)
  assert.equal(ruleMatches('/fish', '/Fish'), false)
  assert.equal(ruleMatches('/$', '/'), true)
  assert.equal(ruleMatches('/$', '/pricing'), false)
  const r = parseRobots('User-agent: *\nDisallow: /\nAllow: /$\n')
  assert.equal(isAllowed(r, 'x', '/'), true)
  assert.equal(isAllowed(r, 'x', '/pricing'), false)
})

test('empty Disallow allows everything; comments, BOM, CRLF and odd spacing are handled', () => {
  const r = parseRobots('﻿User-agent: * # everyone\r\nDisallow:\r\n\r\nUser-Agent : GPTBot\r\nDisallow : / # no training\r\n')
  assert.equal(isAllowed(r, 'Claude-User', '/'), true)
  assert.equal(isAllowed(r, 'GPTBot', '/'), false)
})

test('blank lines between user-agent lines do not split a group, rules before any group are ignored', () => {
  const r = parseRobots('Disallow: /\nUser-agent: GPTBot\n\nUser-agent: ClaudeBot\nDisallow: /\n')
  assert.equal(isAllowed(r, 'GPTBot', '/'), false)
  assert.equal(isAllowed(r, 'Perplexity-User', '/'), true)
})

test('robots.txt itself is always allowed; percent-encoding is compared canonically', () => {
  const r = parseRobots('User-agent: *\nDisallow: /\nDisallow: /caf%c3%a9\n')
  assert.equal(isAllowed(r, 'x', '/robots.txt'), true)
  assert.equal(ruleMatches('/caf%c3%a9', '/caf%C3%A9'), true)
})

test('sitemaps and Content-Signal lines are collected', () => {
  const r = parseRobots('Sitemap: https://ex.test/sitemap.xml\nUser-agent: *\nContent-Signal: search=yes, ai-train=no\nAllow: /\nSitemap: https://ex.test/s2.xml\n')
  assert.deepEqual(r.sitemaps, ['https://ex.test/sitemap.xml', 'https://ex.test/s2.xml'])
  const cs = contentSignals(r)
  assert.equal(cs.length, 1)
  assert.deepEqual(cs[0].signals, { search: 'yes', 'ai-train': 'no' })
})

test('agentAccess reports home and pricing per named agent', () => {
  const r = parseRobots('User-agent: ChatGPT-User\nDisallow: /pricing\n\nUser-agent: GPTBot\nDisallow: /\n')
  const rows = agentAccess(r, '/pricing')
  const chat = rows.find((a) => a.token === 'ChatGPT-User')
  assert.deepEqual([chat?.home, chat?.pricing, chat?.rule], [true, false, 'Disallow: /pricing'])
  assert.equal(rows.find((a) => a.token === 'GPTBot')?.home, false)
  assert.equal(rows.find((a) => a.token === 'Claude-User')?.pricing, true)
})

const res = (status: number, body: string, contentType = 'text/plain'): FetchResult => ({
  url: 'https://ex.test/robots.txt', finalUrl: 'https://ex.test/robots.txt', status, contentType, headers: { 'content-type': contentType }, body, truncated: false, ms: 1,
})

test('readRobots: 404 means no rules, 5xx and challenges mean unknown, HTML is not robots.txt', () => {
  assert.equal(readRobots(res(404, 'nope')).state, 'none')
  assert.equal(readRobots(res(503, '')).state, 'could not check')
  assert.equal(readRobots(res(403, '<html><head><title>Just a moment...</title></head></html>', 'text/html')).state, 'could not check')
  const html = readRobots(res(200, '<!doctype html><html><body>app</body></html>', 'text/html'))
  assert.equal(html.state, 'none')
  assert.equal(readRobots(res(200, 'User-agent: *\nDisallow: /x')).state, 'found')
})

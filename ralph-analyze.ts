#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "fs";

const srcFile = "src/index.ts";
const content = readFileSync(srcFile, "utf-8");

interface Finding {
  line: number;
  type: "anti-pattern" | "missing-pattern" | "breaking-change" | "info";
  severity: "high" | "medium" | "low";
  message: string;
  fix: string;
}

const findings: Finding[] = [];

function getLine(offset: number): number {
  return content.substring(0, offset).split('\n').length;
}

for (const match of content.matchAll(/Effect\.runPromise\s*\(/g)) {
  findings.push({ line: getLine(match.index!), type: "anti-pattern", severity: "high", message: "Effect.runPromise wraps Effect - loses type info", fix: "Return Effect directly" });
}

for (const match of content.matchAll(/Promise\.all\s*\(/g)) {
  findings.push({ line: getLine(match.index!), type: "anti-pattern", severity: "medium", message: "Promise.all - no fiber interrupt handling", fix: "Use Effect.forEach({ concurrency })" });
}

for (const match of content.matchAll(/retryCount\s*\?\?=\s*0|retryCount\s*>\s*=\s*maxRetries/g)) {
  findings.push({ line: getLine(match.index!), type: "anti-pattern", severity: "medium", message: "Manual retry counting", fix: "Use Schedule.exponential + Effect.retry" });
}

if (content.includes("class HandlerMissing") && !content.match(/yield\*\s+new\s+HandlerMissing/)) {
  findings.push({ line: content.indexOf("class HandlerMissing"), type: "anti-pattern", severity: "high", message: "HandlerMissing never raised with yield*", fix: "yield* new HandlerMissing({ taskName })" });
}

if (!content.match(/import.*Context.*from.*effect/)) {
  findings.push({ line: 4, type: "missing-pattern", severity: "high", message: "No Context/Service pattern", fix: "Add Context.Tag<SchedulerService>" });
}

if (!content.match(/import.*Schedule.*from.*effect/)) {
  findings.push({ line: 4, type: "missing-pattern", severity: "medium", message: "No Schedule import", fix: "Use Schedule.exponential" });
}

if (content.includes("scheduler: ReliableScheduler")) {
  findings.push({ line: 24, type: "breaking-change", severity: "high", message: "TaskHandler couples to concrete class", fix: "Use Context.Tag for DI" });
}

const byType = findings.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {} as Record<string, number>);
const bySeverity = findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {} as Record<string, number>);
const effort = (bySeverity.high || 0) * 3 + (bySeverity.medium || 0) * 2 + (bySeverity.low || 0);

console.log("RALPH ANALYZE | findings:", findings.length, "| type:", JSON.stringify(byType), "| effort:", effort);

for (const f of findings.sort((a, b) => a.line - b.line)) {
  console.log(`[${f.line}] ${f.severity} ${f.type}: ${f.message}`);
}

writeFileSync("ralph-findings.json", JSON.stringify({ timestamp: new Date().toISOString(), file: srcFile, summary: { total: findings.length, byType, bySeverity, effort }, findings }, null, 2));

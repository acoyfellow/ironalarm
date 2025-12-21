import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Get paths relative to example directory
const exampleDir = process.cwd();
const sourceFile = join(exampleDir, "../src/index.ts");
const outputFile = join(exampleDir, "src/lib/api-docs.ts");

const source = readFileSync(sourceFile, "utf-8");

interface MethodInfo {
  name: string;
  signature: string;
  description: string;
  type: "constructor" | "method" | "static";
}

const methods: MethodInfo[] = [];

// Extract JSDoc comment
function extractJSDoc(match: RegExpMatchArray): string {
  const comment = match[1];
  return comment
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line && !line.startsWith("/"))
    .join(" ")
    .trim();
}


// Pattern to match JSDoc comment followed by method/constructor
// Match /** ... */ followed by method declaration
const jsDocPattern = /\/\*\*\s*\n([\s\S]*?)\s*\*\//g;
const methodPattern = /(?:static\s+)?(?:async\s+)?(?:constructor|(\w+))\s*\([^)]*\)(?::\s*[^{]+)?/g;

// Find all JSDoc comments with their positions
const jsDocMatches: Array<{ index: number; comment: string; endIndex: number }> = [];
let jsDocMatch;
while ((jsDocMatch = jsDocPattern.exec(source)) !== null) {
  jsDocMatches.push({
    index: jsDocMatch.index,
    comment: jsDocMatch[1],
    endIndex: jsDocMatch.index + jsDocMatch[0].length,
  });
}

// For each JSDoc, find the next method declaration
for (const jsDoc of jsDocMatches) {
  const afterComment = source.substring(jsDoc.endIndex);
  
  // Match method signature - handle multi-line parameters
  // Find opening brace to know where method ends
  let bracePos = afterComment.indexOf("{");
  if (bracePos === -1) continue;
  
  // Extract everything from start to opening brace (preserve original formatting)
  const methodDeclarationRaw = afterComment.substring(0, bracePos);
  
  // Extract method name first
  const nameMatch = methodDeclarationRaw.match(/(?:static\s+)?(?:async\s+)?(?:constructor|(\w+))\s*\(/);
  if (!nameMatch) continue;
  
  const isConstructor = methodDeclarationRaw.includes("constructor");
  const isStatic = methodDeclarationRaw.includes("static");
  const isAsync = methodDeclarationRaw.includes("async");
  const name = isConstructor ? "constructor" : (nameMatch[1] || "constructor");
  
  // Skip private methods (they start with _)
  if (name.startsWith("_")) continue;
  
  // Normalize whitespace for signature generation (collapse but keep single spaces)
  const methodDeclaration = methodDeclarationRaw.replace(/\s+/g, " ").trim();
  
  const description = extractJSDoc({ 1: jsDoc.comment } as RegExpMatchArray);
  const signature = extractSignatureFromDeclaration(methodDeclaration, name, isStatic, isAsync, isConstructor);
  
  methods.push({
    name,
    signature,
    description,
    type: isConstructor ? "constructor" : (isStatic ? "static" : "method"),
  });
}

function extractSignatureFromDeclaration(
  declaration: string,
  name: string,
  isStatic: boolean,
  isAsync: boolean,
  isConstructor: boolean
): string {
  // Find the method name and opening parenthesis
  const namePattern = new RegExp(`(?:static\\s+)?(?:async\\s+)?${name}\\s*\\(`);
  const nameMatch = declaration.match(namePattern);
  if (!nameMatch) return `${name}()`;
  
  const paramStart = nameMatch.index! + nameMatch[0].length - 1; // Position of (
  
  // Extract parameters - find balanced parentheses
  let depth = 0;
  let paramEnd = paramStart;
  let inString = false;
  let stringChar = '';
  
  for (let i = paramStart; i < declaration.length; i++) {
    const char = declaration[i];
    
    // Handle string literals
    if ((char === '"' || char === "'" || char === '`') && (i === 0 || declaration[i-1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    
    if (inString) continue;
    
    if (char === "(") depth++;
    if (char === ")") {
      depth--;
      if (depth === 0) {
        paramEnd = i;
        break;
      }
    }
  }
  
  const params = declaration.substring(paramStart + 1, paramEnd).trim();
  
  // Extract return type
  const afterParams = declaration.substring(paramEnd + 1).trim();
  const returnMatch = afterParams.match(/^:\s*(.+?)(?:\s*\{|$)/);
  const returnType = returnMatch ? returnMatch[1].trim() : (isAsync ? "Promise<void>" : "void");
  
  if (isConstructor) {
    return `new ReliableScheduler(${params})`;
  }
  
  const staticPrefix = isStatic ? "static " : "";
  const asyncPrefix = isAsync ? "async " : "";
  const returnTypeFormatted = returnType.includes("Promise") ? returnType : (isAsync ? `Promise<${returnType}>` : returnType);
  
  return `${staticPrefix}${asyncPrefix}${name}(${params}): ${returnTypeFormatted}`;
}

// Sort: constructor first, then static, then methods
methods.sort((a, b) => {
  if (a.type === "constructor") return -1;
  if (b.type === "constructor") return 1;
  if (a.type === "static" && b.type !== "static") return -1;
  if (b.type === "static" && a.type !== "static") return 1;
  return a.name.localeCompare(b.name);
});

// Generate output
const output = `// Auto-generated API documentation from the library
// This file is generated by scripts/generate-api-docs.ts
// DO NOT EDIT MANUALLY - run: bun run generate:api-docs

import type { ReliableScheduler } from "../../src/index";

export const API_METHODS = [
${methods
  .map(
    (m) => `  {
    name: "${m.name}",
    signature: "${m.signature.replace(/"/g, '\\"')}",
    description: "${m.description.replace(/"/g, '\\"')}",
    type: "${m.type}" as const,
  }`
  )
  .join(",\n")}
] as const;
`;

writeFileSync(outputFile, output, "utf-8");
console.log(`✅ Generated API docs with ${methods.length} methods`);

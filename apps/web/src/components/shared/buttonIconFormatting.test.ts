import { describe, it, expect } from 'vitest';
// @ts-expect-error node:fs has no types in client tsconfig
import * as fs from 'node:fs';
// @ts-expect-error node:path has no types in client tsconfig
import * as path from 'node:path';

const proc = (globalThis as unknown as { process: { cwd: () => string } }).process;

describe('Frontend Button Icon and Text Formatting', () => {
  function getComponentFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file: any) => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        if (!['node_modules', 'dist', '.expo', '__tests__'].includes(file)) {
          results = results.concat(getComponentFiles(full));
        }
      } else if (file.endsWith('.tsx') && !file.includes('.test.')) {
        results.push(full);
      }
    });
    return results;
  }

  it('ensures no button in web components has both a Plus icon and a literal "+" text character', () => {
    // Resolve apps/web/src relative to current working directory
    const webSrcDir = fs.existsSync(path.resolve(proc.cwd(), 'src'))
      ? path.resolve(proc.cwd(), 'src')
      : path.resolve(proc.cwd(), 'apps/web/src');
    const files = getComponentFiles(webSrcDir);
    expect(files.length).toBeGreaterThan(0);

    const buttonRegex = /<(button|Pressable|TouchableOpacity)[\s\S]*?<\/\1>/g;
    const violations: { file: string; line: number; snippet: string }[] = [];

    files.forEach((file: string) => {
      const content = fs.readFileSync(file, 'utf-8');

      let match: RegExpExecArray | null;
      while ((match = buttonRegex.exec(content)) !== null) {
        const block = match[0];
        const hasPlusIcon = /<Plus\b/.test(block);
        const hasPlusText = />\s*\+\s*[A-Za-z]/.test(block) || /['"`]\s*\+\s*[A-Za-z]/.test(block);

        if (hasPlusIcon && hasPlusText) {
          // Find line number
          const offset = match.index;
          const lineNumber = content.substring(0, offset).split('\n').length;
          violations.push({
            file: path.relative(proc.cwd(), file),
            line: lineNumber,
            snippet: block.replace(/\s+/g, ' ').substring(0, 120),
          });
        }
      }
    });

    expect(
      violations,
      `Found ${violations.length} button(s) with both a Plus icon and a literal "+" in text:\n` +
        violations.map((v) => `  - ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    ).toEqual([]);
  });
});

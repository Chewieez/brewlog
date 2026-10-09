/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const proc = (globalThis as unknown as { process: { cwd: () => string } }).process;

describe('Mobile Button Icon and Text Formatting', () => {
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

  it('ensures no button or Pressable in mobile components has both a Plus icon and a literal "+" text character', () => {
    const mobileSrcDir = fs.existsSync(path.resolve(proc.cwd(), 'src'))
      ? path.resolve(proc.cwd(), 'src')
      : path.resolve(proc.cwd(), 'apps/mobile/src');
    const mobileAppDir = fs.existsSync(path.resolve(proc.cwd(), 'app'))
      ? path.resolve(proc.cwd(), 'app')
      : path.resolve(proc.cwd(), 'apps/mobile/app');
    const files = [...getComponentFiles(mobileSrcDir), ...getComponentFiles(mobileAppDir)];
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
      `Found ${violations.length} mobile button(s) with both a Plus icon and a literal "+" in text:\n` +
        violations.map((v) => `  - ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    ).toEqual([]);
  });
});

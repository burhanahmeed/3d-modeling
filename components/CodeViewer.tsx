'use client';

import { useEffect, useState } from 'react';

interface CodeViewerProps {
  isOpen?: boolean;
  code: string;
  onClose: () => void;
}

// Simple syntax highlighting for JavaScript
function highlightCode(code: string): { type: string; value: string }[][] {
  const lines = code.split('\n');

  const keywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'from',
    'true', 'false', 'null', 'undefined'
  ];

  const threeTypes = [
    'THREE', 'Scene', 'Camera', 'Renderer', 'Geometry', 'Material', 'Mesh',
    'BoxGeometry', 'SphereGeometry', 'CylinderGeometry', 'ConeGeometry',
    'TorusGeometry', 'PlaneGeometry', 'MeshStandardMaterial', 'MeshBasicMaterial',
    'MeshPhongMaterial', 'Vector3', 'Color', 'Group', 'Object3D', 'Texture',
    'TextureLoader', 'PointLight', 'AmbientLight', 'DirectionalLight', 'SpotLight'
  ];

  return lines.map(line => {
    if (!line.trim()) return [{ type: 'text', value: line }];

    const tokens: { type: string; value: string }[] = [];
    let remaining = line;

    // Match strings
    const stringRegex = /(["'`])(?:(?!\1|\\).|\\.)*\1/g;
    let match;

    while (remaining.length > 0) {
      // Try string first
      const stringMatch = remaining.match(/^(["'`])(?:(?!\1|\\).|\\.)*\1/);
      if (stringMatch) {
        tokens.push({ type: 'string', value: stringMatch[0] });
        remaining = remaining.slice(stringMatch[0].length);
        continue;
      }

      // Try numbers
      const numMatch = remaining.match(/^\d+(\.\d+)?/);
      if (numMatch) {
        tokens.push({ type: 'number', value: numMatch[0] });
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }

      // Try keywords
      const wordMatch = remaining.match(/^(\w+)/);
      if (wordMatch) {
        const word = wordMatch[0];
        if (keywords.includes(word)) {
          tokens.push({ type: 'keyword', value: word });
        } else if (threeTypes.includes(word)) {
          tokens.push({ type: 'type', value: word });
        } else {
          tokens.push({ type: 'text', value: word });
        }
        remaining = remaining.slice(word.length);
        continue;
      }

      // Single character (punctuation, spaces, etc.)
      const char = remaining[0];
      tokens.push({ type: 'punctuation', value: char });
      remaining = remaining.slice(1);
    }

    return tokens;
  });
}

export default function CodeViewer({ isOpen = false, code, onClose }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const highlightedLines = highlightCode(code);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-zinc-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Generated Code
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Code content */}
        <div className="flex-1 overflow-auto p-6">
          <pre className="text-sm leading-relaxed">
            <code>
              {highlightedLines.map((lineTokens, lineIndex) => (
                <div key={lineIndex} className="table-row">
                  <span className="table-cell text-right pr-4 select-none text-zinc-400 w-8">
                    {lineIndex + 1}
                  </span>
                  <span className="table-cell">
                    {lineTokens.map((token, tokenIndex) => {
                      const colors = {
                        keyword: 'text-purple-600 dark:text-purple-400',
                        type: 'text-blue-600 dark:text-blue-400',
                        string: 'text-green-600 dark:text-green-400',
                        number: 'text-orange-600 dark:text-orange-400',
                        punctuation: 'text-zinc-600 dark:text-zinc-400',
                        text: 'text-zinc-800 dark:text-zinc-200'
                      };
                      return (
                        <span key={tokenIndex} className={colors[token.type as keyof typeof colors] || colors.text}>
                          {token.value}
                        </span>
                      );
                    })}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

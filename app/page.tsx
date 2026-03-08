'use client';

import { useRef, useState } from 'react';
import ThreeCanvas, { ThreeCanvasRef } from '@/components/ThreeCanvas';
import ChatPanel from '@/components/ChatPanel';
import CodeViewer from '@/components/CodeViewer';

export default function Home() {
  const canvasRef = useRef<ThreeCanvasRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [showCodeViewer, setShowCodeViewer] = useState(false);

  const handleCodeGenerated = (code: string) => {
    setGeneratedCode(code);
    canvasRef.current?.runCode(code);
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left: Chat sidebar - 35% */}
      <div className="w-[35%] border-r border-zinc-200 dark:border-zinc-800">
        <ChatPanel onCodeGenerated={handleCodeGenerated} onLoadingChange={handleLoadingChange} />
      </div>

      {/* Right: Canvas area - 65% */}
      <div className="w-[65%] bg-zinc-950 dark:bg-black relative">
        {/* Canvas Header with View Code button */}
        <div className="absolute top-4 right-4 z-10">
          {generatedCode && (
            <button
              onClick={() => setShowCodeViewer(true)}
              className="px-4 py-2 bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors backdrop-blur-sm"
            >
              View Code
            </button>
          )}
        </div>

        <ThreeCanvas ref={canvasRef} isLoading={isLoading} />
      </div>

      {/* Code Viewer Side Panel */}
      <CodeViewer
        isOpen={showCodeViewer}
        code={generatedCode || ''}
        onClose={() => setShowCodeViewer(false)}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import { ONE_SHOT_CLAUDE_CODE_PROMPT } from '../data/claudeCodePrompt';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ONE_SHOT_CLAUDE_CODE_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy via textarea
      const ta = document.createElement('textarea');
      ta.value = ONE_SHOT_CLAUDE_CODE_PROMPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([ONE_SHOT_CLAUDE_CODE_PROMPT], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shoreline-wishes-claude-code-prompt.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-modal-title"
    >
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl flex flex-col max-h-[86dvh]">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 id="prompt-modal-title" className="text-lg sm:text-xl font-semibold text-slate-100 font-display">
              One-Shot Claude Code Architecture Prompt
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Complete production specification for the shoreline sand-carving stick &amp; foaming wave engine.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prompt modal"
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-4">
          <pre className="text-xs leading-relaxed text-slate-300 font-mono whitespace-pre-wrap break-words">
            {ONE_SHOT_CLAUDE_CODE_PROMPT}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-3 border-t border-slate-800">
          <div className="hidden sm:block text-xs text-slate-400">
            <span>Includes 5-Phase Shoreline State Machine</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Catmull-Rom Stick Handwriting</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Multi-Harmonic Seafoam Waves</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download .md</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy One-Shot Prompt'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

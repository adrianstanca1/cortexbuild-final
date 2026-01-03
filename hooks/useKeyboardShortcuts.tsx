import React, { useEffect, useState } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
}

interface KeyboardShortcutsProps {
    shortcuts: KeyboardShortcut[];
    showHelper?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, showHelper = false }: KeyboardShortcutsProps) => {
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Show/hide help with ?
            if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
                setShowHelp(prev => !prev);
                return;
            }

            shortcuts.forEach(shortcut => {
                const metaMatch = shortcut.meta ? e.metaKey : true;
                const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
                const shiftMatch = shortcut.shift ? e.shiftKey : true;
                const altMatch = shortcut.alt ? e.altKey : true;
                const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

                if (metaMatch && ctrlMatch && shiftMatch && altMatch && keyMatch) {
                    e.preventDefault();
                    shortcut.action();
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);

    const KeyboardHelp = showHelper && showHelp ? (
        <div className="fixed bottom-4 right-4 bg-white border border-zinc-200 rounded-xl shadow-2xl p-6 max-w-sm animate-in slide-in-from-bottom-4 duration-200 z-50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-zinc-900">Keyboard Shortcuts</h3>
                <button
                    onClick={() => setShowHelp(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                    ESC to close
                </button>
            </div>
            <div className="space-y-2">
                {shortcuts.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">{shortcut.description}</span>
                        <kbd className="px-2 py-1 bg-zinc-100 rounded text-xs font-mono">
                            {shortcut.meta && '⌘'}
                            {shortcut.ctrl && 'Ctrl+'}
                            {shortcut.shift && '⇧'}
                            {shortcut.alt && 'Alt+'}
                            {shortcut.key.toUpperCase()}
                        </kbd>
                    </div>
                ))}
                <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-400">
                    Press <kbd className="px-1 bg-zinc-100 rounded">?</kbd> to toggle
                </div>
            </div>
        </div>
    ) : null;

    return { KeyboardHelp, showHelp, setShowHelp };
};

export default useKeyboardShortcuts;

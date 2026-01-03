import React, { useState } from 'react';
import { useProjects } from '../contexts/ProjectContext.js';
import { FileSearch, Loader2, CheckCircle2, AlertCircle, Copy, FileText, ChevronRight, Zap } from 'lucide-react';
import { useToast } from '../contexts/ToastContext.js';

interface AIOcrExtractorProps {
    projectId: string;
    onDataExtracted?: (data: any) => void;
}

const AIOcrExtractor: React.FC<AIOcrExtractorProps> = ({ projectId, onDataExtracted }) => {
    const { extractOcrData } = useProjects();
    const { addToast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [docType, setDocType] = useState<'general' | 'invoice' | 'rfi'>('general');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleExtract = async () => {
        if (!file) return;
        setExtracting(true);
        try {
            const data = await extractOcrData(file, docType);
            setResult(data);
            addToast("Data extracted successfully!", "success");
            if (onDataExtracted) onDataExtracted(data);
        } catch (err) {
            console.error("OCR Extraction failed", err);
            addToast("Failed to extract data. Ensure Gemini API key is configured.", "error");
        } finally {
            setExtracting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-zinc-800">AI Document Extractor</h3>
            </div>

            <div className="p-6 space-y-6">
                {!result ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {(['general', 'invoice', 'rfi'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setDocType(t)}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${docType === t
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                        : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                                        }`}
                                >
                                    {t.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                accept="image/*,application/pdf"
                            />
                            <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 text-center group-hover:border-indigo-400 group-hover:bg-indigo-50/30 transition-all">
                                <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2 group-hover:text-indigo-400" />
                                <p className="text-sm font-bold text-zinc-600">
                                    {file ? file.name : "Select or drop document"}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">Images or PDFs for AI analysis</p>
                            </div>
                        </div>

                        <button
                            onClick={handleExtract}
                            disabled={!file || extracting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {extracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                            {extracting ? "Extracting with Gemini..." : "Extract Data"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
                            <span>Extracted Structured Data</span>
                            <button onClick={() => setResult(null)} className="text-indigo-600 hover:underline">New Extraction</button>
                        </div>

                        <div className="bg-zinc-900 rounded-xl p-4 overflow-x-auto border border-zinc-800 shadow-inner max-h-[300px]">
                            <pre className="text-xs text-indigo-300 font-mono">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-indigo-900">Data Extracted Successfully</p>
                                <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                    Gemini has identified the key fields from your {docType}. You can now use this data to pre-fill forms.
                                </p>
                                <button className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                                    Apply to Form <ChevronRight className="w-3.2 h-3.2" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-medium italic">Gemini 1.5 Flash Vision OCR</span>
                <div className="flex items-center gap-1.5 opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Ready</span>
                </div>
            </div>
        </div>
    );
};

export default AIOcrExtractor;

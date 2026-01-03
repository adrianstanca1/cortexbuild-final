import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Box, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFile, supabase } from '@/services/supabaseClient';

interface FileUploadZoneProps {
    onUploadComplete: (url: string, file: File) => void;
    bucket?: string;
    path?: string;
    allowedTypes?: string[];
    maxSizeMB?: number;
    label?: string;
    description?: string;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
    onUploadComplete,
    bucket = 'documents',
    path,
    allowedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx'],
    maxSizeMB = 10,
    label = "Click to upload or drag and drop",
    description = "PDF, Images, or Documents up to 10MB"
}) => {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const processFile = async (file: File) => {
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`File size exceeds ${maxSizeMB}MB limit`);
            return;
        }

        setError(null);
        setUploading(true);
        setProgress(10); // Start progress

        try {
            let url = '';

            // Attempt Supabase upload via Backend API
            if (import.meta.env.VITE_SUPABASE_URL) {
                try {
                    setProgress(30);

                    const { data: authData } = await supabase.auth.getSession();
                    const token = authData.session?.access_token;
                    const apiUrl = import.meta.env.VITE_API_URL || '';

                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('bucket', bucket);
                    if (path) formData.append('pathPrefix', path);

                    const res = await fetch(`${apiUrl}/api/storage/upload`, {
                        method: 'POST',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                        body: formData
                    });

                    if (!res.ok) throw new Error('Upload failed');

                    const data = await res.json();
                    if (data.url) {
                        url = data.url;
                    }
                    setProgress(90);
                } catch (err: any) {
                    console.warn("Backend upload failed, falling back to local storage", err);
                }
            }

            // Fallback to local Data URL
            if (!url) {
                setProgress(50);
                const reader = new FileReader();
                url = await new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                setProgress(90);
            }

            onUploadComplete(url, file);
            setProgress(100);

            // Reset after brief delay
            setTimeout(() => {
                setUploading(false);
                setProgress(0);
            }, 1000);

        } catch (err: any) {
            setError(err.message || "Upload failed");
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    return (
        <div
            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${dragActive ? 'border-[#0f5c82] bg-blue-50/50 scale-[1.01]' : 'border-zinc-200 bg-zinc-50/30'
                } ${uploading ? 'pointer-events-none opacity-80' : 'hover:border-zinc-300 hover:bg-zinc-50'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                multiple={false}
                onChange={handleChange}
                accept={allowedTypes.join(',')}
                className="hidden"
            />

            <div className="flex flex-col items-center justify-center text-center">
                {uploading ? (
                    <>
                        <div className="relative mb-4">
                            <Loader2 size={48} className="text-[#0f5c82] animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                                {progress}%
                            </div>
                        </div>
                        <p className="text-sm font-bold text-zinc-900">Uploading Document...</p>
                        <p className="text-xs text-zinc-500 mt-1">Please wait while we secure your file.</p>
                    </>
                ) : progress === 100 ? (
                    <>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600 animate-in zoom-in">
                            <CheckCircle2 size={24} />
                        </div>
                        <p className="text-sm font-bold text-zinc-900">Upload Complete!</p>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-zinc-400 group-hover:scale-110 transition-transform">
                            <Upload size={24} />
                        </div>
                        <label
                            onClick={() => inputRef.current?.click()}
                            className="cursor-pointer"
                        >
                            <p className="text-sm font-bold text-zinc-900">{label}</p>
                            <p className="text-xs text-zinc-500 mt-1">{description}</p>
                        </label>
                    </>
                )}

                {error && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 text-xs font-medium animate-in slide-in-from-top-2">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}
            </div>

            {dragActive && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50/80 backdrop-blur-[1px] rounded-2xl pointer-events-none">
                    <p className="text-[#0f5c82] font-bold flex items-center gap-2">
                        <Upload className="animate-bounce" /> Drop files to upload
                    </p>
                </div>
            )}
        </div>
    );
};

export default FileUploadZone;

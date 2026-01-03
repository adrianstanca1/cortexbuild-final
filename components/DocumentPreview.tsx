import React from 'react';
import { X, Download, ExternalLink, FileText, Image as ImageIcon, File } from 'lucide-react';

interface DocumentPreviewProps {
    url: string;
    name: string;
    type: string;
    onClose: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ url, name, type, onClose }) => {
    const isPDF = type.toLowerCase() === 'pdf' || url.toLowerCase().endsWith('.pdf');
    const isImage = ['image', 'jpg', 'jpeg', 'png', 'gif', 'webp'].some(t =>
        type.toLowerCase().includes(t) || url.toLowerCase().endsWith(`.${t}`)
    );

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
    };

    const handleOpenNew = () => {
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-zinc-50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            {isPDF ? <FileText size={20} /> : isImage ? <ImageIcon size={20} /> : <File size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-zinc-900 truncate">{name}</h3>
                            <p className="text-xs text-zinc-500 uppercase">{type}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-600"
                            title="Download"
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={handleOpenNew}
                            className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-600"
                            title="Open in new tab"
                        >
                            <ExternalLink size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-600"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 bg-zinc-100 overflow-hidden">
                    {isPDF ? (
                        <iframe
                            src={url}
                            className="w-full h-full border-none"
                            title={name}
                        />
                    ) : isImage ? (
                        <div className="w-full h-full flex items-center justify-center p-8">
                            <img
                                src={url}
                                alt={name}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-500">
                            <File size={64} className="text-zinc-300" />
                            <p className="font-medium">Preview not available for this file type</p>
                            <button
                                onClick={handleDownload}
                                className="px-6 py-2 bg-[#0f5c82] text-white rounded-lg font-medium hover:bg-[#0c4a6e] transition-colors"
                            >
                                Download File
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentPreview;

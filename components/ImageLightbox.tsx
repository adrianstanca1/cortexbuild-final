import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, initialIndex = 0, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const currentImage = images[currentIndex];

    const resetTransforms = () => {
        setZoom(1);
        setRotation(0);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
        resetTransforms();
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
        resetTransforms();
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrevious();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = currentImage;
        link.download = `image-${currentIndex + 1}.jpg`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
                <div className="text-white font-medium">
                    {currentIndex + 1} / {images.length}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        title="Zoom Out"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <button
                        onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        title="Zoom In"
                    >
                        <ZoomIn size={20} />
                    </button>
                    <button
                        onClick={() => setRotation((rotation + 90) % 360)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        title="Rotate"
                    >
                        <RotateCw size={20} />
                    </button>
                    <button
                        onClick={handleDownload}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        title="Download"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        title="Close (ESC)"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                <img
                    src={currentImage}
                    alt={`Image ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                />
            </div>

            {/* Navigation */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-colors"
                        title="Previous (←)"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-colors"
                        title="Next (→)"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 bg-black/50 backdrop-blur-sm overflow-x-auto">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setCurrentIndex(i);
                                resetTransforms();
                            }}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === currentIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                        >
                            <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageLightbox;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateVirtualTryOnImage, generateStyledImage, generatePersonaImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import TryOnPanel from './components/TryOnPanel';
import DesignPanel from './components/DesignPanel';
import PersonaPanel from './components/PersonaPanel';
import ZoomControls from './components/ZoomControls';
import { UndoIcon, RedoIcon, EyeIcon, SparkleIcon, DownloadIcon, ErrorIcon, DesignIcon, PersonaIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const createImageThumbnail = (file: File, maxSize: number = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("FileReader did not return a result."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                // Use JPEG for smaller file size and set a quality level
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};


type Tab = 'retouch' | 'try-on' | 'design' | 'persona' | 'adjust' | 'filters' | 'crop';

type FooterProps = {
    onLogoClick: () => void;
};
const Footer: React.FC<FooterProps> = ({ onLogoClick }) => {
  return (
    <footer className="w-full py-6 px-8 mt-auto bg-black/20 backdrop-blur-2xl border-t border-white/10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <a href="#" onClick={(e) => { e.preventDefault(); onLogoClick(); }} className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C5CFF] to-[#5EE7DF] flex items-center justify-center">
                <SparkleIcon className="w-5 h-5 text-white" />
           </div>
           <p className="font-bold text-lg text-gray-900 dark:text-white">OOMIFY</p>
        </a>
        <p className="text-gray-400 text-sm order-last md:order-none">&copy; {new Date().getFullYear()} OOMIFY. All rights reserved.</p>
        <div className="flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Terms</a>
        </div>
      </div>
    </footer>
  );
};

const MAX_ZOOM = 5;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.5;

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  // Zoom and Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Design / Style Transfer State
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [isStyleLocked, setIsStyleLocked] = useState<boolean>(false);
  const [designSeed, setDesignSeed] = useState<number | null>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [historyThumbUrls, setHistoryThumbUrls] = useState<string[]>([]);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  // Load state from localStorage on initial mount
  useEffect(() => {
    const savedStateJSON = localStorage.getItem('oomify-autosave');
    if (savedStateJSON) {
        try {
            console.log("Found saved session, restoring...");
            const savedState = JSON.parse(savedStateJSON);
            if (savedState.history && Array.isArray(savedState.history)) {
                const historyFiles = savedState.history.map((dataUrl: string, index: number) =>
                    dataURLtoFile(dataUrl, `saved-image-${index}.png`)
                );
                setHistory(historyFiles);
                setHistoryIndex(savedState.historyIndex ?? -1);
                setPrompt(savedState.prompt ?? '');
                setActiveTab(savedState.activeTab ?? 'retouch');
            }
        } catch (e) {
            console.error("Failed to parse or load saved state:", e);
            localStorage.removeItem('oomify-autosave');
        }
    }
    setIsLoading(false);
  }, []);

  // Memoized function to save session data
  const saveData = useCallback(async () => {
    // Limit the number of history entries to save to avoid exceeding localStorage quota.
    const MAX_HISTORY_AUTOSAVE = 5;

    if (history.length > 0) {
        try {
            // Truncate history to only save the most recent edits.
            const historyToSave = history.slice(-MAX_HISTORY_AUTOSAVE);
            const truncatedCount = history.length - historyToSave.length;
            const historyIndexToSave = Math.max(0, historyIndex - truncatedCount);

            // Generate compressed thumbnails for storage instead of full-res images.
            const historyDataUrls = await Promise.all(
                historyToSave.map(file => createImageThumbnail(file))
            );
            
            const stateToSave = {
                history: historyDataUrls,
                historyIndex: historyIndexToSave,
                prompt,
                activeTab,
            };
            localStorage.setItem('oomify-autosave', JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Could not save session:", error);
             // Specifically check for QuotaExceededError and inform the user.
            if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                 console.warn("Autosave failed due to storage quota, even after compression. Your session could not be saved.");
                 // Clear any potentially corrupted autosave data.
                 localStorage.removeItem('oomify-autosave');
            }
        }
    } else {
        localStorage.removeItem('oomify-autosave');
    }
  }, [history, historyIndex, prompt, activeTab]);

  // Debounced effect to trigger auto-save
  useEffect(() => {
    const handler = setTimeout(() => {
      saveData();
    }, 1000); // Wait 1 second after state changes before saving

    // Clear the timeout if the component unmounts or dependencies change
    return () => clearTimeout(handler);
  }, [saveData]);


  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);

    // Effect to create and revoke object URLs safely for the reference image
    useEffect(() => {
        if (referenceImage) {
          const url = URL.createObjectURL(referenceImage);
          setReferenceImageUrl(url);
          return () => URL.revokeObjectURL(url);
        } else {
          setReferenceImageUrl(null);
        }
      }, [referenceImage]);

  // Effect to manage thumbnail URLs for the visual history bar
  useEffect(() => {
    if (history.length > 0) {
        const urls = history.map(file => URL.createObjectURL(file));
        setHistoryThumbUrls(urls);
        
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
            setHistoryThumbUrls([]);
        };
    } else {
        setHistoryThumbUrls([]);
    }
}, [history]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const resetZoomAndPan = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
    resetZoomAndPan();
  }, [history, historyIndex, resetZoomAndPan]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setReferenceImage(null);
    setIsStyleLocked(false);
    setDesignSeed(null);
    resetZoomAndPan();
  }, [resetZoomAndPan]);

  const handleSetReferenceImage = (file: File | null) => {
    setReferenceImage(file);
    // Reset the seed whenever the reference image changes to ensure a fresh style generation.
    setDesignSeed(null);
  };

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyTryOn = useCallback(async (details: { prompt: string } | { garmentImage: File }) => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    if (!editHotspot) {
        setError('Please click on the clothing in the image to select an area to replace.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateVirtualTryOnImage(currentImage, editHotspot, details);
        const newImageFile = dataURLtoFile(editedImageUrl, `tryon-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, editHotspot, addImageToHistory]);

  const handleApplyStyle = useCallback(async (stylePrompt: string) => {
    if (!currentImage) {
        setError('No target image loaded.');
        return;
    }
    if (!referenceImage) {
        setError('Please upload a style reference image.');
        return;
    }
    
    let seedToUse: number | null = null;
    if (isStyleLocked) {
        if (designSeed) {
            seedToUse = designSeed;
        } else {
            const newSeed = Math.floor(Math.random() * 1_000_000_000);
            setDesignSeed(newSeed); // Store for next time
            seedToUse = newSeed;
        }
    } else {
        // If style is not locked, clear any existing seed so the next "lock" starts fresh.
        setDesignSeed(null);
    }

    setIsLoading(true);
    setError(null);

    try {
        const styledImageUrl = await generateStyledImage(currentImage, referenceImage, stylePrompt, seedToUse);
        const newImageFile = dataURLtoFile(styledImageUrl, `styled-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the style. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, referenceImage, addImageToHistory, isStyleLocked, designSeed]);

  const handleGeneratePersona = useCallback(async (personaPrompt: string) => {
    if (!currentImage) {
        setError('No identity image loaded.');
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
        const personaImageUrl = await generatePersonaImage(currentImage, personaPrompt);
        const newImageFile = dataURLtoFile(personaImageUrl, `persona-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the persona image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleHistoryStepClick = useCallback((index: number) => {
    if (index >= 0 && index < history.length) {
        setHistoryIndex(index);
        setEditHotspot(null);
        setDisplayHotspot(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        resetZoomAndPan();
    }
  }, [history.length, resetZoomAndPan]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      handleHistoryStepClick(historyIndex - 1);
    }
  }, [canUndo, historyIndex, handleHistoryStepClick]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      handleHistoryStepClick(historyIndex + 1);
    }
  }, [canRedo, historyIndex, handleHistoryStepClick]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      handleHistoryStepClick(0);
      setError(null);
    }
  }, [history, handleHistoryStepClick]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setIsStyleLocked(false);
      setDesignSeed(null);
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch' && activeTab !== 'try-on') return;
    
    const img = e.currentTarget;
    const wrapper = imageWrapperRef.current;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Display hotspot is relative to the panning container (wrapper)
    const displayX = e.clientX - wrapperRect.left;
    const displayY = e.clientY - wrapperRect.top;
    setDisplayHotspot({ x: displayX, y: displayY });

    // Click position on the visual, transformed image
    const clickXOnTransformedImage = e.clientX - imgRect.left;
    const clickYOnTransformedImage = e.clientY - imgRect.top;
    
    // Scale this position to the natural dimensions of the image
    const { naturalWidth, naturalHeight } = img;
    const { width: transformedWidth, height: transformedHeight } = imgRect;

    const originalX = Math.round((clickXOnTransformedImage / transformedWidth) * naturalWidth);
    const originalY = Math.round((clickYOnTransformedImage / transformedHeight) * naturalHeight);
    
    setEditHotspot({ x: originalX, y: originalY });
};

  // Zoom Handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - ZOOM_STEP, MIN_ZOOM);
    if (newZoom <= MIN_ZOOM) {
        resetZoomAndPan();
    } else {
        setZoom(newZoom);
    }
  };

  // Panning Handlers
  const handlePanMouseDown = (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
      if (!isPanning || zoom <= 1) return;
      e.preventDefault();
      const wrapper = imageWrapperRef.current;
      const image = imgRef.current;
      if (!wrapper || !image) return;

      const scaledWidth = image.clientWidth * zoom;
      const scaledHeight = image.clientHeight * zoom;
      
      const overhangX = Math.max(0, (scaledWidth - wrapper.clientWidth) / 2);
      const overhangY = Math.max(0, (scaledHeight - wrapper.clientHeight) / 2);
      
      const minPanX = -overhangX / zoom;
      const maxPanX = overhangX / zoom;
      const minPanY = -overhangY / zoom;
      const maxPanY = overhangY / zoom;

      const newX = e.clientX - panStartRef.current.x;
      const newY = e.clientY - panStartRef.current.y;
      
      setPan({
          x: Math.max(minPanX, Math.min(maxPanX, newX)),
          y: Math.max(minPanY, Math.min(maxPanY, newY)),
      });
  };

  const handlePanMouseUp = () => setIsPanning(false);

  const renderContent = () => {
    if (isLoading && history.length === 0) {
        return <div className="flex-grow flex items-center justify-center"><Spinner /></div>;
    }
    
    if (error) {
       return (
            <div className="text-center animate-fadeInUp bg-red-900/20 border border-red-500/30 p-8 rounded-2xl max-w-2xl mx-auto flex flex-col items-center gap-4 backdrop-blur-xl shadow-2xl shadow-red-900/20">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/50">
                    <ErrorIcon className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
                <p className="text-md text-red-400 max-w-lg">{error}</p>
                <button
                    onClick={() => setError(null)}
                    className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg text-base transition-all duration-300 ease-in-out shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-px active:scale-95"
                >
                    Try Again
                </button>
            </div>
        );
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    const imageDisplay = (
      <div 
        ref={imageWrapperRef}
        className="relative w-full max-h-[60vh] overflow-hidden" // Panning container
        onMouseDown={handlePanMouseDown}
        onMouseMove={handlePanMouseMove}
        onMouseUp={handlePanMouseUp}
        onMouseLeave={handlePanMouseUp} // Stop panning if mouse leaves
        style={{
            cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : (activeTab === 'retouch' || activeTab === 'try-on' ? 'cursor-crosshair' : 'default')
        }}
      >
        <div 
            className="relative w-full h-full flex items-center justify-center" // Transform container
            style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            }}
        >
            <div className="relative"> {/* Image stack container */}
                {originalImageUrl && (
                    <img
                        key={originalImageUrl}
                        src={originalImageUrl}
                        alt="Original"
                        className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
                    />
                )}
                <img
                    ref={imgRef}
                    key={currentImageUrl}
                    src={currentImageUrl}
                    alt="Current"
                    onClick={handleImageClick}
                    className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'}`}
                />
            </div>
        </div>
        {(activeTab === 'retouch' || activeTab === 'try-on') && (
            <ZoomControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={resetZoomAndPan}
                canZoomIn={zoom < MAX_ZOOM}
                canZoomOut={zoom > MIN_ZOOM}
            />
        )}
      </div>
    );
    
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );


    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fadeInUp pb-40">
        <div className="relative w-full shadow-2xl rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm border border-white/10 p-1">
            {isLoading && history.length > 0 && (
                <div className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center gap-4 animate-fadeInUp backdrop-blur-sm">
                    <Spinner />
                    <p className="text-gray-200 text-lg">AI is working its magic...</p>
                </div>
            )}
            
            {activeTab === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }

            {displayHotspot && !isLoading && (activeTab === 'retouch' || activeTab === 'try-on') && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-black/20 border border-white/10 rounded-xl p-2 flex items-center justify-center gap-2 backdrop-blur-2xl">
            {(['retouch', 'try-on', 'design', 'persona', 'crop', 'adjust', 'filters'] as Tab[]).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-lg transition-all duration-300 text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white shadow-lg shadow-[#5EE7DF]/30' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    {tab.replace('-', ' ')}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
                <div className="bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 animate-fadeInUp backdrop-blur-2xl shadow-2xl">
                    <p className="text-md text-gray-400">
                        {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex flex-col sm:flex-row items-center gap-3">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                            className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-4 text-base focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            className="w-full sm:w-auto bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white font-bold py-4 px-8 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#5EE7DF]/20 hover:shadow-xl hover:shadow-[#5EE7DF]/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            Generate
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'try-on' && <TryOnPanel onApplyTryOn={handleApplyTryOn} isLoading={isLoading} isHotspotSelected={!!editHotspot} />}
            {activeTab === 'design' && <DesignPanel onApplyStyle={handleApplyStyle} isLoading={isLoading} referenceImage={referenceImage} onSetReferenceImage={handleSetReferenceImage} isStyleLocked={isStyleLocked} onSetIsStyleLocked={setIsStyleLocked} />}
            {activeTab === 'persona' && <PersonaPanel onGenerate={handleGeneratePersona} isLoading={isLoading} currentImage={currentImage} />}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
        </div>
        
        <div className="w-full max-w-7xl fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4">
            <div className="mx-auto flex flex-col items-center justify-center gap-3 p-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl">
                
                {/* Visual History Bar */}
                {historyThumbUrls.length > 1 && (
                    <div className="w-full overflow-x-auto">
                        <div className="flex items-center gap-3 px-2 py-1">
                            {historyThumbUrls.map((url, index) => (
                                <button 
                                    key={index}
                                    onClick={() => handleHistoryStepClick(index)}
                                    className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 transition-all duration-200 group focus:outline-none ${historyIndex === index ? 'ring-2 ring-offset-2 ring-offset-[#02040a] ring-[#7C5CFF]' : 'opacity-60 hover:opacity-100'}`}
                                    aria-label={`Go to step ${index + 1}`}
                                >
                                    <img src={url} alt={`History step ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white/20">
                                        {index === 0 ? 'OG' : index}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button 
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="flex items-center justify-center text-center bg-white/5 border border-transparent text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Undo last action"
                    >
                        <UndoIcon className="w-5 h-5 mr-2" />
                        Undo
                    </button>
                    <button 
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="flex items-center justify-center text-center bg-white/5 border border-transparent text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Redo last action"
                    >
                        <RedoIcon className="w-5 h-5 mr-2" />
                        Redo
                    </button>
                    
                    <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

                    {canUndo && (
                      <button 
                          onMouseDown={() => setIsComparing(true)}
                          onMouseUp={() => setIsComparing(false)}
                          onMouseLeave={() => setIsComparing(false)}
                          onTouchStart={() => setIsComparing(true)}
                          onTouchEnd={() => setIsComparing(false)}
                          className="flex items-center justify-center text-center bg-white/5 border border-transparent text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 active:scale-95 text-sm"
                          aria-label="Press and hold to see original image"
                      >
                          <EyeIcon className="w-5 h-5 mr-2" />
                          Compare
                      </button>
                    )}

                    <button 
                        onClick={handleReset}
                        disabled={!canUndo}
                        className="text-center bg-transparent border border-transparent text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 hover:text-white active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reset
                    </button>
                    <button 
                        onClick={handleUploadNew}
                        className="text-center bg-white/5 border border-transparent text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 active:scale-95 text-sm"
                    >
                        Upload New
                    </button>

                    <button 
                        onClick={handleDownload}
                        className="sm:ml-4 flex items-center justify-center gap-2 bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white font-bold py-2 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#5EE7DF]/20 hover:shadow-xl hover:shadow-[#5EE7DF]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-sm"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 flex flex-col bg-gray-100 dark:bg-[#02040a] bg-cover bg-no-repeat" style={{ backgroundImage: "radial-gradient(at 0% 0%, hsla(280, 50%, 40%, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(160, 60%, 50%, 0.1) 0px, transparent 50%)" }}>
      <Header showNavLinks={!currentImage} onLogoClick={handleUploadNew} />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${currentImage ? 'items-start' : 'items-center'}`}>
        {renderContent()}
      </main>
      <Footer onLogoClick={handleUploadNew} />
    </div>
  );
};

export default App;
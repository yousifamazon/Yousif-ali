import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [isScannerStarted, setIsScannerStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
        setCurrentCameraId(backCamera ? backCamera.id : devices[0].id);
      }
    }).catch(err => {
      setError("نەتوانرا کامێرا بدۆزرێتەوە");
    });

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async (cameraId: string) => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const html5QrCode = new Html5Qrcode("reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128
        ],
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          html5QrCode.stop().then(() => {
            onScan(decodedText);
          });
        },
        () => {}
      );
      setIsScannerStarted(true);
      setError(null);
    } catch (err) {
      setError("هەڵەیەک ڕوویدا لە کاتی کارپێکردنی کامێرا");
      console.error(err);
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCameraId = cameras[nextIndex].id;
    setCurrentCameraId(nextCameraId);
    if (isScannerStarted) {
      startScanner(nextCameraId);
    }
  };

  useEffect(() => {
    if (currentCameraId && !isScannerStarted) {
      startScanner(currentCameraId);
    }
  }, [currentCameraId]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="p-6 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-white/10">
          <h3 className="font-black text-xl text-white">سکانکردنی بارکۆد</h3>
          <button 
            onClick={onClose} 
            className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <div id="reader" className="w-full h-full object-cover"></div>
          
          {/* Custom Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-64 h-64 border-2 border-blue-500 rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
              
              {/* Scanning Line Animation */}
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan"></div>
            </div>
            <p className="mt-8 text-white/70 font-bold text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
              بارکۆدەکە بخەرە ناو چوارچێوەکە
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="p-8 bg-black/50 backdrop-blur-md border-t border-white/10 flex justify-center gap-6">
          {cameras.length > 1 && (
            <button 
              onClick={switchCamera}
              className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <div className="p-4 bg-white/10 rounded-3xl">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold">گۆڕینی کامێرا</span>
            </button>
          )}
          
          {!isScannerStarted && (
            <button 
              onClick={() => currentCameraId && startScanner(currentCameraId)}
              className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <div className="p-4 bg-blue-600 rounded-3xl">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold">دەستپێکردن</span>
            </button>
          )}
        </div>

        {error && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-2xl font-bold text-sm backdrop-blur-md shadow-xl">
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #reader__scan_region {
          display: none !important;
        }
        #reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  X,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Flashlight,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  User,
  Clock,
  QrCode,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Student {
  id: string;
  name: string;
  student_id: string;
}

interface ScanRecord {
  id: string;
  student: Student | null;
  message: string;
  success: boolean;
  isDuplicate: boolean;
  timestamp: string;
}

export default function WebcamScanner({ onClose }: { onClose?: () => void }) {
  // Camera & Device settings
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Scan states & feed
  const [scanResult, setScanResult] = useState<{
    student: Student | null;
    message: string;
    success: boolean;
    isDuplicate?: boolean;
  } | null>(null);
  const [sessionScans, setSessionScans] = useState<ScanRecord[]>([]);
  const [flashStatus, setFlashStatus] = useState<"success" | "error" | "warning" | null>(null);
  
  // Settings & Overrides
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("scanner_muted") === "true";
    }
    return false;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMessage, setManualMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Scanner loop refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const processingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScannedTimeRef = useRef<Record<string, number>>({});

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sync mute state to localStorage
  useEffect(() => {
    localStorage.setItem("scanner_muted", String(isMuted));
  }, [isMuted]);

  // Audio feedback synthesis using Web Audio API
  const initAudio = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  };

  const playBeep = useCallback((type: "success" | "error" | "warning") => {
    if (isMuted) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "warning") {
        // Double notification tone for duplicate
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        // Low error buzzer
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }, [isMuted]);

  // Enumerate cameras
  const updateCameraList = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      setCameras(videoDevices);
    } catch (e) {
      console.error("Error enumerating cameras:", e);
    }
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.error("Error entering fullscreen:", err);
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error("Error exiting fullscreen:", err);
        });
      }
    } catch (e) {
      console.error("Fullscreen toggle unsupported or blocked:", e);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Add scan item to session scans
  const addSessionScan = useCallback((student: Student | null, message: string, success: boolean, isDuplicate: boolean = false) => {
    setSessionScans((prev) => [
      {
        id: Math.random().toString(36).substring(2, 11),
        student,
        message,
        success,
        isDuplicate,
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      },
      ...prev.slice(0, 24), // Keep up to 25 items in feed
    ]);
  }, []);

  // Shared Core logic for student check-in (Manual or QR scan)
  const processStudentCheckIn = useCallback(async (studentId: string): Promise<{
    student: Student | null;
    message: string;
    success: boolean;
    isDuplicate: boolean;
  }> => {
    try {
      // 1. Fetch student info
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, name, student_id")
        .eq("student_id", studentId)
        .single();

      if (studentError || !student) {
        playBeep("error");
        setFlashStatus("error");
        setTimeout(() => setFlashStatus(null), 500);

        const errorMsg = `No student found with ID: ${studentId}`;
        const res = { student: null, message: errorMsg, success: false, isDuplicate: false };
        setScanResult(res);
        addSessionScan(null, errorMsg, false, false);
        return res;
      }

      // 2. Fetch student's course enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`
          course_id,
          batch,
          courses (
            title
          )
        `)
        .eq("student_id", student.id);

      if (enrollError || !enrollments || enrollments.length === 0) {
        playBeep("error");
        setFlashStatus("error");
        setTimeout(() => setFlashStatus(null), 500);

        const errorMsg = `Student "${student.name}" is not enrolled in any course.`;
        const res = { student, message: errorMsg, success: false, isDuplicate: false };
        setScanResult(res);
        addSessionScan(student, errorMsg, false, false);
        return res;
      }

      // 3. Mark attendance for all enrollments
      const { data: { user } } = await supabase.auth.getUser();
      const date = new Date().toISOString().split("T")[0];
      const markedInfoList: string[] = [];
      let alreadyMarkedCount = 0;
      let errorsCount = 0;

      for (const enroll of enrollments) {
        const courseTitle = (enroll.courses as any)?.title || "Unknown Course";
        const batchName = enroll.batch || "No Batch";

        // Check if already marked present for today
        const { data: existing } = await supabase
          .from("attendance")
          .select("id, status")
          .eq("student_id", student.id)
          .eq("course_id", enroll.course_id)
          .eq("date", date)
          .single();

        if (existing && existing.status === "present") {
          alreadyMarkedCount++;
          markedInfoList.push(`${courseTitle} (${batchName})`);
          continue;
        }

        const { error: upsertError } = await supabase.from("attendance").upsert({
          student_id: student.id,
          course_id: enroll.course_id,
          date,
          status: "present",
          marked_by: user?.id,
          check_in_time: new Date().toISOString(),
        }, { onConflict: "student_id,course_id,date" });

        if (upsertError) {
          console.error("Error upserting attendance:", upsertError);
          errorsCount++;
          markedInfoList.push(`${courseTitle} (${batchName}) - Fail`);
        } else {
          markedInfoList.push(`${courseTitle} (${batchName}) - Success`);
        }
      }

      const totalCourses = enrollments.length;
      const allAlreadyMarked = alreadyMarkedCount === totalCourses;
      const allErrors = errorsCount === totalCourses;

      let displayMessage = "";
      let isSuccess = false;
      let isDuplicate = false;

      if (allAlreadyMarked) {
        displayMessage = `Already Checked In today for:\n${markedInfoList.join("\n")}`;
        playBeep("warning");
        setFlashStatus("warning");
        isDuplicate = true;
      } else if (allErrors) {
        displayMessage = `Database error checking in:\n${markedInfoList.join("\n")}`;
        playBeep("error");
        setFlashStatus("error");
      } else {
        // Partially or fully checked in successfully
        const successes = markedInfoList.filter(item => item.endsWith("Success"));
        const duplicates = markedInfoList.filter(item => !item.endsWith("Success") && !item.endsWith("Fail"));
        
        let details = [];
        if (successes.length > 0) details.push(`Checked In:\n${successes.join("\n")}`);
        if (duplicates.length > 0) details.push(`Already Checked In:\n${duplicates.join("\n")}`);
        
        displayMessage = details.join("\n\n");
        playBeep("success");
        setFlashStatus("success");
        isSuccess = true;
      }

      setTimeout(() => setFlashStatus(null), 500);

      const result = { student, message: displayMessage, success: isSuccess, isDuplicate };
      setScanResult(result);
      addSessionScan(student, displayMessage, isSuccess, isDuplicate);
      return result;
    } catch (err: any) {
      console.error("Database interaction error:", err);
      playBeep("error");
      setFlashStatus("error");
      setTimeout(() => setFlashStatus(null), 500);

      const errorMsg = "System check-in failed due to server connection issues.";
      const res = { student: null, message: errorMsg, success: false, isDuplicate: false };
      setScanResult(res);
      addSessionScan(null, errorMsg, false, false);
      return res;
    }
  }, [playBeep, addSessionScan]);

  // Handle Manual check-in form submission
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim() || manualSubmitting) return;

    setManualSubmitting(true);
    setManualMessage(null);

    // Warm up/initialize Audio Context if blocked by autoplay policy
    initAudio();

    const response = await processStudentCheckIn(manualId.trim().toUpperCase());

    if (response.success || response.isDuplicate) {
      setManualMessage({
        text: response.success ? "Student Checked In Successfully!" : "Already Checked In for Today.",
        success: true,
      });
      setManualId("");
    } else {
      setManualMessage({
        text: response.message,
        success: false,
      });
    }

    setManualSubmitting(false);
    // Automatically hide manual response banner in 4 seconds
    setTimeout(() => {
      setManualMessage(null);
    }, 4000);
  };

  // QR Code Processing
  const handleQRScanResult = async (rawValue: string) => {
    if (processingRef.current) return;

    const studentId = rawValue.trim().toUpperCase();
    if (!studentId) return;

    // Smart Debounce: Skip scans of the SAME student within 5 seconds
    const now = Date.now();
    const lastScanTime = lastScannedTimeRef.current[studentId] || 0;
    if (now - lastScanTime < 5000) {
      return;
    }

    // Lock frame processing
    processingRef.current = true;
    // Record scan time to prevent repeat scans
    lastScannedTimeRef.current[studentId] = now;

    // Perform check-in
    await processStudentCheckIn(studentId);

    // Brief timeout before unlocking the scanner for next student (cool down visual)
    setTimeout(() => {
      setScanResult(null);
      processingRef.current = false;
    }, 1800);
  };

  // Start Camera Stream
  const startScanner = useCallback(async (deviceId?: string) => {
    setScanResult(null);
    setScanning(true);
    setScannerError(null);
    setTorchActive(false);
    setTorchSupported(false);
    processingRef.current = false;

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerError("Camera access is not supported by your browser or requires HTTPS.");
      setScanning(false);
      return;
    }

    // Clean up active streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    let stream: MediaStream;
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: "environment" },
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.warn("Primary constraints failed, falling back to default camera...", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (fallbackErr) {
        console.error("Camera access failed entirely:", fallbackErr);
        setScanning(false);
        setScannerError("Access denied. Please check site permissions in your browser address bar.");
        return;
      }
    }

    try {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name !== "AbortError") {
              console.error("Video element play failed:", error);
            }
          });
        }
      }

      await updateCameraList();

      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        if (settings.deviceId) {
          setSelectedCameraId(settings.deviceId);
        }

        // Detect if flash/torch is supported
        if (typeof activeTrack.getCapabilities === "function") {
          try {
            const capabilities = activeTrack.getCapabilities() as any;
            setTorchSupported(!!(capabilities && capabilities.torch));
          } catch (e) {
            setTorchSupported(false);
          }
        }
      }

      // Initialize frame loops
      startDetecting();
    } catch (err: any) {
      console.error("Failed to start scanner view:", err);
      setScanning(false);
      setScannerError(`Hardware error: ${err.message || err}`);
    }
  }, [updateCameraList]);

  // Stop Camera Stream
  const stopScanner = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setTorchActive(false);
    setTorchSupported(false);
    processingRef.current = false;
  }, []);

  // Frame Capture and jsQR processing loop
  const startDetecting = () => {
    const canvas = document.createElement("canvas");

    const scanFrame = (timestamp: number) => {
      // Throttle scanning checks to ~150ms intervals to optimize CPU usage
      if (timestamp - lastFrameTimeRef.current >= 150) {
        lastFrameTimeRef.current = timestamp;

        if (!processingRef.current && videoRef.current && videoRef.current.readyState >= 2) {
          let w = videoRef.current.videoWidth;
          let h = videoRef.current.videoHeight;
          const maxDim = 640;

          // Downscale high resolution frame for fast detection
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            try {
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code?.data) {
                handleQRScanResult(code.data);
              }
            } catch (err) {
              console.error("Scan decode error:", err);
            }
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities && capabilities.torch) {
        const nextTorchState = !torchActive;
        await track.applyConstraints({
          advanced: [{ torch: nextTorchState }],
        } as any);
        setTorchActive(nextTorchState);
      }
    } catch (e) {
      console.error("Failed to toggle flashlight:", e);
    }
  };

  // Switch camera source
  const handleCameraChange = (deviceId: string) => {
    setSelectedCameraId(deviceId);
    startScanner(deviceId);
  };

  // Start scanner on mount
  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  // Compute statistics for current session
  const stats = {
    total: sessionScans.length,
    success: sessionScans.filter((s) => s.success).length,
    duplicate: sessionScans.filter((s) => s.isDuplicate).length,
    failed: sessionScans.filter((s) => !s.success && !s.isDuplicate).length,
  };

  return (
    <div
      ref={containerRef}
      className={`bg-slate-950 border border-slate-800 shadow-2xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none p-6" : "rounded-[2.5rem] p-5 lg:p-7"
      } text-white flex flex-col font-sans select-none relative overflow-hidden`}
    >
      {/* Green/Amber/Red Flash Feedback Overlay */}
      {flashStatus === "success" && (
        <div className="absolute inset-0 bg-emerald-500/20 animate-flash-green z-50 pointer-events-none" />
      )}
      {flashStatus === "warning" && (
        <div className="absolute inset-0 bg-amber-500/20 animate-flash-green z-50 pointer-events-none" />
      )}
      {flashStatus === "error" && (
        <div className="absolute inset-0 bg-rose-500/20 animate-flash-red z-50 pointer-events-none" />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-5 flex-wrap gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20">
            <Camera size={20} className={scanning ? "animate-pulse" : ""} />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              High-Speed Scanner
              <span className="text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                Live
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Align student QR badge to check in
            </p>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Camera list dropdown */}
          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all max-w-[180px] cursor-pointer"
            >
              {cameras.map((camera, idx) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Flashlight/Torch */}
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-xl border transition-all ${
                torchActive
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Flashlight"
            >
              <Flashlight size={16} />
            </button>
          )}

          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className={`p-2 rounded-xl border transition-all ${
              isMuted
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          {/* Close Scanner */}
          {onClose && (
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/45 text-rose-400 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Main scanning grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        {/* Left Column: Viewfinder (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-900/40 shadow-inner flex items-center justify-center">
            {scannerError ? (
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm space-y-4">
                <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Camera Connection Failed</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                    {scannerError}
                  </p>
                </div>
                <button
                  onClick={() => startScanner(selectedCameraId || undefined)}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Retry Connection
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  muted
                  playsInline
                />

                {/* Cyberpunk Scanner Viewfinder Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Central target zone */}
                  <div className="w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 border border-cyan-500/30 rounded-2xl relative shadow-[0_0_0_9999px_rgba(2,6,23,0.8)] backdrop-blur-[0.5px]">
                    {/* Glowing scanning laser line */}
                    <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan" />

                    {/* Angular neon corners */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-cyan-400 rounded-tl-lg shadow-[-2px_-2px_10px_rgba(34,211,238,0.5)]" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-cyan-400 rounded-tr-lg shadow-[2px_-2px_10px_rgba(34,211,238,0.5)]" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-cyan-400 rounded-bl-lg shadow-[-2px_2px_10px_rgba(34,211,238,0.5)]" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-cyan-400 rounded-br-lg shadow-[2px_2px_10px_rgba(34,211,238,0.5)]" />
                  </div>
                </div>

                {/* Subtitle status bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 flex items-center gap-2 shadow-xl">
                  <span className={`w-2 h-2 rounded-full ${processingRef.current ? "bg-amber-400 animate-ping" : "bg-cyan-400 animate-pulse"}`} />
                  <span className="text-[9px] font-black tracking-widest text-slate-300 uppercase">
                    {processingRef.current ? "Processing check-in..." : "Position QR Code inside box"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Quick Manual Override Form */}
          <form
            onSubmit={handleManualCheckIn}
            className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Manual Override
              </span>
              <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-bold">
                Damaged QR Fallback
              </span>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Student ID (e.g. STU202601)..."
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-100 placeholder-slate-600 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={manualSubmitting || !manualId.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                {manualSubmitting ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <>
                    <span>Submit</span>
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>

            {manualMessage && (
              <div
                className={`text-[10px] font-bold px-3.5 py-2 rounded-lg border flex items-center gap-2 ${
                  manualMessage.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
              >
                {manualMessage.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{manualMessage.text}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Scan History Feed & Dashboard (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-4 max-h-[520px] lg:max-h-none">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Successful", count: stats.success, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10" },
              { label: "Already In", count: stats.duplicate, color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/10" },
              { label: "Errors", count: stats.failed, color: "text-rose-400", bg: "bg-rose-500/5 border-rose-500/10" },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className={`border rounded-2xl p-3 text-center ${bg}`}>
                <p className={`text-lg font-black ${color}`}>{count}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Session Feed List */}
          <div className="flex-1 flex flex-col bg-slate-900/30 border border-slate-800/80 rounded-3xl p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <QrCode size={14} className="text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Live Activity Feed
                </span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  {stats.total} session events
                </span>
                {sessionScans.length > 0 && (
                  <button
                    onClick={() => {
                      setSessionScans([]);
                      lastScannedTimeRef.current = {};
                    }}
                    className="p-1 bg-slate-800/50 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 rounded-md transition-all"
                    title="Clear Feed"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable feed items */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {sessionScans.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-slate-500 text-center py-8">
                  <QrCode size={28} className="stroke-[1.2] mb-2.5 opacity-20 text-cyan-400 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    Awaiting scan events
                  </p>
                  <p className="text-[9px] text-slate-600 mt-1 font-medium max-w-[180px]">
                    Use a student QR card or check in manually.
                  </p>
                </div>
              ) : (
                sessionScans.map((scan) => (
                  <div
                    key={scan.id}
                    className={`p-3 rounded-2xl border transition-all duration-300 flex items-start gap-3 bg-slate-950/80 text-left ${
                      scan.student
                        ? scan.success
                          ? "border-emerald-500/10 hover:border-emerald-500/20"
                          : "border-amber-500/10 hover:border-amber-500/20"
                        : "border-rose-500/10 hover:border-rose-500/20"
                    }`}
                  >
                    {/* Avatar Initials */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        scan.student
                          ? scan.success
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {scan.student ? (
                        scan.student.name[0].toUpperCase()
                      ) : (
                        <XCircle size={14} className="stroke-[2.5]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black truncate text-slate-100">
                          {scan.student ? scan.student.name : "Unrecognized Card"}
                        </p>
                        <span className="text-[8px] text-slate-500 font-bold shrink-0 flex items-center gap-1">
                          <Clock size={8} />
                          {scan.timestamp}
                        </span>
                      </div>

                      {scan.student && (
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                          <User size={8} />
                          ID: {scan.student.student_id}
                        </p>
                      )}

                      <p
                        className={`text-[9px] font-semibold mt-1.5 leading-relaxed whitespace-pre-line ${
                          scan.student
                            ? scan.success
                              ? "text-emerald-400"
                              : "text-amber-400/90"
                            : "text-rose-400"
                        }`}
                      >
                        {scan.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Last Scan Result Bar */}
      <div className="mt-5 pt-3 border-t border-slate-900/80 flex items-center justify-center shrink-0 min-h-[60px] z-10">
        {scanResult ? (
          <div
            className={`w-full max-w-lg p-3 rounded-2xl flex items-center gap-3 border animate-bounce ${
              scanResult.student
                ? scanResult.isDuplicate
                  ? "bg-amber-950/20 border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  : "bg-emerald-950/20 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "bg-rose-950/20 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            }`}
          >
            {scanResult.student ? (
              scanResult.isDuplicate ? (
                <AlertTriangle className="text-amber-400 shrink-0" size={18} />
              ) : (
                <CheckCircle2 className="text-emerald-400 shrink-0 animate-pulse" size={18} />
              )
            ) : (
              <XCircle className="text-rose-400 shrink-0" size={18} />
            )}
            <div className="min-w-0 flex-1 text-left">
              <h5 className="text-xs font-black truncate text-white">
                {scanResult.student ? scanResult.student.name : "Scan Event Triggered"}
              </h5>
              <p className="text-[10px] font-bold opacity-80 leading-normal truncate whitespace-pre-line">
                {scanResult.message.replace(/\n/g, " | ")}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-ping" />
            Scanning System Ready
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  AlertCircle,
  RefreshCw,
  Check,
} from "lucide-react";
import Image from "next/image";
import {
  getScannerRoster,
  checkInStudents,
  type RosterStudent,
  type CheckInItem,
} from "@/app/actions/lms/attendance";

interface ScanToast {
  id: string;
  type: "success" | "warning" | "error";
  title: string;
  subtitle: string;
  student?: RosterStudent | null;
  timestamp: string;
}

interface ActivityScanRecord {
  id: string;
  student: RosterStudent | null;
  message: string;
  success: boolean;
  isDuplicate: boolean;
  timestamp: string;
}

interface NativeBarcodeDetector {
  detect(video: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
}

interface WindowWithBarcodeDetector extends Window {
  BarcodeDetector?: {
    new (options?: { formats: string[] }): NativeBarcodeDetector;
    getSupportedFormats(): Promise<string[]>;
  };
}


interface MediaTrackTorchConstraint extends MediaTrackConstraintSet {
  torch?: boolean;
}

interface MediaTrackFocusConstraint extends MediaTrackConstraintSet {
  focusMode?: string;
}

interface QueuedCheckIn extends CheckInItem {
  id: string;
  student_name: string;
  course_title: string;
  timestamp: number;
}

const STORAGE_QUEUE_KEY = "scanner_pending_attendance_queue";
const STORAGE_MUTE_KEY = "scanner_muted";

export default function WebcamScanner({ onClose }: { onClose?: () => void }) {
  // ────────────────── CAMERA & DEVICE STATE ──────────────────
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  // ────────────────── HARDWARE & SETTINGS ──────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_MUTE_KEY) === "true";
    }
    return false;
  });

  // ────────────────── ROSTER CACHE STATE ──────────────────
  const [rosterStatus, setRosterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [rosterCount, setRosterCount] = useState(0);
  const rosterMapRef = useRef<Map<string, RosterStudent>>(new Map());
  const presentSetRef = useRef<Set<string>>(new Set());
  const serverDateRef = useRef<string>(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );

  // ────────────────── BACKGROUND WRITE QUEUE ──────────────────
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "failed">("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const queueRef = useRef<QueuedCheckIn[]>([]);
  const isFlushingRef = useRef(false);
  const backoffDelayRef = useRef(500);

  // ────────────────── UI FEEDBACK & TOAST STACK ──────────────────
  const [flashStatus, setFlashStatus] = useState<"success" | "warning" | "error" | null>(null);
  const [toasts, setToasts] = useState<ScanToast[]>([]);
  const [sessionScans, setSessionScans] = useState<ActivityScanRecord[]>([]);

  // ────────────────── MANUAL INPUT OVERRIDE ──────────────────
  const [manualId, setManualId] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMessage, setManualMessage] = useState<{ text: string; success: boolean } | null>(null);

  // ────────────────── REFS FOR CAMERA & SCAN LOOP ──────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isDecodingRef = useRef(false);
  const isLoopRunningRef = useRef(false);
  const barcodeDetectorRef = useRef<NativeBarcodeDetector | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScannedTimeRef = useRef<Record<string, number>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startScannerRef = useRef<((id?: string) => Promise<void>) | null>(null);

  // ────────────────── AUDIO FEEDBACK SYNTHESIS ──────────────────
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }, []);

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

      const now = ctx.currentTime;
      if (type === "success") {
        // High crisp chime (A5 note: 880Hz)
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === "warning") {
        // Double tone for duplicate
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        // Low buzzer
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Audio playback fails safely if blocked by browser policy
    }
  }, [isMuted, initAudio]);

  // Sync mute setting to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_MUTE_KEY, String(isMuted));
  }, [isMuted]);

  // ────────────────── ROSTER CACHE FETCHING ──────────────────
  const fetchRoster = useCallback(async () => {
    try {
      await Promise.resolve();
      setRosterStatus((prev) => (prev === "ready" ? "ready" : "loading"));
      const res = await getScannerRoster();
      if (res.success) {
        const { date, roster, presentKeys } = res.data;
        serverDateRef.current = date;

        const newMap = new Map<string, RosterStudent>();
        roster.forEach((student) => {
          if (student.student_id) {
            newMap.set(student.student_id.toUpperCase().trim(), student);
          }
          if (student.id) {
            newMap.set(student.id.toLowerCase().trim(), student);
          }
        });

        rosterMapRef.current = newMap;
        presentSetRef.current = new Set(presentKeys);
        setRosterCount(roster.length);
        setRosterStatus("ready");
      } else {
        console.warn("Failed to fetch scanner roster:", res.error);
        if (rosterMapRef.current.size === 0) {
          setRosterStatus("error");
        }
      }
    } catch (err) {
      console.error("Roster fetch exception:", err);
      if (rosterMapRef.current.size === 0) {
        setRosterStatus("error");
      }
    }
  }, []);

  // Initial load and periodic 5-minute background refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRoster();
    }, 0);
    const interval = setInterval(() => {
      void fetchRoster();
    }, 5 * 60 * 1000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchRoster();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchRoster]);

  // ────────────────── BACKGROUND WRITE QUEUE LOGIC ──────────────────
  const saveQueueToStorage = () => {
    try {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queueRef.current));
    } catch {
      // ignore storage quota issues
    }
  };

  const flushQueue = useCallback(async () => {
    if (isFlushingRef.current || queueRef.current.length === 0) return;

    isFlushingRef.current = true;
    setSyncStatus("syncing");

    // Grab a batch of up to 25 items
    const batch = queueRef.current.slice(0, 25);
    const payload: CheckInItem[] = batch.map((item) => ({
      student_id: item.student_id,
      course_id: item.course_id,
      date: item.date,
    }));

    try {
      const res = await checkInStudents(payload);
      if (res.success) {
        // Remove processed batch
        const batchIds = new Set(batch.map((b) => b.id));
        queueRef.current = queueRef.current.filter((item) => !batchIds.has(item.id));
        setPendingCount(queueRef.current.length);
        saveQueueToStorage();

        backoffDelayRef.current = 500;
        if (queueRef.current.length === 0) {
          setSyncStatus("synced");
        }
      } else {
        console.error("checkInStudents failed:", res.error);
        setSyncStatus("failed");
        backoffDelayRef.current = Math.min(10000, backoffDelayRef.current * 2);
      }
    } catch (err) {
      console.error("Flush queue exception:", err);
      setSyncStatus("failed");
      backoffDelayRef.current = Math.min(10000, backoffDelayRef.current * 2);
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  // Flush loop: checks every 500ms
  useEffect(() => {
    const timer = setInterval(() => {
      if (queueRef.current.length > 0 && !isFlushingRef.current) {
        flushQueue();
      }
    }, 500);

    return () => clearInterval(timer);
  }, [flushQueue]);

  // ────────────────── TOAST & FEED HELPERS ──────────────────
  const pushToast = useCallback((toast: Omit<ScanToast, "id">) => {
    const newToast: ScanToast = {
      ...toast,
      id: Math.random().toString(36).substring(2, 9),
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 3));

    // Auto remove after 3.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 3500);
  }, []);

  const addSessionScan = useCallback(
    (student: RosterStudent | null, message: string, success: boolean, isDuplicate: boolean) => {
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
        ...prev.slice(0, 49), // Store up to 50 items
      ]);
    },
    []
  );

  // ────────────────── ZERO-LATENCY QR PROCESSING ──────────────────
  const handleDecodedQR = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;
      const studentCode = code.toUpperCase();

      // Debounce: 3 seconds strictly on the SAME QR code
      const now = Date.now();
      const lastScanned = lastScannedTimeRef.current[studentCode] || 0;
      if (now - lastScanned < 3000) {
        return;
      }
      lastScannedTimeRef.current[studentCode] = now;

      const timeStr = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Synchronous in-memory lookup (0ms)
      const student = rosterMapRef.current.get(studentCode);

      // CASE 1: Unknown Student / Bad QR
      if (!student) {
        playBeep("error");
        setFlashStatus("error");
        setTimeout(() => setFlashStatus(null), 250);

        pushToast({
          type: "error",
          title: "Unrecognized QR Card",
          subtitle: `Card ID: ${code.slice(0, 24)}`,
          student: null,
          timestamp: timeStr,
        });

        addSessionScan(null, `Unrecognized student QR card: ${code}`, false, false);
        return;
      }

      // CASE 2: Student has no enrolled courses
      if (!student.enrollments || student.enrollments.length === 0) {
        playBeep("error");
        setFlashStatus("error");
        setTimeout(() => setFlashStatus(null), 250);

        pushToast({
          type: "error",
          title: student.name,
          subtitle: "No active course enrollment found",
          student,
          timestamp: timeStr,
        });

        addSessionScan(student, "No active course enrollment found for student.", false, false);
        return;
      }

      // CASE 3: Check Already In vs New Enrollments
      const todayDate = serverDateRef.current;
      const alreadyPresentCourses: string[] = [];
      const newItemsToQueue: QueuedCheckIn[] = [];

      student.enrollments.forEach((enroll) => {
        const key = `${student.id}|${enroll.course_id}`;
        if (presentSetRef.current.has(key)) {
          alreadyPresentCourses.push(enroll.course_title);
        } else {
          // Optimistically mark as present in local set
          presentSetRef.current.add(key);

          newItemsToQueue.push({
            id: Math.random().toString(36).substring(2, 9),
            student_id: student.id,
            course_id: enroll.course_id,
            date: todayDate,
            student_name: student.name,
            course_title: enroll.course_title,
            timestamp: now,
          });
        }
      });

      // If all enrolled courses were already present -> Duplicate / "Already In"
      if (newItemsToQueue.length === 0) {
        playBeep("warning");
        setFlashStatus("warning");
        setTimeout(() => setFlashStatus(null), 250);

        pushToast({
          type: "warning",
          title: student.name,
          subtitle: `Already In: ${alreadyPresentCourses.join(", ")}`,
          student,
          timestamp: timeStr,
        });

        addSessionScan(
          student,
          `Already In today for: ${alreadyPresentCourses.join(", ")}`,
          false,
          true
        );
        return;
      }

      // INSTANT SUCCESS FEEDBACK (<5ms!)
      playBeep("success");
      setFlashStatus("success");
      setTimeout(() => setFlashStatus(null), 250);

      const enrolledTitles = student.enrollments
        .map((e) => `${e.course_title}${e.batch ? ` (${e.batch})` : ""}`)
        .join(", ");

      pushToast({
        type: "success",
        title: student.name,
        subtitle: `Checked In: ${enrolledTitles}`,
        student,
        timestamp: timeStr,
      });

      addSessionScan(student, `Checked In: ${enrolledTitles}`, true, false);

      // Enqueue for background batch write
      queueRef.current.push(...newItemsToQueue);
      setPendingCount(queueRef.current.length);
      saveQueueToStorage();

      // Trigger immediate flush if queue has 5 or more items
      if (queueRef.current.length >= 5) {
        flushQueue();
      }
    },
    [playBeep, pushToast, addSessionScan, flushQueue]
  );

  // ────────────────── MANUAL CHECK-IN SUBMISSION ──────────────────
  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim();
    if (!id || manualSubmitting) return;

    setManualSubmitting(true);
    setManualMessage(null);
    initAudio();

    handleDecodedQR(id);

    setManualId("");
    setManualSubmitting(false);
  };

  // ────────────────── CAMERA ENUMERATION & PERMISSIONS ──────────────────
  const updateCameraList = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      setCameras(videoDevices);
    } catch (e) {
      console.warn("Error enumerating cameras:", e);
    }
  }, []);

  const watchCameraPermission = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    try {
      const status = await navigator.permissions.query({ name: "camera" as PermissionName });
      if (status.state === "denied") {
        setPermissionBlocked(true);
      } else if (status.state === "granted") {
        setPermissionBlocked(false);
        setScannerError(null);
      }

      status.onchange = () => {
        if (status.state === "granted") {
          setPermissionBlocked(false);
          setScannerError(null);
          startScannerRef.current?.();
        } else if (status.state === "denied") {
          setPermissionBlocked(true);
        }
      };
    } catch {
      // Ignore if permissions API unsupported
    }
  }, []);

  // ────────────────── WEB WORKER / JSQR INITIALIZATION ──────────────────
  useEffect(() => {
    try {
      const worker = new Worker("/workers/qr-worker.js");
      worker.onmessage = (e) => {
        isDecodingRef.current = false;
        if (e.data?.text) {
          handleDecodedQR(e.data.text);
        }
      };
      worker.onerror = () => {
        isDecodingRef.current = false;
        workerRef.current = null;
      };
      workerRef.current = worker;
    } catch {
      workerRef.current = null;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [handleDecodedQR]);

  // ────────────────── CAMERA HARDWARE STREAM CONTROLLER ──────────────────
  const stopScanner = useCallback(() => {
    isLoopRunningRef.current = false;
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
    isDecodingRef.current = false;
  }, []);

  // ────────────────── NON-BLOCKING DETECTION LOOP ──────────────────
  const startFrameLoop = useCallback(() => {
    isLoopRunningRef.current = true;
    const video = videoRef.current;
    if (!video) return;

    const onFrame = async () => {
      if (!isLoopRunningRef.current) return;

      if (video.readyState >= 2 && !isDecodingRef.current) {
        // Fast path 1: Native BarcodeDetector (GPU/Hardware accelerated 0ms decode)
        if (barcodeDetectorRef.current) {
          isDecodingRef.current = true;
          try {
            const barcodes = await barcodeDetectorRef.current.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
              handleDecodedQR(barcodes[0].rawValue);
            }
          } catch {
            // ignore frame error
          } finally {
            isDecodingRef.current = false;
          }
        }
        // Fast path 2: Center-crop 480px + Web Worker / jsQR
        else if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            const cropSize = Math.min(vw, vh) * 0.75;
            const sx = (vw - cropSize) / 2;
            const sy = (vh - cropSize) / 2;

            ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 480, 480);
            const imageData = ctx.getImageData(0, 0, 480, 480);

            if (workerRef.current) {
              isDecodingRef.current = true;
              workerRef.current.postMessage(
                { data: imageData.data, width: 480, height: 480 },
                [imageData.data.buffer]
              );
            } else {
              // Direct jsQR fallback
              try {
                const code = jsQR(imageData.data, 480, 480, {
                  inversionAttempts: "dontInvert",
                });
                if (code?.data) {
                  handleDecodedQR(code.data);
                }
              } catch {
                // ignore
              }
            }
          }
        }
      }

      // Schedule next frame with requestVideoFrameCallback or requestAnimationFrame
      if (isLoopRunningRef.current && "requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(() => onFrame());
      } else if (isLoopRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(onFrame);
      }
    };

    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(() => onFrame());
    } else {
      animationFrameRef.current = requestAnimationFrame(onFrame);
    }
  }, [handleDecodedQR]);

  const startScanner = useCallback(
    async (deviceId?: string) => {
      setScanning(true);
      setScannerError(null);
      setPermissionBlocked(false);
      setTorchActive(false);
      setTorchSupported(false);
      isDecodingRef.current = false;

      if (!navigator?.mediaDevices?.getUserMedia) {
        setScannerError("Camera access requires HTTPS or is unsupported on this browser.");
        setScanning(false);
        return;
      }

      // Cleanup any active stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      let stream: MediaStream;
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
          setScanning(false);
          setPermissionBlocked(true);
          setScannerError("Camera permission blocked.");
          watchCameraPermission();
          return;
        }

        // Fallback to basic video constraint
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (fallbackErr: unknown) {
          const fbErr = fallbackErr as { name?: string; message?: string };
          setScanning(false);
          if (fbErr?.name === "NotAllowedError" || fbErr?.name === "PermissionDeniedError") {
            setPermissionBlocked(true);
            setScannerError("Camera permission blocked.");
            watchCameraPermission();
          } else if (fbErr?.name === "NotFoundError" || fbErr?.name === "DevicesNotFoundError") {
            setScannerError("No camera hardware detected on this device.");
          } else {
            setScannerError(`Could not access camera: ${fbErr?.message || "Check connection"}`);
          }
          return;
        }
      }

      try {
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch((playErr) => {
            if (playErr?.name !== "AbortError") {
              console.warn("Video play error:", playErr);
            }
          });
        }

        await updateCameraList();

        const activeTrack = stream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          if (settings.deviceId) {
            setSelectedCameraId(settings.deviceId);
          }

          // Apply continuous auto-focus if supported
          if (typeof activeTrack.getCapabilities === "function") {
            const capabilities = activeTrack.getCapabilities() as unknown as {
              torch?: boolean;
              focusMode?: string[];
            };
            setTorchSupported(Boolean(capabilities?.torch));

            if (capabilities?.focusMode && capabilities.focusMode.includes("continuous")) {
              try {
                await activeTrack.applyConstraints({
                  advanced: [{ focusMode: "continuous" } as MediaTrackFocusConstraint],
                });
              } catch {
                // Focus constraint safely ignored if rejected
              }
            }
          }
        }

        // Initialize hardware BarcodeDetector if available
        const winWithBD = typeof window !== "undefined" ? (window as unknown as WindowWithBarcodeDetector) : null;
        if (winWithBD?.BarcodeDetector) {
          try {
            const supported = await winWithBD.BarcodeDetector.getSupportedFormats();
            if (supported.includes("qr_code")) {
              barcodeDetectorRef.current = new winWithBD.BarcodeDetector({
                formats: ["qr_code"],
              });
            }
          } catch {
            barcodeDetectorRef.current = null;
          }
        }

        // Reusable canvas with willReadFrequently for fast center-crop decoding
        if (!canvasRef.current) {
          const canvas = document.createElement("canvas");
          canvas.width = 480;
          canvas.height = 480;
          canvasRef.current = canvas;
        }

        // Start non-blocking video frame loop
        startFrameLoop();
      } catch (err: unknown) {
        console.error("Scanner setup error:", err);
        setScanning(false);
        setScannerError("Camera hardware setup failed.");
      }
    },
    [updateCameraList, watchCameraPermission, startFrameLoop]
  );

  // ────────────────── TOGGLE CONTROLS ──────────────────
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchActive;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackTorchConstraint],
      });
      setTorchActive(nextTorch);
    } catch (e) {
      console.warn("Flashlight error:", e);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFS = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFS);
    return () => document.removeEventListener("fullscreenchange", handleFS);
  }, []);

  // Mount scanner
  useEffect(() => {
    const timer = setTimeout(() => {
      void startScanner();
    }, 0);
    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  // Session Statistics
  const stats = useMemo(() => {
    return {
      total: sessionScans.length,
      success: sessionScans.filter((s) => s.success).length,
      duplicate: sessionScans.filter((s) => s.isDuplicate).length,
      failed: sessionScans.filter((s) => !s.success && !s.isDuplicate).length,
    };
  }, [sessionScans]);

  return (
    <div
      ref={containerRef}
      className={`${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none p-6 bg-slate-950 text-white overflow-y-auto"
          : "p-4 sm:p-6 text-slate-900 dark:text-white"
      } flex flex-col font-sans select-none relative overflow-hidden`}
    >
      {/* ────────────────── SCREEN FLASH OVERLAYS ────────────────── */}
      {flashStatus === "success" && (
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none transition-opacity duration-200 z-50" />
      )}
      {flashStatus === "warning" && (
        <div className="absolute inset-0 bg-amber-500/10 pointer-events-none transition-opacity duration-200 z-50" />
      )}
      {flashStatus === "error" && (
        <div className="absolute inset-0 bg-rose-500/10 pointer-events-none transition-opacity duration-200 z-50" />
      )}

      {/* ────────────────── TOP HEADER TOOLBAR ────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5 flex-wrap gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Camera size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              Webcam Scanner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scan student ID card or QR code for instant check-in
            </p>
          </div>
        </div>

        {/* Sync & Roster Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Roster Badge */}
          {rosterStatus === "ready" ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium"
              title="Active student roster loaded in memory"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Roster: {rosterCount}</span>
            </span>
          ) : rosterStatus === "loading" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium">
              <Loader2 size={11} className="animate-spin text-slate-500" />
              <span>Loading roster...</span>
            </span>
          ) : (
            <button
              onClick={fetchRoster}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800 text-xs font-medium cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <RefreshCw size={11} />
              <span>Retry roster</span>
            </button>
          )}

          {/* Sync Queue Badge */}
          {syncStatus === "synced" ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-medium"
              title="All attendance check-ins are saved to database"
            >
              <Check size={12} className="stroke-[2.5]" />
              <span>Synced</span>
            </span>
          ) : syncStatus === "syncing" ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 text-xs font-medium"
              title="Saving check-ins in background"
            >
              <Loader2 size={11} className="animate-spin text-amber-600 dark:text-amber-400" />
              <span>Syncing ({pendingCount})</span>
            </span>
          ) : (
            <button
              onClick={flushQueue}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 text-xs font-medium cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
              title="Retry sending pending check-ins"
            >
              <RefreshCw size={11} />
              <span>Sync failed ({pendingCount})</span>
            </button>
          )}

          {/* Camera Selection */}
          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                startScanner(e.target.value);
              }}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600 cursor-pointer max-w-[150px]"
            >
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Flashlight/Torch */}
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                torchActive
                  ? "bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Toggle Flashlight"
            >
              <Flashlight size={14} />
            </button>
          )}

          {/* Mute button */}
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX size={14} className="text-slate-400" /> : <Volume2 size={14} />}
          </button>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>

          {/* Close Scanner */}
          {onClose && (
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X size={13} />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* ────────────────── MAIN SCANNING BODY ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
        {/* Left: Viewfinder & Manual Input (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
            {/* Camera Permission Blocked Steps UI */}
            {permissionBlocked ? (
              <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-md space-y-3.5">
                <div className="w-11 h-11 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Camera Access Blocked</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Camera permission is required to scan student QR codes.
                  </p>
                </div>

                <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-left space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-semibold shrink-0">
                      1
                    </span>
                    <p className="text-slate-300 text-xs">
                      Click the lock <span className="text-white font-medium">🔒</span> or camera icon in your browser address bar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-semibold shrink-0">
                      2
                    </span>
                    <p className="text-slate-300 text-xs">
                      Set camera permission to <span className="font-semibold text-emerald-400">Allow</span>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-semibold shrink-0">
                      3
                    </span>
                    <p className="text-slate-300 text-xs">
                      Click the button below to connect again.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPermissionBlocked(false);
                    startScanner(selectedCameraId || undefined);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Retry Connection
                </button>
              </div>
            ) : scannerError ? (
              <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm space-y-3">
                <div className="w-11 h-11 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Camera Connection Failed</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {scannerError}
                  </p>
                </div>
                <button
                  onClick={() => startScanner(selectedCameraId || undefined)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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

                {/* Minimal QR Viewfinder Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] backdrop-blur-[0.5px]">
                    {/* Subtle Corner Brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-xl" />

                    {/* Gentle scanning guide line */}
                    <div className="absolute left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent animate-scan" />
                  </div>
                </div>

                {/* Subtle status indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 flex items-center gap-2 shadow-sm pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-medium text-slate-200">
                    Ready to scan
                  </span>
                </div>

                {/* ────────────────── TOAST STACK OVERLAY ────────────────── */}
                {toasts.length > 0 && (
                  <div className="absolute top-3 left-3 right-3 flex flex-col gap-2 pointer-events-none z-30">
                    {toasts.map((toast) => (
                      <div
                        key={toast.id}
                        className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                          toast.type === "success"
                            ? "bg-white/95 dark:bg-slate-900/95 border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white"
                            : toast.type === "warning"
                            ? "bg-white/95 dark:bg-slate-900/95 border-amber-200 dark:border-amber-800 text-slate-900 dark:text-white"
                            : "bg-white/95 dark:bg-slate-900/95 border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white"
                        }`}
                      >
                        {/* Avatar */}
                        {toast.student?.photo_url ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 relative">
                            <Image
                              src={toast.student.photo_url}
                              alt={toast.student.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                              toast.type === "success"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                                : toast.type === "warning"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                            }`}
                          >
                            {toast.student ? (
                              toast.student.name[0].toUpperCase()
                            ) : (
                              <XCircle size={15} />
                            )}
                          </div>
                        )}

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                              {toast.title}
                            </h5>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {toast.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {toast.subtitle}
                          </p>
                        </div>

                        {/* Status Icon */}
                        <div className="shrink-0">
                          {toast.type === "success" ? (
                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                          ) : toast.type === "warning" ? (
                            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
                          ) : (
                            <XCircle size={16} className="text-rose-600 dark:text-rose-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Manual Override Form */}
          <form
            onSubmit={handleManualCheckIn}
            className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Manual Check-In
              </span>
              <span className="text-[11px] text-slate-400">
                Fallback for damaged QR or ID
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Student ID (e.g. STU202601)..."
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-600 uppercase transition-colors"
              />
              <button
                type="submit"
                disabled={manualSubmitting || !manualId.trim()}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {manualSubmitting ? (
                  <Loader2 className="animate-spin" size={13} />
                ) : (
                  <>
                    <span>Submit</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>

            {manualMessage && (
              <div
                className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${
                  manualMessage.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
                }`}
              >
                {manualMessage.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{manualMessage.text}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right: Live Activity Feed & Session Stats (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 max-h-[520px] lg:max-h-none">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                label: "Successful",
                count: stats.success,
                color: "text-emerald-700 dark:text-emerald-400",
                bg: "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60",
                subColor: "text-emerald-800/70 dark:text-emerald-300/70",
              },
              {
                label: "Already In",
                count: stats.duplicate,
                color: "text-amber-700 dark:text-amber-400",
                bg: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60",
                subColor: "text-amber-800/70 dark:text-amber-300/70",
              },
              {
                label: "Errors",
                count: stats.failed,
                color: "text-rose-700 dark:text-rose-400",
                bg: "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/60",
                subColor: "text-rose-800/70 dark:text-rose-300/70",
              },
            ].map(({ label, count, color, bg, subColor }) => (
              <div key={label} className={`border rounded-xl p-3 text-center transition-all ${bg}`}>
                <p className={`text-xl font-bold ${color}`}>{count}</p>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${subColor}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Session Feed List */}
          <div className="flex-1 flex flex-col bg-slate-50/60 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 overflow-hidden min-h-[300px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800/80 mb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Live Activity ({stats.total})
                </span>
              </div>

              {sessionScans.length > 0 && (
                <button
                  onClick={() => {
                    setSessionScans([]);
                    lastScannedTimeRef.current = {};
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                  title="Clear Feed"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Scrollable feed items */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {sessionScans.length === 0 ? (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center py-6">
                  <QrCode size={24} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    No scans yet
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[200px]">
                    Present student card or QR to camera to record attendance.
                  </p>
                </div>
              ) : (
                sessionScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2.5 text-left shadow-2xs"
                  >
                    {/* Avatar */}
                    {scan.student?.photo_url ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 relative">
                        <Image
                          src={scan.student.photo_url}
                          alt={scan.student.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                          scan.student
                            ? scan.success
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        }`}
                      >
                        {scan.student ? (
                          scan.student.name[0].toUpperCase()
                        ) : (
                          <XCircle size={14} />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                          {scan.student ? scan.student.name : "Unrecognized Card"}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {scan.timestamp}
                        </span>
                      </div>

                      {scan.student && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {scan.student.student_id}
                        </p>
                      )}

                      <p
                        className={`text-[10px] font-medium mt-1 leading-snug truncate ${
                          scan.student
                            ? scan.success
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
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
    </div>
  );
}

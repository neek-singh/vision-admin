"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Printer,
  Loader2,
  CreditCard,
  Sparkles,
  Calendar,
  Heart,
  Shield,
  Phone,
  Mail,
  MapPin,
  Upload,
  Layers,
  Sliders,
  Palette,
  RotateCw,
  Globe
} from "lucide-react";

interface StudentIdCardModalProps {
  student: any;
  onClose: () => void;
}

type TemplateType = "excellence" | "visionary" | "curator" | "scholarly" | "cyber" | "modern" | "custom";
type OrientationType = "portrait" | "landscape";
type PatternType = "none" | "grid" | "waves" | "dots" | "guilloche";
type BarcodeType = "qr" | "barcode";

const CODE39_MAP: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
};

const presets = {
  excellence: {
    primary: "#002045",
    secondary: "#1a365d",
    accent: "#adc7f7",
    photoBorder: "#adc7f7",
    label: "rgba(173, 199, 247, 0.8)",
    value: "#ffffff",
    signature: "#adc7f7",
    waveLight: "#adc7f7",
    waveDark: "#1a365d",
    textUpper: "text-slate-900",
    textLower: "text-blue-50"
  },
  visionary: {
    primary: "#003d9b",
    secondary: "#0052cc",
    accent: "#88cffb",
    photoBorder: "#0052cc",
    label: "rgba(136, 207, 251, 0.8)",
    value: "#ffffff",
    signature: "#88cffb",
    waveLight: "#88cffb",
    waveDark: "#003d9b",
    textUpper: "text-slate-900",
    textLower: "text-blue-50"
  },
  curator: {
    primary: "#002045",
    secondary: "#1a365d",
    accent: "#c5a059",
    photoBorder: "#c5a059",
    label: "rgba(197, 160, 89, 0.8)",
    value: "#ffffff",
    signature: "#c5a059",
    waveLight: "#c5a059",
    waveDark: "#1a365d",
    textUpper: "text-slate-900",
    textLower: "text-slate-50"
  },
  scholarly: {
    primary: "#506071",
    secondary: "#394858",
    accent: "#daa264",
    photoBorder: "#daa264",
    label: "rgba(218, 162, 100, 0.8)",
    value: "#ffffff",
    signature: "#daa264",
    waveLight: "#daa264",
    waveDark: "#394858",
    textUpper: "text-slate-900",
    textLower: "text-emerald-50"
  },
  cyber: {
    primary: "#1e1b4b",
    secondary: "#0f172a",
    accent: "#d946ef",
    photoBorder: "#d946ef",
    label: "rgba(34, 211, 238, 0.8)",
    value: "#ffffff",
    signature: "#d946ef",
    waveLight: "#06b6d4",
    waveDark: "#0f172a",
    textUpper: "text-slate-900",
    textLower: "text-indigo-50"
  },
  modern: {
    primary: "#8b5cf6",
    secondary: "#002e6e",
    accent: "#8b5cf6",
    photoBorder: "#002e6e",
    label: "#64748b",
    value: "#0f172a",
    signature: "#8b5cf6",
    waveLight: "#a78bfa",
    waveDark: "#8b5cf6",
    textUpper: "text-white",
    textLower: "text-slate-900"
  }
};

export default function StudentIdCardModal({ student, onClose }: StudentIdCardModalProps) {
  // Navigation & General state
  const [template, setTemplate] = useState<TemplateType>("excellence");
  const [orientation, setOrientation] = useState<OrientationType>("portrait");
  const [pattern, setPattern] = useState<PatternType>("waves");
  const [barcodeType, setBarcodeType] = useState<BarcodeType>("qr");
  const [activeTab, setActiveTab] = useState<"design" | "front" | "back">("design");
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [bgImage, setBgImage] = useState<string | null>("/idcard/idcard_1.png");

  // Custom colors
  const [customPrimary, setCustomPrimary] = useState<string>("#2563eb");
  const [customSecondary, setCustomSecondary] = useState<string>("#1e3a8a");
  const [customAccent, setCustomAccent] = useState<string>("#60a5fa");

  // Custom uploads
  const [logoUrl, setLogoUrl] = useState<string | null>("/logo.png");
  const [signatureUrl, setSignatureUrl] = useState<string | null>("/idcard/signature.png");
  const [processedSignatureUrl, setProcessedSignatureUrl] = useState<string | null>(null);

  // Overridable details
  const [nameText, setNameText] = useState<string>(student.name || "");
  const [idText, setIdText] = useState<string>(student.student_id || "");
  const [courseText, setCourseText] = useState<string>(student.course || "General Student");
  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [validTill, setValidTill] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [phoneText, setPhoneText] = useState<string>(student.phone || "");
  const [emailText, setEmailText] = useState<string>(student.email || "");
  const [addressText, setAddressText] = useState<string>(student.address || "");
  const [fatherName, setFatherName] = useState<string>(student.father_name || "");
  const [motherName, setMotherName] = useState<string>(student.mother_name || "");
  const [dobText, setDobText] = useState<string>(student.dob ? new Date(student.dob).toISOString().split("T")[0] : "");
  const [aadharText, setAadharText] = useState<string>(student.aadhar_no || "");
  const [admissionText, setAdmissionText] = useState<string>(student.admission_date ? new Date(student.admission_date).toISOString().split("T")[0] : "");

  const [instituteName, setInstituteName] = useState<string>("VISION IT COMPUTER INSTITUTE");
  const [signatureText, setSignatureText] = useState<string>("Auth Signatory");
  const [websiteText, setWebsiteText] = useState<string>("www.visionlearn.org");
  const [barcodeText, setBarcodeText] = useState<string>(student.student_id || "");

  // Toggles
  const [showBloodGroup, setShowBloodGroup] = useState<boolean>(true);
  const [showEmergencyContact, setShowEmergencyContact] = useState<boolean>(true);
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [showAddress, setShowAddress] = useState<boolean>(true);
  const [showPhoto, setShowPhoto] = useState<boolean>(true);

  // Printing & Exporting states
  const [isExportingFront, setIsExportingFront] = useState(false);
  const [isExportingBack, setIsExportingBack] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFrontUrl, setPrintFrontUrl] = useState<string>("");
  const [printBackUrl, setPrintBackUrl] = useState<string>("");
  const [triggerPrint, setTriggerPrint] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Utility to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper to resolve theme styles
  const getThemeStyles = (t: TemplateType) => {
    if (t === "custom") {
      return {
        primary: customPrimary,
        secondary: customSecondary,
        accent: customAccent,
        photoBorder: customPrimary,
        label: hexToRgba(customAccent, 0.8),
        value: "#ffffff",
        signature: customAccent,
        waveLight: customAccent,
        waveDark: customSecondary,
        textUpper: "text-slate-900",
        textLower: "text-white"
      };
    }
    return presets[t as keyof typeof presets] || presets.excellence;
  };

  const currentStyles = getThemeStyles(template);

  // Automatically flip the card depending on settings tab
  useEffect(() => {
    if (activeTab === "back") {
      setIsFlipped(true);
    } else if (activeTab === "front") {
      setIsFlipped(false);
    }
  }, [activeTab]);

  // Prevent body scrolling while modal is open
  useEffect(() => {
    setIsMounted(true);
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Process signature image to make its background transparent
  useEffect(() => {
    if (!signatureUrl) {
      setProcessedSignatureUrl(null);
      return;
    }

    const img = new Image();
    if (signatureUrl.startsWith("http://") || signatureUrl.startsWith("https://")) {
      try {
        const url = new URL(signatureUrl);
        if (url.origin !== window.location.origin) {
          img.crossOrigin = "anonymous";
        }
      } catch (e) {
        // ignore
      }
    }
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setProcessedSignatureUrl(signatureUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          // Target pixels close to white or light grey/purple background
          if (brightness > 150) {
            if (brightness >= 200) {
              data[i + 3] = 0; // completely transparent
            } else {
              // smooth transition for anti-aliasing edges
              const factor = (200 - brightness) / 50;
              data[i + 3] = Math.round(data[i + 3] * factor);
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
        setProcessedSignatureUrl(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error("Failed to process signature background", e);
        setProcessedSignatureUrl(signatureUrl);
      }
    };
    img.onerror = () => {
      setProcessedSignatureUrl(signatureUrl);
    };
    img.src = signatureUrl;
  }, [signatureUrl]);

  // Load image safely for Canvas (crossOrigin only if external)
  const loadImgSecurely = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (src.startsWith("http://") || src.startsWith("https://")) {
        try {
          const url = new URL(src);
          if (url.origin !== window.location.origin) {
            img.crossOrigin = "anonymous";
          }
        } catch (e) {
          // ignore invalid URL
        }
      }
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  // Custom File Uploader Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas Security Patterns Draw Helpers
  const drawGuillochePattern = (ctx: CanvasRenderingContext2D, w: number, h: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.08;

    const steps = 16;
    for (let i = 0; i < steps; i++) {
      ctx.beginPath();
      const phase = (i / steps) * Math.PI * 2;
      const amplitude = 35 + Math.sin(phase) * 10;
      const frequency = 0.005 + i * 0.0004;

      ctx.moveTo(0, h / 2);
      for (let x = 0; x <= w; x += 5) {
        const y = h / 2 + Math.sin(x * frequency + phase) * amplitude + Math.cos(x * 0.008) * 20;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawGridPattern = (ctx: CanvasRenderingContext2D, w: number, h: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.07;
    const size = 30;
    for (let x = 0; x < w; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawDotsPattern = (ctx: CanvasRenderingContext2D, w: number, h: number, color: string) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08;
    const spacing = 24;
    for (let x = 12; x < w; x += spacing) {
      for (let y = 12; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  // Draw 1D Barcode helper
  const drawBarcode39 = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    lineColor: string
  ) => {
    const formatted = `*${text.toUpperCase().replace(/[^A-Z0-9\-\.\s]/g, "")}*`;
    let bitString = "";
    for (let i = 0; i < formatted.length; i++) {
      const char = formatted[i];
      const bits = CODE39_MAP[char] || CODE39_MAP['*'];
      bitString += bits + "0";
    }

    const numModules = bitString.length;
    const moduleWidth = w / numModules;

    ctx.fillStyle = lineColor;
    for (let i = 0; i < numModules; i++) {
      if (bitString[i] === '1') {
        ctx.fillRect(x + i * moduleWidth, y, moduleWidth + 0.2, h);
      }
    }
  };

  // High-Resolution Card Drawer
  const drawToCanvas = async (side: "front" | "back"): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Helper to draw image like CSS object-fit: cover
    const drawImageCover = (
      c: CanvasRenderingContext2D,
      img: HTMLImageElement,
      dx: number,
      dy: number,
      dw: number,
      dh: number
    ) => {
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      const srcRatio = imgW / imgH;
      const dstRatio = dw / dh;

      let sx = 0;
      let sy = 0;
      let sw = imgW;
      let sh = imgH;

      if (srcRatio > dstRatio) {
        sw = imgH * dstRatio;
        sx = (imgW - sw) / 2;
      } else {
        sh = imgW / dstRatio;
        sy = (imgH - sh) / 2;
      }

      c.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    };

    // Helper to draw centered wrapped text on canvas
    const drawCenteredWrappedText = (
      c: CanvasRenderingContext2D,
      txt: string,
      cx: number,
      cy: number,
      maxW: number,
      lineHeight: number
    ) => {
      const words = txt.split(" ");
      let line = "";
      const lines = [];
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = c.measureText(testLine);
        if (metrics.width > maxW && n > 0) {
          lines.push(line.trim());
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
      lines.forEach((l, idx) => {
        c.fillText(l, cx, cy + (idx * lineHeight));
      });
      return lines.length;
    };

    // Portrait is 638x1012. Landscape is 1012x638
    const width = orientation === "portrait" ? 638 : 1012;
    const height = orientation === "portrait" ? 1012 : 638;
    canvas.width = width;
    canvas.height = height;

    // Clear background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      try {
        const bgImg = await loadImgSecurely(bgImage);
        ctx.drawImage(bgImg, 0, 0, width, height);
      } catch (err) {
        console.error("Failed to load background template image", err);
      }
    }

    if (side === "front") {
      // --- FRONT SIDE CANVAS ---
      if (orientation === "portrait") {
        if (bgImage) {
          // Skip wave drawing, background image is drawn
        } else if (template === "modern") {
          // Linear gradient background
          const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
          bgGrad.addColorStop(0, "#f8fafc");
          bgGrad.addColorStop(1, "#e2e8f0");
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, width, height);

          // Top purple chevron
          ctx.fillStyle = currentStyles.primary;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(width, 0);
          ctx.lineTo(width, 100 * 2.45);
          ctx.lineTo(width / 2, 145 * 2.45);
          ctx.lineTo(0, 100 * 2.45);
          ctx.closePath();
          ctx.fill();

          // Honeycomb grid lines
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 2.5;
          const drawHex = (cx: number, cy: number, r: number) => {
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
              const angle = (a * Math.PI) / 3;
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              if (a === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
          };
          drawHex(width - 120, 100, 35);
          drawHex(width - 60, 65, 35);
          drawHex(width - 180, 65, 35);
          ctx.restore();

          // Faceted side panels
          ctx.fillStyle = "rgba(241, 245, 249, 0.6)";
          ctx.beginPath();
          ctx.moveTo(0, 100 * 2.45);
          ctx.lineTo(15 * 2.45, 110 * 2.45);
          ctx.lineTo(15 * 2.45, 320 * 2.45);
          ctx.lineTo(0, 340 * 2.45);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(width, 100 * 2.45);
          ctx.lineTo(width - 15 * 2.45, 110 * 2.45);
          ctx.lineTo(width - 15 * 2.45, 320 * 2.45);
          ctx.lineTo(width, 340 * 2.45);
          ctx.closePath();
          ctx.fill();

          // Bottom Left Corner Purple Accent
          ctx.fillStyle = currentStyles.primary;
          ctx.beginPath();
          ctx.moveTo(0, height);
          ctx.lineTo(0, height - 70 * 2.45);
          ctx.lineTo(12 * 2.45, height - 55 * 2.45);
          ctx.lineTo(12 * 2.45, height);
          ctx.closePath();
          ctx.fill();

          // Bottom Right Corner Purple Accent
          ctx.beginPath();
          ctx.moveTo(width, height);
          ctx.lineTo(width, height - 70 * 2.45);
          ctx.lineTo(width - 12 * 2.45, height - 55 * 2.45);
          ctx.lineTo(width - 12 * 2.45, height);
          ctx.closePath();
          ctx.fill();

          // White diagonal stripes at the bottom
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(-50, height);
          ctx.lineTo(100 * 2.45, height - 60 * 2.45);
          ctx.moveTo(width + 50, height);
          ctx.lineTo(width - 100 * 2.45, height - 60 * 2.45);
          ctx.stroke();
          ctx.restore();
        } else {
          // Original portrait waves
          ctx.fillStyle = currentStyles.waveLight;
          ctx.beginPath();
          ctx.moveTo(0, 184 + 147);
          ctx.bezierCurveTo(60 * 2.45, 184 + 49, 130 * 2.45, 184 + 220.5, 190 * 2.45, 184 + 122.5);
          ctx.bezierCurveTo(220 * 2.45, 184 + 73.5, 245 * 2.45, 184 + 110.25, width, 184 + 85.75);
          ctx.lineTo(width, 184 + 294);
          ctx.lineTo(0, 184 + 294);
          ctx.closePath();
          ctx.fill();

          ctx.save();
          ctx.fillStyle = currentStyles.waveDark;
          ctx.beginPath();
          ctx.moveTo(0, 220.5 + 147);
          ctx.bezierCurveTo(70 * 2.45, 220.5 + 73.5, 120 * 2.45, 220.5 + 196, 180 * 2.45, 220.5 + 98);
          ctx.bezierCurveTo(220 * 2.45, 220.5 + 49, 245 * 2.45, 220.5 + 110.25, width, 220.5 + 85.75);
          ctx.lineTo(width, 220.5 + 294);
          ctx.lineTo(0, 220.5 + 294);
          ctx.closePath();
          ctx.fill();
          ctx.clip(); // clip pattern to waveDark

          if (pattern === "grid") drawGridPattern(ctx, width, height, currentStyles.accent);
          else if (pattern === "dots") drawDotsPattern(ctx, width, height, currentStyles.accent);
          else if (pattern === "guilloche") drawGuillochePattern(ctx, width, height, currentStyles.accent);
          ctx.restore();
        }
      } else {
        if (bgImage) {
          // Skip wave drawing, background image is drawn
        } else if (template === "modern") {
          // Background
          const bgGrad = ctx.createLinearGradient(0, 0, width, height);
          bgGrad.addColorStop(0, "#f8fafc");
          bgGrad.addColorStop(1, "#e2e8f0");
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, width, height);

          // Left Purple chevron
          ctx.fillStyle = currentStyles.primary;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(150 * 2.45, 0);
          ctx.lineTo(180 * 2.45, height / 2);
          ctx.lineTo(150 * 2.45, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();

          // Honeycomb lines
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 2.5;
          const drawHex = (cx: number, cy: number, r: number) => {
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
              const angle = (a * Math.PI) / 3;
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              if (a === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
          };
          drawHex(80, 60, 30);
          drawHex(130, 90, 30);
          drawHex(80, 120, 30);
          ctx.restore();

          // Right corners
          ctx.fillStyle = currentStyles.primary;
          ctx.beginPath();
          ctx.moveTo(width, height);
          ctx.lineTo(width, height - 70 * 2.45);
          ctx.lineTo(width - 12 * 2.45, height - 55 * 2.45);
          ctx.lineTo(width - 12 * 2.45, height);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(width, 0);
          ctx.lineTo(width, 70 * 2.45);
          ctx.lineTo(width - 12 * 2.45, 55 * 2.45);
          ctx.lineTo(width - 12 * 2.45, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          // Original landscape waves
          ctx.fillStyle = currentStyles.waveLight;
          ctx.beginPath();
          ctx.moveTo(width * 0.38, 0);
          ctx.bezierCurveTo(width * 0.45, height * 0.3, width * 0.35, height * 0.7, width * 0.42, height);
          ctx.lineTo(width, height);
          ctx.lineTo(width, 0);
          ctx.closePath();
          ctx.fill();

          ctx.save();
          ctx.fillStyle = currentStyles.waveDark;
          ctx.beginPath();
          ctx.moveTo(width * 0.42, 0);
          ctx.bezierCurveTo(width * 0.49, height * 0.3, width * 0.39, height * 0.7, width * 0.46, height);
          ctx.lineTo(width, height);
          ctx.lineTo(width, 0);
          ctx.closePath();
          ctx.fill();
          ctx.clip();

          if (pattern === "grid") drawGridPattern(ctx, width, height, currentStyles.accent);
          else if (pattern === "dots") drawDotsPattern(ctx, width, height, currentStyles.accent);
          else if (pattern === "guilloche") drawGuillochePattern(ctx, width, height, currentStyles.accent);
          ctx.restore();
        }
      }

      // Slot
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      const slotX = (width - 100) / 2;
      const slotY = 18;
      ctx.roundRect ? ctx.roundRect(slotX, slotY, 100, 15, 7.5) : ctx.rect(slotX, slotY, 100, 15);
      ctx.fill();

      // Top logo area (Centered)
      const drawDefaultLogo = (c: CanvasRenderingContext2D, lx: number, ly: number, lsz: number) => {
        c.fillStyle = currentStyles.primary;
        c.beginPath();
        c.arc(lx + lsz / 2, ly + lsz / 2, lsz / 2, 0, Math.PI * 2);
        c.fill();
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.font = "bold 34px 'Outfit', sans-serif";
        c.fillStyle = "#ffffff";
        c.fillText("V", lx + lsz / 2, ly + lsz / 2);
        c.textBaseline = "alphabetic";
      };

      const isDarkHeader = bgImage === "/idcard/idcard_2.png";
      const mainName = instituteName.split(" ").slice(0, -1).join(" ");
      const lastName = instituteName.split(" ").slice(-1)[0];

      if (orientation === "portrait") {
        const logoSize = 110;
        const logoX = (width - logoSize) / 2;
        const logoY = 30;

        if (logoUrl) {
          try {
            const logoImg = await loadImgSecurely(logoUrl);
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
          } catch {
            drawDefaultLogo(ctx, logoX, logoY, logoSize);
          }
        } else {
          drawDefaultLogo(ctx, logoX, logoY, logoSize);
        }

        // Institution titles
        ctx.textAlign = "center";
        ctx.fillStyle = isDarkHeader ? "#ffffff" : "#0f172a";
        ctx.font = "bold 34px 'Outfit', sans-serif";
        ctx.fillText(mainName.toUpperCase(), width / 2, 155);
        
        ctx.fillStyle = isDarkHeader ? "rgba(255, 255, 255, 0.75)" : "#000000";
        ctx.font = "bold 22px 'Outfit', sans-serif";
        ctx.fillText(lastName.toUpperCase(), width / 2, 185);

        // Student ID Card Label Pill
        const pillW = 160;
        const pillH = 24;
        const pillX = width / 2 - pillW / 2;
        const pillY = 223 - pillH / 2;
        ctx.strokeStyle = isDarkHeader ? "rgba(255, 255, 255, 0.3)" : "#000000";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(pillX, pillY, pillW, pillH, 12) : ctx.rect(pillX, pillY, pillW, pillH);
        ctx.stroke();

        ctx.fillStyle = isDarkHeader ? "rgba(255, 255, 255, 0.8)" : "#000000";
        ctx.font = "bold 13px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = "2.6px"; // 0.2em of 13px
        }
        ctx.fillText("Student ID Card", width / 2, 223);
        ctx.textBaseline = "alphabetic";
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = "normal"; // reset
        }

        // Profile Photo
        const photoX = width / 2;
        const photoY = 375; // center of photo
        const radius = 100;

        if (showPhoto) {
          ctx.strokeStyle = currentStyles.photoBorder;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(photoX, photoY, radius + 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.save();
          ctx.beginPath();
          ctx.arc(photoX, photoY, radius, 0, Math.PI * 2);
          ctx.clip();

          try {
            if (student.photo_url) {
              const photo = await loadImgSecurely(student.photo_url);
              drawImageCover(ctx, photo, photoX - radius, photoY - radius, radius * 2, radius * 2);
            } else {
              throw new Error();
            }
          } catch {
            ctx.fillStyle = "#f1f5f9";
            ctx.fillRect(photoX - radius, photoY - radius, radius * 2, radius * 2);
            ctx.fillStyle = "#cbd5e1";
            ctx.beginPath();
            ctx.arc(photoX, photoY - 10, radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(photoX, photoY + radius * 1.05, radius * 0.85, Math.PI, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Name Section
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.font = "bold 30px 'Outfit', sans-serif";
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = "0.75px"; // tracking-wide
        }
        ctx.fillText(nameText.toUpperCase(), photoX, 515);
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = "normal"; // reset
        }

        // Course pill
        ctx.save();
        ctx.strokeStyle = "#3b82f6"; // blue-500
        ctx.lineWidth = 1.5;
        ctx.font = "bold 15px 'Outfit', sans-serif";
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = "0.75px"; // tracking-wider
        }
        const textWidth = ctx.measureText(courseText.toUpperCase()).width + 30;
        const capH = 30;
        const capX = photoX - textWidth / 2;
        const capY = 535;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(capX, capY, textWidth, capH, capH / 2) : ctx.strokeRect(capX, capY, textWidth, capH);
        ctx.stroke();

        ctx.fillStyle = "#000000"; // black
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(courseText.toUpperCase(), photoX, capY + capH / 2);
        ctx.restore();

        // Vertical Session Text
        ctx.save();
        ctx.translate(28, height / 2 + 110);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#3b82f6"; // blue-500
        ctx.font = "italic bold 28px 'Outfit', sans-serif";
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = "5.6px"; // 0.2em of 28px
        }
        ctx.fillText("SESSION 2026-27", 0, 0);
        ctx.restore();

        // Details Rows
        const dataRows = [];
        dataRows.push({ label: "ID NO", val: idText });
        if (fatherName) dataRows.push({ label: "FATHER", val: `MR. ${fatherName.toUpperCase()}` });
        if (dobText) {
          const d = new Date(dobText);
          dataRows.push({ label: "DOB", val: `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` });
        }
        if (showEmergencyContact && phoneText) dataRows.push({ label: "PHONE", val: phoneText });
        if (showAddress && addressText) dataRows.push({ label: "ADDRESS", val: addressText.toUpperCase() });

        // Calculate max value width to center the entire block
        ctx.save();
        ctx.font = "700 20px 'Outfit', sans-serif";
        let maxValWidth = 0;
        dataRows.forEach((row) => {
          if (row.label === "ADDRESS") {
            const addrWidth = ctx.measureText(`:  ${row.val}`).width;
            const effectiveWidth = Math.min(addrWidth, 280);
            if (effectiveWidth > maxValWidth) maxValWidth = effectiveWidth;
          } else {
            const valWidth = ctx.measureText(`:  ${row.val}`).width;
            if (valWidth > maxValWidth) maxValWidth = valWidth;
          }
        });

        const labelWidthOffset = 145;
        const totalBlockWidth = labelWidthOffset + maxValWidth;
        const currentX = ((width - totalBlockWidth) / 2) - 25;
        ctx.restore();

        ctx.textAlign = "left";
        dataRows.forEach((row, i) => {
          const startY = 615;
          const rowHeight = 45;
          const currentY = startY + (i * rowHeight);

          ctx.fillStyle = "#000000";
          ctx.font = "800 20px 'Outfit', sans-serif";
          if ('letterSpacing' in ctx) {
            ctx.letterSpacing = "1.2px"; // tracking-wider
          }
          ctx.fillText(row.label === "BLOOD GROUP" ? "BLOOD GP" : row.label === "EMAIL" ? "E-MAIL" : row.label, currentX, currentY);
          if ('letterSpacing' in ctx) {
            ctx.letterSpacing = "normal"; // reset
          }

          ctx.fillStyle = "#000000";
          ctx.font = "700 20px 'Outfit', sans-serif";

          if (row.label === "ADDRESS") {
            const valX = currentX + labelWidthOffset;
            const addr = row.val;
            const words = addr.split(" ");
            let line = ":  ";
            let lineCount = 0;
            const maxW = 280;
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + " ";
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxW && n > 0) {
                ctx.fillText(line, valX, currentY + (lineCount * 26));
                line = "   " + words[n] + " ";
                lineCount++;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, valX, currentY + (lineCount * 26));
          } else {
            ctx.fillText(`:  ${row.val}`, currentX + labelWidthOffset, currentY);
          }
        });

        // QR / Barcode
        if (barcodeType === "qr") {
          const qrSize = 110;
          const qrX = width / 2 - qrSize / 2;
          const qrY = 840;

          try {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${idText}`;
            const qrImg = await loadImgSecurely(qrUrl);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12) : ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
            ctx.fill();
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          } catch {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12) : ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
            ctx.fill();
            ctx.fillStyle = "#000000";
            ctx.fillRect(qrX + 10, qrY + 10, 30, 30);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(qrX + 16, qrY + 16, 18, 18);
            ctx.fillStyle = "#000000";
            ctx.fillRect(qrX + 20, qrY + 20, 10, 10);
            ctx.fillRect(qrX + qrSize - 40, qrY + 10, 30, 30);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(qrX + qrSize - 34, qrY + 16, 18, 18);
            ctx.fillStyle = "#000000";
            ctx.fillRect(qrX + qrSize - 30, qrY + 20, 10, 10);
            ctx.fillRect(qrX + 10, qrY + qrSize - 40, 30, 30);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(qrX + 16, qrY + qrSize - 34, 18, 18);
            ctx.fillStyle = "#000000";
            ctx.fillRect(qrX + 20, qrY + qrSize - 30, 10, 10);
          }
        } else {
          const barW = 200;
          const barH = 50;
          const barX = width / 2 - barW / 2;
          const barY = 840;

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(barX - 15, barY - 10, barW + 30, barH + 25, 12) : ctx.fillRect(barX - 15, barY - 10, barW + 30, barH + 25);
          ctx.fill();

          drawBarcode39(ctx, barcodeText || idText, barX, barY, barW, barH, "#000000");

          ctx.fillStyle = "#000000";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText(barcodeText || idText, width / 2, barY + barH + 12);
        }
      } else {
        // --- LANDSCAPE ELEMENTS DRAWING ---
        const leftColX = 180;
        
        // Logo and Institution Titles
        const logoSize = 80;
        const logoX = (width - logoSize) / 2;
        const logoY = 25;

        if (logoUrl) {
          try {
            const logoImg = await loadImgSecurely(logoUrl);
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
          } catch {
            drawDefaultLogo(ctx, logoX, logoY, logoSize);
          }
        } else {
          drawDefaultLogo(ctx, logoX, logoY, logoSize);
        }

        ctx.textAlign = "center";
        ctx.fillStyle = isDarkHeader ? "#ffffff" : "#0f172a";
        ctx.font = "bold 26px 'Outfit', sans-serif";
        ctx.fillText(mainName.toUpperCase(), width / 2, logoY + logoSize + 25);
        
        ctx.fillStyle = isDarkHeader ? "rgba(255, 255, 255, 0.75)" : "#000000";
        ctx.font = "bold 16px 'Outfit', sans-serif";
        ctx.fillText(lastName.toUpperCase(), width / 2, logoY + logoSize + 45);

        // Photo
        const photoX = leftColX;
        const photoY = 320;
        const radius = 80;

        if (showPhoto) {
          ctx.strokeStyle = currentStyles.photoBorder;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(photoX, photoY, radius + 3, 0, Math.PI * 2);
          ctx.stroke();

          ctx.save();
          ctx.beginPath();
          ctx.arc(photoX, photoY, radius, 0, Math.PI * 2);
          ctx.clip();

          try {
            if (student.photo_url) {
              const photo = await loadImgSecurely(student.photo_url);
              drawImageCover(ctx, photo, photoX - radius, photoY - radius, radius * 2, radius * 2);
            } else {
              throw new Error();
            }
          } catch {
            ctx.fillStyle = "#f1f5f9";
            ctx.fillRect(photoX - radius, photoY - radius, radius * 2, radius * 2);
            ctx.fillStyle = "#cbd5e1";
            ctx.beginPath();
            ctx.arc(photoX, photoY - 8, radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(photoX, photoY + radius * 1.05, radius * 0.85, Math.PI, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Student Name
        ctx.textAlign = "center";
        ctx.fillStyle = isDarkHeader ? "#ffffff" : "#000000";
        ctx.font = "bold 24px 'Outfit', sans-serif";
        ctx.fillText(nameText.toUpperCase(), leftColX, 435);

        // Course pill
        ctx.save();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.font = "bold 13px 'Outfit', sans-serif";
        const textWidth = ctx.measureText(courseText.toUpperCase()).width + 24;
        const capH = 26;
        const capX = leftColX - textWidth / 2;
        const capY = 455;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(capX, capY, textWidth, capH, capH / 2) : ctx.strokeRect(capX, capY, textWidth, capH);
        ctx.stroke();

        ctx.fillStyle = "#3b82f6";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(courseText.toUpperCase(), leftColX, capY + capH / 2);
        ctx.restore();

        // Right Column: Details & Barcode/QR
        const rightColX = 460;
        const startY = 220;
        const rowHeight = 35;

        const dataRows = [];
        dataRows.push({ label: "ID NO", val: idText.toUpperCase() });
        if (showBloodGroup && bloodGroup) dataRows.push({ label: "BLOOD GP", val: bloodGroup.toUpperCase() });
        if (showEmergencyContact && phoneText) dataRows.push({ label: "PHONE", val: phoneText.toUpperCase() });
        if (emailText) dataRows.push({ label: "EMAIL", val: emailText.toUpperCase() });
        if (showAddress && addressText) dataRows.push({ label: "ADDRESS", val: addressText.toUpperCase() });

        ctx.textAlign = "left";
        dataRows.forEach((row, i) => {
          const currentY = startY + (i * rowHeight);

          ctx.fillStyle = "#64748b";
          ctx.font = "800 13px 'Outfit', sans-serif";
          ctx.fillText(row.label === "BLOOD GROUP" ? "BLOOD GP" : row.label, rightColX, currentY);

          ctx.fillStyle = "#0f172a";
          ctx.font = "700 13px 'Outfit', sans-serif";

          if (row.label === "ADDRESS") {
            const valX = rightColX + 100;
            const addr = row.val;
            const words = addr.split(" ");
            let line = ":  ";
            let lineCount = 0;
            const maxW = 380;
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + " ";
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxW && n > 0) {
                ctx.fillText(line, valX, currentY + (lineCount * 18));
                line = "   " + words[n] + " ";
                lineCount++;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, valX, currentY + (lineCount * 18));
          } else {
            ctx.fillText(`:  ${row.val}`, rightColX + 100, currentY);
          }
        });

        // QR / Barcode bottom right
        if (barcodeType === "qr") {
          const qrSize = 95;
          const qrX = width - qrSize - 50;
          const qrY = height - qrSize - 40;

          try {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${idText}`;
            const qrImg = await loadImgSecurely(qrUrl);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12) : ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
            ctx.fill();
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          } catch {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12) : ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
            ctx.fill();
          }
        } else {
          const barW = 160;
          const barH = 40;
          const barX = width - barW - 50;
          const barY = height - barH - 45;

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(barX - 15, barY - 8, barW + 30, barH + 20, 12) : ctx.fillRect(barX - 15, barY - 8, barW + 30, barH + 20);
          ctx.fill();

          drawBarcode39(ctx, barcodeText || idText, barX, barY, barW, barH, "#000000");

          ctx.fillStyle = "#000000";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(barcodeText || idText, barX + barW / 2, barY + barH + 8);
        }
      }

    } else {
      // --- BACK SIDE CANVAS ---
      if (orientation === "portrait") {
        if (!bgImage) {
          // Clear background (white)
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);

          // Slanted corners (tirachha)
          ctx.fillStyle = currentStyles.primary;
          ctx.beginPath();
          ctx.moveTo(width, 0);
          ctx.lineTo(width - 120, 0);
          ctx.lineTo(width, 120);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(80, 0);
          ctx.lineTo(0, 80);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(0, height);
          ctx.lineTo(0, height - 120);
          ctx.lineTo(120, height);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(width, height);
          ctx.lineTo(width - 120, height);
          ctx.lineTo(width, height - 120);
          ctx.closePath();
          ctx.fill();
        }

        // Slot
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.beginPath();
        const slotX = (width - 100) / 2;
        const slotY = 18;
        ctx.roundRect ? ctx.roundRect(slotX, slotY, 100, 15, 7.5) : ctx.rect(slotX, slotY, 100, 15);
        ctx.fill();
      } else {
        // Landscape back: clear card with slanted corners
        if (!bgImage) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);

          ctx.fillStyle = currentStyles.primary;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(150, 0);
          ctx.lineTo(0, 150);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(width, height);
          ctx.lineTo(width - 150, height);
          ctx.lineTo(width, height - 150);
          ctx.closePath();
          ctx.fill();
        }

        // Slot
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.beginPath();
        const slotX = (width - 100) / 2;
        const slotY = 18;
        ctx.roundRect ? ctx.roundRect(slotX, slotY, 100, 15, 7.5) : ctx.rect(slotX, slotY, 100, 15);
        ctx.fill();
      }

      // Back Header removed

      // Columns Grid details removed

      // Terms and Conditions, Logo, Institute Name & Institute Address
      if (orientation === "portrait") {
        // Logo
        const backLogoSize = 110;
        const backLogoX = (width - backLogoSize) / 2;
        const backLogoY = 30;

        if (logoUrl) {
          try {
            const logoImg = await loadImgSecurely(logoUrl);
            ctx.drawImage(logoImg, backLogoX, backLogoY, backLogoSize, backLogoSize);
          } catch {
            ctx.fillStyle = currentStyles.primary;
            ctx.beginPath();
            ctx.arc(backLogoX + backLogoSize / 2, backLogoY + backLogoSize / 2, backLogoSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 28px 'Outfit', sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("V", backLogoX + backLogoSize / 2, backLogoY + backLogoSize / 2);
            ctx.textBaseline = "alphabetic";
          }
        } else {
          ctx.fillStyle = currentStyles.primary;
          ctx.beginPath();
          ctx.arc(backLogoX + backLogoSize / 2, backLogoY + backLogoSize / 2, backLogoSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "bold 28px 'Outfit', sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.fillText("V", backLogoX + backLogoSize / 2, backLogoY + backLogoSize / 2);
          ctx.textBaseline = "alphabetic";
        }
 
        // Institute Name
        const mainName = instituteName.split(" ").slice(0, -1).join(" ");
        const lastName = instituteName.split(" ").slice(-1)[0];
 
        ctx.textAlign = "center";
        ctx.fillStyle = bgImage ? "#0f172a" : "#ffffff";
        ctx.font = "bold 34px 'Outfit', sans-serif";
        ctx.fillText(mainName.toUpperCase(), width / 2, 155);
        
        ctx.fillStyle = bgImage ? "#000000" : "rgba(255,255,255,0.7)";
        ctx.font = "bold 22px 'Outfit', sans-serif";
        ctx.fillText(lastName.toUpperCase(), width / 2, 185);
 
        const tcY = 290;
        ctx.textAlign = "center";
        ctx.font = "bold 24px 'Outfit', sans-serif";
        ctx.fillStyle = bgImage ? "#000000" : "rgba(255,255,255,0.8)";
        ctx.fillText("TERMS & CONDITIONS", width / 2, tcY);
 
        ctx.font = "normal 19px 'Outfit', sans-serif";
        ctx.fillStyle = bgImage ? "#000000" : "rgba(255,255,255,0.7)";
        
        let currentTcY = tcY + 36;
        const t1Lines = drawCenteredWrappedText(ctx, "1. This card is non-transferable and property of the institute.", width / 2, currentTcY, 520, 26);
        currentTcY += t1Lines * 26 + 10;
 
        const t2Lines = drawCenteredWrappedText(ctx, "2. If found, please return to the institute address mentioned below.", width / 2, currentTcY, 520, 26);
        currentTcY += t2Lines * 26 + 10;
 
        const t3Lines = drawCenteredWrappedText(ctx, "3. Report loss of card immediately to the office.", width / 2, currentTcY, 520, 26);
 
      }
 
      // Signature area
      if (showSignature) {
        const sigX = orientation === "portrait" ? width / 2 : 780;
        const sigY = orientation === "portrait" ? 525 : 425;
 
        ctx.textAlign = "center";
 
        const drawSignatureText = (c: CanvasRenderingContext2D, txt: string, sx: number, sy: number, col: string) => {
          c.font = "italic bold 32px 'Georgia', serif";
          c.fillStyle = bgImage ? "#0f172a" : col;
          c.fillText(txt, sx, sy);
        };
 
        const activeSigUrl = processedSignatureUrl || signatureUrl;
        if (activeSigUrl) {
          try {
            const sigImg = await loadImgSecurely(activeSigUrl);
            ctx.save();
            ctx.translate(sigX, sigY + 4); // Slightly below the dashed line to overlap text
            ctx.rotate(-0.1); // slanted: left down, right up
            ctx.drawImage(sigImg, -100, -25, 200, 50);
            ctx.restore();
          } catch {
            // No fallback text
          }
        }
 
        ctx.font = "bold 18px 'Outfit', sans-serif";
        ctx.fillStyle = bgImage ? "#000000" : "rgba(255, 255, 255, 0.6)";
        ctx.fillText("Director Signature", sigX, sigY + 35);
      }
 
      if (orientation === "portrait") {
        const addressY = 630;
        ctx.textAlign = "center";

        ctx.font = "bold 26px 'Outfit', sans-serif";
        ctx.fillStyle = bgImage ? "#000000" : "rgba(255,255,255,0.9)";

        // Draw Contact underlined
        ctx.fillText("Contact", width / 2, addressY);
        const contactWidth = ctx.measureText("Contact").width;
        ctx.beginPath();
        ctx.moveTo(width / 2 - contactWidth / 2, addressY + 4);
        ctx.lineTo(width / 2 + contactWidth / 2, addressY + 4);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = "bold 23px 'Outfit', sans-serif";
        ctx.fillText("📞 +91 8103170595", width / 2, addressY + 36);
        ctx.fillText("✉️ visionitpratappur@gmail.com", width / 2, addressY + 66);

        ctx.font = "bold 26px 'Outfit', sans-serif";
        ctx.fillStyle = bgImage ? "#000000" : "rgba(255,255,255,0.8)";
        ctx.fillText("INSTITUTE ADDRESS", width / 2, addressY + 122);
        const instAddrWidth = ctx.measureText("INSTITUTE ADDRESS").width;
        ctx.beginPath();
        ctx.moveTo(width / 2 - instAddrWidth / 2, addressY + 126);
        ctx.lineTo(width / 2 + instAddrWidth / 2, addressY + 126);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = "bold 24px 'Outfit', sans-serif";
        ctx.fillStyle = bgImage ? "#000000" : "rgba(255,255,255,0.9)";
        
        const nextY = addressY + 154;
        const addrLinesCount = drawCenteredWrappedText(ctx, "Vision IT Computer Institute, kadampara chowk, Pratappur, Surajpur(C.G.) - 497223", width / 2, nextY, 540, 27);
        
        ctx.fillText("🌐 www.visionitinstitute.com", width / 2, nextY + addrLinesCount * 27 + 45);
      }

      // Footer removed
    }

    return canvas.toDataURL("image/png");
  };

  // Load jsPDF from CDN dynamically
  const loadJsPDF = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).jspdf) {
        resolve((window as any).jspdf);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.async = true;
      script.onload = () => resolve((window as any).jspdf);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  // Trigger PDF Downloads
  const handleDownload = async (side: "front" | "back" | "both") => {
    if (side === "front" || side === "both") setIsExportingFront(true);
    if (side === "back" || side === "both") setIsExportingBack(true);

    try {
      const jspdfModule = await loadJsPDF();
      const { jsPDF } = jspdfModule;

      const cardW = orientation === "portrait" ? 53.98 : 85.6;
      const cardH = orientation === "portrait" ? 85.6 : 53.98;

      const pdf = new jsPDF({
        orientation: orientation === "portrait" ? "p" : "l",
        unit: "mm",
        format: [cardW, cardH]
      });

      if (side === "front" || side === "both") {
        const frontData = await drawToCanvas("front");
        if (!frontData) throw new Error("Front canvas generation failed");
        pdf.addImage(frontData, "PNG", 0, 0, cardW, cardH);
      }

      if (side === "both") {
        const backData = await drawToCanvas("back");
        if (!backData) throw new Error("Back canvas generation failed");
        pdf.addPage([cardW, cardH], orientation === "portrait" ? "p" : "l");
        pdf.addImage(backData, "PNG", 0, 0, cardW, cardH);
      } else if (side === "back") {
        const backData = await drawToCanvas("back");
        if (!backData) throw new Error("Back canvas generation failed");
        pdf.addImage(backData, "PNG", 0, 0, cardW, cardH);
      }

      pdf.save(`student_id_${side}_${student.student_id || "card"}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF. CORS restrictions or custom assets may be causing failures.");
    } finally {
      setIsExportingFront(false);
      setIsExportingBack(false);
    }
  };

  // Trigger ID Printing Setup
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const frontUrl = await drawToCanvas("front");
      const backUrl = await drawToCanvas("back");
      if (frontUrl && backUrl) {
        setPrintFrontUrl(frontUrl);
        setPrintBackUrl(backUrl);
        setTriggerPrint(true);
      } else {
        alert("Failed to prepare cards for printing.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred preparing high-res assets for print.");
    } finally {
      setIsPrinting(false);
    }
  };

  // Effect to handle printing when assets are fully loaded in DOM
  useEffect(() => {
    if (triggerPrint && printFrontUrl && printBackUrl) {
      const container = document.getElementById("print-card-container");
      if (!container) return;

      const imgs = Array.from(container.getElementsByTagName("img"));
      if (imgs.length === 0) {
        const timer = setTimeout(() => {
          window.print();
          setTriggerPrint(false);
        }, 500);
        return () => clearTimeout(timer);
      }

      let loadedCount = 0;
      const onImageLoad = () => {
        loadedCount++;
        if (loadedCount === imgs.length) {
          setTimeout(() => {
            window.print();
            setTriggerPrint(false);
          }, 150);
        }
      };

      imgs.forEach((img) => {
        if (img.complete) {
          onImageLoad();
        } else {
          img.addEventListener("load", onImageLoad);
          img.addEventListener("error", onImageLoad);
        }
      });

      return () => {
        imgs.forEach((img) => {
          img.removeEventListener("load", onImageLoad);
          img.removeEventListener("error", onImageLoad);
        });
      };
    }
  }, [triggerPrint, printFrontUrl, printBackUrl]);

  // React SVG helpers for HTML Preview Card Waves
  const renderWavesFrontHtml = () => {
    if (bgImage) {
      return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[24px]">
          <img src={bgImage} alt="Background template" className="w-full h-full object-cover" />
        </div>
      );
    }
    if (orientation === "portrait") {
      return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[24px]" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)" }}>
          {/* Top Purple Chevron */}
          <svg viewBox="0 0 260 150" className="absolute top-0 left-0 w-full h-[150px] z-0" preserveAspectRatio="none" style={{ fill: currentStyles.primary }}>
            <path d="M 0 0 L 260 0 L 260 100 L 130 145 L 0 100 Z" />
          </svg>

          {/* Honeycomb grid on top right */}
          <svg viewBox="0 0 100 100" className="absolute top-1 right-2 w-[80px] h-[80px] opacity-[0.15] text-white pointer-events-none z-10" style={{ stroke: "currentColor", fill: "none", strokeWidth: "1.2" }}>
            <path d="M 50 10 L 70 20 L 70 40 L 50 50 L 30 40 L 30 20 Z" />
            <path d="M 70 20 L 90 10 L 110 20 L 110 40 L 90 50 L 70 40" />
            <path d="M 30 20 L 10 10 L -10 20 L -10 40 L 10 50 L 30 40" />
            <path d="M 50 50 L 70 60 L 70 80 L 50 90 L 30 80 L 30 60 Z" />
            <path d="M 70 60 L 90 50" />
            <path d="M 30 60 L 10 50" />
          </svg>

          {/* Faceted grey border/plates */}
          <svg viewBox="0 0 40 412" className="absolute top-0 left-0 w-[40px] h-full opacity-60" preserveAspectRatio="none" style={{ fill: "#f1f5f9" }}>
            <path d="M 0 100 L 15 110 L 15 320 L 0 340 Z" />
          </svg>
          <svg viewBox="0 0 40 412" className="absolute top-0 right-0 w-[40px] h-full opacity-60" preserveAspectRatio="none" style={{ fill: "#f1f5f9" }}>
            <path d="M 40 100 L 25 110 L 25 320 L 40 340 Z" />
          </svg>

          {/* Bottom Left Corner Purple Accent */}
          <svg viewBox="0 0 40 80" className="absolute bottom-0 left-0 w-[30px] h-[70px]" preserveAspectRatio="none" style={{ fill: currentStyles.primary }}>
            <path d="M 0 80 L 0 0 L 12 15 L 12 80 Z" />
          </svg>
          {/* Bottom Right Corner Purple Accent */}
          <svg viewBox="0 0 40 80" className="absolute bottom-0 right-0 w-[30px] h-[70px]" preserveAspectRatio="none" style={{ fill: currentStyles.primary }}>
            <path d="M 40 80 L 40 0 L 28 15 L 28 80 Z" />
          </svg>

          {/* White diagonal stripes at the bottom */}
          <svg viewBox="0 0 260 60" className="absolute bottom-0 left-0 w-full h-[60px] opacity-40" preserveAspectRatio="none" style={{ stroke: "#ffffff", strokeWidth: "2", fill: "none" }}>
            <path d="M -20 60 L 100 0" />
            <path d="M 280 60 L 160 0" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[24px]" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
          {/* Left Purple chevron */}
          <svg viewBox="0 0 180 260" className="absolute top-0 left-0 w-[180px] h-full z-0" preserveAspectRatio="none" style={{ fill: currentStyles.primary }}>
            <path d="M 0 0 L 150 0 L 180 130 L 150 260 L 0 260 Z" />
          </svg>

          {/* Honeycomb grid */}
          <svg viewBox="0 0 100 100" className="absolute top-2 left-2 w-[70px] h-[70px] opacity-[0.15] text-white pointer-events-none z-10" style={{ stroke: "currentColor", fill: "none", strokeWidth: "1.2" }}>
            <path d="M 50 10 L 70 20 L 70 40 L 50 50 L 30 40 L 30 20 Z" />
            <path d="M 70 20 L 90 10 L 110 20 L 110 40 L 90 50 L 70 40" />
            <path d="M 50 50 L 70 60 L 70 80 L 50 90 L 30 80 L 30 60 Z" />
          </svg>

          {/* Right corner accents */}
          <svg viewBox="0 0 40 80" className="absolute bottom-0 right-0 w-[30px] h-[70px]" preserveAspectRatio="none" style={{ fill: currentStyles.primary }}>
            <path d="M 40 80 L 40 0 L 28 15 L 28 80 Z" />
          </svg>
          <svg viewBox="0 0 40 80" className="absolute top-0 right-0 w-[30px] h-[70px]" preserveAspectRatio="none" style={{ fill: currentStyles.primary }}>
            <path d="M 40 0 L 40 80 L 28 65 L 28 0 Z" />
          </svg>
        </div>
      );
    }
  };

  const renderWavesBackHtml = () => {
    if (bgImage) {
      return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[24px]">
          <img src={bgImage} alt="Background template" className="w-full h-full object-cover" />
        </div>
      );
    }
    if (orientation === "portrait") {
      return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[24px]" style={{ backgroundColor: "#ffffff" }}>
          {/* Top Right Slanted Chevron */}
          <svg viewBox="0 0 100 100" className="absolute top-0 right-0 w-[80px] h-[80px] z-0" style={{ fill: currentStyles.primary }}>
            <path d="M 0 0 L 100 0 L 100 100 Z" />
          </svg>

          {/* Top Left Slanted Chevron */}
          <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-[50px] h-[50px] z-0" style={{ fill: currentStyles.primary }}>
            <path d="M 0 0 L 100 0 L 0 100 Z" />
          </svg>

          {/* Bottom Left Slanted Chevron */}
          <svg viewBox="0 0 100 100" className="absolute bottom-0 left-0 w-[80px] h-[80px] z-0" style={{ fill: currentStyles.primary }}>
            <path d="M 0 0 L 0 100 L 100 100 Z" />
          </svg>

          {/* Bottom Right Slanted Chevron */}
          <svg viewBox="0 0 100 100" className="absolute bottom-0 right-0 w-[80px] h-[80px] z-0" style={{ fill: currentStyles.primary }}>
            <path d="M 100 0 L 100 100 L 0 100 Z" />
          </svg>
        </div>
      );
    } else {
      // Landscape Back waves
      return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[24px]" style={{ backgroundColor: "#ffffff" }}>
          {/* Top Left Corner */}
          <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-[60px] h-[60px] z-0" style={{ fill: currentStyles.primary }}>
            <path d="M 0 0 L 100 0 L 0 100 Z" />
          </svg>
          {/* Bottom Right Corner */}
          <svg viewBox="0 0 100 100" className="absolute bottom-0 right-0 w-[60px] h-[60px] z-0" style={{ fill: currentStyles.primary }}>
            <path d="M 100 0 L 100 100 L 0 100 Z" />
          </svg>
        </div>
      );
    }
  };

  const renderGuillocheOverlay = () => {
    const paths = [];
    for (let i = 0; i < 6; i++) {
      const phase = (i / 6) * Math.PI * 2;
      let d = "M 0 130";
      for (let x = 0; x <= 260; x += 10) {
        const y = 130 + Math.sin(x * 0.02 + phase) * 20 + Math.cos(x * 0.04) * 10;
        d += ` L ${x} ${y}`;
      }
      paths.push(<path key={i} d={d} stroke="currentColor" fill="none" strokeWidth="0.5" />);
    }
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.09] pointer-events-none z-0 text-white" viewBox="0 0 260 412" preserveAspectRatio="none">
        {paths}
      </svg>
    );
  };

  const renderGuillocheOverlayLandscape = () => {
    const paths = [];
    for (let i = 0; i < 6; i++) {
      const phase = (i / 6) * Math.PI * 2;
      let d = "M 0 100";
      for (let x = 0; x <= 412; x += 15) {
        const y = 100 + Math.sin(x * 0.015 + phase) * 18 + Math.cos(x * 0.03) * 8;
        d += ` L ${x} ${y}`;
      }
      paths.push(<path key={i} d={d} stroke="currentColor" fill="none" strokeWidth="0.5" />);
    }
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.09] pointer-events-none z-0 text-white" viewBox="0 0 412 260" preserveAspectRatio="none">
        {paths}
      </svg>
    );
  };

  // Dynamic Barcode SVG generator
  const getBarcodeSVG = (text: string) => {
    const formatted = `*${text.toUpperCase().replace(/[^A-Z0-9\-\.\s]/g, "")}*`;
    let bitString = "";
    for (let i = 0; i < formatted.length; i++) {
      const char = formatted[i];
      const bits = CODE39_MAP[char] || CODE39_MAP['*'];
      bitString += bits + "0";
    }

    const numModules = bitString.length;
    return (
      <svg viewBox={`0 0 ${numModules} 40`} className="w-full h-full" preserveAspectRatio="none">
        {bitString.split("").map((bit, idx) => (
          bit === "1" ? <rect key={idx} x={idx} y={0} width={1.2} height={40} fill="currentColor" /> : null
        ))}
      </svg>
    );
  };

  // RENDER CARD HTML FOR LIVE PREVIEWS
  const renderCardFrontHtml = () => {
    return (
      <div className="w-full h-full flex flex-col relative bg-white select-none">
        <div className="glass-glare" />

        {/* Lanyard Slot */}
        <div className={`w-10 h-1.5 rounded-full mx-auto mt-2.5 mb-1.5 shrink-0 z-10 ${orientation === 'portrait' ? 'bg-slate-200' : 'bg-slate-200'}`} />

        {/* Waves Backdrop */}
        {renderWavesFrontHtml()}

        {/* Vertical Session Text */}
        <div className="absolute left-2 top-[65%] -translate-x-1/2 -translate-y-1/2 -rotate-90 z-20">
          <span className="italic text-[12px] font-black tracking-[0.2em] text-blue-500 uppercase whitespace-nowrap opacity-100">
            SESSION 2026-27
          </span>
        </div>

        {/* Top Header — Logo top center, Institute name below */}
        <div className="absolute top-3 left-4 right-4 flex flex-col items-center gap-1 z-10 text-center">
          {/* Logo */}
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-[48px] h-[48px] object-contain" />
          ) : (
            <div className="w-[48px] h-[48px] rounded-full bg-blue-900 flex items-center justify-center font-black text-[18px] text-white">V</div>
          )}
          {/* Institute Name below logo */}
          {/* Institute Name — main part big, last word small below */}
          <div className="mt-1 text-left leading-none">
            <div className={`text-[14px] font-black uppercase tracking-wider ${bgImage === "/idcard/idcard_2.png" || template === "modern" ? "text-white" : "text-black"}`}>
              {instituteName.split(" ").slice(0, -1).join(" ")}
            </div>
            <div className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ${bgImage === "/idcard/idcard_2.png" || template === "modern" ? "text-white/70" : "text-black"}`}>
              {instituteName.split(" ").slice(-1)[0]}
            </div>
          </div>
        </div>

        {orientation === "portrait" ? (
          // --- PORTRAIT LAYOUT FRONT ---
          <>
            {/* STUDENT ID CARD label — centered just above photo */}
            <div className={`text-center mt-16 mb-1 z-10 relative shrink-0`}>
              <span className={`text-[6px] font-black uppercase tracking-[0.2em] px-3 py-0.5 rounded-full border ${bgImage === "/idcard/idcard_2.png" || template === "modern"
                ? "text-white/80 border-white/30"
                : "text-black border-black/30"
                }`}>Student ID Card</span>
            </div>

            {/* Photo */}
            <div
              className="w-[100px] h-[100px] rounded-full border-[3px] overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 mx-auto z-10 relative shadow-sm"
              style={{ borderColor: currentStyles.photoBorder, display: showPhoto ? 'flex' : 'none' }}
            >
              {student.photo_url ? (
                <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-300 font-black text-2xl">?</div>
              )}
            </div>

            {/* Name / Course */}
            <div className="text-center mt-2 px-4 z-10 relative shrink-0">
              <h3 className="text-xs font-black uppercase tracking-wide leading-tight text-black">{nameText}</h3>
              <div className="mt-1.5 flex justify-center">
                <span className="px-3 py-0.5 rounded-full text-[6.5px] font-bold tracking-wider uppercase text-black shadow-sm border border-blue-500">
                  {courseText}
                </span>
              </div>
            </div>

            {/* Info rows — centered in card */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2 relative z-10 min-h-0 gap-1 w-full">
              {/* Info — table aligned: LABEL : value */}
              <table className="border-collapse text-[8px]">
                <tbody>
                  <tr>
                    <td className="text-left font-extrabold text-black uppercase tracking-wider whitespace-nowrap pr-1 py-[2px]">ID No</td>
                    <td className="font-bold text-black px-1 py-[2px]">:</td>
                    <td className="text-left font-bold text-black py-[2px]">{idText}</td>
                  </tr>
                  {fatherName && (
                    <tr>
                      <td className="text-left font-extrabold text-black uppercase tracking-wider whitespace-nowrap pr-1 py-[2px]">Father</td>
                      <td className="font-bold text-black px-1 py-[2px]">:</td>
                      <td className="text-left font-bold text-black py-[2px]">Mr. {fatherName}</td>
                    </tr>
                  )}
                  {dobText && (
                    <tr>
                      <td className="text-left font-extrabold text-black uppercase tracking-wider whitespace-nowrap pr-1 py-[2px]">DOB</td>
                      <td className="font-bold text-black px-1 py-[2px]">:</td>
                      <td className="text-left font-bold text-black py-[2px]">{(() => { const d = new Date(dobText); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })()}</td>
                    </tr>
                  )}
                  {showEmergencyContact && phoneText && (
                    <tr>
                      <td className="text-left font-extrabold text-black uppercase tracking-wider whitespace-nowrap pr-1 py-[2px]">Phone</td>
                      <td className="font-bold text-black px-1 py-[2px]">:</td>
                      <td className="text-left font-bold text-black py-[2px]">{phoneText}</td>
                    </tr>
                  )}
                  {showAddress && addressText && (
                    <tr>
                      <td className="text-left font-extrabold text-black uppercase tracking-wider whitespace-nowrap pr-1 py-[2px]">Address</td>
                      <td className="font-bold text-black px-1 py-[2px]">:</td>
                      <td className="text-left font-bold text-black py-[2px]">{addressText}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* QR / Barcode centered below info */}
              <div className="mt-2 flex flex-col items-center">
                {barcodeType === "qr" ? (
                  <div className="w-[52px] h-[52px] bg-white p-1 rounded-lg flex items-center justify-center shadow-md border border-slate-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${idText}`}
                      alt="QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-[100px] h-[36px] bg-white p-1 rounded-lg flex flex-col items-center justify-center shadow-md border border-slate-200 text-black">
                    {getBarcodeSVG(barcodeText || idText)}
                    <span className="text-[5px] font-mono mt-0.5 leading-none">{barcodeText || idText}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // --- LANDSCAPE LAYOUT FRONT ---
          <div className="flex-1 flex relative z-10 px-4 pt-10 pb-3 text-left">
            {/* Left Column: Profile photo & Name */}
            <div className="w-[140px] flex flex-col justify-center items-center text-center pr-2 border-r border-slate-100 shrink-0">
              <div
                className="w-[74px] h-[74px] rounded-full border-[3px] overflow-hidden bg-slate-50 flex items-center justify-center shadow-sm"
                style={{ borderColor: currentStyles.photoBorder, display: showPhoto ? 'flex' : 'none' }}
              >
                {student.photo_url ? (
                  <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-300 font-black text-xl">?</div>
                )}
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-wide leading-tight mt-2 text-white truncate w-full">{nameText}</h3>
              <p className="text-[7px] font-extrabold tracking-wider uppercase mt-0.5 truncate w-full" style={{ color: currentStyles.accent }}>
                {courseText}
              </p>
            </div>

            {/* Right Column: details + QR/Barcode */}
            <div className="flex-1 pl-4 flex flex-col justify-between">
              <div className="space-y-1 text-[7.5px] font-bold">
                <div className="flex items-center gap-1">
                  <span className="uppercase text-[6px] tracking-wider font-extrabold w-14 shrink-0" style={{ color: "#64748b" }}>ID NO:</span>
                  <span className="truncate" style={{ color: "#0f172a" }}>{idText}</span>
                </div>
                {showBloodGroup && (
                  <div className="flex items-center gap-1">
                    <span className="uppercase text-[6px] tracking-wider font-extrabold w-14 shrink-0" style={{ color: "#64748b" }}>BLOOD GP:</span>
                    <span className="truncate" style={{ color: "#0f172a" }}>{bloodGroup}</span>
                  </div>
                )}
                {showEmergencyContact && phoneText && (
                  <div className="flex items-center gap-1">
                    <span className="uppercase text-[6px] tracking-wider font-extrabold w-14 shrink-0" style={{ color: "#64748b" }}>PHONE:</span>
                    <span className="truncate" style={{ color: "#0f172a" }}>{phoneText}</span>
                  </div>
                )}
                {emailText && (
                  <div className="flex items-center gap-1">
                    <span className="uppercase text-[6px] tracking-wider font-extrabold w-14 shrink-0" style={{ color: "#64748b" }}>EMAIL:</span>
                    <span className="truncate block max-w-[130px]" style={{ color: "#0f172a" }}>{emailText}</span>
                  </div>
                )}
                {showAddress && addressText && (
                  <div className="flex items-start gap-1">
                    <span className="uppercase text-[6px] tracking-wider font-extrabold w-14 shrink-0 mt-0.5" style={{ color: "#64748b" }}>ADDRESS:</span>
                    <span className="line-clamp-2 leading-snug" style={{ color: "#0f172a" }}>{addressText}</span>
                  </div>
                )}
              </div>

              {/* QR / Barcode aligned at the bottom right */}
              <div className="flex justify-end items-end mt-1">
                {barcodeType === "qr" ? (
                  <div className="w-[50px] h-[50px] bg-white p-0.5 rounded-lg flex items-center justify-center shadow-md border border-slate-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${idText}`}
                      alt="QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-[84px] h-[35px] bg-white p-1 rounded-lg flex flex-col items-center justify-center shadow-md border border-slate-200 text-black">
                    {getBarcodeSVG(barcodeText || idText)}
                    <span className="text-[4px] font-mono mt-0.5 leading-none">{barcodeText || idText}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCardBackHtml = () => {
    return (
      <div className="w-full h-full flex flex-col relative bg-white select-none">
        <div className="glass-glare" />

        {/* Lanyard Slot */}
        <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto mt-2.5 mb-1.5 shrink-0 z-10" />

        {/* Waves Backdrop */}
        {renderWavesBackHtml()}

        {/* Back Content */}
        <div className="relative z-10 px-4 pt-1 flex-grow min-h-0 text-left mt-2">
          {orientation === "portrait" ? (
            // --- PORTRAIT LAYOUT BACK ---
            <>

              {/* Center Content Stack: Logo -> Institute Name -> Terms */}
              {/* Top Header — Matches Front */}
              <div className="absolute -top-2 left-4 right-4 flex flex-col items-center gap-1 z-10 text-center">
                {/* Logo */}
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-[48px] h-[48px] object-contain opacity-90" />
                ) : (
                  <div className="w-[48px] h-[48px] rounded-full bg-blue-900 flex items-center justify-center font-black text-[18px] text-white opacity-90">V</div>
                )}
                
                {/* Institute Name */}
                <div className="mt-1 text-left leading-none">
                  <div className={`text-[14px] font-black uppercase tracking-wider ${bgImage ? 'text-slate-800' : 'text-white'}`}>
                    {instituteName.split(" ").slice(0, -1).join(" ")}
                  </div>
                  <div className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ${bgImage ? 'text-black' : 'text-white/70'}`}>
                    {instituteName.split(" ").slice(-1)[0]}
                  </div>
                </div>
              </div>
              {/* Center Content Stack: Terms */}
              <div className="flex flex-col items-center justify-center flex-1 w-full gap-2 mt-[105px] pb-2">
                {/* Terms & Conditions + Institute Address */}
                <div className="mt-2 text-center w-full px-2 z-10">
                  <h5 className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${bgImage ? 'text-black' : 'text-white/80'}`}>Terms & Conditions</h5>
                  <ul className={`text-[9px] leading-snug list-none space-y-1 p-0 m-0 ${bgImage ? 'text-black' : 'text-white/70'}`}>
                    <li>1. This card is non-transferable and property of the institute.</li>
                    <li>2. If found, please return to the institute address mentioned below.</li>
                    <li>3. Report loss of card immediately to the office.</li>
                  </ul>
                </div>
              </div>
 
              {/* Signature area */}
              {showSignature && (
                <div className="mt-3.5 flex flex-col items-center shrink-0 -translate-y-4 relative z-20">
                  {signatureUrl ? (
                    <img src={processedSignatureUrl || signatureUrl} alt="Signature" className="h-[22px] object-contain transform rotate-[-6deg] translate-y-[4px] relative z-20" />
                  ) : (
                    <div className="h-[22px]" />
                  )}
                  <span className={`text-[6px] uppercase tracking-wider mt-0.5 font-bold ${bgImage ? 'text-black' : 'opacity-60 text-slate-350'}`}>Director Signature</span>
                </div>
              )}

              {/* Bottom Address */}
              <div className="absolute bottom-12 left-0 w-full text-center px-4">
                <div className={`text-[9.5px] font-semibold leading-snug flex flex-col items-center gap-1 mb-2 ${bgImage ? 'text-black' : 'text-white/90'}`}>
                  <span className="font-bold border-b-[0.5px] border-current pb-[1px] inline-block mb-0.5">Contact</span>
                  <span className="flex items-center gap-1.5"><Phone className="w-2.5 h-2.5" /> +91 8103170595</span>
                  <span className="flex items-center gap-1.5"><Mail className="w-2.5 h-2.5" /> visionitpratappur@gmail.com</span>
                </div>
                <div className={`text-[9.5px] font-semibold leading-snug ${bgImage ? 'text-black' : 'text-white/90'} flex flex-col items-center gap-0.5`}>
                  <span className={`font-extrabold text-[8.5px] border-b-[0.5px] border-current pb-[1px] inline-block mb-0.5 ${bgImage ? 'text-black' : 'text-white/70'}`}>INSTITUTE ADDRESS</span>
                  <span>Vision IT Computer Institute, kadampara chowk, Pratappur, Surajpur(C.G.) - 497223</span>
                  <span className="flex items-center gap-1.5 mt-1"><Globe className="w-2.5 h-2.5" /> www.visionitinstitute.com</span>
                </div>
              </div>
            </>
          ) : (
            // --- LANDSCAPE LAYOUT BACK ---
            <>
              <div className={`grid grid-cols-3 gap-x-2 gap-y-1.5 text-[7px] ${bgImage ? 'text-slate-800' : 'text-white'}`}>
                <div>
                  <span className="block text-[5px] uppercase opacity-75 font-extrabold" style={{ color: bgImage ? "#64748b" : currentStyles.label }}>Father's Name</span>
                  <span className={`font-bold truncate block ${bgImage ? 'text-slate-900' : ''}`}>{fatherName || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[5px] uppercase opacity-75 font-extrabold" style={{ color: bgImage ? "#64748b" : currentStyles.label }}>Mother's Name</span>
                  <span className={`font-bold truncate block ${bgImage ? 'text-slate-900' : ''}`}>{motherName || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[5px] uppercase opacity-75 font-extrabold" style={{ color: bgImage ? "#64748b" : currentStyles.label }}>Date of Birth</span>
                  <span className={`font-bold block ${bgImage ? 'text-slate-900' : ''}`}>{dobText ? new Date(dobText).toLocaleDateString() : "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[5px] uppercase opacity-75 font-extrabold" style={{ color: bgImage ? "#64748b" : currentStyles.label }}>Aadhar Number</span>
                  <span className={`font-bold block ${bgImage ? 'text-slate-900' : ''}`}>{aadharText || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[5px] uppercase opacity-75 font-extrabold" style={{ color: bgImage ? "#64748b" : currentStyles.label }}>Admission Date</span>
                  <span className={`font-bold block ${bgImage ? 'text-slate-900' : ''}`}>{admissionText ? new Date(admissionText).toLocaleDateString() : "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[5px] uppercase opacity-75 font-extrabold" style={{ color: bgImage ? "#64748b" : currentStyles.label }}>Emergency Phone</span>
                  <span className={`font-bold block ${bgImage ? 'text-slate-900' : ''}`}>{phoneText || "N/A"}</span>
                </div>
              </div>

              <div className="mt-2.5 flex justify-between items-end">
                {showAddress && addressText && (
                  <div className={`text-[7px] max-w-[60%] ${bgImage ? 'text-slate-800' : 'text-white'}`}>
                    <span className="block text-[5px] uppercase opacity-75 font-extrabold" style={{ color: bgImage ? "#64748b" : currentStyles.label }}>Residential Address</span>
                    <span className={`block line-clamp-2 leading-relaxed ${bgImage ? 'text-slate-900' : ''}`}>{addressText}</span>
                  </div>
                )}

                {/* Signature aligned to bottom right of back */}
                {showSignature && (
                  <div className="flex flex-col items-center pr-2 shrink-0 -translate-y-4 relative z-20">
                    {signatureUrl ? (
                      <img src={processedSignatureUrl || signatureUrl} alt="Signature" className="h-[20px] object-contain transform rotate-[-6deg] translate-y-[3px] relative z-20" />
                    ) : (
                      <div className="text-xs font-serif italic font-black text-center leading-none" style={{ color: bgImage ? "#0f172a" : currentStyles.signature }}>
                        {signatureText}
                      </div>
                    )}
                    <span className={`text-[4px] uppercase tracking-wider mt-0.5 font-bold ${bgImage ? 'text-black' : 'opacity-60 text-slate-300'}`}>Authorized Signature</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer removed */}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* Dynamic Embedded CSS Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .card-perspective {
          perspective: 1200px;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .card-inner.is-flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 24px;
        }
        .card-back {
          transform: rotateY(180deg);
        }
        
        .glass-glare {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.05) 100%);
          pointer-events: none;
          z-index: 20;
          border-radius: 24px;
        }

        .pattern-grid {
          background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
          background-size: 15px 15px;
        }
        .pattern-dots {
          background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1.5px, transparent 1.5px);
          background-size: 10px 10px;
        }

        /* Custom Scrollbar for editor panel */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }

        @media print {
          @page {
            size: ${orientation === "portrait" ? "53.98mm 85.6mm" : "85.6mm 53.98mm"};
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body > :not(#print-card-container) {
            display: none !important;
          }
          #print-card-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: ${orientation === "portrait" ? "53.98mm" : "85.6mm"} !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card-box {
            width: ${orientation === "portrait" ? "53.98mm" : "85.6mm"} !important;
            height: ${orientation === "portrait" ? "85.6mm" : "53.98mm"} !important;
            border: none !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-card-box:last-child {
            page-break-after: avoid !important;
          }
        }
      `}} />
 
      {/* Off-screen Canvas for image building */}
      <canvas ref={canvasRef} className="hidden" />
 
      {/* Styled Printable Container for Print Media (Rendered as Portal at body level) */}
      {isMounted && createPortal(
        <div id="print-card-container" className="hidden">
          {printFrontUrl && (
            <img src={printFrontUrl} alt="Front Card" className="print-card-box" />
          )}
          {printBackUrl && (
            <img src={printBackUrl} alt="Back Card" className="print-card-box" />
          )}
        </div>,
        document.body
      )}

      {/* Top Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl">
            <CreditCard size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              ID Card Design Studio <span className="text-blue-500 font-normal">v2.0</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Customize, print, and export high-res badges for <span className="text-slate-200 font-extrabold">{student.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={isPrinting}
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-75"
          >
            {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
            {isPrinting ? "Compiling..." : "Print ID Badge"}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Exit Generator"
          >
            <X size={18} />
            <span className="text-[10.5px] font-black uppercase tracking-widest hidden sm:inline pr-1">Exit Studio</span>
          </button>
        </div>
      </div>

      {/* Split Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Left Control Panel */}
        <div className="w-full lg:w-[460px] bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto p-6 space-y-6 custom-scrollbar shrink-0">

          {/* Section 1: Template & Theme Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sparkles size={16} className="text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">Layout & Theme</h2>
            </div>

            {/* Background Image Template */}
            <div className="space-y-2">
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Select Template Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBgImage("/idcard/idcard_1.png");
                    setOrientation("portrait");
                  }}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer h-12 flex flex-col justify-center ${bgImage === "/idcard/idcard_1.png"
                    ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-sm font-extrabold"
                    : "bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 text-slate-400"
                    }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block text-center">Theme 1</span>
                  <span className="text-[7px] text-slate-500 uppercase block text-center mt-0.5">Blue Corners</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBgImage("/idcard/idcard_2.png");
                    setOrientation("portrait");
                  }}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer h-12 flex flex-col justify-center ${bgImage === "/idcard/idcard_2.png"
                    ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-sm font-extrabold"
                    : "bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 text-slate-400"
                    }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block text-center">Theme 2</span>
                  <span className="text-[7px] text-slate-500 uppercase block text-center mt-0.5">Blue Waves</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBgImage("/idcard/idcard_3.png");
                    setOrientation("portrait");
                  }}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer h-12 flex flex-col justify-center ${bgImage === "/idcard/idcard_3.png"
                    ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-sm font-extrabold"
                    : "bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 text-slate-400"
                    }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block text-center">Theme 3</span>
                  <span className="text-[7px] text-slate-500 uppercase block text-center mt-0.5">Orange Waves</span>
                </button>
              </div>
            </div>

          </div>

          {/* Section 2: Branding & School Details */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Palette size={16} className="text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">Institution Branding</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Institute Name</label>
                <input
                  type="text"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Website URL</label>
                <input
                  type="text"
                  value={websiteText}
                  onChange={(e) => setWebsiteText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>

            {/* Custom Logo Upload */}
            <div className="space-y-2">
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Institution Logo</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center gap-2 shrink-0">
                  <Upload size={12} />
                  Choose File
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
                <input
                  type="text"
                  value={logoUrl || ""}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Or paste Logo Image URL here..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>

            {/* Signature Designation & Image Upload */}
            <div className="space-y-2">
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Authorized Signature Designation</label>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Authorized Signatory title..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Signature Image Asset</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center gap-2 shrink-0">
                  <Upload size={12} />
                  Choose File
                  <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                </label>
                <input
                  type="text"
                  value={signatureUrl || ""}
                  onChange={(e) => setSignatureUrl(e.target.value)}
                  placeholder="Or paste signature URL here..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Student Profile overrides */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sliders size={16} className="text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">Student Details</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Student Name</label>
                <input
                  type="text"
                  value={nameText}
                  onChange={(e) => setNameText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Student ID No</label>
                <input
                  type="text"
                  value={idText}
                  onChange={(e) => setIdText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Course / Class</label>
                <input
                  type="text"
                  value={courseText}
                  onChange={(e) => setCourseText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Blood Group</label>
                <input
                  type="text"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Contact Number</label>
                <input
                  type="text"
                  value={phoneText}
                  onChange={(e) => setPhoneText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Email Address</label>
                <input
                  type="text"
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Father's Name</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Mother's Name</label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Date of Birth</label>
                <input
                  type="date"
                  value={dobText}
                  onChange={(e) => setDobText(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Admission Date</label>
                <input
                  type="date"
                  value={admissionText}
                  onChange={(e) => setAdmissionText(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Aadhar No</label>
                <input
                  type="text"
                  value={aadharText}
                  onChange={(e) => setAadharText(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] text-white outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Residential Address</label>
              <textarea
                rows={2}
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
              />
            </div>


          </div>

          {/* Section 4: Visibility toggles */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sliders size={16} className="text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">Visibility Toggles</h2>
            </div>

            <div className="divide-y divide-slate-800/40">
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Show Profile Photo</span>
                <button
                  type="button"
                  onClick={() => setShowPhoto(!showPhoto)}
                  className={`w-9 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${showPhoto ? 'bg-blue-600' : 'bg-slate-750'}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 shadow-sm ${showPhoto ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Show Blood Group</span>
                <button
                  type="button"
                  onClick={() => setShowBloodGroup(!showBloodGroup)}
                  className={`w-9 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${showBloodGroup ? 'bg-blue-600' : 'bg-slate-750'}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 shadow-sm ${showBloodGroup ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Show Emergency Contact</span>
                <button
                  type="button"
                  onClick={() => setShowEmergencyContact(!showEmergencyContact)}
                  className={`w-9 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${showEmergencyContact ? 'bg-blue-600' : 'bg-slate-750'}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 shadow-sm ${showEmergencyContact ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Show Residential Address</span>
                <button
                  type="button"
                  onClick={() => setShowAddress(!showAddress)}
                  className={`w-9 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${showAddress ? 'bg-blue-600' : 'bg-slate-750'}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 shadow-sm ${showAddress ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Show Signature Area</span>
                <button
                  type="button"
                  onClick={() => setShowSignature(!showSignature)}
                  className={`w-9 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${showSignature ? 'bg-blue-600' : 'bg-slate-750'}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 shadow-sm ${showSignature ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Preview Area */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-8 overflow-y-auto relative min-h-0">

          <div className="flex flex-col items-center gap-6 max-w-full">

            {/* Quick Downloader Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-[320px] mt-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isExportingFront}
                  onClick={() => handleDownload("front")}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isExportingFront ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Front PDF
                </button>
                <button
                  disabled={isExportingBack}
                  onClick={() => handleDownload("back")}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isExportingBack ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Back PDF
                </button>
              </div>
              <button
                disabled={isExportingFront || isExportingBack}
                onClick={() => handleDownload("both")}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9.5px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isExportingFront || isExportingBack ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Download Combined PDF
              </button>
            </div>

            {/* Helpful Tips Alert Box */}
            <div className="text-center bg-slate-900/40 border border-slate-900 rounded-2xl p-4 max-w-[480px] text-[9.5px] text-slate-400 font-bold leading-normal transition-colors mt-4">
              💡 <strong>Printing Setup Guide:</strong> Prepares standard CR80 layout. In the browser print pop-up, set margins to <strong>None</strong>, disable headers/footers, and select <strong>{orientation === "portrait" ? "Portrait" : "Landscape"}</strong> layout orientation.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}


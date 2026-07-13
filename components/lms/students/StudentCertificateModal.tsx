"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Download, Loader2, Award } from "lucide-react";

interface StudentCertificateModalProps {
  student: any;
  onClose: () => void;
}

const loadImgSecurely = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http://") || src.startsWith("https://")) {
      try {
        const url = new URL(src);
        if (url.origin !== window.location.origin) {
          img.crossOrigin = "anonymous";
        }
      } catch {
        // ignore
      }
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

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

const getShortCourse = (cName: string): string => {
  if (!cName) return "";
  const uName = cName.toUpperCase().trim();
  if (uName.includes("POST GRADUATE DIPLOMA IN COMPUTER APPLICATIONS") || uName.includes("POST GRADUATE DIPLOMA IN COMPUTER APPLICATION")) return "PGDCA";
  if (uName.includes("ADVANCED DIPLOMA IN COMPUTER APPLICATIONS") || uName.includes("ADVANCED DIPLOMA IN COMPUTER APPLICATION")) return "ADCA";
  if (uName.includes("DIPLOMA IN COMPUTER APPLICATIONS") || uName.includes("DIPLOMA IN COMPUTER APPLICATION") || uName === "DIPLOMA IN COMPUTER") return "DCA";
  if (uName.includes("BASIC COMPUTER COURSE")) return "BCC";
  return cName;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  const radii = typeof r === "number" ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + radii[0], y);
  ctx.lineTo(x + w - radii[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
  ctx.lineTo(x + w, y + h - radii[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
  ctx.lineTo(x + radii[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
  ctx.lineTo(x, y + radii[0]);
  ctx.quadraticCurveTo(x, y, x + radii[0], y);
  ctx.closePath();
}

async function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, logoSrc: string) {
  ctx.save();

  // Outermost filled circle (background)
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  bgGrad.addColorStop(0, "#ffffff");
  bgGrad.addColorStop(1, "#dbeafe");
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Outer thick ring
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Second ring (thinner, lighter)
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 28, 0, Math.PI * 2);
  ctx.stroke();

  // Dashed inner ring
  ctx.setLineDash([18, 12]);
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner logo circle (white background)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 72, 0, Math.PI * 2);
  ctx.fill();

  // Logo image in center
  try {
    const logoImg = await loadImgSecurely(logoSrc);
    const lSize = (r - 80) * 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 80, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, cx - lSize / 2, cy - lSize / 2, lSize, lSize);
    ctx.restore();
  } catch {
    // Fallback: star
    ctx.font = `bold ${r * 0.5}px serif`;
    ctx.fillStyle = "#1e3a8a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", cx, cy);
  }

  // Circular text between outer rings
  const circleText = "✦  VISION IT INSTITUTE  ✦  CERTIFIED  ";
  const textRadius = r - 14;
  ctx.font = `bold ${Math.round(r * 0.13)}px Georgia, serif`;
  ctx.fillStyle = "#1e3a8a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < circleText.length; i++) {
    const angle = (i / circleText.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + textRadius * Math.cos(angle), cy + textRadius * Math.sin(angle));
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(circleText[i], 0, 0);
    ctx.restore();
  }

  ctx.restore();
}


export default function StudentCertificateModal({ student, onClose }: StudentCertificateModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [studentName, setStudentName] = useState<string>(student?.name || "");
  const [courseName, setCourseName] = useState<string>(student?.course || "");
  const [certNo, setCertNo] = useState<string>(() => {
    const year = new Date().getFullYear();
    const id = (student?.student_id || "STD001").replace(/\D/g, "").slice(-3).padStart(3, "0");
    return `VIT${year}CERT${id}`;
  });
  const [issueDate, setIssueDate] = useState<string>(() =>
    new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
  );

  const logoUrl = "/logo.png";
  const signatureUrl = "/idcard/signature.png";

  const CANVAS_W = 3508;
  const CANVAS_H = 2480;

  const drawCertificate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const W = CANVAS_W;
    const H = CANVAS_H;

    // ── Background ──────────────────────────────────────
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);


    // ── Outer Border ─────────────────────────────────────
    const BM = 60;
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 18;
    ctx.strokeRect(BM, BM, W - BM * 2, H - BM * 2);

    const IM = 90;
    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = 6;
    ctx.strokeRect(IM, IM, W - IM * 2, H - IM * 2);

    // ── Corner ornaments ─────────────────────────────────
    const drawCorner = (cx: number, cy: number, rx: number, ry: number) => {
      const size = 200;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      ctx.strokeStyle = "#1e40af";
      ctx.lineWidth = 14 / Math.abs(rx);
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.stroke();
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 6 / Math.abs(rx);
      ctx.beginPath();
      ctx.moveTo(40, size - 30);
      ctx.lineTo(40, 40);
      ctx.lineTo(size - 30, 40);
      ctx.stroke();
      ctx.restore();
    };

    drawCorner(IM, IM, 1, 1);
    drawCorner(W - IM, IM, -1, 1);
    drawCorner(IM, H - IM, 1, -1);
    drawCorner(W - IM, H - IM, -1, -1);

    // ── Logo (left) + Institute Header (right) ───────────
    const bannerH = 340; // keep same value so layout below still aligns
    const logoSize = 300;
    const logoX = IM + 60;
    const logoY = IM + 20;
    if (logoUrl) {
      try {
        const logoImg = await loadImgSecurely(logoUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      } catch {
        // skip on error
      }
    }

    // Institute name (centered)
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 110px Georgia, serif";
    ctx.fillText("VISION IT COMPUTER INSTITUTE", W / 2, IM + bannerH - 170);

    ctx.font = "500 54px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("Pratappur, Surajpur (C.G.)", W / 2, IM + bannerH - 100);

    // ── Certificate Title ────────────────────────────────
    const titleY = IM + bannerH + 150;
    ctx.textAlign = "center";
    ctx.font = "bold 96px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("CERTIFICATE OF COMPLETION", W / 2, titleY);


    // ── "This is to certify that" ────────────────────────
    const subtitleY = titleY + 140;
    ctx.font = "italic 62px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("This is to certify that", W / 2, subtitleY);

    // ── Student Name ─────────────────────────────────────
    const nameY = subtitleY + 200;
    ctx.font = "bold 148px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(studentName.toUpperCase(), W / 2, nameY);



    // ── "has successfully completed the course" ──────────
    const completedY = nameY + 140;
    ctx.font = "italic 58px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("has successfully completed the course", W / 2, completedY);

    // ── Course Name (Plain Text without Border) ──────────
    const courseY = completedY + 175;
    const shortCourse = getShortCourse(courseName);
    const fullCourseDisplay = shortCourse !== courseName ? `${courseName}  (${shortCourse})` : courseName;
    ctx.font = "bold italic 90px 'Times New Roman', Times, serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(fullCourseDisplay, W / 2, courseY);

    // ── Cert No. & Issue Date ────────────────────────────
    const metaY = courseY + 190;
    ctx.fillStyle = "#000000";
    ctx.font = "500 48px Georgia, serif";

    // Left: Certificate No label + monospace value
    ctx.textAlign = "left";
    ctx.fillText("Certificate No: ", IM + 120, metaY);
    const labelW1 = ctx.measureText("Certificate No: ").width;
    ctx.font = "bold 48px 'Courier New', Courier, monospace";
    ctx.fillText(certNo, IM + 120 + labelW1, metaY);

    // Right: Date of Issue (fully right-aligned at right edge)
    ctx.textAlign = "right";
    ctx.font = "500 48px Georgia, serif";
    ctx.fillText(`Date of Issue: ${issueDate}`, W - IM - 120, metaY);


    // Horizontal divider
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(IM + 80, metaY + 55);
    ctx.lineTo(W - IM - 80, metaY + 55);
    ctx.stroke();

    // ── Signatures (Instructor on Left, Director on Right) ─
    const sigBaseY = metaY + 140;
    const sigH = 150;
    const sigW = 440;
    const sigLineW = 600;

    const leftCenterX = W / 2 - 700;
    const rightCenterX = W / 2 + 700;

    // Load signature image
    if (signatureUrl) {
      try {
        const sigImg = await loadImgSecurely(signatureUrl);
        // Draw Instructor signature (left)
        ctx.drawImage(sigImg, leftCenterX - sigW / 2, sigBaseY, sigW, sigH);
        // Draw Director signature (right)
        ctx.drawImage(sigImg, rightCenterX - sigW / 2, sigBaseY, sigW, sigH);
      } catch {
        // skip on error
      }
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 5;

    // Left signature line & text
    ctx.beginPath();
    ctx.moveTo(leftCenterX - sigLineW / 2, sigBaseY + 165);
    ctx.lineTo(leftCenterX + sigLineW / 2, sigBaseY + 165);
    ctx.stroke();

    ctx.font = "bold 50px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText("Instructor", leftCenterX, sigBaseY + 220);

    ctx.font = "40px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("VISION IT COMPUTER INSTITUTE", leftCenterX, sigBaseY + 272);

    // Right signature line & text
    ctx.beginPath();
    ctx.moveTo(rightCenterX - sigLineW / 2, sigBaseY + 165);
    ctx.lineTo(rightCenterX + sigLineW / 2, sigBaseY + 165);
    ctx.stroke();

    ctx.font = "bold 50px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText("Director", rightCenterX, sigBaseY + 220);

    ctx.font = "40px Georgia, serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("VISION IT COMPUTER INSTITUTE", rightCenterX, sigBaseY + 272);


  };



  const handleDownload = async () => {
    setIsExporting(true);
    try {
      // Draw the certificate fresh before exporting
      await drawCertificate();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png", 1.0);
      const jspdfModule = await loadJsPDF();
      const { jsPDF } = jspdfModule;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pW, pH);
      pdf.save(`Certificate_${(studentName || "Student").replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to export certificate PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const content = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-blue-900 to-blue-600 text-white rounded-t-3xl shrink-0">
            <div className="flex items-center gap-3">
              <Award className="w-7 h-7 text-blue-200" />
              <div>
                <h2 className="text-lg font-black tracking-wide">Certificate Generator</h2>
                <p className="text-blue-200 text-xs">Blue Theme • Landscape A4</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all cursor-pointer">
              <X size={20} />
            </button>
          </div>

          {/* Hidden canvas for drawing — not shown to user */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Edit fields */}
          <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800">
            {[
              { label: "Student Name", value: studentName, setter: setStudentName },
              { label: "Course Name", value: courseName, setter: setCourseName },
              { label: "Certificate No.", value: certNo, setter: setCertNo },
              { label: "Date of Issue", value: issueDate, setter: setIssueDate },
            ].map(({ label, value, setter }) => (
              <div className="space-y-1" key={label}>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-800 to-blue-500 text-white text-sm font-black tracking-wide hover:from-blue-900 hover:to-blue-600 transition-all cursor-pointer flex items-center gap-2 shadow-md disabled:opacity-60"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? "Generating PDF..." : "Download Certificate (PDF)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(content, document.body) : null;
}

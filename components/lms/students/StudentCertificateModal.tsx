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
    ctx.font = `bold ${r * 0.5}px 'Poppins', sans-serif`;
    ctx.fillStyle = "#1e3a8a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", cx, cy);
  }

  // Circular text between outer rings
  const circleText = "✦  VISION IT INSTITUTE  ✦  CERTIFIED  ";
  const textRadius = r - 14;
  ctx.font = `bold ${Math.round(r * 0.13)}px 'Poppins', sans-serif`;
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

function drawGoldBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();

  // 1. Draw Ribbon Tails (hanging down at the back)
  // Prestigious dark blue ribbons with gold borders!
  
  // Left ribbon
  // Shadow/Outline (Gold border)
  ctx.fillStyle = "#fbbf24"; // Bright gold border
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy + 50);
  ctx.lineTo(cx - 100, cy + r * 1.6);
  ctx.lineTo(cx - 50, cy + r * 1.48); // Chevron tip
  ctx.lineTo(cx - 10, cy + r * 1.6);
  ctx.lineTo(cx - 10, cy + 50);
  ctx.closePath();
  ctx.fill();

  // Inner Blue body of left ribbon
  ctx.fillStyle = "#1e40af"; // Brand blue
  ctx.beginPath();
  ctx.moveTo(cx - 24, cy + 50);
  ctx.lineTo(cx - 92, cy + r * 1.56);
  ctx.lineTo(cx - 50, cy + r * 1.45);
  ctx.lineTo(cx - 16, cy + r * 1.56);
  ctx.lineTo(cx - 16, cy + 50);
  ctx.closePath();
  ctx.fill();

  // Gold accent stripe in the middle of left ribbon
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(cx - 52, cy + 50);
  ctx.lineTo(cx - 58, cy + r * 1.46);
  ctx.lineTo(cx - 50, cy + r * 1.43);
  ctx.lineTo(cx - 48, cy + r * 1.46);
  ctx.lineTo(cx - 48, cy + 50);
  ctx.closePath();
  ctx.fill();

  // Right ribbon
  // Shadow/Outline (Gold border)
  ctx.fillStyle = "#d97706"; // Darker gold border for overlap
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy + 50);
  ctx.lineTo(cx + 10, cy + r * 1.6);
  ctx.lineTo(cx + 50, cy + r * 1.48); // Chevron tip
  ctx.lineTo(cx + 100, cy + r * 1.6);
  ctx.lineTo(cx + 30, cy + 50);
  ctx.closePath();
  ctx.fill();

  // Inner Blue body of right ribbon
  ctx.fillStyle = "#1e3a8a"; // Darker brand blue
  ctx.beginPath();
  ctx.moveTo(cx + 16, cy + 50);
  ctx.lineTo(cx + 16, cy + r * 1.56);
  ctx.lineTo(cx + 50, cy + r * 1.45);
  ctx.lineTo(cx + 92, cy + r * 1.56);
  ctx.lineTo(cx + 24, cy + 50);
  ctx.closePath();
  ctx.fill();

  // Gold accent stripe in the middle of right ribbon
  ctx.fillStyle = "#d97706";
  ctx.beginPath();
  ctx.moveTo(cx + 48, cy + 50);
  ctx.lineTo(cx + 48, cy + r * 1.46);
  ctx.lineTo(cx + 50, cy + r * 1.43);
  ctx.lineTo(cx + 52, cy + r * 1.46);
  ctx.lineTo(cx + 52, cy + 50);
  ctx.closePath();
  ctx.fill();


  // 2. Draw Scalloped Outer Circle (Medal) - Gold
  const numScallops = 36;
  const outerR = r;
  const innerR = r - 14;
  ctx.beginPath();
  for (let i = 0; i <= numScallops; i++) {
    const angle = (i / numScallops) * Math.PI * 2;
    const nextAngle = ((i + 1) / numScallops) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;

    const x = cx + outerR * Math.cos(angle);
    const y = cy + outerR * Math.sin(angle);
    const midX = cx + innerR * Math.cos(midAngle);
    const midY = cy + innerR * Math.sin(midAngle);
    const nextX = cx + outerR * Math.cos(nextAngle);
    const nextY = cy + outerR * Math.sin(nextAngle);

    if (i === 0) {
      ctx.moveTo(x, y);
    }
    ctx.quadraticCurveTo(midX, midY, nextX, nextY);
  }
  ctx.closePath();

  // Gold radial gradient fill
  const medalGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  medalGrad.addColorStop(0, "#fffbeb");
  medalGrad.addColorStop(0.3, "#fcd34d");
  medalGrad.addColorStop(0.8, "#fbbf24");
  medalGrad.addColorStop(1, "#d97706");
  ctx.fillStyle = medalGrad;
  ctx.fill();

  // Double stroke
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 1.5;
  ctx.stroke();


  // 3. Draw Blue Ring Band (Brand color!)
  ctx.beginPath();
  ctx.arc(cx, cy, r - 22, 0, Math.PI * 2);
  const ringGrad = ctx.createRadialGradient(cx, cy, r - 70, cx, cy, r - 22);
  ringGrad.addColorStop(0, "#1d4ed8"); // Light blue
  ringGrad.addColorStop(1, "#1e3a8a"); // Navy blue
  ctx.fillStyle = ringGrad;
  ctx.fill();

  ctx.strokeStyle = "#fbbf24"; // Gold stroke around the blue ring
  ctx.lineWidth = 4;
  ctx.stroke();


  // 4. Circular Text on the Blue Ring: "✦ VISION IT COMPUTER INSTITUTE ✦"
  // Draw text only along the top arc (left → top → right) so it stays readable
  const circleText = "✦ VISION IT COMPUTER INSTITUTE ✦";
  const textRadius = r - 44;
  ctx.font = `bold ${Math.round(r * 0.10)}px 'Poppins', sans-serif`;
  ctx.fillStyle = "#ffffff"; // White text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const arcStart = -Math.PI;       // -180° = left side
  const arcSpan  =  Math.PI;       //  180° span → ends at 0° = right side (goes through top)
  for (let i = 0; i < circleText.length; i++) {
    const angle = arcStart + (i / (circleText.length - 1)) * arcSpan;
    ctx.save();
    ctx.translate(cx + textRadius * Math.cos(angle), cy + textRadius * Math.sin(angle));
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(circleText[i], 0, 0);
    ctx.restore();
  }


  // 5. Draw Inner Center Circle (White background for text)
  ctx.beginPath();
  ctx.arc(cx, cy, r - 66, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.stroke();


  // 6. Draw Center Text ("VIT INSTITUTE")
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1e3a8a"; // Brand navy blue

  // 3 stars at the top
  ctx.font = "24px 'Poppins', sans-serif";
  ctx.fillText("★  ★  ★", cx, cy - r * 0.52);

  // "VIT" in center
  ctx.font = "bold 64px 'Poppins', sans-serif";
  ctx.fillText("VIT", cx, cy - 2);

  // "INSTITUTE" below
  ctx.font = "bold 24px 'Poppins', sans-serif";
  ctx.fillText("INSTITUTE", cx, cy + 34);

  // 2 stars at the bottom
  ctx.font = "20px 'Poppins', sans-serif";
  ctx.fillText("★  ★", cx, cy + 62);

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
  const [prefix, setPrefix] = useState<string>(() => {
    const nameUpper = (student?.name || "").toUpperCase().trim();
    if (
      nameUpper.startsWith("MR. ") ||
      nameUpper.startsWith("MR ") ||
      nameUpper.startsWith("MISS. ") ||
      nameUpper.startsWith("MISS ") ||
      nameUpper.startsWith("MS. ") ||
      nameUpper.startsWith("MS ")
    ) {
      return "";
    }
    const g = (student?.gender || "").toLowerCase().trim();
    if (g === "male") return "Mr. ";
    if (g === "female") return "Miss. ";
    return "";
  });

  const logoUrl = "/logo.png";
  const signatureUrl = "/idcard/signature.png";

  const CANVAS_W = 3508;
  const CANVAS_H = 2480;

  const drawCertificate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Load Google Fonts via FontFace API ───────────────
    const fontsToLoad = [
      { name: "Poppins", url: "https://fonts.gstatic.com/s/poppins/v21/pxiDypQkot1TnFhsFMOfGShVF9eO.woff2", weight: "400" },
      { name: "Poppins", url: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7Z1xlFd2JQEk.woff2", weight: "700" },
      { name: "Poppins", url: "https://fonts.gstatic.com/s/poppins/v21/pxiGyp8kv8JHgFVrLPTed3FBGPaTSQ.woff2", weight: "300" },
      { name: "Poppins", url: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLFj_Z1xlFd2JQEk.woff2", weight: "200" },
    ];
    await Promise.allSettled(
      fontsToLoad.map(async ({ name, url, weight }) => {
        const font = new FontFace(name, `url(${url})`, { weight });
        const loaded = await font.load();
        document.fonts.add(loaded);
      })
    );
    await document.fonts.ready;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const W = CANVAS_W;
    const H = CANVAS_H;
    const CONTENT_X = 940; // Shifted left to reduce empty spacing next to the sidebar

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
      const size = 130;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 10 / Math.abs(rx);
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.stroke();
      ctx.strokeStyle = "#bfdbfe";
      ctx.lineWidth = 5 / Math.abs(rx);
      ctx.beginPath();
      ctx.moveTo(30, size - 20);
      ctx.lineTo(30, 30);
      ctx.lineTo(size - 20, 30);
      ctx.stroke();
      ctx.restore();
    };

    drawCorner(IM, IM, 1, 1);
    drawCorner(W - IM, IM, -1, 1);
    drawCorner(IM, H - IM, 1, -1);
    drawCorner(W - IM, H - IM, -1, -1);

    // ── Left Sidebar: QR Code ──────
    const barX = IM + 150;
    const barWidth = 360;
    const barY = IM + 240;
    const barHeight = 1400;

    // Draw QR Code below the vertical bar
    const qrSize = 360; // Match barWidth
    const qrX = barX + (barWidth - qrSize) / 2;
    const qrY = barY + barHeight + 60;
    const verificationUrl = `https://visionitinstitute.com/verify?id=${certNo}`;
    // Force version 3 (ecc=L, margin=0) to guarantee a 29x29 module grid for perfect styling
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&ecc=L&margin=0&data=${encodeURIComponent(verificationUrl)}`;

    try {
      const qrImg = await loadImgSecurely(qrUrl);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.error("Failed to load QR code image:", e);
    }

    // ── Logo (left) + Institute Header (right) ───────────
    const bannerH = 340; // keep same value so layout below still aligns
    const logoSize = 250;
    const logoX = IM + 540; // Shifted left to match shifted content baseline
    const logoY = IM + 35;
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

    // Institute name (left-aligned)
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 88px 'Poppins', sans-serif";
    ctx.fillText("VISION IT COMPUTER INSTITUTE", CONTENT_X, IM + bannerH - 170);

    const nameWidth = ctx.measureText("VISION IT COMPUTER INSTITUTE").width;
    const headerCenterX = CONTENT_X + nameWidth / 2;

    ctx.textAlign = "center";
    ctx.font = "44px 'Poppins', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("Pratappur, Surajpur (C.G.) - 497223", headerCenterX, IM + bannerH - 100);

    // Restore text alignment to left for subsequent certificate details
    ctx.textAlign = "left";

    // ── Certificate Title Layout Baseline ────────────────
    const titleY = IM + bannerH + 300;

    // ── "CERTIFICATE OF COMPLETION" centered title ────────
    const certTitleX = W / 2;
    ctx.textAlign = "center";
    ctx.font = "bold 90px 'Poppins', sans-serif";

    // Measure text width for background
    const certTitleTextW = ctx.measureText("CERTIFICATE OF COMPLETION").width;
    const certTitlePadX = 60;
    const certTitlePadY = 30;
    const certTitleBgH = 90 + certTitlePadY * 2;
    const certTitleBgX = certTitleX - certTitleTextW / 2 - certTitlePadX;
    const certTitleBgY = titleY;
    const certTitleBgW = certTitleTextW + certTitlePadX * 2;

    // Draw sky blue background
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(certTitleBgX, certTitleBgY, certTitleBgW, certTitleBgH);

    // Draw white text vertically centered in background
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText("CERTIFICATE OF COMPLETION", certTitleX, certTitleBgY + certTitleBgH / 2);
    ctx.textBaseline = "alphabetic"; // reset


    ctx.textAlign = "center";


    // ── "This is to certify that" ────────────────────────
    const subtitleY = certTitleBgY + certTitleBgH + 120; // safely below background
    ctx.font = "250 62px 'Poppins', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("This is to certify that", W / 2, subtitleY);

    // ── Student Name ─────────────────────────────────────
    const nameY = subtitleY + 200;
    ctx.font = "bold 110px 'Poppins', sans-serif";
    ctx.fillStyle = "#0ea5e9"; // Sky blue

    const nameUpper = studentName.toUpperCase().trim();
    let namePrefix = prefix;
    if (
      nameUpper.startsWith("MR. ") ||
      nameUpper.startsWith("MR ") ||
      nameUpper.startsWith("MISS. ") ||
      nameUpper.startsWith("MISS ") ||
      nameUpper.startsWith("MS. ") ||
      nameUpper.startsWith("MS ")
    ) {
      namePrefix = "";
    }
    ctx.fillText(namePrefix + studentName.toUpperCase(), W / 2, nameY);



    // ── "has successfully completed the course" ──────────
    const completedY = nameY + 140;
    ctx.font = "250 58px 'Poppins', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("has successfully completed the course", W / 2, completedY);

    // ── Course Name (Plain Text without Border) ──────────
    const courseY = completedY + 175;
    const shortCourse = getShortCourse(courseName);
    const fullCourseDisplay = shortCourse !== courseName ? `${courseName}  (${shortCourse})` : courseName;
    ctx.font = "bold 90px 'Poppins', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(fullCourseDisplay, W / 2, courseY);

    // ── "from Vision IT Computer Institute..." ───────────
    const fromY = courseY + 120;
    ctx.font = "250 58px 'Poppins', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("from Vision IT Computer Institute with satisfactory performance.", W / 2, fromY);

    // ── Signatures (Instructor on Left, Director on Right) ─
    const sigBaseY = fromY + 200; // Positioned just below "from..." line
    const sigH = 150;
    const sigW = 440;
    const sigLineW = 600;

    const leftCenterX = CONTENT_X + 300;
    const rightCenterX = leftCenterX + 900; // Moved closer to Instructor

    // ── "Verified by" label above signatures ─────────────
    ctx.font = "65px 'Poppins', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.fillText("Verified by", CONTENT_X, sigBaseY - 20);

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

    ctx.font = "bold 50px 'Poppins', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText("Instructor", leftCenterX, sigBaseY + 220);

    // Right signature line & text
    ctx.beginPath();
    ctx.moveTo(rightCenterX - sigLineW / 2, sigBaseY + 165);
    ctx.lineTo(rightCenterX + sigLineW / 2, sigBaseY + 165);
    ctx.stroke();

    ctx.font = "bold 50px 'Poppins', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText("Director", rightCenterX, sigBaseY + 220);


    // ── Cert No. & Issue Date (at the very bottom, no divider line) ──
    const metaY = H - IM - 90; // 2300px (very bottom of certificate margin)
    ctx.fillStyle = "#000000";
    ctx.font = "48px 'Poppins', sans-serif";

    // Left: Certificate No label + monospace value
    ctx.textAlign = "left";
    ctx.fillText("Certificate No: ", CONTENT_X, metaY);
    const labelW1 = ctx.measureText("Certificate No: ").width;
    ctx.font = "bold 48px 'Poppins', sans-serif";
    ctx.fillText(certNo, CONTENT_X + labelW1, metaY);

    // Right: Date of Issue (fully right-aligned at right edge)
    ctx.textAlign = "right";
    ctx.font = "48px 'Poppins', sans-serif";
    ctx.fillText(`Date of Issue: ${issueDate}`, W - IM - 120, metaY);

    // Draw the gold scalloped medal badge with ribbons in the top right corner
    drawGoldBadge(ctx, W - IM - 380, IM + 250, 140);
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
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Prefix (Mr. / Miss.)</label>
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="Mr. ">Mr.</option>
                <option value="Miss. ">Miss.</option>
                <option value="">None</option>
              </select>
            </div>
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

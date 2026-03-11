import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;
type Workout = Tables<"workouts"> & { workout_exercises: Tables<"workout_exercises">[] };

interface ClientPdfData {
  name: string;
  roles: string[];
  registrationDate: string;
  entries: ProgressEntry[];
  workouts: Workout[];
}

/** Load image, crop to 1:1 square (center crop), return as base64 JPEG */
async function loadImageAsSquareBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const size = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - size) / 2;
    const sy = (bitmap.height - size) / 2;

    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size);

    const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(outBlob);
    });
  } catch {
    return null;
  }
}

function drawSimpleChart(
  doc: jsPDF,
  data: { label: string; value: number }[],
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number]
): number {
  if (data.length < 2) return y;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(title, x, y);
  y += 5;

  const chartX = x + 5;
  const chartW = width - 10;
  const chartH = height - 20;
  const chartY = y;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(chartX, chartY, chartW, chartH);

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  for (let i = 0; i <= 4; i++) {
    const val = yMin + ((yMax - yMin) * i) / 4;
    const py = chartY + chartH - (chartH * i) / 4;
    doc.text(val.toFixed(1), chartX - 1, py + 1, { align: "right" });
    if (i > 0 && i < 4) {
      doc.setDrawColor(230, 230, 230);
      doc.line(chartX, py, chartX + chartW, py);
    }
  }

  const step = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i += step) {
    const px = chartX + (chartW * i) / (data.length - 1);
    doc.text(data[i].label, px, chartY + chartH + 4, { align: "center" });
  }

  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.8);
  const points: [number, number][] = data.map((d, i) => [
    chartX + (chartW * i) / (data.length - 1),
    chartY + chartH - ((d.value - yMin) / (yMax - yMin)) * chartH,
  ]);

  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }

  doc.setFillColor(color[0], color[1], color[2]);
  for (const [px, py] of points) {
    doc.circle(px, py, 1.2, "F");
  }

  return chartY + chartH + 12;
}

export async function exportClientPdf(client: ClientPdfData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("FloerFit \u2014 \u0417\u0432\u0456\u0442 \u043a\u043b\u0456\u0454\u043d\u0442\u0430", margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(client.name, margin, y);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`\u0420\u043e\u043b\u0456: ${client.roles.join(", ")}  |  \u0414\u0430\u0442\u0430 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457: ${client.registrationDate}`, margin, y + 5);
  doc.text(`\u0421\u0442\u0432\u043e\u0440\u0435\u043d\u043e: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, margin, y + 10);
  y += 18;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ─── Progress Table ───
  if (client.entries.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Записи прогресу", margin, y);
    y += 4;

    const sortedEntries = [...client.entries].sort(
      (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [55, 65, 81], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      head: [["Дата", "Вага (кг)", "% жиру", "Талія (см)", "Груди (см)", "Стегна (см)", "Руки (см)", "Сідниці (см)", "Обхват стегна (см)"]],
      body: sortedEntries.map((e) => [
        format(new Date(e.entry_date), "dd.MM.yy"),
        e.weight ?? "—",
        e.body_fat ?? "—",
        e.waist ?? "—",
        e.chest ?? "—",
        e.hips ?? "—",
        e.arm_circumference ?? "—",
        e.glute_circumference ?? "—",
        e.thigh_circumference ?? "—",
      ]),
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ─── Charts ───
    const weightData = sortedEntries
      .filter((e) => e.weight != null)
      .map((e) => ({ label: format(new Date(e.entry_date), "dd.MM"), value: Number(e.weight) }));

    const waistData = sortedEntries
      .filter((e) => e.waist != null)
      .map((e) => ({ label: format(new Date(e.entry_date), "dd.MM"), value: Number(e.waist) }));

    const bodyFatData = sortedEntries
      .filter((e) => e.body_fat != null)
      .map((e) => ({ label: format(new Date(e.entry_date), "dd.MM"), value: Number(e.body_fat) }));

    const chartWidth = pageWidth - margin * 2;

    if (y + 55 > 280) { doc.addPage(); y = 20; }
    if (weightData.length >= 2) {
      y = drawSimpleChart(doc, weightData, "Динаміка ваги (кг)", margin, y, chartWidth, 50, [59, 130, 246]);
    }
    if (y + 55 > 280) { doc.addPage(); y = 20; }
    if (waistData.length >= 2) {
      y = drawSimpleChart(doc, waistData, "Динаміка талії (см)", margin, y, chartWidth, 50, [234, 88, 12]);
    }
    if (y + 55 > 280) { doc.addPage(); y = 20; }
    if (bodyFatData.length >= 2) {
      y = drawSimpleChart(doc, bodyFatData, "Динаміка відсотка жиру (%)", margin, y, chartWidth, 50, [22, 163, 74]);
    }
  }

  // ─── Workouts Table ───
  if (client.workouts.length > 0) {
    if (y + 30 > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Історія тренувань", margin, y);
    y += 4;

    const workoutRows = client.workouts.flatMap((w) =>
      w.workout_exercises.map((ex) => {
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        const setsStr = (sets as any[])
          .map((s: any, i: number) => `${i + 1}: ${s.weight ?? 0}кг×${s.reps ?? 0}`)
          .join(", ");
        return [
          format(new Date(w.started_at), "dd.MM.yy HH:mm"),
          ex.exercise_name,
          ex.muscle_group,
          setsStr || "—",
        ];
      })
    );

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [55, 65, 81], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      head: [["Дата", "Вправа", "Група м\u2019язів", "Підходи"]],
      body: workoutRows,
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Photos (2 per row grid, 1:1 square, date under each photo) ───
  const entriesWithPhotos = [...client.entries]
    .filter((e) => e.photo_urls && e.photo_urls.length > 0)
    .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());

  if (entriesWithPhotos.length > 0) {
    if (y + 20 > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Фото прогресу", margin, y);
    y += 8;

    const cols = 2;
    const gap = 6;
    const availableW = pageWidth - margin * 2;
    const imgSize = (availableW - gap * (cols - 1)) / cols;
    const cellHeight = imgSize + 8; // photo + date label

    // Flatten all photos with their dates
    const allPhotos: { url: string; date: string }[] = [];
    for (const entry of entriesWithPhotos) {
      const dateStr = format(new Date(entry.entry_date), "dd.MM.yyyy");
      for (const url of entry.photo_urls!) {
        allPhotos.push({ url, date: dateStr });
      }
    }

    for (let i = 0; i < allPhotos.length; i++) {
      const col = i % cols;
      if (col === 0 && i > 0) { y += cellHeight; }
      if (col === 0 && y + cellHeight > 280) { doc.addPage(); y = 20; }

      const imgX = margin + col * (imgSize + gap);
      const base64 = await loadImageAsSquareBase64(allPhotos[i].url);
      if (base64) {
        try {
          doc.addImage(base64, "JPEG", imgX, y, imgSize, imgSize);
          // Date label centered under the photo
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(allPhotos[i].date, imgX + imgSize / 2, y + imgSize + 4, { align: "center" });
        } catch {
          // skip corrupt images
        }
      }
    }
    y += cellHeight + 4;
  }

  const safeName = (client.name || "user").replace(/\s+/g, "_").toLowerCase();
  doc.save(`floerfit_${safeName}_${format(new Date(), "yyyy_MM_dd")}.pdf`);
}

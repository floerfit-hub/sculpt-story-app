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

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
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

  // Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(chartX, chartY, chartW, chartH);

  // Grid lines
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  // Y-axis labels
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

  // X-axis labels
  const step = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i += step) {
    const px = chartX + (chartW * i) / (data.length - 1);
    doc.text(data[i].label, px, chartY + chartH + 4, { align: "center" });
  }

  // Draw line
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.8);
  const points: [number, number][] = data.map((d, i) => [
    chartX + (chartW * i) / (data.length - 1),
    chartY + chartH - ((d.value - yMin) / (yMax - yMin)) * chartH,
  ]);

  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }

  // Dots
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
  doc.text("FloerFit — Client Report", margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(client.name, margin, y);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Roles: ${client.roles.join(", ")}  |  Registered: ${client.registrationDate}`, margin, y + 5);
  doc.text(`Generated: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, margin, y + 10);
  y += 18;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ─── Progress Table ───
  if (client.entries.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Progress Entries", margin, y);
    y += 4;

    const sortedEntries = [...client.entries].sort(
      (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [55, 65, 81], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      head: [["Date", "Weight", "Body Fat %", "Waist", "Chest", "Hips", "Arm", "Glute", "Thigh"]],
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
      y = drawSimpleChart(doc, weightData, "Weight Progression (kg)", margin, y, chartWidth, 50, [59, 130, 246]);
    }
    if (y + 55 > 280) { doc.addPage(); y = 20; }
    if (waistData.length >= 2) {
      y = drawSimpleChart(doc, waistData, "Waist Progression (cm)", margin, y, chartWidth, 50, [234, 88, 12]);
    }
    if (y + 55 > 280) { doc.addPage(); y = 20; }
    if (bodyFatData.length >= 2) {
      y = drawSimpleChart(doc, bodyFatData, "Body Fat Progression (%)", margin, y, chartWidth, 50, [22, 163, 74]);
    }
  }

  // ─── Workouts Table ───
  if (client.workouts.length > 0) {
    if (y + 30 > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Workout History", margin, y);
    y += 4;

    const workoutRows = client.workouts.flatMap((w) =>
      w.workout_exercises.map((ex) => {
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        const setsStr = (sets as any[])
          .map((s: any, i: number) => `${i + 1}: ${s.weight ?? 0}kg×${s.reps ?? 0}`)
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
      head: [["Date", "Exercise", "Muscle Group", "Sets"]],
      body: workoutRows,
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Photos ───
  const entriesWithPhotos = client.entries.filter(
    (e) => e.photo_urls && e.photo_urls.length > 0
  );

  if (entriesWithPhotos.length > 0) {
    if (y + 20 > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Progress Photos", margin, y);
    y += 6;

    for (const entry of entriesWithPhotos) {
      if (y + 10 > 280) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(format(new Date(entry.entry_date), "dd.MM.yyyy"), margin, y);
      y += 4;

      const urls = entry.photo_urls!;
      const imgSize = Math.min(55, (pageWidth - margin * 2 - (urls.length - 1) * 3) / Math.min(urls.length, 3));

      for (let i = 0; i < urls.length; i++) {
        const col = i % 3;
        if (i > 0 && col === 0) { y += imgSize + 4; }
        if (y + imgSize > 280) { doc.addPage(); y = 20; }

        const base64 = await loadImageAsBase64(urls[i]);
        if (base64) {
          try {
            doc.addImage(base64, "JPEG", margin + col * (imgSize + 3), y, imgSize, imgSize);
          } catch {
            // skip corrupt images
          }
        }
      }
      y += imgSize + 6;
    }
  }

  const safeName = (client.name || "user").replace(/\s+/g, "_").toLowerCase();
  doc.save(`floerfit_${safeName}_${format(new Date(), "yyyy_MM_dd")}.pdf`);
}

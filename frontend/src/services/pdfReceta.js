import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export async function generarPDFReceta(receta) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margen = 18;

  // ── Paleta ────────────────────────────────────────────────
  const AZUL    = [30, 107, 138];
  const VERDE   = [45, 106, 79];
  const GRIS    = [100, 100, 100];
  const GRIS_L  = [240, 242, 245];
  const BLANCO  = [255, 255, 255];

  // ── QR ───────────────────────────────────────────────────
  const qrData = await QRCode.toDataURL(
    `CLINICAOS:${receta.codigo}`,
    { width: 200, margin: 1, color: { dark: '#0d1b2a', light: '#ffffff' } }
  );

  // ══════════════════════════════════════════════════════════
  // CABECERA
  // ══════════════════════════════════════════════════════════
  // Banda superior
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, 28, 'F');

  // Logo / ícono
  doc.setFillColor(...VERDE);
  doc.roundedRect(margen, 6, 16, 16, 3, 3, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFontSize(14);
  doc.text('⚕', margen + 8, 17, { align: 'center' });

  // Nombre clínica
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ClinicaOS', margen + 20, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestión Clínica', margen + 20, 20);

  // Etiqueta RECETA MÉDICA
  doc.setFillColor(...VERDE);
  doc.roundedRect(W - margen - 42, 8, 42, 12, 2, 2, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RECETA MÉDICA', W - margen - 21, 16, { align: 'center' });

  // ── Código + QR ──────────────────────────────────────────
  let y = 35;
  doc.setFillColor(...GRIS_L);
  doc.roundedRect(margen, y, W - margen * 2, 22, 3, 3, 'F');

  doc.setTextColor(...AZUL);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CÓDIGO DE RECETA', margen + 4, y + 6);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 27, 42);
  doc.text(receta.codigo, margen + 4, y + 16);

  // QR a la derecha
  doc.addImage(qrData, 'PNG', W - margen - 22, y + 1, 20, 20);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  const fecha = new Date(receta.fecha).toLocaleString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  doc.text(`Emitida: ${fecha}`, margen + 4, y + 20);

  // ══════════════════════════════════════════════════════════
  // DATOS PACIENTE Y MÉDICO
  // ══════════════════════════════════════════════════════════
  y += 28;

  const colW = (W - margen * 2 - 6) / 2;

  // Paciente
  doc.setFillColor(...AZUL);
  doc.rect(margen, y, colW, 6, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL PACIENTE', margen + 3, y + 4.2);

  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(margen, y, colW, 28, 'F');
  doc.setStrokeColor(220, 226, 234);
  doc.rect(margen, y, colW, 28);

  doc.setTextColor(13, 27, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`${receta.pac_nombre} ${receta.pac_apellido}`, margen + 3, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Documento: ${receta.documento}`, margen + 3, y + 13);
  if (receta.eps)       doc.text(`EPS: ${receta.eps}`, margen + 3, y + 19);
  if (receta.fecha_nac) {
    const edad = Math.floor((Date.now() - new Date(receta.fecha_nac)) / (365.25 * 24 * 3600 * 1000));
    doc.text(`Edad: ${edad} años`, margen + 3, y + 25);
  }

  // Médico
  const x2 = margen + colW + 6;
  y -= 6;
  doc.setFillColor(...VERDE);
  doc.rect(x2, y, colW, 6, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MÉDICO TRATANTE', x2 + 3, y + 4.2);

  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(x2, y, colW, 28, 'F');
  doc.setStrokeColor(220, 226, 234);
  doc.rect(x2, y, colW, 28);

  doc.setTextColor(13, 27, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(receta.medico_nombre || '—', x2 + 3, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text('Médico General', x2 + 3, y + 13);

  // ══════════════════════════════════════════════════════════
  // TABLA DE MEDICAMENTOS
  // ══════════════════════════════════════════════════════════
  y += 34;

  doc.setFillColor(...AZUL);
  doc.rect(margen, y, W - margen * 2, 7, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('MEDICAMENTOS PRESCRITOS', margen + 3, y + 5);

  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen },
    head: [['Medicamento', 'Dosis', 'Frecuencia', 'Duración', 'Cant.']],
    body: (receta.items || []).map(it => [
      it.nombre_medicamento,
      it.dosis        || '—',
      it.frecuencia   || '—',
      it.duracion     || '—',
      String(it.cantidad || 1),
    ]),
    headStyles: {
      fillColor: AZUL,
      textColor: BLANCO,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [13, 27, 42] },
    alternateRowStyles: { fillColor: GRIS_L },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      4: { cellWidth: 15, halign: 'center' },
    },
    tableLineColor: [220, 226, 234],
    tableLineWidth: 0.2,
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Indicaciones ─────────────────────────────────────────
  if (receta.indicaciones) {
    doc.setFillColor(255, 251, 235);
    doc.setStrokeColor(251, 191, 36);
    doc.roundedRect(margen, y, W - margen * 2, 16, 2, 2, 'FD');
    doc.setTextColor(146, 100, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Indicaciones:', margen + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 80, 0);
    const lines = doc.splitTextToSize(receta.indicaciones, W - margen * 2 - 30);
    doc.text(lines[0] || '', margen + 28, y + 5.5);
    if (lines[1]) doc.text(lines[1], margen + 3, y + 11);
    y += 20;
  }

  // ══════════════════════════════════════════════════════════
  // PIE DE PÁGINA
  // ══════════════════════════════════════════════════════════
  const pageH = 297;
  const footY = pageH - 22;

  doc.setFillColor(...AZUL);
  doc.rect(0, footY, W, 22, 'F');

  doc.setTextColor(...BLANCO);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Este documento es una receta electrónica generada por ClinicaOS.', W / 2, footY + 6, { align: 'center' });
  doc.text('Válida únicamente con el código QR y el código único impreso.', W / 2, footY + 11, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Código: ${receta.codigo}`, margen, footY + 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('ClinicaOS © 2025', W - margen, footY + 17, { align: 'right' });

  // ── Descargar ─────────────────────────────────────────────
  doc.save(`Receta_${receta.codigo}.pdf`);
}

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export async function generarPDFReceta(receta) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margen = 18;

  const AZUL   = [30, 107, 138];
  const VERDE  = [45, 106, 79];
  const GRIS   = [100, 100, 100];
  const GRIS_L = [240, 242, 245];
  const BLANCO = [255, 255, 255];

  // QR — URL pública que abre el PDF al escanear (sin necesidad de login)
  const baseUrl = import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_MS_HISTORIAS || 'http://localhost:4001';
  const qrUrl = `${baseUrl}/api/recetas/${receta.id}/pdf-publico`;

  const qrData = await QRCode.toDataURL(
    qrUrl,
    { width: 300, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0d1b2a', light: '#ffffff' } }
  );

  // ── CABECERA ──────────────────────────────────────────────
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, 28, 'F');

  doc.setFillColor(...VERDE);
  doc.roundedRect(margen, 6, 16, 16, 3, 3, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFontSize(14);
  doc.text('⚕', margen + 8, 17, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ClinicaOS', margen + 20, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestion Clinica', margen + 20, 20);

  doc.setFillColor(...VERDE);
  doc.roundedRect(W - margen - 42, 8, 42, 12, 2, 2, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RECETA MEDICA', W - margen - 21, 16, { align: 'center' });

  // ── CÓDIGO + QR ───────────────────────────────────────────
  let y = 35;
  doc.setFillColor(...GRIS_L);
  doc.roundedRect(margen, y, W - margen * 2, 22, 3, 3, 'F');

  doc.setTextColor(...AZUL);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CODIGO DE RECETA', margen + 4, y + 6);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 27, 42);
  doc.text(receta.codigo, margen + 4, y + 16);

  doc.addImage(qrData, 'PNG', W - margen - 22, y + 1, 20, 20);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  const fecha = new Date(receta.fecha).toLocaleString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  doc.text(`Emitida: ${fecha}`, margen + 4, y + 20);

  // ── PACIENTE Y MÉDICO ─────────────────────────────────────
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
  doc.setDrawColor(220, 226, 234);
  doc.rect(margen, y, colW, 28);

  doc.setTextColor(13, 27, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const nomPac = `${receta.pac_nombre || ''} ${receta.pac_apellido || ''}`.trim();
  doc.text(nomPac, margen + 3, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Documento: ${receta.documento || '—'}`, margen + 3, y + 13);
  if (receta.eps)       doc.text(`EPS: ${receta.eps}`, margen + 3, y + 19);
  if (receta.fecha_nac) {
    const edad = Math.floor((Date.now() - new Date(receta.fecha_nac)) / (365.25 * 24 * 3600 * 1000));
    doc.text(`Edad: ${edad} anos`, margen + 3, y + 25);
  }

  // Médico
  const x2 = margen + colW + 6;
  y -= 6;
  doc.setFillColor(...VERDE);
  doc.rect(x2, y, colW, 6, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MEDICO TRATANTE', x2 + 3, y + 4.2);

  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(x2, y, colW, 28, 'F');
  doc.setDrawColor(220, 226, 234);
  doc.rect(x2, y, colW, 28);

  doc.setTextColor(13, 27, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(receta.medico_nombre || '—', x2 + 3, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text('Medico General', x2 + 3, y + 13);

  // ── MEDICAMENTOS ──────────────────────────────────────────
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
    head: [['Medicamento', 'Dosis', 'Frecuencia', 'Duracion', 'Cant.']],
    body: (receta.items || []).map(it => [
      it.nombre_medicamento,
      it.dosis      || '—',
      it.frecuencia || '—',
      it.duracion   || '—',
      String(it.cantidad || 1),
    ]),
    headStyles:  { fillColor: AZUL, textColor: BLANCO, fontStyle: 'bold', fontSize: 8 },
    bodyStyles:  { fontSize: 8, textColor: [13, 27, 42] },
    alternateRowStyles: { fillColor: GRIS_L },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 4: { cellWidth: 15, halign: 'center' } },
    tableLineColor: [220, 226, 234],
    tableLineWidth: 0.2,
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── INDICACIONES ──────────────────────────────────────────
  if (receta.indicaciones) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(margen, y, W - margen * 2, 16, 2, 2, 'FD');
    doc.setTextColor(146, 100, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Indicaciones:', margen + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 80, 0);
    const lines = doc.splitTextToSize(receta.indicaciones, W - margen * 2 - 32);
    doc.text(lines[0] || '', margen + 30, y + 5.5);
    if (lines[1]) doc.text(lines[1], margen + 3, y + 11);
    y += 20;
  }

  // ── PIE DE PÁGINA ─────────────────────────────────────────
  const footY = 297 - 22;
  doc.setFillColor(...AZUL);
  doc.rect(0, footY, W, 22, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento electronico generado por ClinicaOS. Valido con codigo QR.', W / 2, footY + 7, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Codigo: ${receta.codigo}`, margen, footY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('ClinicaOS 2025', W - margen, footY + 16, { align: 'right' });

  doc.save(`Receta_${receta.codigo}.pdf`);
}

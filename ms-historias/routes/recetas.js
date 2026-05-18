const router  = require('express').Router();
const pool    = require('../config/db');
const PDFDoc  = require('pdfkit');
const QRCode  = require('qrcode');
const { verifyToken, requirePerfil } = require('../middleware/auth');
const { decrypt } = require('../utils/crypto');

// GET /api/recetas/:id/verificar  — PÚBLICO, debe ir ANTES del middleware de auth
router.get('/:id/verificar', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.estado, r.fecha,
              p.nombre AS pac_nombre, p.apellido AS pac_apellido, p.documento,
              u.nombre AS medico_nombre
       FROM recetas r
       JOIN pacientes p ON p.id = r.paciente_id
       LEFT JOIN usuarios u ON u.id = r.medico_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).send('<h2>Receta no encontrada</h2>');

    const [items] = await pool.execute(
      'SELECT nombre_medicamento, dosis, frecuencia, duracion, cantidad FROM receta_items WHERE receta_id = ?',
      [req.params.id]
    );
    const r = rows[0];
    const codigo = `RX-${String(r.id).padStart(6, '0')}`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verificar Receta ${codigo}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:520px;margin:2rem auto;padding:1rem;background:#f4f7fb}
  .card{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  h1{color:#1e3a5f;font-size:1.2rem;margin:0 0 1rem}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:.8rem;font-weight:600}
  .pendiente{background:#fef3c7;color:#92400e}
  .despachada{background:#d1fae5;color:#065f46}
  .cancelada{background:#fee2e2;color:#991b1b}
  table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.85rem}
  th{background:#1e3a5f;color:#fff;padding:6px 8px;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #eee}
  .label{color:#6b7280;font-size:.8rem}
  .value{font-weight:600;color:#111}
</style></head>
<body><div class="card">
  <h1>⚕ ClinicaOS — Verificación de Receta</h1>
  <p><span class="label">Código:</span> <span class="value">${codigo}</span>
     &nbsp;<span class="badge ${r.estado}">${r.estado.toUpperCase()}</span></p>
  <p><span class="label">Fecha:</span> <span class="value">${new Date(r.fecha).toLocaleString('es-CO')}</span></p>
  <p><span class="label">Médico:</span> <span class="value">${r.medico_nombre}</span></p>
  <p><span class="label">Paciente:</span> <span class="value">${r.pac_nombre} ${r.pac_apellido} — ${r.documento}</span></p>
  <table>
    <tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr>
    ${items.map(i => `<tr>
      <td>${i.nombre_medicamento}</td>
      <td>${i.dosis || '-'}</td>
      <td>${i.frecuencia || '-'}</td>
      <td>${i.duracion || '-'}</td>
    </tr>`).join('')}
  </table>
</div></body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(`<h2>Error: ${err.message}</h2>`);
  }
});

// GET /api/recetas/:id/pdf-publico — PDF público para escaneo QR (sin token)
router.get('/:id/pdf-publico', (req, res) => generarPDF(req, res));

router.use(verifyToken);

// GET /api/recetas?historia_id=X
router.get('/', async (req, res) => {
  try {
    const { historia_id, estado } = req.query;
    const conditions = [];
    const params = [];
    if (historia_id) { conditions.push('r.historia_id = ?'); params.push(historia_id); }
    if (estado)      { conditions.push('r.estado = ?');      params.push(estado); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await pool.execute(
      `SELECT r.*, p.nombre AS pac_nombre, p.apellido AS pac_apellido,
              p.documento, u.nombre AS medico_nombre
       FROM recetas r
       JOIN pacientes p ON p.id = r.paciente_id
       LEFT JOIN usuarios u ON u.id = r.medico_id
       ${where}
       ORDER BY r.fecha DESC`,
      params
    );

    if (!rows.length) return res.json([]);

    // Traer todos los items de esas recetas en una sola query
    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const [itemRows] = await pool.execute(
      `SELECT receta_id, id, nombre_medicamento, dosis, frecuencia, duracion, cantidad
       FROM receta_items WHERE receta_id IN (${placeholders})`,
      ids
    );

    // Agrupar items por receta_id
    const itemsByReceta = {};
    for (const it of itemRows) {
      if (!itemsByReceta[it.receta_id]) itemsByReceta[it.receta_id] = [];
      itemsByReceta[it.receta_id].push(it);
    }

    res.json(rows.map(r => ({ ...r, items: itemsByReceta[r.id] || [] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/recetas/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, p.nombre AS pac_nombre, p.apellido AS pac_apellido,
              p.documento, p.fecha_nac, p.eps,
              u.nombre AS medico_nombre, u.email AS medico_email
       FROM recetas r
       JOIN pacientes p ON p.id = r.paciente_id
       LEFT JOIN usuarios u ON u.id = r.medico_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Receta no encontrada' });

    const [medicamentos] = await pool.execute(
      'SELECT * FROM receta_items WHERE receta_id = ?', [req.params.id]
    );
    res.json({ ...rows[0], medicamentos, items: medicamentos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/recetas  (solo médico)
router.post('/', requirePerfil('medico'), async (req, res) => {
  const { historia_id, paciente_id, indicaciones, items = [] } = req.body;
  if (!historia_id || !paciente_id)
    return res.status(400).json({ error: 'historia_id y paciente_id requeridos' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.execute(
      `INSERT INTO recetas (historia_id, paciente_id, medico_id, indicaciones)
       VALUES (?,?,?,?)`,
      [historia_id, paciente_id, req.user.id, indicaciones || null]
    );
    const recetaId = r.insertId;
    const codigo = `RX-${String(recetaId).padStart(6, '0')}`;
    await conn.execute('UPDATE recetas SET codigo = ? WHERE id = ?', [codigo, recetaId]);

    for (const item of items) {
      await conn.execute(
        `INSERT INTO receta_items
          (receta_id, medicamento_id, nombre_medicamento, dosis, frecuencia, duracion, cantidad)
         VALUES (?,?,?,?,?,?,?)`,
        [recetaId, item.medicamento_id || null, item.nombre_medicamento,
         item.dosis || null, item.frecuencia || null, item.duracion || null, item.cantidad || 1]
      );
    }

    await conn.commit();
    res.status(201).json({ id: recetaId, codigo, message: 'Receta creada' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PATCH /api/recetas/:id/estado  (farmacéutico)
router.patch('/:id/estado', requirePerfil('farmaceutico', 'administrador'), async (req, res) => {
  const { estado } = req.body;
  if (!['pendiente', 'despachada', 'cancelada'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido' });
  try {
    const dispensada_en = estado === 'despachada' ? new Date() : null;
    await pool.execute(
      'UPDATE recetas SET estado = ?, dispensada_en = COALESCE(?, dispensada_en) WHERE id = ?',
      [estado, dispensada_en, req.params.id]
    );
    res.json({ message: 'Estado actualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Función compartida de generación de PDF (usada por ruta pública y autenticada)
async function generarPDF(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, r.id AS codigo_receta,
              p.nombre AS pac_nombre, p.apellido AS pac_apellido,
              p.documento, p.tipo_documento, p.fecha_nac, p.eps, p.grupo_sanguineo,
              u.nombre AS medico_nombre, u.email AS medico_email
       FROM recetas r
       JOIN pacientes p ON p.id = r.paciente_id
       LEFT JOIN usuarios u ON u.id = r.medico_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Receta no encontrada' });

    const receta = rows[0];
    const [items] = await pool.execute(
      'SELECT * FROM receta_items WHERE receta_id = ?', [req.params.id]
    );

    // Código único legible
    const codigoUnico = `RX-${String(receta.codigo_receta).padStart(6, '0')}`;
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:4001';
    const qrData  = `${baseUrl}/api/recetas/${receta.codigo_receta}/pdf-publico`;
    const qrBuffer = await QRCode.toBuffer(qrData, { width: 120, margin: 1 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receta_${codigoUnico}.pdf"`);

    const doc = new PDFDoc({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const AZUL  = '#1e3a5f';
    const GRIS  = '#555555';
    const LINEA = '#dddddd';

    // ── Encabezado ───────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill(AZUL);
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold').fontSize(22)
       .text('ClinicaOS', 50, 22);
    doc.font('Helvetica').fontSize(10)
       .text('Sistema de Gestión Clínica', 50, 48)
       .text('Receta Médica Electrónica', 50, 62);

    // QR en esquina superior derecha
    doc.image(qrBuffer, doc.page.width - 130, 10, { width: 80, height: 80 });

    doc.moveDown(4).fillColor(AZUL);

    // ── Código único ────────────────────────────────────────
    doc.roundedRect(50, 105, doc.page.width - 100, 28, 4).fill('#e8f0fe');
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(11)
       .text(`Código de receta: ${codigoUnico}`, 60, 113)
       .text(`Estado: ${receta.estado.toUpperCase()}`, 350, 113);

    // ── Médico ───────────────────────────────────────────────
    doc.moveTo(50, 145).lineTo(doc.page.width - 50, 145).strokeColor(LINEA).stroke();
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(11).text('DATOS DEL MÉDICO', 50, 152);
    doc.fillColor(GRIS).font('Helvetica').fontSize(10)
       .text(`Nombre: ${receta.medico_nombre}`, 50, 168)
       .text(`Email:  ${receta.medico_email || 'N/A'}`, 50, 182)
       .text(`Fecha de emisión: ${new Date(receta.fecha).toLocaleString('es-CO')}`, 320, 168);

    // ── Paciente ─────────────────────────────────────────────
    doc.moveTo(50, 204).lineTo(doc.page.width - 50, 204).strokeColor(LINEA).stroke();
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(11).text('DATOS DEL PACIENTE', 50, 211);
    doc.fillColor(GRIS).font('Helvetica').fontSize(10)
       .text(`Nombre:    ${receta.pac_nombre} ${receta.pac_apellido}`, 50, 227)
       .text(`Documento: ${receta.tipo_documento || 'CC'} ${receta.documento}`, 50, 241)
       .text(`EPS:       ${receta.eps || 'N/A'}`, 50, 255)
       .text(`Grupo sanguíneo: ${receta.grupo_sanguineo || 'N/A'}`, 320, 227)
       .text(`Fecha nac.: ${receta.fecha_nac ? new Date(receta.fecha_nac).toLocaleDateString('es-CO') : 'N/A'}`, 320, 241);

    // ── Medicamentos ─────────────────────────────────────────
    doc.moveTo(50, 277).lineTo(doc.page.width - 50, 277).strokeColor(LINEA).stroke();
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(11).text('MEDICAMENTOS PRESCRITOS', 50, 284);

    // Cabecera tabla
    const colX = [50, 200, 295, 370, 445];
    doc.rect(50, 300, doc.page.width - 100, 18).fill('#e8f0fe');
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(9);
    ['Medicamento', 'Dosis', 'Frecuencia', 'Duración', 'Cant.'].forEach((h, i) =>
      doc.text(h, colX[i] + 3, 305)
    );

    let y = 320;
    if (items.length === 0) {
      doc.fillColor(GRIS).font('Helvetica').fontSize(10)
         .text('Sin medicamentos registrados.', 50, y);
      y += 16;
    }
    items.forEach((item, idx) => {
      if (idx % 2 === 0) doc.rect(50, y - 2, doc.page.width - 100, 16).fill('#f9f9f9');
      doc.fillColor('#222222').font('Helvetica').fontSize(9);
      doc.text(item.nombre_medicamento || '', colX[0] + 3, y, { width: 145 });
      doc.text(item.dosis        || '-', colX[1] + 3, y, { width: 90 });
      doc.text(item.frecuencia   || '-', colX[2] + 3, y, { width: 70 });
      doc.text(item.duracion     || '-', colX[3] + 3, y, { width: 70 });
      doc.text(String(item.cantidad || 1), colX[4] + 3, y, { width: 40 });
      y += 16;
    });

    // ── Indicaciones ─────────────────────────────────────────
    if (receta.indicaciones) {
      y += 10;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(LINEA).stroke();
      y += 8;
      doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(10).text('INDICACIONES', 50, y);
      y += 14;
      doc.fillColor(GRIS).font('Helvetica').fontSize(10)
         .text(receta.indicaciones, 50, y, { width: doc.page.width - 100 });
    }

    // ── Pie de página ────────────────────────────────────────
    const bottomY = doc.page.height - 70;
    doc.moveTo(50, bottomY).lineTo(doc.page.width - 50, bottomY).strokeColor(LINEA).stroke();
    doc.fillColor(GRIS).font('Helvetica').fontSize(8)
       .text(
         'Este documento es una receta médica electrónica generada por ClinicaOS. ' +
         'Verifique su autenticidad escaneando el código QR.',
         50, bottomY + 8, { align: 'center', width: doc.page.width - 100 }
       )
       .text(`Código: ${codigoUnico}  |  Generado: ${new Date().toLocaleString('es-CO')}`,
         50, bottomY + 24, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// GET /api/recetas/:id/pdf  — requiere token (RNF-03)
router.get('/:id/pdf', (req, res) => generarPDF(req, res));

module.exports = router;

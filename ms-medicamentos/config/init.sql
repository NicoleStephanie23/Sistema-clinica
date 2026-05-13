-- ============================================================
--  Microservicio: Medicamentos
-- ============================================================

CREATE DATABASE IF NOT EXISTS medicamentos;
USE medicamentos;

-- Copia independiente de usuarios para que el servicio
-- funcione aunque ms-historias esté caído
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100)  NOT NULL,
  apellido    VARCHAR(100)  NOT NULL DEFAULT '',
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  perfil      ENUM('medico','administrador','farmaceutico') NOT NULL,
  activo      BOOLEAN DEFAULT TRUE,
  creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categorías de medicamentos
CREATE TABLE IF NOT EXISTS categorias (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL UNIQUE
);

-- Inventario de medicamentos
CREATE TABLE IF NOT EXISTS medicamentos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150)  NOT NULL,
  nombre_generico VARCHAR(150),
  categoria_id    INT,
  presentacion    VARCHAR(100),
  concentracion   VARCHAR(100),
  laboratorio     VARCHAR(150),
  registro_invima VARCHAR(50),
  stock_actual    INT DEFAULT 0,
  stock_minimo    INT DEFAULT 5,
  precio_unitario DECIMAL(10,2) DEFAULT 0,
  requiere_receta BOOLEAN DEFAULT TRUE,
  activo          BOOLEAN DEFAULT TRUE,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Movimientos de inventario (entradas / salidas / ajustes)
CREATE TABLE IF NOT EXISTS movimientos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  medicamento_id  INT NOT NULL,
  usuario_id      INT NOT NULL,
  tipo            ENUM('entrada','salida','ajuste') NOT NULL,
  cantidad        INT NOT NULL,
  motivo          VARCHAR(255),
  receta_id       INT,          -- referencia externa (ms-historias)
  fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
);

-- ── Seeds ─────────────────────────────────────────────────────
INSERT INTO usuarios (nombre, email, password, perfil) VALUES
  ('Dr. Carlos Medina',   'medico@clinica.com',        '$2b$10$YourHashHere.PlaceholderMedicoHash000000000000',   'medico'),
  ('Ana Torres',          'admin@clinica.com',          '$2b$10$YourHashHere.PlaceholderAdminHash000000000000',   'administrador'),
  ('Luis Farmacia',       'farmaceutico@clinica.com',  '$2b$10$YourHashHere.PlaceholderFarmHash0000000000000',   'farmaceutico')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO categorias (nombre) VALUES
  ('Analgésicos'), ('Antibióticos'), ('Antiinflamatorios'),
  ('Antihipertensivos'), ('Antidiabéticos'), ('Vitaminas')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO medicamentos (nombre, nombre_generico, categoria_id, presentacion, concentracion, laboratorio, stock_actual, stock_minimo, precio_unitario, requiere_receta) VALUES
  ('Acetaminofén 500mg', 'Paracetamol',    1, 'Tableta', '500mg', 'Genfar',    120, 20, 350,   FALSE),
  ('Amoxicilina 500mg',  'Amoxicilina',    2, 'Cápsula', '500mg', 'La Santé',   45, 10, 1200,  TRUE),
  ('Ibuprofeno 400mg',   'Ibuprofeno',     3, 'Tableta', '400mg', 'Pfizer',     80, 15, 500,   FALSE),
  ('Losartán 50mg',      'Losartán',       4, 'Tableta', '50mg',  'MK',         60, 10, 800,   TRUE),
  ('Metformina 850mg',   'Metformina',     5, 'Tableta', '850mg', 'Merck',      35,  8, 950,   TRUE),
  ('Vitamina C 1g',      'Ácido Ascórbico',6, 'Tableta', '1000mg','Bayer',     200, 30, 280,   FALSE)
ON DUPLICATE KEY UPDATE id=id;

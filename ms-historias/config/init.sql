-- ============================================================
--  Microservicio: Historias Clínicas
-- ============================================================

CREATE DATABASE IF NOT EXISTS historias_clinicas;
USE historias_clinicas;

-- Tabla de usuarios (compartida lógicamente con ms-medicamentos
--  pero cada servicio mantiene su propia copia para independencia)
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

-- Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  documento       VARCHAR(20)  NOT NULL UNIQUE,
  tipo_documento  ENUM('CC','TI','CE','PA') DEFAULT 'CC',
  fecha_nac       DATE,
  sexo            ENUM('M','F','O'),
  telefono        VARCHAR(20),
  email           VARCHAR(150),
  direccion       VARCHAR(255),
  eps             VARCHAR(100),
  grupo_sanguineo VARCHAR(5),
  alergias        TEXT,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Historias clínicas
CREATE TABLE IF NOT EXISTS historias_clinicas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id     INT NOT NULL,
  medico_id       INT NOT NULL,
  fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
  motivo_consulta TEXT,
  anamnesis       TEXT,
  examen_fisico   TEXT,
  diagnostico     TEXT,
  plan_tratamiento TEXT,
  observaciones   TEXT,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
);

-- Recetas electrónicas
CREATE TABLE IF NOT EXISTS recetas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  historia_id     INT NOT NULL,
  paciente_id     INT NOT NULL,
  medico_id       INT NOT NULL,
  fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
  indicaciones    TEXT,
  estado          ENUM('pendiente','despachada','cancelada') DEFAULT 'pendiente',
  FOREIGN KEY (historia_id) REFERENCES historias_clinicas(id),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
);

-- Items de receta
CREATE TABLE IF NOT EXISTS receta_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  receta_id       INT NOT NULL,
  medicamento_id  INT,
  nombre_medicamento VARCHAR(150) NOT NULL,
  dosis           VARCHAR(100),
  frecuencia      VARCHAR(100),
  duracion        VARCHAR(100),
  cantidad        INT DEFAULT 1,
  FOREIGN KEY (receta_id) REFERENCES recetas(id)
);

-- ── Seeds ────────────────────────────────────────────────────
-- Contraseña para todos: Admin123* (bcrypt hash)
INSERT INTO usuarios (nombre, email, password, perfil) VALUES
  ('Dr. Carlos Medina',   'medico@clinica.com',        '$2b$10$YourHashHere.PlaceholderMedicoHash000000000000',   'medico'),
  ('Ana Torres',          'admin@clinica.com',          '$2b$10$YourHashHere.PlaceholderAdminHash000000000000',   'administrador'),
  ('Luis Farmacia',       'farmaceutico@clinica.com',  '$2b$10$YourHashHere.PlaceholderFarmHash0000000000000',   'farmaceutico')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO pacientes (nombre, apellido, documento, tipo_documento, fecha_nac, sexo, telefono, email, eps, grupo_sanguineo) VALUES
  ('María', 'González', '12345678', 'CC', '1985-03-12', 'F', '3001234567', 'maria@mail.com', 'Sura',    'O+'),
  ('Pedro', 'Ramírez',  '87654321', 'CC', '1990-07-25', 'M', '3109876543', 'pedro@mail.com', 'Sanitas', 'A+'),
  ('Laura', 'Díaz',     '11223344', 'CC', '2000-11-08', 'F', '3207654321', 'laura@mail.com', 'Nueva EPS','B-')
ON DUPLICATE KEY UPDATE id=id;

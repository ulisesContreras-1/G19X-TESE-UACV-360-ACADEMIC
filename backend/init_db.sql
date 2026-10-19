-- ==============================================================================
-- Esquema Inicial de Base de Datos - PostgreSQL
-- Motor Inteligente de Generación Automática de Contratos
-- NovaLex Tecnología Contractual S.A. de C.V. (Soluciones Digitales)
-- ==============================================================================

-- 1. Tabla de Usuarios del Sistema (Flujo de 3 roles)
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('GENERADOR', 'EDITOR', 'APROBADOR')),
    cargo VARCHAR(150),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Clientes con Requisitos Fiscales del SAT (México)
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(50) PRIMARY KEY,
    razon_social VARCHAR(255) NOT NULL,
    rfc VARCHAR(13) NOT NULL,
    domicilio_fiscal TEXT NOT NULL,
    representante_legal VARCHAR(150) NOT NULL,
    cargo VARCHAR(150) NOT NULL,
    escritura TEXT NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    es_demo BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Catálogo de Cláusulas (Estándar y Personalizadas)
CREATE TABLE IF NOT EXISTS clausulas (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    texto_base TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ESTANDAR', 'PERSONALIZADA')),
    categoria VARCHAR(100) NOT NULL,
    requerida BOOLEAN DEFAULT FALSE,
    orden INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Contratos Empresariales y su Trazabilidad de Estados
CREATE TABLE IF NOT EXISTS contratos (
    id VARCHAR(50) PRIMARY KEY,
    cliente_id VARCHAR(50) NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_contrato VARCHAR(100) DEFAULT 'PRESTACION_SERVICIOS',
    estado VARCHAR(30) NOT NULL CHECK (estado IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'RECHAZADO')),
    variables JSONB NOT NULL,
    clausulas_seleccionadas TEXT[] NOT NULL,
    texto_generado TEXT,
    creado_por VARCHAR(50) REFERENCES usuarios(id),
    editado_por VARCHAR(50) REFERENCES usuarios(id),
    aprobado_por VARCHAR(50) REFERENCES usuarios(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserción de usuarios iniciales ficticios para demostración y pruebas de roles (clave demo: inicio2026)
INSERT INTO usuarios (id, username, nombre, email, password_hash, rol, cargo, activo)
VALUES 
    ('usr-gen-01', 'uacontreras', 'Valeria Ramos Peña', 'valeria.ramos@example.com', '$2b$12$NU30SKyg2Cc0EeILoSGq/OAeDxTiS9AYbMB9pmUeBDvfQiUIPcWXW', 'GENERADOR', 'Ingeniera de Soluciones Contractuales', TRUE),
    ('usr-edit-02', 'elozano', 'Eduardo Lozano Mora', 'eduardo.lozano@example.com', '$2b$12$NU30SKyg2Cc0EeILoSGq/OAeDxTiS9AYbMB9pmUeBDvfQiUIPcWXW', 'EDITOR', 'Revisor Jurídico de Contratos', TRUE),
    ('usr-aprob-03', 'jmorales', 'Javier Morales Hinojosa', 'javier.morales@example.com', '$2b$12$NU30SKyg2Cc0EeILoSGq/OAeDxTiS9AYbMB9pmUeBDvfQiUIPcWXW', 'APROBADOR', 'Director de Operaciones Legales', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Inserción de clientes iniciales ficticios de demostración
INSERT INTO clientes (id, razon_social, rfc, domicilio_fiscal, representante_legal, cargo, escritura, email, telefono, es_demo)
VALUES 
    ('cli-001', 'Logística Integral Quantum S.A. de C.V.', 'LIQ180425AB1', 'Av. Insurgentes Sur 1200 Piso 5, Col. Del Valle, Benito Juárez, Ciudad de México, C.P. 03100 (Demostración)', 'Ing. Fernando Barrientos Ochoa', 'Director General y Apoderado Legal', 'Escritura Pública No. 24,190, Notaría Pública No. 34 de la Ciudad de México (Ficticia)', 'contacto@logistica-quantum.example.com', '55 5555 0120', TRUE),
    ('cli-002', 'Distribuidora Nexus Farma S.A.P.I. de C.V.', 'DNF140912CD2', 'Calzada de Tlalpan 2148, Col. Campestre Churubusco, Coyoacán, Ciudad de México, C.P. 04200 (Demostración)', 'Lic. Mariana Soto Castro', 'Representante Legal y Directora de Operaciones', 'Póliza Mercantil No. 8,921 ante Correduría Pública No. 51 de la Ciudad de México (Ficticia)', 'contacto@nexusfarma.example.com', '55 5555 0140', TRUE)
ON CONFLICT (id) DO NOTHING;

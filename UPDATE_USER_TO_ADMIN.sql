-- Script para actualizar el rol del usuario a "admin" en producción
-- Ejecutar este script en el panel de Database del Management UI de Manus

-- Actualizar el rol del usuario "Green House Project" a "admin"
UPDATE user 
SET role = 'admin' 
WHERE email = 'greenhproject@gmail.com';

-- Verificar que el cambio se aplicó correctamente
SELECT id, name, email, role 
FROM user 
WHERE email = 'greenhproject@gmail.com';

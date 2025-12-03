-- Agregar jobTitle a users
ALTER TABLE users ADD COLUMN jobTitle VARCHAR(255) AFTER role;

-- Agregar assignedUserId a milestones
ALTER TABLE milestones ADD COLUMN assignedUserId INT AFTER dependencies;

-- Crear índice para assignedUserId
CREATE INDEX assigned_user_idx ON milestones(assignedUserId);

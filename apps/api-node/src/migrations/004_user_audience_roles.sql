INSERT INTO roles (id, code, name, description)
SELECT UUID(), 'STUDENT', 'Student', 'Student community user role'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'STUDENT');

INSERT INTO roles (id, code, name, description)
SELECT UUID(), 'LECTURER', 'Lecturer', 'Lecturer community user role'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'LECTURER');

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'STUDENT'
WHERE u.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles existing_role ON existing_role.id = ur.role_id
    WHERE ur.user_id = u.id
      AND existing_role.code IN ('STUDENT', 'LECTURER', 'STAFF', 'ADMIN')
  );

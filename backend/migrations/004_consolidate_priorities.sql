-- Consolida as prioridades antigas ('low', 'urgent', 'critical') para 'normal' e 'high'
UPDATE tickets SET priority = 'high' WHERE priority IN ('urgent', 'critical');
UPDATE tickets SET priority = 'normal' WHERE priority = 'low';

UPDATE tasks SET priority = 'high' WHERE priority IN ('urgent', 'critical');
UPDATE tasks SET priority = 'normal' WHERE priority = 'low';

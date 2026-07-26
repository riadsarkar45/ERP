-- 1. Does styleRequirementId exist?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'WorkOrder' AND column_name = 'styleRequirementId';

-- 2. What FK constraints currently exist on WorkOrder?
SELECT conname, confrelid::regclass AS references_table
FROM pg_constraint
WHERE conrelid = '"WorkOrder"'::regclass AND contype = 'f';

-- 3. Is jobNo still required (NOT NULL) and does WorkOrder.jobNo data still look fine?
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'WorkOrder' AND column_name = 'jobNo';
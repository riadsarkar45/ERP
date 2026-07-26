SELECT w.id, w."workOrderNo", w."jobNo"
FROM "WorkOrder" w
LEFT JOIN "StyleRequirement" sr ON sr."jobNo" = w."jobNo"
WHERE sr."jobNo" IS NULL;
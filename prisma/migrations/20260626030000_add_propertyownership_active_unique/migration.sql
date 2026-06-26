-- At most one ACTIVE beneficial-ownership row per (property, owner). Prevents
-- duplicate active shares, which would double-count an owner in the pro-rata
-- tax split and defeat the 100% cap. Partial unique index (mirrors the
-- Portfolio_one_default pattern); the effective-dated history rows (effectiveTo
-- not null) are unconstrained.
CREATE UNIQUE INDEX "PropertyOwnership_active_owner" ON "PropertyOwnership"("propertyId", "beneficialOwnerId") WHERE "effectiveTo" IS NULL;

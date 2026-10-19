# MIVO Database Migrations

This directory contains version-controlled SQL migrations for the MIVO database.

## Migration Strategy

Migrations are numbered sequentially and must be applied in order:

1. **001_init.sql** - Extensions and base functions (✅ Created)
2. **002_profiles.sql** - User profiles and addresses (Milestone 3)
3. **003_categories.sql** - Product categories (Milestone 2)
4. **004_products.sql** - Products and variants (Milestone 2)
5. **005_carts.sql** - Shopping carts (Milestone 4)
6. **006_orders.sql** - Orders and order items (Milestone 4)
7. **007_payments.sql** - Payment tracking (Milestone 4)
8. **008_quotes.sql** - Quotation requests and quotes (Milestone 5)
9. **009_production.sql** - Production jobs (Milestone 6)
10. **010_shipments.sql** - Shipping tracking (Milestone 6)
11. **011_audit.sql** - Audit logs and operations (Milestone 6)
12. **012_rls.sql** - Row Level Security policies (Milestone 7)

## Running Migrations

### Using Supabase CLI (Recommended)

```bash
# Link your project
supabase link --project-ref your-project-ref

# Push migrations to Supabase
supabase db push

# Or apply a specific migration
supabase migration up
```

### Using SQL Editor (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste migration contents
4. Execute the migration
5. Verify success message

### Using psql (Direct Database Connection)

```bash
psql "postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]" < supabase/migrations/001_init.sql
```

## Migration Guidelines

1. **Never edit applied migrations** - Create a new migration to modify schema
2. **Test migrations locally first** - Use Supabase local development
3. **Backup before production migrations** - Always have a rollback plan
4. **Document breaking changes** - Note any schema changes affecting existing code
5. **Sequential execution** - Migrations must be applied in numeric order

## Current Schema Status

### Milestone 1 (Foundation) ✅
- ✅ Extensions enabled (uuid-ossp, pgcrypto)
- ✅ Base functions created (timestamps, ID generation)

### Milestone 2 (Catalogue) - Pending
- ⏳ Categories table
- ⏳ Products table
- ⏳ Product variants table
- ⏳ Product images table

### Milestone 3 (Authentication) - Pending
- ⏳ Profiles table (extends auth.users)
- ⏳ Addresses table
- ⏳ User roles table

### Milestone 4 (Cart/Checkout) - Pending
- ⏳ Carts table
- ⏳ Cart items table
- ⏳ Orders table
- ⏳ Order items table (immutable snapshots)
- ⏳ Payments table

### Milestone 5 (Quotations) - Pending
- ⏳ Quote requests table
- ⏳ Quote files table
- ⏳ Quotes table (revisions)

### Milestone 6 (Admin/Operations) - Pending
- ⏳ Production jobs table
- ⏳ Shipments table
- ⏳ Audit logs table

### Milestone 7 (Production Ready) - Pending
- ⏳ Row Level Security policies
- ⏳ Performance indexes
- ⏳ Final constraints and validations

## Rollback Strategy

If a migration fails:

1. Check error messages carefully
2. Do NOT modify the failed migration file
3. Create a new migration to fix the issue
4. Document the issue and resolution

For catastrophic failures:
1. Restore from backup
2. Review and fix migration
3. Test in development environment
4. Re-apply to production

## Development vs Production

- **Development**: Use Supabase local development (`supabase start`)
- **Staging**: Apply migrations to staging project first
- **Production**: Only apply tested, verified migrations

## Migration Checklist

Before creating a production migration:

- [ ] Migration tested in local development
- [ ] Migration tested in staging environment
- [ ] Backup created (production)
- [ ] No destructive operations without explicit confirmation
- [ ] RLS policies updated for new tables
- [ ] Indexes added for performance
- [ ] Foreign key constraints added
- [ ] Check constraints for data validation
- [ ] Documentation updated
- [ ] Team notified of schema changes

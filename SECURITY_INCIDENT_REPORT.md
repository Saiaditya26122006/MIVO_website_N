# Security Incident Report: Exposed Supabase Service Role Key

**Date Detected:** October 22, 2026  
**Severity:** CRITICAL  
**Status:** ⚠️ REQUIRES IMMEDIATE ACTION  

---

## Incident Summary

Supabase service role key was hardcoded in 4 migration scripts and committed to a **public GitHub repository**. The key has been exposed to the internet for approximately **2 days**.

### Exposure Details

- **Repository:** https://github.com/Saiaditya26122006/MIVO_website_N
- **Visibility:** PUBLIC (confirmed via GitHub API)
- **Exposed Since:** Commit `2ddd237` (October 20, 2026)
- **Pushed to GitHub:** Yes, exposed on origin/main
- **Affected Files:** 4 migration scripts in `scripts/` directory
- **Fixed in Commit:** `10fccc5` (October 22, 2026)

### Access Granted by Exposed Key

The compromised service role key provides **unrestricted database access**:
- ✅ Read/write ALL tables bypassing Row Level Security (RLS)
- ✅ Execute arbitrary SQL queries
- ✅ Access ALL user data (customer profiles, orders, addresses, phone numbers)
- ✅ Modify or delete data
- ✅ Create/alter database schema
- ✅ Access authentication data
- ✅ Grant additional permissions

**Attack Surface:** Any person or bot that scraped this public repository during the 2-day exposure window has full database access.

---

## Immediate Actions Required

### 1. Rotate Service Role Key (DO THIS FIRST)

**⚠️ This must be completed immediately before any further development work.**

#### Steps to Rotate in Supabase Dashboard:

1. **Log in to Supabase Dashboard:** https://app.supabase.com/project/ntrbvoxdvpywadiqgvtt

2. **Navigate to Settings → API**
   - Project: `ntrbvoxdvpywadiqgvtt`
   - Region: Your project region

3. **Locate "Service Role Key" section**
   - Current key starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...`
   - This is the compromised key

4. **Click "Generate new service role key"**
   - Supabase will prompt for confirmation
   - Confirm that you understand this will invalidate the old key
   - **Copy the new key immediately** - it will only be shown once

5. **Update all deployments with new key:**

   a. **Local Development** (`.env.local`):
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
   ```

   b. **Vercel Production** (Settings → Environment Variables):
   - Variable: `SUPABASE_SERVICE_ROLE_KEY`
   - Environment: Production
   - Value: [paste new key]
   - Mark as "Encrypted"
   - **Redeploy production** after updating

   c. **Vercel Preview** (if used):
   - Variable: `SUPABASE_SERVICE_ROLE_KEY`
   - Environment: Preview
   - Value: [paste new key]

   d. **Any CI/CD Pipelines:**
   - Update secrets in GitHub Actions / GitLab CI / other CI tools
   - Ensure pipelines use the new key

6. **Test the rotation:**
   ```bash
   # Run a migration script to verify new key works
   node scripts/apply-migration-direct.mjs
   ```

7. **Verify old key is invalidated:**
   - Try using the old key (should fail with 401 Unauthorized)
   - Check Supabase logs for unauthorized access attempts

### 2. Audit for Unauthorized Access

**After rotating the key, investigate potential unauthorized access:**

1. **Check Supabase Logs** (Dashboard → Database → Logs):
   - Look for unusual queries between Oct 20-22
   - Check for unexpected data modifications
   - Look for new user accounts or admin escalations

2. **Review Recent Database Changes:**
   ```sql
   -- Check for recently created admin users
   SELECT * FROM customer_profiles 
   WHERE is_admin = true 
   ORDER BY created_at DESC;

   -- Check for recently modified orders
   SELECT * FROM orders 
   WHERE updated_at > '2026-10-20' 
   ORDER BY updated_at DESC;

   -- Check for suspicious contact messages
   SELECT * FROM contact_messages 
   WHERE created_at > '2026-10-20';
   ```

3. **Check for API Rate Limiting:**
   - Review Supabase API usage in Dashboard → Project Settings → API
   - Look for unusual spikes in API calls

### 3. Security Audit Checklist

- [ ] Service role key rotated in Supabase dashboard
- [ ] New key deployed to Vercel production
- [ ] New key deployed to Vercel preview (if applicable)
- [ ] New key added to local `.env.local`
- [ ] Old key confirmed invalidated
- [ ] Database logs reviewed for suspicious activity
- [ ] No unauthorized admin accounts found
- [ ] No unauthorized data modifications found
- [ ] Migration scripts tested with new key
- [ ] All team members notified of key rotation

---

## Root Cause Analysis

### How It Happened

1. **Initial Mistake:** Developer hardcoded service role key in `scripts/apply-migration-direct.mjs` during initial project setup
2. **Propagation:** Pattern was copied to 3 additional migration scripts
3. **Committed to Git:** Files committed with hardcoded credentials (commit `2ddd237`)
4. **Pushed to Public Repo:** Changes pushed to public GitHub repository
5. **Exposure Duration:** Key remained public for ~2 days before detection

### Why It Wasn't Caught Earlier

- ❌ No pre-commit hooks to scan for secrets
- ❌ No secrets detection in CI/CD pipeline
- ❌ No code review process for migration scripts
- ❌ Scripts directory not flagged as sensitive

---

## Preventive Measures Implemented

### Code Changes (Commit `10fccc5`)

1. ✅ Created `scripts/supabase-client.mjs` helper module
2. ✅ All scripts now load credentials from environment variables
3. ✅ Environment variable validation before execution
4. ✅ Clear error messages if credentials not set
5. ✅ Hardcoded keys removed from all 4 affected scripts

### Required Setup for Scripts

Scripts now require environment variables in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ntrbvoxdvpywadiqgvtt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
```

Running scripts without these variables will fail with clear error message.

---

## Additional Security Recommendations

### 1. Enable Secrets Detection

**Option A: GitHub Secret Scanning (Recommended)**
- Enable in: Repository Settings → Security → Code security and analysis
- Turn on "Secret scanning"
- GitHub will automatically scan for exposed credentials

**Option B: Pre-commit Hooks**
```bash
# Install git-secrets or similar tool
npm install --save-dev @commitlint/cli husky
# Configure pre-commit hook to reject commits with patterns like:
# - JWT tokens starting with "eyJ"
# - Supabase service role patterns
# - API keys
```

**Option C: Gitleaks**
```bash
# Add to CI/CD pipeline
npm install -g gitleaks
gitleaks detect --source . --verbose
```

### 2. Secure Current .env.local

Verify `.env.local` security:
```bash
# Confirm .env.local is gitignored
git check-ignore .env.local  # Should output: .env.local

# Verify no .env files in git
git ls-files | grep -E "\.env$|\.env\."  # Should be empty or only .env.example
```

### 3. Rotate Other Secrets (Recommended)

Consider rotating these if they were in the same environment:
- [ ] Razorpay API keys (if configured)
- [ ] Email provider API keys
- [ ] Any other third-party API keys

### 4. Enable Supabase Audit Logging

In Supabase Dashboard → Project Settings → Audit Logs:
- Enable comprehensive audit logging
- Set up alerts for suspicious activity
- Review logs weekly

### 5. Implement Least Privilege

For future scripts that don't need full database access:
- Use anon key or service role with restricted permissions
- Create custom Postgres roles with minimal required permissions
- Never use service role key in client-side code

---

## Communication

### Who Needs to Know

- ✅ Project owner/maintainer (immediate notification)
- ✅ All developers with access to production
- ✅ Security team (if applicable)
- ❌ **DO NOT** publicly disclose specific key values or exploitation methods
- ❌ **DO NOT** publish this report to public repository until key is rotated

### Public Disclosure Timeline

1. **Immediate (Before Public Disclosure):**
   - Rotate service role key
   - Audit for unauthorized access
   - Update all deployments

2. **After Mitigation Complete:**
   - Can disclose incident without exposing key values
   - Update repository README with security best practices
   - Can keep this report in repository as learning documentation

---

## Lessons Learned

### What Went Wrong
- Hardcoded secrets in source code
- Committed sensitive data to git
- Public repository without secrets scanning
- No code review for infrastructure scripts

### What Went Right
- Issue detected during systematic security audit
- Exposure limited to 2-day window
- Fix implemented immediately
- Comprehensive incident documentation

### Process Improvements
- [ ] Add pre-commit hooks for secrets detection
- [ ] Enable GitHub secret scanning
- [ ] Add code review requirement for infrastructure changes
- [ ] Document secure development practices
- [ ] Add secrets detection to CI/CD pipeline
- [ ] Regular security audits scheduled

---

## References

- **Supabase Security Best Practices:** https://supabase.com/docs/guides/auth/security
- **GitHub Secret Scanning:** https://docs.github.com/en/code-security/secret-scanning
- **OWASP Top 10 - Security Misconfiguration:** https://owasp.org/Top10/A05_2021-Security_Misconfiguration/

---

## Incident Timeline

| Date/Time | Event |
|-----------|-------|
| Oct 20, 2026 | Service role key committed to git (commit `2ddd237`) |
| Oct 20, 2026 | Changes pushed to public GitHub repository |
| Oct 22, 2026 | Exposure detected during payment integration security audit |
| Oct 22, 2026 | Hardcoded keys removed (commit `10fccc5`) |
| Oct 22, 2026 | Security incident report created |
| **PENDING** | ⚠️ Service role key rotation (REQUIRED) |
| **PENDING** | ⚠️ Unauthorized access audit (REQUIRED) |

---

## Action Items Summary

### CRITICAL (Do Immediately)
- [ ] Rotate Supabase service role key in dashboard
- [ ] Update production Vercel environment variable
- [ ] Update local `.env.local` with new key
- [ ] Test deployment with new key
- [ ] Verify old key is invalidated

### HIGH PRIORITY (Within 24 Hours)
- [ ] Audit Supabase logs for unauthorized access
- [ ] Review database for suspicious modifications
- [ ] Check for unauthorized admin accounts
- [ ] Enable GitHub secret scanning

### MEDIUM PRIORITY (Within 1 Week)
- [ ] Add pre-commit hooks for secrets detection
- [ ] Document secure development practices
- [ ] Rotate other API keys as precaution
- [ ] Set up Supabase audit logging alerts
- [ ] Security training for team

---

**Last Updated:** October 22, 2026  
**Next Review:** After service role key rotation completed

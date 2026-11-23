## Server caller checks
- Sending/admin edge functions use _shared/caller-auth.ts; DB triggers and cron send a one-time x-job-token from issue_job_token(). Why: the anon key is public and proves nothing.
- Program, billing and access columns on profiles change only via staff or server code (protect_profile_access_fields trigger). Why: members must not self-upgrade.

# PawBuck data inventory (user & pet data)

Engineering source of truth for erasure, export, and retention. **Not legal advice.**  
Machine-readable table list: [inventoried-tables.txt](./inventoried-tables.txt) (CI drift guard).

| Table / bucket | Category | Special category | Retention (default) | Erasure | Export |
|----------------|----------|------------------|---------------------|---------|--------|
| `auth.users` | Account | — | Life of account | Purge worker (Auth Admin API) | yes (email, metadata) |
| `user_preferences` | Account | — | Life of account | `erase_user_data` | yes |
| `user_entitlements` | Billing | — | Life of account | `erase_user_data` | yes |
| `user_subscription_usage` | Billing | — | Life of account | `erase_user_data` | yes |
| `push_tokens` | Account | — | Until logout/delete | `erase_user_data` | yes |
| `analytics_events` | Behavioral | — | 14 months (TTL job) | `erase_user_data` | yes |
| `pets` | Health | — | Life of account | `erase_user_data` | yes |
| `vaccinations` | Health | Health-adjacent | Life of account | cascade / RPC | yes |
| `medicines` | Health | Health-adjacent | Life of account | cascade / RPC | yes |
| `medication_doses` | Health | Health-adjacent | Life of account | cascade / RPC | yes |
| `clinical_exams` | Health | Health-adjacent | Life of account | cascade / RPC | yes |
| `lab_results` | Health | Health-adjacent | Life of account | cascade / RPC | yes |
| `pet_documents` | Health | Health-adjacent | Life of account | cascade / RPC | yes (signed URLs) |
| `daily_intake` | Health | — | Life of account | cascade / RPC | yes |
| `pet_weight_logs` | Health | — | Life of account | cascade / RPC | yes |
| `pet_behavior_baselines` | Health | — | Life of account | cascade / RPC | yes |
| `pet_allergies` | Health | Health-adjacent | Life of account | cascade / RPC | yes |
| `pet_conditions` | Health | Health-adjacent | Life of account | cascade / RPC | yes |
| `pet_journal_entries` | Health / AI | Health-adjacent | Life of account | cascade / RPC | yes |
| `walk_sessions` | Location | Precise location (`points`) | 90d GPS prune; row life of account | cascade / RPC | yes (points redacted after prune) |
| `milo_journal_chat_turns` | AI | — | 12 months (TTL job) | cascade / RPC | yes |
| `milo_journal_message_feedback` | AI | — | 12 months (TTL job) | cascade / RPC | yes |
| `journal_interview_sessions` | AI | — | 24h incomplete; complete with journal | cascade / RPC | yes |
| `message_threads` | Comms | — | Life of account | cascade / RPC | yes |
| `thread_messages` | Comms | — | Life of account | cascade / RPC | yes |
| `thread_read_status` | Comms | — | Life of account | `erase_user_data` | yes |
| `processed_emails` | Comms | Health in attachments | 180d raw prune (TTL job) | cascade / RPC | yes |
| `pending_email_approvals` | Comms | — | Life of account | cascade / RPC | yes |
| `pet_email_list` | Comms | — | Life of account | `erase_user_data` | yes |
| `pet_care_team_members` | Health | — | Life of account | cascade / RPC | yes |
| `vet_bookings` | Scheduling | — | Life of account | cascade / RPC | yes |
| `household_members` | Account | — | Life of account | `erase_user_data` | yes |
| `household_invites` | Account | — | Life of account | `erase_user_data` | yes |
| `pet_family_grants` | Account | — | Life of account | `erase_user_data` | yes |
| `pet_family_invites` | Account | — | Life of account | `erase_user_data` | yes |
| `pet_transfers` | Account | — | Life of account | `erase_user_data` | yes |
| `pet_activity_events` | Behavioral | — | Life of account | cascade / RPC | yes |
| `proactive_pet_health_sends` | Health / AI | — | Life of account | cascade / RPC | yes |
| `provider_profiles` | Marketplace | — | Life of account | `erase_user_data` | yes |
| `data_export_requests` | Account | — | 7d after ready | `erase_user_data` | meta only |
| `account_deletion_requests` | Account | — | Until purged | purge worker | no |
| `account_deletion_log` | Audit | — | 24 months | retention job | no |
| `retention_job_runs` | Ops | — | 90 days | ops | no |
| Storage `pets` | Health | Images/PDFs | Life of account | purge worker | signed URLs in export |
| Storage `email-attachments` | Comms | — | Life of account | purge worker | signed URLs |
| Storage `pending-emails` | Comms | — | TTL / delete | purge worker | no |
| Storage `data-exports` | Account | Export bundle | 7 days | TTL job | user download |

**System / non-user tables (not in export):** `documentation`, `milo_journal_config`, `clinic_scheduling_config`, `medication_adr_*`, `subscription_feature_gates`, `subscription_limits`, `ops_probe_results`, `notification_dedupe` (Edge push cooldown ledger, service role), `one_time_ops_log` (one-shot migration idempotency), `faq_*`, `milo_curated_snippets`, `country_email_document_verification`, reminder sent markers, etc.

When adding a migration with `CREATE TABLE public.*` for user/pet data, add a row here and a line in `inventoried-tables.txt`.

# Security Specification - Container Tracker

## Data Invariants
1. **Containers**:
   - Must have a unique number.
   - Status must be one of: 'Active', 'Repairing', 'Repaired', 'Billing', 'Billed', 'Archived'.
   - Type must be 'Local' or 'Foreign'.
   - `localReference` is required for 'Local' containers (usually same as number).
2. **Invoices**:
   - Must have a unique invoice number.
   - Status transitions must follow: Draft -> Approved -> Billed -> Archived.
   - `billedAt` is required when status is 'Billed'.
   - `archivedAt` is required when status is 'Archived'.
   - Container IDs must exist (logic check in app, rules can check count if needed).

## The "Dirty Dozen" Payloads (Deny List)
1. **Container - Shadow Field**: Adding `isVerified: true` to a container.
2. **Container - Status Spoof**: Setting status to 'Billed' directly on creation.
3. **Container - Invalid Type**: Setting type to 'Intergalactic'.
4. **Invoice - Status Spoof**: Setting status to 'Archived' directly on creation.
5. **Invoice - Unauthorized Approval**: User trying to approve an invoice without being admin (if admin exists) or just bypass status check.
6. **Invoice - Immutable Field Change**: Changing `createdAt` after creation.
7. **Invoice - Large ID**: Using a 2KB string as a container ID.
8. **Invoice - Invalid Container ID List**: Sending `containerIds` as a string instead of a list.
9. **Invoice - Missing Required Field**: Creating invoice without `invoiceNumber`.
10. **Invoice - PII Leak**: (Not applicable here yet, but good to have) Reading all user profiles.
11. **Invoice - Outcome Change**: Changing an 'Archived' invoice back to 'Draft'.
12. **Invoice - Temporal Spoof**: Setting `createdAt` to a date in the future (not using `request.time`).

## Conflict Report
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|------------------|-------------------|-------------------|
| containers | Protected (UID check) | Protected (Status enum) | Protected (Size check) |
| invoices   | Protected (UID check) | Protected (Status enum) | Protected (Size check) |

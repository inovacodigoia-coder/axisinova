# Plan: Equipment Webhooks Integration

Implement webhook management for laboratory equipment to allow third-party systems to listen for instrument events.

## Proposed Changes

### Database & Backend
- No schema changes required initially (using standard POST /api/v1/instruments/{id}/webhooks as specified).
- Integration relies on an external instrument management service (Axiaxius).

### Lab Equipment Page
- **Webhook Management**:
  - Add a "Webhooks" button to the equipment edit modal/section in `src/pages/company/lab/equipment/LabEquipmentPage.tsx`.
  - Create a new modal `InstrumentWebhooksModal.tsx` to:
    - List current webhooks (fetched via GET).
    - Add new webhooks with fields: **Destination URL** and **Events** (RESULT_RECEIVED, STATUS_CHANGED, COMMUNICATION_ERROR).
    - Handle POST to `/api/v1/instruments/{id}/webhooks`.

## Technical Details
- **API Endpoint**: `https://api.inovacodigoia.com.br/api/v1/instruments/{id}/webhooks` (assumed base based on project patterns).
- **Events**: `RESULT_RECEIVED`, `STATUS_CHANGED`, `COMMUNICATION_ERROR`.
- **Flow**: Edit Equipment -> Click Webhooks -> Load current -> Add new -> POST update.

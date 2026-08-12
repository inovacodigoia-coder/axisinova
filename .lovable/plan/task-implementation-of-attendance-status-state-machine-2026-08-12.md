# Task: Implementation of Attendance Status State Machine

Implement a derived status system for attendance orders based on the aggregated state of their exams.

## User Review Required

> [!IMPORTANT]
> - The status will now be calculated in real-time based on exam collection, result entry, and release states.
> - The existing "Validação" and "Autorizado" filters in the Reception search will be preserved as requested, but the core logic will shift to the 7-status machine.

## Proposed Changes

### 1. Logic & Data Types
- Create `src/utils/attendanceStatus.ts` (already initialized) with `calculateAttendanceStatus` logic.
- Update `AttendanceOrder` type to include the new calculated status strings.

### 2. UI Components
#### `AttendanceLookupModal.tsx`
- Replace `ATTENDANCE_STATUS_LABELS` with the new configuration from `attendanceStatus.ts`.
- Apply `calculateAttendanceStatus` to the status badge in the results table.
- Update the Status filter dropdown to work with calculated statuses while keeping existing ones.

#### `AttendanceDetailsModal.tsx`
- Use the derived status in the header badge.
- Ensure real-time updates when exams are collected or results are modified (the component already reacts to `order` updates).

### 3. Migrations & Data
- Update the mock data retrieval in `useAttendanceCadastro` or `AttendanceLookupModal` to apply the status recalculation to all existing mock records.
- Ensure that "Impresso" (printed) or "Baixado" (downloaded) actions trigger the `deliveryStatus = 'delivered'` to reach the "Concluído" state.

## Technical Details
- **Status Precedence**: Cancelado (unless Concluído) > Concluído > Liberado > Em Análise > Coleta Realizada > Aguardando > Aberto.
- **Derived Logic**: The status is never set manually in the database (except for 'cancelled'); it is always calculated from the `exams` array inside the order.
- **Tailwind Classes**: Use the specific brand-aligned background/text color combinations for each pill.

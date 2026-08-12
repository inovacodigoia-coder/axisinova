# Plan - Attendance Status Management & Automation

Implement a dynamic status management system for laboratory attendances based on the technical lifecycle of exams.

## User Review Required

> [!IMPORTANT]
> The status transitions will follow these rules:
> 1. **COLETA REALIZADA** (Collection Done) -> The order moves to "Digitação de Resultados" (Result Entry).
> 2. **VALIDAÇÃO** (Validation) -> Set automatically if any exam in the order is missing results or is not yet released.
> 3. **LIBERADO** (Released) -> Set automatically when at least one exam in the order is marked as "Liberado".
> 4. **CONCLUÍDO** (Completed) -> Set automatically when ALL exams in the order are marked as "Liberado".

## Proposed Changes

### Logic & Hooks
- Update `src/hooks/useAttendanceCadastro.ts`:
    - Modify the `AttendanceOrder` status type to include `in_analysis`, `validation`, and `released`.
    - Implement an internal status resolver logic that recalculates the order status based on individual exam statuses.

### Laboratory Module
- Update `src/pages/company/lab/LabColetaPage.tsx`:
    - Ensure `handleConfirmColeta` updates the status to `collection_done` (which maps to "Coleta Realizada").
- Update `src/pages/company/lab/analise/LabAnalisePage.tsx`:
    - Refine the filter to include orders with statuses `collection_done`, `in_analysis`, `validation`, and `released`.
- Update `src/components/lab/analise/ResultEntryModal.tsx`:
    - Implement the status transition logic during `handleSave`, `handleConcluirExame`, and `handleReleaseExam`.
    - When an exam is released, trigger an update to the parent `attendance_orders` table to reflect the new global status (Liberado, Validação, or Concluído).

### UI Refinements
- Ensure the "Digitação de Resultados" (Analysis) list correctly labels patients based on these new statuses.

## Technical Details
- The mapping between database status and UI labels:
    - `collection_done` -> "Coleta Realizada"
    - `in_analysis` -> "Digitação de Resultados"
    - `validation` -> "Validação"
    - `released` -> "Liberado"
    - `completed` -> "Concluído"
- Use a dedicated helper function `resolveOrderStatus(exams: any[])` to determine the correct status string based on the collection of exam states (`pending`, `digitized`, `released`, `cancelled`).

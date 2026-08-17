# Plan: Work Map Visual Refinement (Parameters & Layout)

Update the Work Map view at `/app/lab/mapa/:codigo` to display full exam parameters with reference ranges and units, matching the style of the "Result Entry" interface. This will ensure consistency across all view modes (Completo, Exame, Compacto, Grade).

## User Review Required

> [!IMPORTANT]
> The "Result Entry" layout uses cards for each parameter with labels for Unit and Reference. We will replicate this layout in the Work Map's "Completo" view. Other views (Exame, Compacto, Grade) will also be updated to show parameters correctly.

## Proposed Changes

### Laboratory Work Map
#### [Frontend]
- **Refactor `LabMapaViewPage.tsx` Parameter Fetching**:
    - Update the `useEffect` that fetches parameters to also include `measurement_unit`, `reference_values`, `is_calculated`, and `formula` from `lab_exam_parameters` (or `exams` catalog for fallback).
    - Use `buildExamParams` utility to resolve parameters with correct reference ranges based on patient gender and age.
- **Update View Layouts**:
    - **Completo**: Change the parameter display to a grid of cards similar to `ResultEntryModal`, showing:
        - Parameter Name (Header)
        - Empty Result Box
        - Reference Range (e.g., "4,5 a 6,1")
        - Unit (e.g., "MILHÕES/MM³")
    - **Exame**: Ensure every parameter sigla is listed with a line for manual entry and an "Observação" field.
    - **Compacto**: List parameters below the exam name.
    - **Grade**: Flatten all parameters into the grid header, ensuring each specific test item has a column for results.

## Technical Details
- Import `buildExamParams` and `findCatalogExam` from `@/utils/examParameters`.
- Enhance the patient mapping logic to calculate `age` (using `differenceInYears` from `date-fns`) for reference range resolution.
- Modify the `paramsByExamId` state to store full `ResolvedParam` objects instead of just sigla/name.
- Update CSS/Tailwind classes in the `@media print` section to ensure these new detailed fields print clearly without excessive page breaks.

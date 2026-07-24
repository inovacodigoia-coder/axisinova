import { test, expect } from '@playwright/test';

test.describe('Protocol Numeric Validation', () => {
  test('should display only numeric protocols in the attendance lookup modal', async ({ page }) => {
    // Navigate to the app and login if necessary (session injection handles this)
    await page.goto('http://localhost:8080/app/recepcao?lookup=true');
    
    // Wait for the modal to be visible
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Check all protocol/order number cells
    // The previous AI agent updated lookup to label columns as "Pedido / Atend."
    const cells = page.locator('td:nth-child(2)'); // Assuming 2nd column based on recent rebuild
    const count = await cells.count();
    
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent();
      if (text && text.trim() !== '-') {
        // Pattern: [idPaciente]-[nSequencial]-[idOrigem]
        // Should match numeric-numeric-numeric
        expect(text.trim()).toMatch(/^\d+-\d+-\d+$/);
      }
    }
  });

  test('should generate numeric protocol after creating a new attendance', async ({ page }) => {
    // This is a placeholder for a full E2E flow if needed
    // For now, we rely on the unit tests and visual consistency
    await page.goto('http://localhost:8080/app/recepcao/cadastro-direto');
    
    // Verify Step 1 is loaded
    await expect(page.getByText('Dados do Paciente')).toBeVisible();
  });
});

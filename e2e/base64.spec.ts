import { expect, test } from '@playwright/test'

test.describe('Base64 tool', () => {
  test('encodes plain text', async ({ page }) => {
    await page.goto('/tools/base64-encoder')

  const input = page.getByPlaceholder('Paste text to encode...')
    await input.waitFor({ state: 'visible' })
    await input.fill('hello tuneer')

  await expect(page.getByPlaceholder('Output appears here...')).toHaveValue('aGVsbG8gdHVuZWVy')
  })
})

import {expect, test} from '@playwright/test'
import {url} from './config.js'

async function fillPublicImport(page) {
  await expect(page.locator('.collapsePublic')).toBeVisible()
  await page.locator('.collapsePublic input:nth-of-type(1)').fill('EditorTest')
  await page.locator('.collapsePublic input:nth-of-type(2)').fill('https://raw.githubusercontent.com/Uptaker/i18n-public/main/i18n/')
  await page.locator('.collapsePublic button').click()
  await expect(page.locator('.collapsePublic')).not.toBeVisible()
}

test('editor page functionality', async ({page}) => {
  await page.goto(url)
  await expect(page.locator('#top h3')).toContainText('Translation Tool')
  await fillPublicImport(page)
  await expect(page.locator('.num-changes')).not.toBeVisible()
  await expect(page.locator('nav .nav-link:first-of-type')).toContainText('EditorTest')
  expect(await page.inputValue('table .form-control:first-of-type')).toContain('Public Testing')
  expect(await page.inputValue('#rawOutput')).toContain('Public Testing')

  await page.locator('table .form-control').first().fill('Changed! Abcdefghijklmnopqrstuvwxyz')
  await page.locator('[href="#output"]').click()
  expect(await page.inputValue('table .form-control:first-of-type')).toContain('Changed! Abcdefghijklmnopqrstuvwxyz')
  expect(await page.inputValue('#rawOutput')).toContain('Changed! Abcdefghijklmnopqrstuvwxyz')
  expect(await page.inputValue('#rawOutput')).not.toContain('Public Testing')

  await expect(page.locator('.num-changes')).toBeVisible()
  await expect(page.locator('.num-changes')).toContainText('1 change')
  await page.locator('table .form-control').last().fill('other change')
  await page.locator('[href="#output"]').click()
  await expect(page.locator('.num-changes')).toContainText('2 changes')
  await page.locator('table .form-control').last().fill('Submit')
  await page.locator('table .form-control').first().fill('Public Testing')
  await page.locator('[href="#output"]').click()
  await expect(page.locator('.num-changes')).not.toBeVisible()

  await page.locator('table .form-control').last().fill('to be saved')
  await page.locator('[href="#output"]').click()
  await expect(page.locator('.num-changes')).toContainText('1 change')
  expect(await page.inputValue('#rawOutput')).toContain('to be saved')
  await page.locator('text=clipboard').click()
  await page.on('dialog', dialog => dialog.accept())
  await expect(page.locator('.num-changes')).not.toBeVisible()
})


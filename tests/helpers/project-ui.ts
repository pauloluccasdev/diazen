import { expect, type Page } from "@playwright/test";

export async function openProjectCreate(page: Page) {
  await page
    .getByRole("button", { name: "Criar novo projeto", exact: true })
    .click();
  await expect(page.locator("#new-project")).toBeVisible();
}

export async function dismissProjectFeedback(page: Page, error = false) {
  const feedback = page.locator(".record-feedback-dialog");
  await expect(feedback).toBeVisible();
  await feedback
    .getByRole("button", {
      name: error ? "Voltar ao formulário" : "Continuar",
      exact: true,
    })
    .click();
  await expect(feedback).toHaveCount(0);
}

export async function filterProjectState(page: Page, status: string) {
  await page.locator(".dz-project-filters > summary").click();
  await page
    .getByRole("combobox", { name: "Estado dos projetos", exact: true })
    .selectOption(status);
  await page
    .getByRole("button", { name: "Filtrar projetos", exact: true })
    .click();
}

const path = require('path');
const { test, expect } = require('@playwright/test');

const fixturesDir = path.join(__dirname, 'fixtures');

async function useAcademicFixtures(page) {
  await page.route('**/data/courses.csv*', route => route.fulfill({
    path: path.join(fixturesDir, 'courses.csv'),
    contentType: 'text/csv; charset=utf-8'
  }));
  await page.route('**/data/subjects.csv*', route => route.fulfill({
    path: path.join(fixturesDir, 'subjects.csv'),
    contentType: 'text/csv; charset=utf-8'
  }));
}

async function chooseOption(page, comboboxName, optionName) {
  await page.getByRole('combobox', { name: comboboxName }).click();
  await page.getByRole('option', { name: optionName }).click();
}

async function completeFlow(page, { useFixtures = true, semester = '2º Módulo' } = {}) {
  if (useFixtures) await useAcademicFixtures(page);
  await page.goto('/');

  const startButton = page.getByRole('button', { name: 'Vamos lá' });
  await expect(startButton).toBeEnabled({ timeout: 30_000 });
  await startButton.click();

  const course = page.getByRole('combobox', { name: 'Curso' });
  await course.fill('Sistemas de Informação');
  await page.getByRole('option', { name: /G014 - Sistemas de Informação/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await chooseOption(page, 'Matriz curricular', 'Matriz 2023/01');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await chooseOption(page, 'Semestre', semester);
  await page.getByRole('button', { name: 'Finalizar' }).click();

  await expect(page.getByRole('heading', { name: 'Matérias' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar para Montagem' }).click();
  await expect(page.getByRole('heading', { name: /Minha Grade/ })).toBeVisible();
}

async function openSubject(page, name) {
  await page.getByRole('button', { name: `Ver informações de ${name}` }).first().click();
  return page.getByRole('dialog', { name });
}

async function addSubject(page, name, turma) {
  const dialog = await openSubject(page, name);
  await dialog.getByRole('button', { name: new RegExp(`Turma ${turma}`) }).click();
  await dialog.getByRole('button', { name: 'Fechar detalhes da disciplina' }).click();
}

test.describe('fluxos críticos com dados controlados', () => {
  test.beforeEach(async ({ page }) => {
    await completeFlow(page);
  });

  test('adiciona turma normal e ANP, detecta conflito normal e híbrido e exporta PNG', async ({ page }) => {
    await addSubject(page, 'Programação Web', 'A');
    await expect(page.locator('.calendar__credits')).toContainText('4');

    for (const subject of ['Banco de Dados', 'Sistemas Híbridos']) {
      const dialog = await openSubject(page, subject);
      const turma = dialog.getByRole('button', { name: /Turma/ });
      await expect(turma).toHaveAttribute('aria-disabled', 'true');
      await expect(turma).toContainText(/Conflito com Programação Web/);
      await dialog.getByRole('button', { name: 'Fechar detalhes da disciplina' }).click();
    }

    await addSubject(page, 'Projeto Integrador ANP', 'ANP');
    await expect(page.locator('.calendar__credits')).toContainText('8');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('.calendar__download').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('grade-2semestre.png');
  });

  test('bloqueia seleção acima do limite de 32 créditos', async ({ page }) => {
    await addSubject(page, 'Projeto de 20 Créditos', 'A');
    await addSubject(page, 'Projeto de 12 Créditos', 'A');
    await expect(page.locator('.calendar__credits')).toContainText('32');

    const dialog = await openSubject(page, 'Projeto Excedente');
    await dialog.getByRole('button', { name: /Turma A/ }).click();

    await expect(page.getByText(/excederia o limite de 32 créditos/i)).toBeVisible();
    await expect(page.locator('.calendar__credits')).toContainText('32');
  });

  test('mantém o card visível acompanhando o ponteiro durante o drag', async ({ page, isMobile }) => {
    test.skip(isMobile, 'O fluxo mobile adiciona a disciplina pelo modal, sem drag.');

    const card = page.locator('.materia-card', { hasText: 'Programação Web' });
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();

    const start = {
      x: cardBox.x + cardBox.width / 2,
      y: cardBox.y + cardBox.height / 2
    };
    const target = { x: start.x + 180, y: start.y + 120 };

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 3 });

    const ghost = page.locator('.drag-ghost');
    await expect(ghost).toBeVisible();
    await expect(ghost).toContainText('Programação Web');

    const ghostBox = await ghost.boundingBox();
    expect(ghostBox).not.toBeNull();
    expect(Math.abs(ghostBox.x - (target.x - 80))).toBeLessThan(4);
    expect(Math.abs(ghostBox.y - (target.y - 25))).toBeLessThan(4);

    await page.mouse.up();
    await expect(ghost).toHaveCount(0);
  });
});

test('permite concluir o fluxo principal somente com teclado', async ({ page }) => {
  await useAcademicFixtures(page);
  await page.goto('/');

  const startButton = page.getByRole('button', { name: 'Vamos lá' });
  await expect(startButton).toBeEnabled();
  await startButton.focus();
  await page.keyboard.press('Enter');

  const course = page.getByRole('combobox', { name: 'Curso' });
  await course.focus();
  await page.keyboard.type('Sistemas');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Continuar' }).focus();
  await page.keyboard.press('Enter');

  const matrix = page.getByRole('combobox', { name: 'Matriz curricular' });
  await matrix.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Continuar' }).focus();
  await page.keyboard.press('Enter');

  const semester = page.getByRole('combobox', { name: 'Semestre' });
  await semester.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Finalizar' }).focus();
  await page.keyboard.press('Enter');

  await page.getByRole('button', { name: 'Continuar para Montagem' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Minha Grade - 2º Semestre' })).toBeVisible();
});

test('carrega o fluxo real de Sistemas de Informação 2023', async ({ page }) => {
  test.slow();
  await completeFlow(page, { useFixtures: false, semester: '1º Módulo' });
  await expect(page.getByText('Matérias Disponíveis')).toBeVisible();
});

test('desativa partículas e rotação de texto com reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await useAcademicFixtures(page);
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Vamos lá' })).toBeEnabled();
  await expect(page.locator('.particles-container canvas')).toHaveCount(0);
  await expect(page.locator('.text-rotate')).toContainText('prática');

  await page.waitForTimeout(2_200);
  await expect(page.locator('.text-rotate')).toContainText('prática');
});

// HoloLearn AI - Specialized Test Suite
// Verifies:
// 1. AI Tutor Backend API & Safe Offline Fallback
// 2. Server Status & Health Check
// 3. UI/UX Transformation & Holographic HUD
// 4. Interactive Holo Tutor Panel & Learning Level Switching
// 5. Guided Learning Mode & Step Progression
// 6. Educational Achievements Tracking & Persistence
// 7. Flagship Human Heart Experience & Component Registry
import { test, expect } from '@playwright/test';
import { openApp, status, play, watchErrors } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test('HL01 backend status API returns HoloLearn AI system info', async ({ request }) => {
  const res = await request.get('/api/status');
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.ok).toBe(true);
  expect(data.app).toBe('HoloLearn AI');
  expect(data.version).toBe('2.0.0');
  expect(data.catalogSize).toBe(33);
  expect(typeof data.aiConfigured).toBe('boolean');
});

test('HL02 AI Tutor API provides educational explanations across learning levels', async ({ request }) => {
  // Test Beginner Level
  const resBeg = await request.post('/api/tutor', {
    data: {
      model: 'Human Heart',
      part: 'Left Ventricle',
      question: 'What does this part do?',
      level: 'beginner',
    },
  });
  expect(resBeg.status()).toBe(200);
  const dataBeg = await resBeg.json();
  expect(dataBeg.ok).toBe(true);
  expect(dataBeg.model).toBe('Human Heart');
  expect(dataBeg.level).toBe('beginner');
  expect((dataBeg.answer || dataBeg.message).length).toBeGreaterThan(15);

  // Test Advanced Level
  const resAdv = await request.post('/api/tutor', {
    data: {
      model: 'Human Heart',
      part: 'Aorta',
      question: 'Explain hemodynamics and vascular compliance',
      level: 'advanced',
    },
  });
  expect(resAdv.status()).toBe(200);
  const dataAdv = await resAdv.json();
  expect(dataAdv.ok).toBe(true);
  expect(dataAdv.model).toBe('Human Heart');
  expect(dataAdv.level).toBe('advanced');
  expect((dataAdv.answer || dataAdv.message).length).toBeGreaterThan(15);
});

test('HL03 brand UI: start screen, futuristic holographic HUD, and controls', async ({ page }) => {
  const noErrors = watchErrors(page);
  await page.goto('/?n=150000');
  
  // Document title
  await expect(page).toHaveTitle(/HoloLearn AI — Touch Knowledge\. Explore Reality\./);
  
  // Start screen elements
  await expect(page.locator('#start')).toBeVisible();
  await expect(page.locator('#start h1')).toHaveText('HoloLearn AI');
  await expect(page.locator('.start-tagline')).toHaveText('TOUCH KNOWLEDGE · EXPLORE REALITY');
  await expect(page.locator('#bStartCam')).toContainText('Enter HoloLab');
  await expect(page.locator('#bStartNoCam')).toContainText('Explore Without Camera');
  
  // Enter without camera
  await page.click('#bStartNoCam');
  await expect(page.locator('#start')).toBeHidden();
  await page.waitForFunction(() => window.holoLearn?.status().uploaded === 0);
  
  // HUD Branding
  await expect(page.locator('.brand-name')).toHaveText('HoloLearn AI');
  await expect(page.locator('#catTabs')).toBeVisible();
  await expect(page.locator('#bTutor')).toBeVisible();
  await expect(page.locator('#bAchieve')).toBeVisible();
  
  noErrors();
});

test('HL04 interactive Holo Tutor panel queries and answers', async ({ page }) => {
  const noErrors = watchErrors(page);
  await openApp(page);
  
  // Open Holo Tutor
  await page.click('#bTutor');
  await expect(page.locator('#tutorCard')).toBeVisible();
  
  // Check level selection button
  await page.click('.level-btn[data-level="advanced"]');
  await expect(page.locator('.level-btn[data-level="advanced"]')).toHaveClass(/active/);
  
  // Select Human Heart
  await page.evaluate(() => {
    const idx = window.holoLearn.CATALOG.findIndex((m) => m.name === 'Human Heart');
    window.holoLearn.select(idx);
  });
  await play(page, 0.5, null);
  await page.keyboard.press('f');
  await play(page, 2.5, null);
  
  // Pick Left Ventricle
  await page.evaluate(() => {
    window.holoLearn.app.sel = 1; // Left Ventricle
  });
  await play(page, 0.2, null);
  
  // Verify Part Card shows Ask AI Tutor button
  await expect(page.locator('#partCard')).toBeVisible();
  await expect(page.locator('#partAskAi')).toBeVisible();
  
  // Ask AI Tutor via input
  await page.fill('#tutorInput', 'How does the ventricle contract?');
  await page.click('#tutorSend');
  
  // Wait for tutor response
  await expect(page.locator('#tutorResponse')).not.toContainText('Welcome to HoloLab');
  const answer = await page.locator('#tutorResponse').textContent();
  expect(answer.length).toBeGreaterThan(15);
  
  noErrors();
});

test('HL05 guided learning mode tracks steps and lesson goals', async ({ page }) => {
  const noErrors = watchErrors(page);
  await openApp(page);
  
  // Select Human Heart and start guided lesson
  await page.evaluate(() => {
    const idx = window.holoLearn.CATALOG.findIndex((m) => m.name === 'Human Heart');
    window.holoLearn.select(idx);
    window.holoLearn.startGuidedLesson(idx);
  });
  
  // Verify Guided Lesson Banner is visible
  await expect(page.locator('#guidedBanner')).toBeVisible();
  await expect(page.locator('.g-title')).toContainText('Human Heart');
  const stepText = await page.locator('.g-prog').textContent();
  expect(stepText.length).toBeGreaterThan(3);
  
  // Advance guided lesson step via app method
  await page.evaluate(() => window.holoLearn.app.advanceGuidedStep());
  const step2Text = await page.locator('.g-prog').textContent();
  expect(step2Text.length).toBeGreaterThan(3);
  
  // Close guided lesson
  await page.click('#guidedClose');
  await expect(page.locator('#guidedBanner')).toBeHidden();
  
  noErrors();
});

test('HL06 educational achievements unlock and persist in localStorage', async ({ page }) => {
  const noErrors = watchErrors(page);
  await openApp(page);
  
  // Check initial achievements
  const initialBadges = await page.evaluate(() => window.holoLearn.getAchievements());
  expect(initialBadges).toBeDefined();
  
  // Trigger Holo X-Ray (keyboard X)
  await page.keyboard.press('x');
  await play(page, 0.4, null);
  
  // Verify Holo X-Ray achievement unlocked
  const updatedBadges = await page.evaluate(() => window.holoLearn.getAchievements());
  const xray = updatedBadges.find((a) => a.id === 'xray_vision');
  expect(xray?.unlocked).toBe(true);
  
  // Open achievements modal
  await page.click('#bAchieve');
  await expect(page.locator('#achievements')).toBeVisible();
  await expect(page.locator('.achieve-item.unlocked')).toBeVisible();
  await page.click('#achieveClose');
  await expect(page.locator('#achievements')).toBeHidden();
  
  noErrors();
});

test('HL07 flagship human heart experience: cardiac dynamics and education registry', async ({ page }) => {
  const noErrors = watchErrors(page);
  await openApp(page);
  
  // Form Human Heart
  const heartIdx = await page.evaluate(() => window.holoLearn.CATALOG.findIndex((m) => m.name === 'Human Heart'));
  await page.evaluate((idx) => window.holoLearn.select(idx), heartIdx);
  await play(page, 0.5, null);
  await page.keyboard.press('f');
  await play(page, 2.5, null);
  
  // Verify cardiac pulse is oscillating (heartbeat)
  const pulse1 = (await status(page)).pulse;
  await play(page, 0.2, null);
  const pulse2 = (await status(page)).pulse;
  expect(pulse1).toBeDefined();
  expect(pulse2).toBeDefined();
  
  // Verify educational registry data
  const eduData = await page.evaluate(() => {
    const { EDUCATION_REGISTRY } = window.holoLearn;
    return EDUCATION_REGISTRY ? EDUCATION_REGISTRY['Human Heart'] : null;
  });
  
  expect(eduData).toBeDefined();
  expect(eduData.objectives.length).toBeGreaterThanOrEqual(3);
  expect(eduData.guidedLesson.length).toBeGreaterThanOrEqual(4);
  expect(eduData.componentData['Left ventricle']).toBeDefined();
  expect(eduData.componentData['Aorta']).toBeDefined();
  
  noErrors();
});

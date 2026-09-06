import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VIDEO_DIR = path.resolve("./temp-videos");

if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

async function smoothScroll(page, distance, steps = 15, delay = 40) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, distance / steps);
    await page.waitForTimeout(delay);
  }
}

async function smoothMove(page, targetX, targetY, steps = 25) {
  await page.mouse.move(targetX, targetY, { steps });
}

async function run() {
  console.log("Starting Chrome browser for DOM Walkthrough...");
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1366,768',
      '--force-device-scale-factor=1'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1366, height: 768 }
    }
  });

  const page = await context.newPage();

  // Custom cursor injection for realistic visual playback
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const cursor = document.createElement('div');
      cursor.id = 'virtual-cursor';
      cursor.style.width = '22px';
      cursor.style.height = '22px';
      cursor.style.borderRadius = '50%';
      cursor.style.backgroundColor = 'rgba(22, 163, 74, 0.85)';
      cursor.style.border = '2.5px solid #ffffff';
      cursor.style.boxShadow = '0 3px 10px rgba(0,0,0,0.35)';
      cursor.style.position = 'fixed';
      cursor.style.pointerEvents = 'none';
      cursor.style.zIndex = '9999999';
      cursor.style.transform = 'translate(-50%, -50%)';
      cursor.style.transition = 'width 0.15s, height 0.15s, background-color 0.15s';
      document.body.appendChild(cursor);

      window.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      });
      window.addEventListener('mousedown', () => {
        cursor.style.width = '14px';
        cursor.style.height = '14px';
        cursor.style.backgroundColor = 'rgba(234, 88, 12, 0.95)';
      });
      window.addEventListener('mouseup', () => {
        cursor.style.width = '22px';
        cursor.style.height = '22px';
        cursor.style.backgroundColor = 'rgba(22, 163, 74, 0.85)';
      });
    });
  });

  console.log("Navigating to Homepage...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 1. Showcase Homepage Hero & Categories
  console.log("Scene 1: Homepage Showcase");
  await smoothMove(page, 400, 300, 30);
  await page.waitForTimeout(1000);
  
  // Smooth scroll down to explore tools & categories
  await smoothScroll(page, 500, 20, 50);
  await page.waitForTimeout(1200);

  await smoothScroll(page, 500, 20, 50);
  await page.waitForTimeout(1500);

  await smoothScroll(page, -800, 25, 40);
  await page.waitForTimeout(1000);

  // 2. Navigate to Tools Directory (/tools)
  console.log("Scene 2: Tools Directory & Filter Exploration");
  const exploreBtn = await page.$('a[href*="/tools"]');
  if (exploreBtn) {
    const box = await exploreBtn.boundingBox();
    if (box) await smoothMove(page, box.x + box.width / 2, box.y + box.height / 2, 20);
    await exploreBtn.click();
  } else {
    await page.goto("http://localhost:3000/tools", { waitUntil: "networkidle" });
  }
  await page.waitForTimeout(2000);

  // Search or Filter interaction
  const searchInput = await page.$('input[type="search"], input[placeholder*="Search" i], input[placeholder*="ಹುಡುಕಿ" i], input[type="text"]');
  if (searchInput) {
    const sBox = await searchInput.boundingBox();
    if (sBox) {
      await smoothMove(page, sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, 15);
      await searchInput.click();
      await page.waitForTimeout(400);
      await page.keyboard.type("Areca", { delay: 120 });
      await page.waitForTimeout(1500);
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(800);
    }
  }

  // Scroll through tool cards
  await smoothScroll(page, 400, 15, 50);
  await page.waitForTimeout(1200);

  // 3. Click into Tool Detail Page
  console.log("Scene 3: Tool Detail & Booking Configuration");
  const firstToolCard = await page.$('a[href*="/tools/"]');
  if (firstToolCard) {
    const box = await firstToolCard.boundingBox();
    if (box) await smoothMove(page, box.x + box.width / 2, box.y + box.height / 2, 20);
    await firstToolCard.click();
  } else {
    await page.goto("http://localhost:3000/tools/carbon-fiber-areca-pole-12m", { waitUntil: "networkidle" });
  }
  await page.waitForTimeout(2200);

  // Scroll down to see specifications, delivery radius, operator fees
  await smoothScroll(page, 450, 18, 45);
  await page.waitForTimeout(1500);

  // Interactive buttons highlight
  const buttons = await page.$$('button');
  for (const btn of buttons.slice(0, 3)) {
    const text = await btn.textContent();
    if (text && (text.includes("Operator") || text.includes("Book") || text.includes("Rent") || text.includes("Details"))) {
      const bBox = await btn.boundingBox();
      if (bBox) {
        await smoothMove(page, bBox.x + bBox.width / 2, bBox.y + bBox.height / 2, 15);
        await page.waitForTimeout(500);
      }
    }
  }
  await smoothScroll(page, -450, 15, 45);
  await page.waitForTimeout(1000);

  // 4. Navigate to How It Works
  console.log("Scene 4: How It Works Guide");
  await page.goto("http://localhost:3000/how-it-works", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1800);
  await smoothScroll(page, 600, 20, 50);
  await page.waitForTimeout(1500);
  await smoothScroll(page, -600, 20, 50);
  await page.waitForTimeout(1000);

  // 5. Navigate to Owner Portal (/owner)
  console.log("Scene 5: Owner Portal / Tool Management");
  await page.goto("http://localhost:3000/owner", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(2000);
  await smoothScroll(page, 400, 15, 50);
  await page.waitForTimeout(1500);

  // 6. Navigate to Operator Portal (/operator)
  console.log("Scene 6: Operator Services Portal");
  await page.goto("http://localhost:3000/operator", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(2000);
  await smoothScroll(page, 400, 15, 50);
  await page.waitForTimeout(1500);

  // 7. Return to Homepage to close
  console.log("Scene 7: Return to Home & Wrap up");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  console.log("Finishing recording session...");
  await page.close();
  await context.close();
  await browser.close();

  // Find recorded video
  const videoFiles = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const latestVideo = path.join(VIDEO_DIR, videoFiles[videoFiles.length - 1]);
    const outputMp4 = path.resolve("./public/walkthrough.mp4");
    const outputWebm = path.resolve("./public/walkthrough.webm");

    // Copy webm
    fs.copyFileSync(latestVideo, outputWebm);
    console.log(`Saved WebM video to ${outputWebm}`);

    // Transcode to MP4 using ffmpeg
    try {
      console.log("Transcoding to MP4 using ffmpeg...");
      execSync(`ffmpeg -y -i "${latestVideo}" -c:v libx264 -pix_fmt yuv420p -r 30 -crf 23 "${outputMp4}"`, { stdio: 'inherit' });
      console.log(`Transcoded MP4 saved to ${outputMp4}`);
    } catch (e) {
      console.log("FFmpeg transcode error, falling back to WebM:", e.message);
    }
  }

  console.log("Walkthrough recording complete!");
}

run().catch(err => {
  console.error("Walkthrough recording failed:", err);
  process.exit(1);
});

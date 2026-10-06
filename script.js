// ========== Melaura — script ==========

// ---------- Mobile menu ----------
const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
toggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

// ---------- Scroll reveal + shelf-life bars ----------
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      if (entry.target.classList.contains("bar-fill")) {
        entry.target.style.width = entry.target.dataset.width + "%";
      }
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal, .bar-fill").forEach((el) => observer.observe(el));

// ---------- Flip cards ----------
document.querySelectorAll(".flip").forEach((card) =>
  card.addEventListener("click", () => card.classList.toggle("flipped"))
);

// ---------- Mix calculator (approx. 1 part powder : 9 parts water) ----------
const mixRange = document.getElementById("mixRange");
function updateMix() {
  const ml = Number(mixRange.value);
  const powder = Math.round(ml * 0.1);
  const water = ml - powder;
  document.getElementById("mixMl").textContent = ml >= 1000 ? (ml / 1000).toFixed(2).replace(/\.?0+$/, "") + " L" : ml + " ml";
  document.getElementById("mixPowder").textContent = powder + " g";
  document.getElementById("mixWater").textContent = water + " ml";
  document.getElementById("mixFill").style.height = (ml / 2000) * 100 + "%";
}
mixRange.addEventListener("input", updateMix);
updateMix();

// ---------- Signup form (no backend — demo only) ----------
document.getElementById("signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("formMsg").textContent = "Thank you! We'll let you know when Melaura arrives in Lithuania. 🥛";
  e.target.reset();
});

// ---------- Mini game: Milk Catch ----------
const game = document.getElementById("gameArea");
const glass = document.getElementById("glass");
const glassFill = document.getElementById("glassFill");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");

const GAME_LENGTH = 25;
let drops = [];
let score = 0;
let timeLeft = GAME_LENGTH;
let running = false;
let glassX = 0;
let lastSpawn = 0;
let lastFrame = 0;
let timerId = null;
let best = 0;

try {
  best = Number(localStorage.getItem("melauraBest")) || 0;
} catch (e) { /* storage not available */ }
bestEl.textContent = best;

function moveGlass(clientX) {
  const rect = game.getBoundingClientRect();
  const half = glass.offsetWidth / 2;
  glassX = Math.max(half, Math.min(rect.width - half, clientX - rect.left));
  glass.style.left = glassX + "px";
}
game.addEventListener("pointermove", (e) => running && moveGlass(e.clientX));
game.addEventListener("pointerdown", (e) => running && moveGlass(e.clientX));
document.addEventListener("keydown", (e) => {
  if (!running) return;
  const rect = game.getBoundingClientRect();
  if (e.key === "ArrowLeft") moveGlass(rect.left + glassX - 30);
  if (e.key === "ArrowRight") moveGlass(rect.left + glassX + 30);
});

function spawnDrop() {
  const el = document.createElement("div");
  const bad = Math.random() < 0.25;
  el.className = "drop " + (bad ? "bad" : "good");
  const x = Math.random() * (game.clientWidth - 24);
  el.style.left = x + "px";
  game.appendChild(el);
  // drops get a bit faster as time runs out
  const speed = 140 + Math.random() * 90 + (GAME_LENGTH - timeLeft) * 6;
  drops.push({ el, x, y: -24, speed, bad });
}

function showPop(text, x, y, color) {
  const p = document.createElement("div");
  p.className = "pop";
  p.textContent = text;
  p.style.left = x + "px";
  p.style.top = y + "px";
  p.style.color = color;
  game.appendChild(p);
  setTimeout(() => p.remove(), 700);
}

function loop(now) {
  if (!running) return;
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;

  if (now - lastSpawn > 520) {
    spawnDrop();
    lastSpawn = now;
  }

  const gameH = game.clientHeight;
  const glassTop = gameH - 14 - glass.offsetHeight;
  const half = glass.offsetWidth / 2;

  drops = drops.filter((d) => {
    d.y += d.speed * dt;
    d.el.style.transform = `translateY(${d.y}px)`;
    const centerX = d.x + 10;

    // caught?
    if (d.y > glassTop - 10 && d.y < glassTop + 20 && Math.abs(centerX - glassX) < half) {
      if (d.bad) {
        score = Math.max(0, score - 2);
        showPop("-2 lump!", centerX, glassTop - 20, "#6b4f3a");
      } else {
        score += 1;
        showPop("+1", centerX, glassTop - 20, "#2f5d3a");
      }
      scoreEl.textContent = score;
      glassFill.style.height = Math.min(100, (score % 10) * 10 + (score >= 10 ? 10 : 0)) + "%";
      d.el.remove();
      return false;
    }
    // missed
    if (d.y > gameH) {
      d.el.remove();
      return false;
    }
    return true;
  });

  requestAnimationFrame(loop);
}

function startGame() {
  drops.forEach((d) => d.el.remove());
  drops = [];
  score = 0;
  timeLeft = GAME_LENGTH;
  scoreEl.textContent = 0;
  timeEl.textContent = timeLeft;
  glassFill.style.height = "0%";
  overlay.classList.add("hidden");
  moveGlass(game.getBoundingClientRect().left + game.clientWidth / 2);
  running = true;
  lastFrame = performance.now();
  lastSpawn = lastFrame;
  requestAnimationFrame(loop);

  timerId = setInterval(() => {
    timeLeft--;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  running = false;
  clearInterval(timerId);
  drops.forEach((d) => d.el.remove());
  drops = [];

  if (score > best) {
    best = score;
    bestEl.textContent = best;
    try { localStorage.setItem("melauraBest", best); } catch (e) { /* ignore */ }
  }

  const glasses = Math.floor(score / 10);
  let msg;
  if (glasses === 0) msg = `Score ${score}. Not a full glass yet — try again!`;
  else if (glasses === 1) msg = `Score ${score}. You made 1 glass of milk! 🥛`;
  else msg = `Score ${score}. You made ${glasses} glasses of milk! 🥛`;

  overlayText.textContent = msg + " (10 points = 1 glass)";
  startBtn.textContent = "Play again";
  overlay.classList.remove("hidden");
}

startBtn.addEventListener("click", startGame);

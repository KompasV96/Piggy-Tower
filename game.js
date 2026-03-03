
// ---------- CANVAS ----------
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const HUD = 70;
const REAL_HEIGHT = GAME_HEIGHT + HUD;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");


// blokuje zaznaczanie i menu przytrzymania
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("selectstart", e => e.preventDefault());
canvas.addEventListener("dragstart", e => e.preventDefault());

function resize(){

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const viewH = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;

  const viewW = window.visualViewport
    ? window.visualViewport.width
    : window.innerWidth;

  const safeVH = Math.min(viewH, document.documentElement.clientHeight);

  const scale = Math.min(
    viewW / GAME_WIDTH,
    safeVH / REAL_HEIGHT
  );

  canvas.style.width = GAME_WIDTH * scale + "px";
  canvas.style.height = REAL_HEIGHT * scale + "px";

  canvas.width  = Math.floor(GAME_WIDTH * dpr);
  canvas.height = Math.floor(REAL_HEIGHT * dpr);

  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", resize);
resize();

function getPointerPos(e){
  const rect = canvas.getBoundingClientRect();

  const scaleX = GAME_WIDTH / rect.width;
  const scaleY = REAL_HEIGHT / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY
  };
}
function getCompassShake(){
  let t = getLavaRatio();

  if(t < 0.85) return 0;

  let power = (t - 0.85) / 0.15;
  return Math.sin(performance.now()*0.04) * 2 * power;
}
function getCompassClickPulse(){
 if(boostCharges <= 0) return 0;
  return Math.sin(uiTime * 8) * 4 + 4;
}
// ---------- GAME STATE --------------------------------------
let gameState = "start"; 
// start | play | pause | dead | loading
let loadingTimer = 0;
// ---------- AUDIO ----------
const music = new Audio("audio/techno_loop.mp3");
music.loop = true;
music.volume = 0;     // start cisza
let musicStarted = false;

// ---------- PLAYER ----------------------------------------------
let player = {
  x: GAME_WIDTH/2 - 15,
  y: REAL_HEIGHT - 120,
  w: 30, h: 30,
  vx: 0, vy: 0,
  lastY: REAL_HEIGHT - 120
};
let currentPigColor = "#fff";
let compass = { x:0, y:0, r:26 };
const UI_MARGIN = 20;
const SAFE = Math.max(20, GAME_WIDTH * 0.04);

let boostButton = {
  x: 0,
  y: 0,
  r: 28
};
// ---------- PHYSICS ----------------------------------------------
let gravity = 2400;
let jumpPower = -1000;
let maxFall = 1400;
let speedKeyboard = 600;
let speedTouch = 400;
// FLOW
let airControl = 0.55;     // sterowanie w powietrzu
let coyoteTime = 0.08;     // można skoczyć chwilę po zejściu
let coyoteTimer = 0;
let jumpBuffer = 0.12;     // wciśniesz przed lądowaniem = zadziała
let jumpBufferTimer = 0;
let onGround = false;
let deathSmokeTimer = 0;
let deathFlash = 0;
let baconMode = false;

// ---------- SCORE ------------------------------------------------
let worldOffset = 0;
let score = 0;
let bestScore = Number(localStorage.getItem("piggyBest")) || 0;


// ---------- DANGER ----------------------------------------------------
let dangerY = REAL_HEIGHT + 200;
let dangerSpeed = 120;



// ---------- PLATFORMS ----------------------------------------------------
const PLATFORM_COUNT = 20;
const PLATFORM_GAP = GAME_HEIGHT * 0.22;
let platforms = [];

// ---------- COINS -----------------------------------------------------------
let coins = [];
let coinScore = 0;

// ---------- boskie szczescie --------------------------------------------------

let miracleMargin = 25; // ile px od lawy to „o włos”
let miraclePower = 5 * PLATFORM_GAP; // 5 platform w górę
let miracleUsed = false;

// BOOST (jednorazowy tryb)
let boostCharges = 3;
const maxBoostCharges = 3;
let boosting = false;

let boostDuration = 1.1;
let boostTimer = 0;

let boostForce = 3400;       // siła ciągu co sekundę
let boostGravityFactor =0.18; // lżejsza grawitacja
let boostControlLock = 0.18;
let boostLockTimer = 0;
let boostVisualTime = 0;
let boostAfterglow = 0;
const BOOST_AFTERGLOW_TIME = 2.5;
let uiTime = 0;
let blinkTimer = 0;
let nextBlink = 2 + Math.random()*3;
let blink = 0; // 0 = otwarte, 1 = zamknięte
let screenShakeTime = 0;
let screenShakePower = 0;
let boostFlash = 0;
let stars = [];
let shootingStar = null;
let nextShootingStar = 5 + Math.random()*8; // pierwsza za kilka sekund
function createPlatform(y){

  const minW = GAME_WIDTH * 0.18;   // mała
  const maxW = GAME_WIDTH * 0.32;   // duża

  let w = minW + Math.random()*(maxW - minW);
  let x = Math.random()*(GAME_WIDTH - w);

  return { x, y, w, h: GAME_HEIGHT * 0.03 };
}
function initPlatforms(){
  platforms = [];

platforms.push({
  x:0,
  y:REAL_HEIGHT-80,
  w:GAME_WIDTH,
  h:20
});
  let y = REAL_HEIGHT - 80 - PLATFORM_GAP;
  for(let i=1;i<PLATFORM_COUNT;i++){
    platforms.push(createPlatform(y));
    y -= PLATFORM_GAP;
  }

  spawnInitialCoins();
}
function initStars(){
  stars = [];

  for(let i=0;i<80;i++){
    stars.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * REAL_HEIGHT,
      size: Math.random()*2 + 1,
      phase: Math.random()*Math.PI*2,
      speed: 1 + Math.random()*2
    });
  }
}

initStars();
function recyclePlatforms(){
  let highest = Infinity;

  for(let p of platforms){
    if(p.y < highest) highest = p.y;
  }

  for(let p of platforms){
    if(p.y > REAL_HEIGHT + 50){

      highest -= PLATFORM_GAP;
      let np = createPlatform(highest);

      p.x = np.x;
      p.y = np.y;
      p.w = np.w;

      // 💰 spawn monety NA NOWEJ platformie
   
      if(Math.random() < 0.4){
        coins.push({
          x: p.x + Math.random() * (p.w - 20),
          y: p.y - (25 + Math.random()*30),
          r: 8
        });
      }
    }
  }
}

initPlatforms();

// ---------- INPUT ----------
let left=false, right=false, touchSide=0;

document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft") left=true;
  if(e.key==="ArrowRight") right=true;
  if(e.key==="ArrowUp") tryBoost();

  if(e.code==="Space" && gameState==="start"){
    e.preventDefault();
    gameState="play";
  }

  if((e.key==="r"||e.key==="R") && gameState==="dead") resetGame();
});

document.addEventListener("keyup", e=>{
  if(e.key==="ArrowLeft") left=false;
  if(e.key==="ArrowRight") right=false;
});
let touching = false;
let touchX = 0;

canvas.addEventListener("pointerdown", e=>{
  layoutUI();
  e.preventDefault();

  const pos = getPointerPos(e);
  const mx = pos.x;
  const my = pos.y;

  if(gameState==="pause"){
    gameState="play";
    return;
  }
 if(!musicStarted){
  music.play().catch(() => {});
  musicStarted = true;
}

  if(gameState==="start"){ gameState="play"; return; }
  if(gameState==="dead"){ resetGame(); return; }

  // HUD nie steruje ruchem
  if(my <= HUD){

  // PAUSE
  let dxp = mx - pauseButton.x;
  let dyp = my - pauseButton.y;
  if(Math.sqrt(dxp*dxp+dyp*dyp) <= pauseButton.r){
    if(gameState==="play") gameState="pause";
    else if(gameState==="pause") gameState="play";
    return;
  }

  // BOOST
  const dx = mx - compass.x;
  const dy = my - compass.y;
  if(Math.sqrt(dx*dx+dy*dy) <= compass.r*0.75){
    tryBoost();
  }

  return;
}

  touching = true;
  touchX = mx;
});

canvas.addEventListener("pointermove", e=>{
  if(!touching) return;

  const pos = getPointerPos(e);
touchX = pos.x;
});

canvas.addEventListener("pointerup", ()=>{
  touching = false;
});

canvas.addEventListener("pointercancel", ()=>{
  touching = false;
});
// ---------- RESET ----------
function spawnInitialCoins(){

  coins = [];

  for(let i=1;i<platforms.length;i++){ // pomijamy podłogę

    let p = platforms[i];

    if(Math.random() < 0.5){
      coins.push({
        x: p.x + Math.random()*(p.w-20),
        y: p.y - (20 + Math.random()*40),
        r: 8
      });
    }
  }
}

function snapCameraToPlayer(){

  // chcemy aby gracz był ~65% wysokości ekranu
  const targetY = REAL_HEIGHT * 0.65;

  const diff = targetY - player.y;

  if(diff === 0) return;

  worldOffset -= diff;

  for(let p of platforms) p.y -= diff;
  for(let c of coins) c.y -= diff;
  dangerY -= diff;

  player.y = targetY;
}

function resetGame(){
  
 player.x = GAME_WIDTH/2 - 15;
player.y = REAL_HEIGHT - 120;
  player.vx = 0;
  player.vy = 0;
  player.lastY = player.y;

  worldOffset = 0;
  score = 0;

  dangerY = REAL_HEIGHT + 200;
  dangerSpeed = 0;

  miracleUsed = false;

  left = false;
  right = false;
  touchSide = 0;

  initPlatforms();   // ← jedyne miejsce generacji monet
  coinScore = 0;
snapCameraToPlayer();
  gameState = "loading";
  loadingTimer = 400;

boostCharges = maxBoostCharges;
boostLockTimer = 0;
}
// ================= UPDATE =================
function tryBoost(){

  if(boostCharges <= 0 || gameState!=="play") return;

boostCharges--;
  boosting = true;
  boostTimer = boostDuration;
  boostVisualTime = 0;   // ← START ANIMACJI

  // lekki startowy kop
  if(player.vy > 0) player.vy *= 0.3;
  player.vy = -900;

  boostLockTimer = boostControlLock;
  screenShakeTime = 0.22;   // ile trwa
screenShakePower = 26;    // siła
  boostFlash = 1;
}

function updateState(dt){
  if(gameState!=="loading") return false;
  loadingTimer -= dt;
  if(loadingTimer<=0) gameState="start";
  return true;
}

function updateScore(){
  score = Math.floor(worldOffset/12) + coinScore;
}

function updateDanger(dtSec){

  // prędkość lawy
  dangerSpeed = 200 + worldOffset / 2000;
  dangerY -= dangerSpeed * dtSec;

  // odległość lawy od nóg gracza
  let distance = dangerY - (player.y + player.h);

  // ===== BOSKIE SZCZĘŚCIE =====
  if(!miracleUsed && distance < miracleMargin && distance > -20){

      miracleUsed = true;

      // cofnięcie lawy
      dangerY += 120;

      // WYSTRZAŁ W GÓRĘ
      player.vy = -Math.sqrt(2 * gravity * miraclePower);
  }

  // ===== ŚMIERĆ =====
  if(player.y + player.h > dangerY){
      gameState = "dead";
    deathSmokeTimer = 1.5;
    deathFlash = 1;
    baconMode = Math.random() < 0.15; // 15% szansy
    
      if(score > bestScore){
          bestScore = score;
          localStorage.setItem("piggyBest", bestScore);
      }
  }
}

function updatePlayer(dt,dtSec){
  player.lastY = player.y;
  // sprawdzanie ziemi
onGround = false;

  // ruch
 let targetSpeed = 0;

if(left) targetSpeed = -speedKeyboard;
else if(right) targetSpeed = speedKeyboard;
else if(touching){

 let mid = GAME_WIDTH/2;
  let dist = (touchX - mid) / mid; // -1..1

  // martwa strefa (stabilność)
  if(Math.abs(dist) < 0.08) dist = 0;

  // krzywa responsywności
  dist = Math.sign(dist) * Math.pow(Math.abs(dist), 0.65);

  targetSpeed = dist * speedTouch * 1.35;
}
let control = onGround ? 1 : airControl;

if(boostLockTimer > 0){
  control = 0.05;
  boostLockTimer -= dtSec;
}

player.vx += (targetSpeed - player.vx) * 14 * control * dtSec;

  player.x += player.vx*dtSec;
  if(player.x<0) player.x=0;
  if(player.x+player.w>GAME_WIDTH) player.x=GAME_WIDTH-player.w;

  // grawitacja
  let gravityFactor = 1;

if(boosting){
    gravityFactor = boostGravityFactor;

    // ciąg
    player.vy -= boostForce * dtSec;

    boostTimer -= dtSec;
    if(boostTimer <= 0){
    boosting = false;
    boostAfterglow = BOOST_AFTERGLOW_TIME;
}
}

player.vy += gravity * gravityFactor * dtSec;

if(player.vy > maxFall) player.vy = maxFall;
player.y += player.vy * dtSec;
  // animacja boosta
if(boosting){
  boostVisualTime = 1 - (boostTimer / boostDuration);
}else{
  boostVisualTime = 0;
}
  if(boostAfterglow > 0){
  boostAfterglow -= dtSec;
}
}

function updatePlatforms(dt){

  // --- KOLIZJE ---
  for(let p of platforms){

    let prevBottom = player.lastY + player.h;
    let currBottom = player.y + player.h;

    if(player.vy>0 &&
       prevBottom<=p.y &&
       currBottom>=p.y &&
       player.x<p.x+p.w &&
       player.x+player.w>p.x){

        player.y = p.y - player.h;
player.vy = jumpPower;

onGround = true;
coyoteTimer = coyoteTime;

break;
    }
  }

  // ===== KAMERA =====
  if(player.y < REAL_HEIGHT/2){

    let diff = REAL_HEIGHT/2 - player.y;

    player.y = REAL_HEIGHT/2;
    worldOffset += diff;

    for(let p of platforms) p.y += diff;
for(let c of coins) c.y += diff;   // ← TO BRAKOWAŁO
dangerY += diff;
  }
}
function updateCoins(){

  for(let i = coins.length-1; i >= 0; i--){

    let c = coins[i];

   

    // kolizja
    if(player.x < c.x + c.r &&
       player.x + player.w > c.x &&
       player.y < c.y + c.r &&
       player.y + player.h > c.y){

        coinScore += 50;
        coins.splice(i,1);
    }

    // usuwamy gdy spadną poza ekran
    if(c.y > REAL_HEIGHT + 20){
        coins.splice(i,1);
    }
  }
}
function update(dt){

  if(updateState(dt)) return;

  const dtSec = dt/1000;

  // ===== ZAWSZE DZIAŁA (nawet w pauzie) =====
  uiTime += dtSec;
    // ===== SPAADAJĄCA GWIAZDA TIMER =====
nextShootingStar -= dtSec;

if(nextShootingStar <= 0 && !shootingStar){

  shootingStar = {
    x: Math.random() * GAME_WIDTH,
    y: 50 + Math.random()*120,
    vx: -400 - Math.random()*200,
    vy: 200 + Math.random()*100,
    life: 1.2
  };

  nextShootingStar = 10 + Math.random()*15;
}

// ===== UPDATE GWIAZDY =====
if(shootingStar){

  shootingStar.x += shootingStar.vx * dtSec;
  shootingStar.y += shootingStar.vy * dtSec;
  shootingStar.life -= dtSec;

  if(shootingStar.life <= 0){
    shootingStar = null;
  }
}
  // blink
  blinkTimer += dtSec;

  if(blinkTimer > nextBlink){
    blink = 1;
    nextBlink = blinkTimer + 0.12;
  }

  if(blink === 1 && blinkTimer > nextBlink){
    blink = 0;
    nextBlink = blinkTimer + 2 + Math.random()*3;
  }

  // efekty wizualne
  if(screenShakeTime > 0){
    screenShakeTime -= dtSec;
    if(screenShakeTime < 0) screenShakeTime = 0;
  }

  if(boostFlash > 0){
    boostFlash -= dtSec * 6;
    if(boostFlash < 0) boostFlash = 0;
  }
  if(deathFlash > 0){
  deathFlash -= dt * 2;   // tempo zanikania
  if(deathFlash < 0) deathFlash = 0;
}
  
  if(deathSmokeTimer > 0){
  deathSmokeTimer -= dtSec;
}

  // ===== TU ZATRZYMUJEMY ŚWIAT =====
  if(gameState !== "play") return;

  // ===== FIZYKA GRY =====
  updateMusic(dtSec);
  updatePlayer(dt, dtSec);
  updatePlatforms(dt);
  updateCoins();
  recyclePlatforms();
  updateScore();
  updateDanger(dtSec);
}

function getRainbowColor(t){
  let a = t * Math.PI * 6; // ile zmian koloru w trakcie boosta
  let r = Math.sin(a)*127+128;
  let g = Math.sin(a+2)*127+128;
  let b = Math.sin(a+4)*127+128;
  return `rgb(${r|0},${g|0},${b|0})`;
}
function getScreenShakeOffset(){
  if(screenShakeTime <= 0) return {x:0,y:0};

  const DURATION = 0.22;
  let t = 1 - (screenShakeTime / DURATION); // ODWRÓCONE

  // mocny start → szybki zanik
  let intensity = screenShakePower * (1 - t*t*t);

  return {
    x: (Math.random()*2-1) * intensity,
    y: (Math.random()*2-1) * intensity * 0.6
  };
}

function getPigColor(dist){

  // krytycznie — zaraz śmierć
  if(dist < 140) return "#ff2a2a";

  // ostrzeżenie
  if(dist < 280) return "#ff00aa";

  // bezpiecznie
  return "#00e5ff";
}

function getLavaRatio(){
  let dist = dangerY - (player.y + player.h);

  // zakres w którym kompas reaguje
  let max = REAL_HEIGHT * 1.2;

  let t = 1 - (dist / max);
  if(t < 0) t = 0;
  if(t > 1) t = 1;

  return t;
}
function updateMusic(dtSec){

if(gameState !== "play"){
  music.volume += (0 - music.volume) * 2 * dtSec;
  return;
}

  // im bliżej lawy tym głośniej
  let t = getLavaRatio(); // 0..1

  // krzywa napięcia
  let target = 0.25 + Math.pow(t, 2) * 0.65;

  // płynne przejście
  music.volume += (target - music.volume) * 1.5 * dtSec;

  if(music.volume < 0.001) music.volume = 0;
}

function drawBackground(){

  // niebo
  const g = ctx.createLinearGradient(0,0,0,REAL_HEIGHT);
  g.addColorStop(0,"#050814");
  g.addColorStop(1,"#0b1a33");

  ctx.fillStyle = g;
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

  // księżyc
  ctx.fillStyle="#f5f3ce";
  ctx.beginPath();
  ctx.arc(GAME_WIDTH*0.78, 110, 38, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle="rgba(255,255,200,0.08)";
  ctx.beginPath();
  ctx.arc(GAME_WIDTH*0.78, 110, 80, 0, Math.PI*2);
  ctx.fill();

  // ===== MIGAJĄCE GWIAZDY =====
for(let s of stars){

  let twinkle = Math.sin(uiTime * s.speed + s.phase) * 0.5 + 0.5;

  // przy lawie lekko bardziej dramatyczne
  let lavaT = getLavaRatio();
  twinkle += lavaT * 0.3;

  if(twinkle > 1) twinkle = 1;

  ctx.fillStyle = "rgba(255,255,255," + twinkle + ")";
  ctx.fillRect(s.x, s.y, s.size, s.size);
}

  // chmury
  ctx.fillStyle="rgba(255,255,255,0.08)";
  drawCloud(60,180,70);
  drawCloud(260,240,60);
  drawCloud(180,120,55);

  ctx.fillStyle="rgba(255,255,255,0.16)";
  drawCloud(120,330,90);
  drawCloud(280,420,110);

// ===== SPAADAJĄCA GWIAZDA =====
if(shootingStar){

  const s = shootingStar;

  ctx.save();

  ctx.globalAlpha = Math.max(0, s.life);

  // ogon
  let grad = ctx.createLinearGradient(
    s.x, s.y,
    s.x + 60, s.y - 40
  );

  grad.addColorStop(0,"white");
  grad.addColorStop(1,"rgba(255,255,255,0)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x + 60, s.y - 40);
  ctx.stroke();

  // punkt
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(s.x, s.y, 3, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}
}
function drawCloud(x,y,s){
  ctx.beginPath();
  ctx.arc(x,y,s*0.5,0,Math.PI*2);
  ctx.arc(x+s*0.6,y+5,s*0.45,0,Math.PI*2);
  ctx.arc(x-s*0.6,y+8,s*0.4,0,Math.PI*2);
  ctx.arc(x,y+15,s*0.55,0,Math.PI*2);
  ctx.fill();
}
  // ====== WORLD ======
 
function drawWorld(){
  ctx.save();
  ctx.translate(0, HUD);

  drawLava();
  drawPlatforms();
  drawCoins();
  drawPlayer();
  drawPanicBubble();
  drawDeathSmoke();
  
  ctx.restore();
}

 function drawLava(){

  const t = uiTime;

  // ===== PODSTAWA =====
  let grad = ctx.createLinearGradient(0,dangerY,0,REAL_HEIGHT);
  grad.addColorStop(0,"#ff2a2a");
  grad.addColorStop(0.5,"#ff0040");
  grad.addColorStop(1,"#2a0000");

  ctx.fillStyle = grad;
  ctx.fillRect(0,dangerY,GAME_WIDTH,REAL_HEIGHT);

  // ===== FALA POWIERZCHNI =====
  ctx.beginPath();

  const waveH = 6;

  for(let x=0;x<=GAME_WIDTH;x+=6){
    let y = dangerY + Math.sin(x*0.05 + t*3)*waveH
                      + Math.sin(x*0.12 + t*2)*waveH*0.5;

    if(x===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }

  ctx.lineTo(GAME_WIDTH,REAL_HEIGHT);
ctx.lineTo(0,REAL_HEIGHT);
  ctx.closePath();

  let surf = ctx.createLinearGradient(0,dangerY-10,0,dangerY+20);
  surf.addColorStop(0,"#ffff66");
  surf.addColorStop(1,"#ff3300");

  ctx.fillStyle = surf;
  ctx.fill();

  // ===== BĄBLE =====
  ctx.fillStyle="rgba(255,200,120,0.7)";

  for(let i=0;i<8;i++){
    let x = (i*83 + t*70) % GAME_WIDTH;
    let y = dangerY + 15 + Math.sin(t*4+i)*10;

    ctx.beginPath();
    ctx.arc(x,y,3+Math.sin(t*5+i)*2,0,Math.PI*2);
    ctx.fill();
  }

  // ===== ŻAR =====
  ctx.fillStyle="rgba(255,120,0,0.15)";
  ctx.fillRect(0,dangerY-20,GAME_WIDTH,20);
}
function drawCloud(cx, cy, r){

  ctx.beginPath();

  ctx.arc(cx-r*1.4, cy, r*0.9, 0, Math.PI*2);
  ctx.arc(cx-r*0.5, cy-r*0.5, r*1.1, 0, Math.PI*2);
  ctx.arc(cx+r*0.5, cy-r*0.4, r*1.0, 0, Math.PI*2);
  ctx.arc(cx+r*1.4, cy, r*0.8, 0, Math.PI*2);

  ctx.closePath();
  ctx.fill();
}

  function drawPlatforms(){

  for(let p of platforms){

    const cx = p.x + p.w/2;
    const cy = p.y + p.h/2;
    const r  = p.w * 0.22;

    // cień
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    drawCloud(cx, cy+6, r);

    // złota chmura
    ctx.fillStyle = "#ffd76a";
    drawCloud(cx, cy, r);

    // highlight
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    drawCloud(cx-r*0.3, cy-r*0.25, r*0.6);
  }
}
  function drawCoins(){

  for(let c of coins){

    // ===== PULS =====
    let pulse = 1 + Math.sin(uiTime*3 + c.x)*0.15;
    let r = c.r * pulse;

    // ===== GLOW =====
    ctx.shadowBlur = 18 + Math.sin(uiTime*8 + c.y)*6;
    ctx.shadowColor = "rgba(255,215,0,0.7)";

    // ===== GRADIENT MONETY =====
    const grad = ctx.createRadialGradient(
      c.x - r*0.4,
      c.y - r*0.4,
      2,
      c.x,
      c.y,
      r
    );

    grad.addColorStop(0,"#fff6b0");
    grad.addColorStop(0.35,"#ffd700");
    grad.addColorStop(1,"#b8860b");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI*2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // ===== SYMBOL $ (OBRÓT + 3D) =====
    ctx.save();
    ctx.translate(c.x, c.y);

    // delikatny obrót w czasie
    let rot = Math.sin(uiTime*2 + c.y) * 0.25;
    ctx.rotate(rot);

    // cień pod literą
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.font = "bold " + (r * 1.1) + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", r*0.05, r*0.08);

    // główny kolor
    ctx.fillStyle = "#5a3b00";
    ctx.fillText("$", 0, 0);

    // outline arcade
    ctx.lineWidth = r * 0.08;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.strokeText("$", 0, 0);

    ctx.restore();

    // ===== HIGHLIGHT =====
    ctx.fillStyle="rgba(255,255,200,0.7)";
    ctx.beginPath();
    ctx.arc(c.x - r*0.3, c.y - r*0.3, r*0.25, 0, Math.PI*2);
    ctx.fill();
  }
}
function getLookDir(){

  // poziom — reaguje mocno
  let x = player.vx / 600;

  // pion — bardzo delikatnie
  let y = player.vy / 1800;

  // lekkie patrzenie w kierunku ruchu zamiast spadania
  if(onGround) y *= 0.2;

  // ograniczenie do wnętrza oka
  const max = 0.22;

  x = Math.max(-max, Math.min(max, x));
  y = Math.max(-max, Math.min(max, y));

  return {x, y};
}
  function drawPlayer(){


  let playerBottom = player.y + player.h;
  let lavaDist = dangerY - playerBottom;

  const pigColor = "#ff9ecb";
  currentPigColor = pigColor;

  const cx = player.x + player.w/2;
const cy = player.y + player.h/2;
const size = player.w * 0.55;
   
        const x = cx;
const y = cy;
const r = size;
    
    // ===== BOOST AURA =====
if(boosting || boostAfterglow > 0){

  let t = boosting
    ? boostVisualTime
    : 1 - (boostAfterglow / BOOST_AFTERGLOW_TIME);

  ctx.shadowBlur = 30;
  ctx.shadowColor = getRainbowColor(t);

}else{
  ctx.shadowBlur = 0;
}

// ===== CIEŃ ===== 
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse( x + size*0.15, y + size*0.9, size*0.7, size*0.25, 0, 0, Math.PI*2 );
    ctx.fill();
    // ===== GŁOWA (gradient 3D) =====
    let headGrad = ctx.createRadialGradient( x - size*0.3, y - size*0.4, size*0.1, x, y, size );
    headGrad.addColorStop(0, "#ffd1dc");
    headGrad.addColorStop(1, "#ff8fa3");
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.fill();
    //===== RYJ =====
    let snoutGrad = ctx.createRadialGradient( x, y + size*0.3, size*0.1, x, y + size*0.3, size*0.6 ); 
    snoutGrad.addColorStop(0, "#ffb3c1");
    snoutGrad.addColorStop(1, "#e56b83"); ctx.fillStyle = snoutGrad;
    ctx.beginPath(); 
    ctx.ellipse(x, y + size*0.35, size*0.55, size*0.35, 0, 0, Math.PI*2);
    ctx.fill();
    // ===== NOSKI ===== 
    ctx.fillStyle = "#2b2b2b"; 
    ctx.beginPath(); ctx.arc(x - size*0.18, y + size*0.35, size*0.1, 0, Math.PI*2);
    ctx.arc(x + size*0.18, y + size*0.35, size*0.1, 0, Math.PI*2); 
    ctx.fill();
    // ===== OCZY =====

let panicLevel = 0;

if(lavaDist < 200){
  panicLevel = 1 - (lavaDist / 200);
  if(panicLevel < 0) panicLevel = 0;
}

let eyeSize = size * (0.16 + panicLevel * 0.18);

ctx.fillStyle = "black";
ctx.beginPath();
ctx.arc(x - size*0.35, y - size*0.25, eyeSize, 0, Math.PI*2);
ctx.arc(x + size*0.35, y - size*0.25, eyeSize, 0, Math.PI*2);
ctx.fill();
    // ===== POŁYSK W OCZACH ===== 
    ctx.fillStyle = "white";
    ctx.beginPath(); 
    ctx.arc(x - size*0.32, y - size*0.3, size*0.05, 0, Math.PI*2);
    ctx.arc(x + size*0.32, y - size*0.3, size*0.05, 0, Math.PI*2); 
    ctx.fill();
  
    // ===== POWIEKI =====
if(blink > 0){
  ctx.fillStyle = pigColor;

  const h = r*0.25 * blink;

  ctx.fillRect(cx-r*0.5, cy-r*0.25, r*0.44, h);
  ctx.fillRect(cx+r*0.06, cy-r*0.25, r*0.44, h);
}
    


    ctx.shadowBlur = 0;
  return pigColor;
}
function drawDeathSmoke(){

  if(gameState !== "dead" || deathSmokeTimer <= 0) return;

  const cx = player.x + player.w/2;
  const cy = player.y;

  for(let i=0;i<6;i++){
    let t = uiTime*2 + i;
    let rise = (1.5 - deathSmokeTimer) * 40;

    ctx.fillStyle = "rgba(80,80,80,0.5)";
    ctx.beginPath();
    ctx.arc(
      cx + Math.sin(t)*8,
      cy - rise - i*6,
      8 + Math.sin(t)*2,
      0,
      Math.PI*2
    );
    ctx.fill();
  }
}

function drawPanicBubble(){

  if(!player) return;

  let dist = dangerY - (player.y + player.h);
  if(dist > 180 || dist < 0) return;

  const cx = player.x + player.w/2;
  const cy = player.y - 35;

  const panic = 1 - (dist / 180);
  const shake = Math.sin(uiTime*25) * 2 * panic;

  ctx.save();
  ctx.translate(shake,0);

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI*2);
  ctx.arc(cx+18, cy+6, 14, 0, Math.PI*2);
  ctx.arc(cx-16, cy+8, 12, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = "#ff0033";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let text = dist < 70 ? "!!!" : "RUN!";
  ctx.fillText(text, cx, cy);

  ctx.restore();
}

  function drawHUD(){

  // panel
  ctx.fillStyle="#2a2a2a";
  ctx.fillRect(0,0,GAME_WIDTH,HUD);

  ctx.strokeStyle="#111";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,HUD);
  ctx.lineTo(GAME_WIDTH, HUD);
  ctx.stroke();

  drawCompass();
  drawScore();
  drawCompassCircle();
}
let pauseButton = { x:0, y:0, r:18 };
  function drawCompass(){
  let lavaT = getLavaRatio();

  let barW = GAME_WIDTH * 0.5;
  let barH = 6;
  let barX = GAME_WIDTH/2 - barW/2;
  let barY = HUD - 10;

  ctx.fillStyle="#222";
  ctx.fillRect(barX,barY,barW,barH);

  let r = Math.floor(255 * lavaT);
  let g = Math.floor(200 * (1-lavaT));
  let b = 255 - r;

  ctx.fillStyle=`rgb(${r},${g},${b})`;
  ctx.fillRect(barX,barY,barW*lavaT,barH);
}


 function drawScore(){
  ctx.textAlign="left";
  ctx.textBaseline="top";
  ctx.font="20px Arial";
  ctx.fillStyle = currentPigColor;

  ctx.fillText("Score: "+score, SAFE, SAFE);
  ctx.fillText("Best: "+bestScore, SAFE, SAFE+25);
}
function getCompassAngle(){
  let t = getLavaRatio();

  // zaczyna reagować dopiero gdy naprawdę niebezpiecznie
  let start = 0.55;
  if(t < start) return 0;

  let danger = (t - start) / (1 - start);
  if(danger > 1) danger = 1;

  // easing — powoli, potem gwałtownie
  danger = danger * danger;

  return danger * Math.PI/2; // do 90°
}
function drawCompassCircle(){

  compass.x = GAME_WIDTH - SAFE - 32;
  compass.y = HUD/2;
  compass.r = 26;

  const shake = getCompassShake();
const cx = compass.x + shake;
const cy = compass.y

;

  let lavaDist = dangerY - (player.y + player.h);

  // poziom zagrożenia
  let danger = 0;
  if(lavaDist < 280) danger = 1 - (lavaDist / 280);
  if(danger < 0) danger = 0;
  if(danger > 1) danger = 1;

  // puls
  let pulse = Math.sin(uiTime * 6) * danger;
  let r = compass.r + getCompassClickPulse();

  // kolor
  let color = getPigColor(lavaDist);

  ctx.shadowBlur = 25 * danger;
  ctx.shadowColor = color;

  // obręcz
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.shadowBlur = 0;

  // środek
  ctx.beginPath();
  ctx.arc(cx, cy, r*0.15, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
  


// obrót
let ang = getCompassAngle();

ctx.save();
ctx.translate(cx, cy);
ctx.rotate(ang);

// strzałka
ctx.beginPath();
ctx.moveTo(0, r*0.65);
ctx.lineTo(-r*0.35, -r*0.2);
ctx.lineTo(r*0.35, -r*0.2);
ctx.closePath();

ctx.fillStyle = "#ccc";
ctx.fill();

ctx.restore();

// ===== BOOST COUNT POD KOMPASEM =====
ctx.font = "bold 14px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "top";
ctx.save();

if(boostCharges === 0){
  ctx.fillStyle = "#ff3b3b";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ff3b3b";
}else{
  ctx.fillStyle = "white";
}

ctx.fillText(boostCharges, cx, cy + compass.r + 4);

ctx.restore();
}
  function layoutUI(){

  // najpierw pozycja kompasu
  compass.x = GAME_WIDTH - SAFE - 32;
  compass.y = HUD/2;

  // pauza obok kompasu (z lewej strony)
  const gap = 14; // odstęp między ikonami
  pauseButton.x = compass.x - compass.r - gap - pauseButton.r;
  pauseButton.y = HUD/2;
}



  


function drawOverlay(title, sub){

  // ciemne tło
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cx = GAME_WIDTH / 2;
  const cy = REAL_HEIGHT / 2 - 40;

  // ================= DEAD =================
  if(gameState === "dead"){

    ctx.font = "bold 64px Arial";

    // czerwony glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#ff0000";

    ctx.fillStyle = "#ff1a1a";
    ctx.fillText("GAME OVER", cx, cy);

    ctx.shadowBlur = 0;

    // outline horror
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#330000";
    ctx.strokeText("GAME OVER", cx, cy);
    
    // ===== REALISTIC 3D BACON =====
if(baconMode){

  let bx = GAME_WIDTH/2;
  let by = REAL_HEIGHT/2 + 95;

  let wobble = Math.sin(uiTime*2) * 5;

  ctx.save();
  ctx.translate(bx + wobble, by);
  ctx.rotate(Math.sin(uiTime*1.5)*0.08);

  const w = 110;
  const h = 28;

  // ===== falowany kształt =====
  ctx.beginPath();

  for(let x = -w/2; x <= w/2; x+=4){
    let wave = Math.sin(x*0.12) * 4;
    let y = -h/2 + wave;
    if(x === -w/2) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  for(let x = w/2; x >= -w/2; x-=4){
    let wave = Math.sin(x*0.12) * 4;
    let y = h/2 + wave;
    ctx.lineTo(x, y);
  }

  ctx.closePath();

  // ===== mięso gradient =====
  let meatGrad = ctx.createLinearGradient(0, -h/2, 0, h/2);
  meatGrad.addColorStop(0, "#ff8a8a");
  meatGrad.addColorStop(0.5, "#ff4d4d");
  meatGrad.addColorStop(1, "#b30000");

  ctx.fillStyle = meatGrad;
  ctx.fill();

  // ===== warstwy tłuszczu =====
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffe9c9";
  ctx.globalAlpha = 0.9;

  ctx.beginPath();
  ctx.moveTo(-w/2+8, -2);
  ctx.lineTo(w/2-8, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-w/2+15, 6);
  ctx.lineTo(w/2-15, 8);
  ctx.stroke();

  ctx.globalAlpha = 1;

  // ===== połysk =====
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, -6, 35, 6, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

    // ===== HORROR BLOOD DRIP =====
for(let i = -4; i <= 4; i++){

  let baseX = cx + i * 32;

  // lekki chaos
  let wobble = Math.sin(uiTime*2 + i*1.3) * 4;
  let dripX = baseX + wobble;

  // długość zmienna
  let dripLen = 25 + Math.sin(uiTime*3 + i*2) * 18;

  // szerokość losowa
  let width = 6 + (Math.sin(i*3.7)*2);

  // kolor główny
  ctx.fillStyle = "#7a0000";

  ctx.beginPath();
  ctx.moveTo(dripX - width/2, cy + 8);
  ctx.lineTo(dripX - width/2, cy + dripLen);
  ctx.lineTo(dripX + width/2, cy + dripLen);
  ctx.lineTo(dripX + width/2, cy + 8);
  ctx.closePath();
  ctx.fill();

  // okrągła kropla na końcu
  ctx.beginPath();
  ctx.arc(dripX, cy + dripLen, width * 0.6, 0, Math.PI*2);
  ctx.fill();

  // połysk krwi
  ctx.fillStyle = "rgba(255,80,80,0.25)";
  ctx.beginPath();
  ctx.arc(dripX - width*0.2, cy + dripLen - width*0.2, width*0.25, 0, Math.PI*2);
  ctx.fill();
}

  }

  // ================= INNE STANY =================
  else{
    ctx.font = "50px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(title, cx, cy);
  }

  // ===== SUBTEXT =====
  ctx.font = "25px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(sub, GAME_WIDTH/2, REAL_HEIGHT/2 + 30);
}
function drawPauseOverlay(){

  ctx.fillStyle="rgba(0,0,0,0.55)";
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

  ctx.fillStyle="white";
  ctx.textAlign="center";

  const cx = GAME_WIDTH/2;
  const cy = REAL_HEIGHT/2;

  // tytuł
  ctx.font="50px Arial";
  ctx.fillText("PAUSE",cx,cy-60);

  // przycisk play
  const r = 32;

  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.lineWidth=3;
  ctx.strokeStyle="white";
  ctx.stroke();

  // trójkąt ▶
  ctx.beginPath();
  ctx.moveTo(cx-8,cy-14);
  ctx.lineTo(cx-8,cy+14);
  ctx.lineTo(cx+16,cy);
  ctx.closePath();
  ctx.fill();

  // tekst
  ctx.font="20px Arial";
  ctx.fillText("tap anywhere to continue",cx,cy+60);
}

 
 function drawOverlayLayer(){
  if(gameState==="start") drawOverlay("PIGGY TOWER","tap to start");
  if(gameState==="dead") drawOverlay("GAME OVER","tap to restart");
  if(gameState==="loading") drawOverlay("loading...","");
   if(gameState==="pause") drawPauseOverlay();
 }

function drawPauseButton(){
  ctx.beginPath();
  ctx.arc(pauseButton.x, pauseButton.y, pauseButton.r, 0, Math.PI*2);
  ctx.fillStyle = "#444";
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.fillRect(pauseButton.x-5, pauseButton.y-8, 4,16);
  ctx.fillRect(pauseButton.x+1, pauseButton.y-8, 4,16);
}

// ================= DRAW =================

function draw(){
  layoutUI();
  
 ctx.clearRect(0,0,GAME_WIDTH,REAL_HEIGHT);
 drawBackground();
  const shake = getScreenShakeOffset();

  // tylko świat się trzęsie
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawWorld();
  ctx.restore();

  // HUD stabilny
  drawHUD();

  // overlay + UI
 drawOverlayLayer();

if(gameState !== "pause")
  drawPauseButton();

  // flash na końcu
  if(boostFlash > 0){
    ctx.fillStyle = "rgba(255,255,255," + (boostFlash*0.35) + ")";
    ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);
  }
  // flash death
if(deathFlash > 0){
  ctx.fillStyle = "rgba(255,0,0," + (deathFlash * 0.6) + ")";
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);
}
}

// ================= LOOP =================

let lastTime=performance.now();
function loop(now){
  try{
    let dt=now-lastTime;
    if(dt>50) dt=50;
    lastTime=now;

    update(dt);
    draw();
  }
  catch(e){
    console.error("GAME LOOP ERROR:", e);
  }

  requestAnimationFrame(loop);
}



requestAnimationFrame(loop);

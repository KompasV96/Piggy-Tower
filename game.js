// ---------- CANVAS ----------
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// stała rozdzielczość świata (fizyka!)
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// blokuje zaznaczanie i menu przytrzymania
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("selectstart", e => e.preventDefault());
canvas.addEventListener("dragstart", e => e.preventDefault());

function resize(){
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );

  canvas.style.width = GAME_WIDTH * scale + "px";
  canvas.style.height = GAME_HEIGHT * scale + "px";
}

window.addEventListener("resize", resize);
resize();
function getPointerPos(e){
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;

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
  if(!boostReady) return 0;
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
  x: canvas.width/2 - 15,
  y: canvas.height - 120,
  w: 30, h: 30,
  vx: 0, vy: 0,
  lastY: canvas.height - 120
};
let currentPigColor = "#fff";
let compass = { x:0, y:0, r:26 };
const UI_MARGIN = 20;
const SAFE = Math.max(20, canvas.width * 0.04);
const HUD = 70;
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


// ---------- SCORE ------------------------------------------------
let worldOffset = 0;
let score = 0;
let bestScore = Number(localStorage.getItem("piggyBest")) || 0;


// ---------- DANGER ----------------------------------------------------
let dangerY = canvas.height + 200;
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
let boostReady = true;
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


function createPlatform(y){

  const minW = GAME_WIDTH * 0.18;   // mała
  const maxW = GAME_WIDTH * 0.32;   // duża

  let w = minW + Math.random()*(maxW - minW);
  let x = Math.random()*(GAME_WIDTH - w);

  return { x, y, w, h: GAME_HEIGHT * 0.03 };
}
function initPlatforms(){
  platforms = [];

  platforms.push({ x:0, y:canvas.height-80, w:canvas.width, h:20 });

  let y = canvas.height-80-PLATFORM_GAP;
  for(let i=1;i<PLATFORM_COUNT;i++){
    platforms.push(createPlatform(y));
    y -= PLATFORM_GAP;
  }

  spawnInitialCoins();
}
function recyclePlatforms(){
  let highest = Infinity;

  for(let p of platforms){
    if(p.y < highest) highest = p.y;
  }

  for(let p of platforms){
    if(p.y > canvas.height + 50){

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
function resetGame(){
  
  player.x = canvas.width/2 - 15;
  player.y = canvas.height - 120;
  player.vx = 0;
  player.vy = 0;
  player.lastY = player.y;

  worldOffset = 0;
  score = 0;

  dangerY = canvas.height + 200;
  dangerSpeed = 0;

  miracleUsed = false;

  left = false;
  right = false;
  touchSide = 0;

  initPlatforms();   // ← jedyne miejsce generacji monet
  coinScore = 0;

  gameState = "loading";
  loadingTimer = 400;

boostReady = true;
boostLockTimer = 0;
}
// ================= UPDATE =================
function tryBoost(){

  if(!boostReady || gameState!=="play") return;

  boostReady = false;
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
  let mid = canvas.width/2;
  let dir = (touchX - mid) / mid;   // -1 do 1
  targetSpeed = dir * speedTouch;
}

let control = onGround ? 1 : airControl;

if(boostLockTimer > 0){
  control = 0.05;
  boostLockTimer -= dtSec;
}

player.vx += (targetSpeed - player.vx) * 14 * control * dtSec;

  player.x += player.vx*dtSec;
  if(player.x<0) player.x=0;
  if(player.x+player.w>canvas.width) player.x=canvas.width-player.w;

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
  if(player.y < canvas.height/2){

    let diff = canvas.height/2 - player.y;

    player.y = canvas.height/2;
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
    if(c.y > canvas.height + 20){
        coins.splice(i,1);
    }
  }
}
function update(dt){

  if(updateState(dt)) return;

  const dtSec = dt/1000;

  // ===== ZAWSZE DZIAŁA (nawet w pauzie) =====
  uiTime += dtSec;

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
  let max = canvas.height * 1.2;

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
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,"#050814");
  g.addColorStop(1,"#0b1a33");

  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // ===== KSIĘŻYC =====
  ctx.fillStyle="#f5f3ce";
  ctx.beginPath();
  ctx.arc(canvas.width*0.78, 110, 38, 0, Math.PI*2);
  ctx.fill();

  // poświata
  ctx.fillStyle="rgba(255,255,200,0.08)";
  ctx.beginPath();
  ctx.arc(canvas.width*0.78, 110, 80, 0, Math.PI*2);
  ctx.fill();


  // ===== GWIAZDY =====
  ctx.fillStyle="white";
  for(let i=0;i<70;i++){
    let x = (i*97)%canvas.width;
    let y = (i*53)%canvas.height;
    ctx.fillRect(x,y,2,2);
  }


  // ===== CHMURY DALEKIE =====
  ctx.fillStyle="rgba(255,255,255,0.08)";
  drawCloud(60,180,70);
  drawCloud(260,240,60);
  drawCloud(180,120,55);


  // ===== CHMURY BLISKIE =====
  ctx.fillStyle="rgba(255,255,255,0.16)";
  drawCloud(120,330,90);
  drawCloud(280,420,110);
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

  ctx.restore();
}
 function drawLava(){

  const t = uiTime;

  // ===== PODSTAWA =====
  let grad = ctx.createLinearGradient(0,dangerY,0,canvas.height);
  grad.addColorStop(0,"#ff2a2a");
  grad.addColorStop(0.5,"#ff0040");
  grad.addColorStop(1,"#2a0000");

  ctx.fillStyle = grad;
  ctx.fillRect(0,dangerY,canvas.width,canvas.height);

  // ===== FALA POWIERZCHNI =====
  ctx.beginPath();

  const waveH = 6;

  for(let x=0;x<=canvas.width;x+=6){
    let y = dangerY + Math.sin(x*0.05 + t*3)*waveH
                      + Math.sin(x*0.12 + t*2)*waveH*0.5;

    if(x===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }

  ctx.lineTo(canvas.width,canvas.height);
  ctx.lineTo(0,canvas.height);
  ctx.closePath();

  let surf = ctx.createLinearGradient(0,dangerY-10,0,dangerY+20);
  surf.addColorStop(0,"#ffff66");
  surf.addColorStop(1,"#ff3300");

  ctx.fillStyle = surf;
  ctx.fill();

  // ===== BĄBLE =====
  ctx.fillStyle="rgba(255,200,120,0.7)";

  for(let i=0;i<8;i++){
    let x = (i*83 + t*70) % canvas.width;
    let y = dangerY + 15 + Math.sin(t*4+i)*10;

    ctx.beginPath();
    ctx.arc(x,y,3+Math.sin(t*5+i)*2,0,Math.PI*2);
    ctx.fill();
  }

  // ===== ŻAR =====
  ctx.fillStyle="rgba(255,120,0,0.15)";
  ctx.fillRect(0,dangerY-20,canvas.width,20);
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

    // puls 0.85 → 1.15
    let pulse = 1 + Math.sin(uiTime*3 + c.x)*0.15;

    let r = c.r * pulse;

    // złoty glow
    ctx.shadowBlur = 18 + Math.sin(uiTime*8 + c.y)*6;
    ctx.shadowColor = "rgba(255,215,0,0.7)";

    // gradient
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

    // jasny błysk
    ctx.fillStyle="rgba(255,255,200,0.7)";
    ctx.beginPath();
    ctx.arc(c.x - r*0.3, c.y - r*0.3, r*0.25, 0, Math.PI*2);
    ctx.fill();

    ctx.shadowBlur = 0;
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
  const r = player.w*0.55;
    
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

  // ===== GŁOWA =====
  ctx.fillStyle = pigColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fill();

  // ===== USZY =====
  ctx.beginPath();
  ctx.arc(cx-r*0.55, cy-r*0.65, r*0.35, 0, Math.PI*2);
  ctx.arc(cx+r*0.55, cy-r*0.65, r*0.35, 0, Math.PI*2);
  ctx.fill();

  // ===== RYJ =====
  ctx.fillStyle = "#ffb6c1";
  ctx.beginPath();
  ctx.ellipse(cx, cy+r*0.15, r*0.55, r*0.38, 0, 0, Math.PI*2);
  ctx.fill();

  // nozdrza
  ctx.fillStyle = "#a05566";
  ctx.beginPath();
  ctx.arc(cx-r*0.18, cy+r*0.15, r*0.09, 0, Math.PI*2);
  ctx.arc(cx+r*0.18, cy+r*0.15, r*0.09, 0, Math.PI*2);
  ctx.fill();

  // ===== OCZY =====
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx-r*0.28, cy-r*0.05, r*0.22, 0, Math.PI*2);
  ctx.arc(cx+r*0.28, cy-r*0.05, r*0.22, 0, Math.PI*2);
  ctx.fill();
    // ===== POWIEKI =====
if(blink > 0){
  ctx.fillStyle = pigColor;

  const h = r*0.25 * blink;

  ctx.fillRect(cx-r*0.5, cy-r*0.25, r*0.44, h);
  ctx.fillRect(cx+r*0.06, cy-r*0.25, r*0.44, h);
}

  const look = getLookDir();

ctx.fillStyle = "black";
ctx.beginPath();
ctx.arc(cx-r*0.28 + look.x*r, cy-r*0.05 + look.y*r, r*0.10, 0, Math.PI*2);
ctx.arc(cx+r*0.28 + look.x*r, cy-r*0.05 + look.y*r, r*0.10, 0, Math.PI*2);
ctx.fill();

    ctx.shadowBlur = 0;
  return pigColor;
}

  function drawHUD(){

  // panel
  ctx.fillStyle="#2a2a2a";
  ctx.fillRect(0,0,canvas.width,HUD);

  ctx.strokeStyle="#111";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,HUD);
  ctx.lineTo(canvas.width,HUD);
  ctx.stroke();

  drawCompass();
  drawScore();
  drawCompassCircle();
}
let pauseButton = { x:0, y:0, r:18 };
  function drawCompass(){
  let lavaT = getLavaRatio();

  let barW = canvas.width * 0.5;
  let barH = 6;
  let barX = canvas.width/2 - barW/2;
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

  compass.x = canvas.width - SAFE - 32;
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
}
function layoutUI(){

  // najpierw pozycja kompasu
  compass.x = canvas.width - SAFE - 32;
  compass.y = HUD/2;

  // pauza obok kompasu (z lewej strony)
  const gap = 14; // odstęp między ikonami
  pauseButton.x = compass.x - compass.r - gap - pauseButton.r;
  pauseButton.y = HUD/2;
}



  


function drawOverlay(title,sub){

  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle="white";
  ctx.textAlign="center";

  ctx.font="50px Arial";
  ctx.fillText(title,canvas.width/2,canvas.height/2-40);

  ctx.font="25px Arial";
  ctx.fillText(sub,canvas.width/2,canvas.height/2+20);
}
function drawPauseOverlay(){

  // przyciemnienie
  ctx.fillStyle="rgba(0,0,0,0.55)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle="white";
  ctx.textAlign="center";

  // tytuł
  ctx.font="50px Arial";
  ctx.fillText("PAUSE",canvas.width/2,canvas.height/2-40);

  // play button
  const cx = canvas.width/2;
  const cy = canvas.height/2 + 10;
  const r = 26;

  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle="white";
  ctx.lineWidth=3;
  ctx.stroke();

  // trójkąt ▶
  ctx.beginPath();
  ctx.moveTo(cx-6,cy-10);
  ctx.lineTo(cx-6,cy+10);
  ctx.lineTo(cx+12,cy);
  ctx.closePath();
  ctx.fill();

  // tekst
  ctx.font="22px Arial";
  ctx.fillText("tap anywhere to continue",canvas.width/2,cy+50);
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
  
 ctx.clearRect(0,0,canvas.width,canvas.height);
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
    ctx.fillRect(0,0,canvas.width,canvas.height);
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

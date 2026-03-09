
// ---------- CANVAS ---------------------------------------------------------
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
function vibrate(ms){
  if(vibrationEnabled && navigator.vibrate){
    navigator.vibrate(ms);
  }
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

function rollStartBlessing(){

  let r = Math.random();

  if(r < 0.05){
    startBlessing = "rocket";
  }
  else if(r < 0.35){
    startBlessing = "luck";
  }
  else{
    startBlessing = "none";
  }

}
// ---------- GAME STATE --------------------------------------------------------------

// start | play | pause | dead | loading | menu | shop
let gameState = "start";
let loadingTimer = 0;
let musicVolume = Number(localStorage.getItem("musicVolume")) || 0.6;
let vibrationEnabled = localStorage.getItem("vibration") !== "false";
let showFPS = localStorage.getItem("showFPS") !== "false";

// ---------- AUDIO ---------------------------------------------------------------------
let music = new Audio("audio/techno_loop.mp3");
music.loop = true;
music.volume = musicVolume;
music.preload = "auto";
let musicStarted = false;
let pigDeath = new Audio("audio/Chrum 1 (mp3cut.net).mp3");pigDeath.volume = 0.8;
let deathPlayed = false;
let coinSound = new Audio("audio/coinsding.mp3");
coinSound.volume = 0.7;

// ---------- PLAYER ------------------------------------------------------------------
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

// ---------- PHYSICS ----------------------------------------------------------------
let gravity = 2400;
let jumpPower = -1000;
let maxFall = 1400;
let speedKeyboard = 600;
let speedTouch = 400;
// FLOW
let lavaSplash = null;
let airControl = 0.55;     // sterowanie w powietrzu
let coyoteTime = 0.08;     // można skoczyć chwilę po zejściu
let coyoteTimer = 0;
let jumpBuffer = 0.12;     // wciśniesz przed lądowaniem = zadziała
let jumpBufferTimer = 0;
let squash = 0;          // aktualne wgniatanie
let squashVel = 0;       // prędkość sprężyny
let onGround = false;
let deathSmokeTimer = 0;
let deathFlash = 0;
let baconMode = false;
let baconSpawnTime = 0;
let deathSlowMo = 0;
let dustParticles = [];
let confirmReset = false;
// ---------- SCORE ------------------------------------------------------------------
let worldOffset = 0;
let score = 0;
let bestScore = Number(localStorage.getItem("piggyBest")) || 0;
let wallet = Number(localStorage.getItem("piggyWallet")) || 0;
        let skins = [
 { id:"pink", price:0 },
 { id:"ninja", price:2500 },
 { id:"gold", price:5000 },
 { id:"space", price:7000 }
];

let ownedSkins = JSON.parse(localStorage.getItem("ownedSkins")) || ["pink"];
let currentSkin = localStorage.getItem("currentSkin") || "pink";
let fps = 0;
let fpsTimer = 0;
let fpsFrames = 0;

// ---------- DANGER ----------------------------------------------------------------
let dangerY = REAL_HEIGHT + 200;
let dangerSpeed = 120;



// ---------- PLATFORMS -------------------------------------------------------------
const PLATFORM_COUNT = 20;
const PLATFORM_GAP = GAME_HEIGHT * 0.22;
let platforms = [];

// ---------- COINS ----------------------------------------------------------------
let coins = [];
let coinScore = 0;

// ---------- boskie szczescie ------------------------------------------------------

let miracleMargin = 25; // ile px od lawy to „o włos”
let miraclePower = 5 * PLATFORM_GAP; // 5 platform w górę
let miracleUsed = false;

// BOOST (jednorazowy tryb)------------------------------------------------------------
let boostCharges = 3;
const maxBoostCharges = 3;
let boosting = false;
let startBlessing = "none";
let rocketMode = false;
let rocketTimer = 0;

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

  const minW = GAME_WIDTH * 0.14;  // mała
  const maxW = GAME_WIDTH * 0.36;  // duża

  let w = minW + Math.random()*(maxW - minW);
  let x = Math.random()*(GAME_WIDTH - w);

  return { x, y, w, h: GAME_HEIGHT * 0.03 };
}

//-------MENU---------------------------------------------------------------------------

let menuButtons = [
  { text:"PLAY", y: REAL_HEIGHT/2 },
  { text:"SHOP", y: REAL_HEIGHT/2 + 70 },
  { text:"SETTINGS", y: REAL_HEIGHT/2 + 140 }
];
let pauseButtons = [
  { text:"RESUME", y: REAL_HEIGHT/2 - 10 },
  { text:"RESTART", y: REAL_HEIGHT/2 + 40 },
  { text:"MENU", y: REAL_HEIGHT/2 + 90 }
];
let gameOverButtons = [
  { text:"RESTART", y: REAL_HEIGHT/2 + 160 },
  { text:"MENU", y: REAL_HEIGHT/2 + 210 }
];
let settingsButtons = [
  { text:"RESET STATS", y: REAL_HEIGHT/2 + 110 },
  { text:"BACK", y: REAL_HEIGHT/2 + 160 }
];

//Funkcje----------------------------------------------------------------------------------

//platformy ==========================================
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


//kurz ===============================================
function spawnDust(x, y, rainbow=false){

  for(let i = 0; i < 6; i++){

    dustParticles.push({
      x: x,
      y: y,
      vx: (Math.random()-0.5)*4,
      vy: -Math.random()*4 - 2,
      size: 4 + Math.random()*4,
      life: 20,
      rainbow: rainbow,
      color: getRainbowColor(uiTime + Math.random())
    });

  }
}

//gwiazdy ==============================================
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


//platformy sie odnawiają =============================
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

      // 💰 spawn monety NA NOWEJ platformie =================

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

// ---------- INPUT ---------------------------------------------------------------------
let left=false, right=false, touchSide=0;

document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft") left=true;
  if(e.key==="ArrowRight") right=true;
  if(e.key==="ArrowUp") tryBoost();



  if((e.key==="r"||e.key==="R") && gameState==="dead") resetGame();
});

document.addEventListener("keyup", e=>{
  if(e.key==="ArrowLeft") left=false;
  if(e.key==="ArrowRight") right=false;
});
let touching = false;
let touchX = 0;


//Pointerdown =====================================================================================
canvas.addEventListener("pointerdown", e => {
   

  const pos = getPointerPos(e);
  const mx = pos.x;
  const my = pos.y;

  // START SCREEN---------------------------------------
  if(gameState === "start"){
    gameState = "menu";
    return;
  }

  // MENU-----------------------------------------------
  if(gameState === "menu"){

    for(let b of menuButtons){

      if(Math.abs(pos.y - b.y) < 30){

        if(b.text === "PLAY"){
          resetGame();
          gameState = "play";
        }

        if(b.text === "SHOP"){
          gameState = "shop";
        }

        if(b.text === "SETTINGS"){
          gameState = "settings";
        }

      }

    }

    return;
  }

  // SHOP------------------------------------------
  if(gameState === "shop"){

    let startY = REAL_HEIGHT/2 - 60;

    for(let i=0;i<skins.length;i++){

      let s = skins[i];
      let y = startY + i*60;

      if(Math.abs(my - y) < 25){

        if(ownedSkins.includes(s.id)){

          currentSkin = s.id;
          localStorage.setItem("currentSkin", currentSkin);

        }else if(wallet >= s.price){

          wallet -= s.price;
          ownedSkins.push(s.id);

          localStorage.setItem("piggyWallet", wallet);
          localStorage.setItem("ownedSkins", JSON.stringify(ownedSkins));

        }

      }

    }

    if(Math.abs(my - (REAL_HEIGHT/2 + 200)) < 25){
      gameState = "menu";
    }

    return;
  }

  // SETTINGS--------------------------------------
  if(gameState === "settings"){

    // ===== YES / NO RESET =============================
    if(confirmReset){

      if(Math.abs(my - (REAL_HEIGHT/2 + 140)) < 25){

        if(mx < GAME_WIDTH/2){

          // YES
          bestScore = 0;
          wallet = 0;

          ownedSkins = ["pink"];
          currentSkin = "pink";

          localStorage.removeItem("piggyBest");
          localStorage.removeItem("piggyWallet");
          localStorage.removeItem("ownedSkins");
          localStorage.removeItem("currentSkin");

        }

        confirmReset = false;
        return;
      }

    }

    // ===== VOLUME SLIDER =================================
    let barW = 200;
    let barX = GAME_WIDTH/2 - barW/2;
    let barY = REAL_HEIGHT/2 - 60;

    if(my > barY-15 && my < barY+25 &&
       mx > barX && mx < barX + barW){

      musicVolume = (mx - barX) / barW;

      if(musicVolume < 0) musicVolume = 0;
      if(musicVolume > 1) musicVolume = 1;

      music.volume = musicVolume;
      localStorage.setItem("musicVolume", musicVolume);
      return;
    }

    // ===== VIBRATION =====================================
    if(Math.abs(my - (REAL_HEIGHT/2 + 10)) < 25){
      vibrationEnabled = !vibrationEnabled;
      localStorage.setItem("vibration", vibrationEnabled);
      return;
    }

    // ===== FPS ============================================
    if(Math.abs(my - (REAL_HEIGHT/2 + 60)) < 25){
      showFPS = !showFPS;
      localStorage.setItem("showFPS", showFPS);
      return;
    }

    // ===== BUTTONS ==========================================
    for(let b of settingsButtons){

      if(Math.abs(my - b.y) < 25){

        if(b.text === "RESET STATS"){

          if(!confirmReset){
            confirmReset = true;
            return;
          }

        }

        if(b.text === "BACK"){
          confirmReset = false;
          gameState = "menu";
        }

      }

    }

    return;
  }

  // PAUSE ====================================================
  if(gameState === "pause"){

    for(let b of pauseButtons){

      if(Math.abs(pos.y - b.y) < 25){

        if(b.text === "RESUME"){
          gameState = "play";
        }

        if(b.text === "RESTART"){
          resetGame();
          gameState = "play";
        }

        if(b.text === "MENU"){
          gameState = "menu";
        }

      }

    }

    return;
  }

if(gameState === "dead"){

  for(let b of gameOverButtons){

    if(Math.abs(pos.y - b.y) < 25){

      if(b.text === "RESTART"){
        resetGame();
        gameState = "play";
      }

      if(b.text === "MENU"){
        gameState = "menu";
      }

    }

  }

}


  layoutUI();
  e.preventDefault();

  // HUD ===================================================
  if(my <= HUD){

    let dxp = mx - pauseButton.x;
    let dyp = my - pauseButton.y;

    if(Math.sqrt(dxp*dxp + dyp*dyp) <= pauseButton.r){
      gameState = "pause";
      return;
    }

    const dx = mx - compass.x;
    const dy = my - compass.y;

    if(Math.sqrt(dx*dx + dy*dy) <= compass.r*0.75){
      tryBoost();
    }

    return;
  }

  // MOVEMENT ==============================================
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
// ---------- RESET ---------------------------------------------------------------------------------
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

  player.x = GAME_WIDTH/2 - 15;
  player.y = REAL_HEIGHT - 120;
  player.vx = 0;
  player.vy = 0;
  player.lastY = player.y;

  worldOffset = 0;
  score = 0;

  dangerY = REAL_HEIGHT + 400;
  dangerSpeed = 0;

  deathPlayed = false;

  miracleUsed = false;

  left = false;
  right = false;
  touchSide = 0;
  rollStartBlessing();

if(startBlessing === "rocket"){

  rocketMode = true;
 rocketTimer = 1.8;
player.vy = -2000;

  screenShakeTime = 0.6;
  screenShakePower = 70;

  vibrate([40,60,80]);

}


if(startBlessing === "luck"){
  miracleUsed = false;
}

  initPlatforms();   // ← jedyne miejsce generacji monet
  coinScore = 0;
  gameState = "play";

  boostCharges = maxBoostCharges;
  boostLockTimer = 0;
  }
// ================= UPDATE ======================================================================

//BOST ==================================================================
function tryBoost(){

  if(boostCharges <= 0 || gameState!=="play") return;

  boostCharges--;
  boosting = true;
  boostTimer = boostDuration;
  deathSlowMo = 0.04;
  boostVisualTime = 0;   // ← START ANIMACJI

   // 🌈 BOOST BLAST -------------------------------------------------
  spawnDust(player.x + player.w/2, player.y + player.h + 30, true);
  spawnDust(player.x + player.w/2, player.y + player.h + 30, true);
  spawnDust(player.x + player.w/2, player.y + player.h + 30, true);

  // lekki startowy kop -----------------------------------------------
  if(player.vy > 0) player.vy *= 0.3;
  player.vy = -900;

  boostLockTimer = boostControlLock;
  screenShakeTime = 0.40;   // ile trwa
  screenShakePower = 50;    // siła
  vibrate(40);
  boostFlash = 1;
  squashVel = -18;
 
}

//Stan gry =============================================================
function updateState(dt){
  if(gameState!=="loading") return false;
  loadingTimer -= dt;
  if(loadingTimer<=0) gameState="start";
  return true;
}


//Punkty ================================================================
function updateScore(){
  score = Math.floor(worldOffset/12) + coinScore;
}


//Lawa ================================================================================================
function updateDanger(dtSec){

  // prędkość lawy -------------------------------------------------------------------------
  dangerSpeed = 200 + worldOffset / 2000;
  dangerY -= dangerSpeed * dtSec;

  // odległość lawy od nóg gracza ------------------------------------------------------------
  let distance = dangerY - (player.y + player.h);

  // ===== BOSKIE SZCZĘŚCIE ------------------------------------------------------------------
 if(startBlessing === "luck" && !miracleUsed && distance < miracleMargin && distance > -20){

      miracleUsed = true;

      // cofnięcie lawy
      dangerY += 120;

      // WYSTRZAŁ W GÓRĘ
      player.vy = -Math.sqrt(2 * gravity * miraclePower);
  }

  // ===== ŚMIERĆ ------------------------------------------------------------
  if(player.y + player.h > dangerY){

    if(!deathPlayed){
        pigDeath.currentTime = 0;
        pigDeath.play();
        deathPlayed = true;
    }

    gameState = "dead";
    deathSlowMo = 0.12;
    deathSmokeTimer = 1.5;
    deathFlash = 1;
    
    // MEGA IMPACT ---------------------------------------------------------
    screenShakeTime = 0.45;
    screenShakePower = 55;

    // wibracja pattern: krótka-mocna-przerwa-krótka -----------------------
    vibrate([120, 40, 90]);
    baconMode = Math.random() < 0.15; // 15% szansy
    baconSpawnTime = 0; // reset animacji
    
    // LAVA SPLASH ---------------------------------------------------------
    lavaSplash = {
  x: player.x + player.w/2,
  y: dangerY,
  time: 0,
  particles: []
};

// generuj cząstki ---------------------------------------------------------
for(let i=0;i<20;i++){
  lavaSplash.particles.push({
    vx: (Math.random()*2-1) * 200,
    vy: -Math.random()*400 - 100,
    life: 0.8 + Math.random()*0.4
  });
}



      if(score > bestScore){
          bestScore = score;
          localStorage.setItem("piggyBest", bestScore);
      }
  }
}

//Gracz ===============================================================================
function updatePlayer(dt,dtSec){
  player.lastY = player.y;
  // sprawdzanie ziemi -------------------------------------------------
onGround = false;

  // ruch --------------------------------------------------------------
 let targetSpeed = 0;

if(left) targetSpeed = -speedKeyboard;
else if(right) targetSpeed = speedKeyboard;
else if(touching){

 let mid = GAME_WIDTH/2;
  let dist = (touchX - mid) / mid; // -1..1

  // martwa strefa (stabilność) ----------------------------------------
  if(Math.abs(dist) < 0.08) dist = 0;

  // krzywa responsywności --------------------------------------------
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

  // grawitacja ----------------------------------------------------------
  let gravityFactor = 1;

if(boosting){
    gravityFactor = boostGravityFactor;

    // ciąg --------------------------------------------------------------
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

//Platformy ===========================================================================
function updatePlatforms(dt){

  // --- KOLIZJE ----------------------------------------------------------------------
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

        // zwykły splash sadła-------------------------------------------------------
        squashVel = -8;

        //kurz przy lądowaniu--------------------------------------------------------
        spawnDust(player.x + player.w/2, player.y + player.h);

        // micro impact-----------------------------------------------------------------
        screenShakeTime = 0.08;
        screenShakePower = 8;

onGround = true;
coyoteTimer = coyoteTime;

break;
    }
  }

dustParticles.forEach(p=>{
  p.x += p.vx;
  p.y += p.vy;
  p.vy += 0.1;
  p.life--;
});

dustParticles = dustParticles.filter(p=>p.life>0);

  // ===== KAMERA =====-----------------------------------------------------------------
  if(player.y < REAL_HEIGHT/2){

    let diff = REAL_HEIGHT/2 - player.y;

    player.y = REAL_HEIGHT/2;
    worldOffset += diff;

    for(let p of platforms) p.y += diff;
for(let c of coins) c.y += diff;   
dangerY += diff;
  }
}

//Kasa ==========================================================================================
function updateCoins(){

  for(let i = coins.length-1; i >= 0; i--){

    let c = coins[i];



    // kolizja -------------------------------------------------------------------------------------
    if(player.x < c.x + c.r &&
       player.x + player.w > c.x &&
       player.y < c.y + c.r &&
       player.y + player.h > c.y){

        coinScore += 50;
        wallet += 10;
        
        playCoin();

localStorage.setItem("piggyWallet", wallet);

coins.splice(i,1);
    }

    // usuwamy gdy spadną poza ekran ------------------------------------------------------------------
    if(c.y > REAL_HEIGHT + 20){
        coins.splice(i,1);
    }
  }
}


//Muzyka =================================================================================================
function updateMusic(){

  if(gameState === "play"){

    if(!musicStarted){
      music.currentTime = 0;
      music.play().catch(()=>{});
      musicStarted = true;
    }

  }else{

    if(!music.paused){
      music.pause();
    }

    musicStarted = false;
  }

}


//DELTA Time ===============================================================================================
function update(dt){

   updateMusic();

  fpsFrames++;
fpsTimer += dt;

if (fpsTimer >= 1000){
  fps = fpsFrames;
  fpsFrames = 0;
  fpsTimer = 0;
}
  // ===== CAP DT (anti lag spike) --------------------------------------------------------------------------
  if(dt > 50) dt = 50;

  const realDtSec = dt / 1000;

  // ===== SLOW MOTION SYSTEM ---------------------------------------------------------------------------------
  let timeScale = 1;

  if(deathSlowMo > 0){

    let t = deathSlowMo / 0.50;        
    timeScale = 0.18 + 0.82*(1 - t);   

    deathSlowMo -= realDtSec;
    if(deathSlowMo < 0) deathSlowMo = 0;
  }

  const dtScaled = dt * timeScale;
  const dtSec = dtScaled / 1000;

  // ===== LOADING STATE --------------------------------------------------------------------------------------
  if(updateState(dtScaled)) return;

  // ===== ZAWSZE DZIAŁA (UI / FX) ----------------------------------------------------------------------------
  uiTime += realDtSec;  

  // spadająca gwiazda timer -----------------------------------------------------------------------------------
  nextShootingStar -= realDtSec;

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

  if(shootingStar){
    shootingStar.x += shootingStar.vx * realDtSec;
    shootingStar.y += shootingStar.vy * realDtSec;
    shootingStar.life -= realDtSec;
    if(shootingStar.life <= 0) shootingStar = null;
  }

  // blink ----------------------------------------------------------------------------------------------------
  blinkTimer += realDtSec;

  if(blinkTimer > nextBlink){
    blink = 1;
    nextBlink = blinkTimer + 0.12;
  }

  if(blink === 1 && blinkTimer > nextBlink){
    blink = 0;
    nextBlink = blinkTimer + 2 + Math.random()*3;
  }

  // efekty wizualne --------------------------------------------------------------------------------------------
  if(screenShakeTime > 0){
    screenShakeTime -= realDtSec;
    if(screenShakeTime < 0) screenShakeTime = 0;
  }

  if(boostFlash > 0){
    boostFlash -= realDtSec * 6;
    if(boostFlash < 0) boostFlash = 0;
  }

  if(deathFlash > 0){
    deathFlash -= realDtSec * 2;
    if(deathFlash < 0) deathFlash = 0;
  }

  if(deathSmokeTimer > 0){
    deathSmokeTimer -= realDtSec;
  }

  if(gameState === "dead" && baconMode){
    baconSpawnTime += realDtSec;
  }

  if(lavaSplash){
    lavaSplash.time += realDtSec;

    for(let p of lavaSplash.particles){
      p.vy += 900 * realDtSec;
      p.life -= realDtSec;
    }

    lavaSplash.particles =
      lavaSplash.particles.filter(p => p.life > 0);

    if(lavaSplash.time > 1.2){
      lavaSplash = null;
    }
  }

  // ===== STOP WORLD WHEN NOT PLAYING ------------------------------------------------------------------------
  if(gameState !== "play") return;
  if(rocketMode){

  rocketTimer -= dtSec;

  // ciąg rakiety ----------------------------------------------------------------------------------------------
  player.vy -= 3200 * dtSec;
  // rainbow trail ---------------------------------------------------------------------------------------------
  spawnDust(
    player.x + player.w/2,
    player.y + player.h + 8,
    true
  );

  if(rocketTimer <= 0){
    rocketMode = false;
  }
}
  // ===== SPRĘŻYNA SADŁA -----------------------------------------------------------------------------------------
  let spring = 120;
  let damping = 14;

  squashVel += (-squash * spring) * dtSec;
  squashVel -= squashVel * damping * dtSec;
  squash += squashVel * dtSec;

  // ===== GAME LOGIC (SPALNIA SIĘ W SLOWMO) ------------------------------------------------------------------------

  updatePlayer(dtScaled, dtSec);
  updatePlatforms(dtScaled);
  updateCoins();
  recyclePlatforms();
  updateScore();
  updateDanger(dtSec);
}


//Kolory tęczy ===================================================================================================
function getRainbowColor(t){
  let a = t * Math.PI * 6; // ile zmian koloru w trakcie boosta
  let r = Math.sin(a)*127+128;
  let g = Math.sin(a+2)*127+128;
  let b = Math.sin(a+4)*127+128;
  return `rgb(${r|0},${g|0},${b|0})`;
}


//barwy kolorow ==================================================================================================
function shadeColor(color, percent){

  let f = parseInt(color.slice(1),16);
  let t = percent < 0 ? 0 : 255;
  let p = percent < 0 ? percent*-1 : percent;

  let R = f>>16;
  let G = f>>8 & 0x00FF;
  let B = f & 0x0000FF;

  return "#" + (
    0x1000000 +
    (Math.round((t-R)*p)+R)*0x10000 +
    (Math.round((t-G)*p)+G)*0x100 +
    (Math.round((t-B)*p)+B)
  ).toString(16).slice(1);
}


function playCoin(){

  const s = coinSound.cloneNode(); // pozwala nakładać dźwięki
  s.volume = coinSound.volume;
  s.play().catch(()=>{});

}

//Szejk ekran ======================================================================================================
function getScreenShakeOffset(){
  if(screenShakeTime <= 0) return {x:0,y:0};

  const DURATION = 0.45;
  let t = 1 - (screenShakeTime / DURATION);

  // mocny start, szybki fade
  let intensity = screenShakePower * (1 - t*t*t);

  return {
    x: (Math.random()*2-1) * intensity,
    y: (Math.random()*2-1) * intensity * 0.7
  };
}


//Kolor świni =======================================================================================================
function getPigColor(dist){

  // krytycznie — zaraz śmierć ----------
  if(dist < 140) return "#ff2a2a";

  // ostrzeżenie ------------------------
  if(dist < 280) return "#ff00aa";

  // bezpiecznie ------------------------
  return "#00e5ff";
}

//Czujnik lawy =======================================================================================================
function getLavaRatio(){
  let dist = dangerY - (player.y + player.h);

  // zakres w którym kompas reaguje
  let max = REAL_HEIGHT * 1.2;

  let t = 1 - (dist / max);
  if(t < 0) t = 0;
  if(t > 1) t = 1;

  return t;
}

//Tło ==================================================================================================================
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

  // ===== MIGAJĄCE GWIAZDY ---------------------------------------------------------------------------------------
for(let s of stars){

  let twinkle = Math.sin(uiTime * s.speed + s.phase) * 0.5 + 0.5;

  // przy lawie lekko bardziej dramatyczne -----------------------------------------------------------------------
  let lavaT = getLavaRatio();
  twinkle += lavaT * 0.3;

  if(twinkle > 1) twinkle = 1;

  ctx.fillStyle = "rgba(255,255,255," + twinkle + ")";
  ctx.fillRect(s.x, s.y, s.size, s.size);
}

  // chmury -----------------------------------------------------------------------------------------------------
  ctx.fillStyle="rgba(255,255,255,0.08)";
  drawCloud(60,180,70);
  drawCloud(260,240,60);
  drawCloud(180,120,55);

  ctx.fillStyle="rgba(255,255,255,0.16)";
  drawCloud(120,330,90);
  drawCloud(280,420,110);

// ===== SPAADAJĄCA GWIAZDA ------------------------------------------------------------------------------------
if(shootingStar){

  const s = shootingStar;

  ctx.save();

  ctx.globalAlpha = Math.max(0, s.life);

  // ogon ------------------------------------------------------------------------------------------------------
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
 
  // punkt -------------------------------------------------------------------------------------------------------
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(s.x, s.y, 3, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}
}

  // ====== WORLD ======================================================================================================

function drawWorld(){
  ctx.save();
  ctx.translate(0, HUD);

  drawLava();
  drawLavaSplash();
  drawPlatforms();
  drawCoins();
  drawPlayer();
  drawDust();
  drawPanicBubble();
  drawDeathSmoke();

  ctx.restore();
}

//Rozbryzg lawy ======================================================================================================
function drawLavaSplash(){

  if(!lavaSplash) return;

  const s = lavaSplash;

  // ===== RIPPLE ----------------------------------------------------------------------------------------------------
  let rippleSize = s.time * 180;
  let alpha = 1 - s.time;

  ctx.strokeStyle = "rgba(255,120,0,"+alpha+")";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(s.x, s.y+5, rippleSize, 0, Math.PI*2);
  ctx.stroke();

  // ===== CZĄSTKI ----------------------------------------------------------------------------------------------------
  for(let p of s.particles){

    ctx.fillStyle = "rgba(255,80,0,"+p.life+")";
    ctx.beginPath();
    ctx.arc(
      s.x + p.vx * s.time,
      s.y + p.vy * s.time,
      5,
      0,
      Math.PI*2
    );
    ctx.fill();
  }
}


// Rysowanie LAWA =====================================================================================================
function drawLava(){

  const t = uiTime;

  // ===== PODSTAWA --------------------------------------------------------------------------------------------------
  let grad = ctx.createLinearGradient(0,dangerY,0,REAL_HEIGHT);
  grad.addColorStop(0,"#ff2a2a");
  grad.addColorStop(0.5,"#ff0040");
  grad.addColorStop(1,"#2a0000");

  ctx.fillStyle = grad;
  ctx.fillRect(0,dangerY,GAME_WIDTH,REAL_HEIGHT);

  // ===== FALA POWIERZCHNI ------------------------------------------------------------------------------------------
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

  // ===== BĄBLE ----------------------------------------------------------------------------------------------------
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


//rysowanie chmur ====================================================================================================
function drawCloud(cx, cy, r){
  ctx.beginPath();

  ctx.arc(cx-r*1.4, cy, r*0.9, 0, Math.PI*2);
  ctx.arc(cx-r*0.5, cy-r*0.5, r*1.1, 0, Math.PI*2);
  ctx.arc(cx+r*0.5, cy-r*0.4, r*1.0, 0, Math.PI*2);
  ctx.arc(cx+r*1.4, cy, r*0.8, 0, Math.PI*2);

  ctx.closePath();
  ctx.fill();
}


//rysowanie platform ==============================================================================================
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


// rysowanie kurzu =================================================================================================
function drawDust(){

  for(let p of dustParticles){

    ctx.globalAlpha = p.life/20;

    ctx.fillStyle = p.rainbow ? p.color : "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}


//Rysowanie Monety ==================================================================================================
  function drawCoins(){

  for(let c of coins){

    // ===== PULS =====---------------------------------------------------------------------------------------------
    let pulse = 1 + Math.sin(uiTime*3 + c.x)*0.15;
    let r = c.r * pulse;

    // ===== GLOW =====--------------------------------------------------------------------------------------------
    ctx.shadowBlur = 4 + Math.sin(uiTime*8 + c.y)*6;
    ctx.shadowColor = "rgba(255,215,0,0.7)";

    // ===== GRADIENT MONETY =====---------------------------------------------------------------------------------
    const grad = ctx.createRadialGradient(
      c.x - r*0.4,
      c.y - r*0.4,
      2,
      c.x,
      c.y,
      r
    );

    grad.addColorStop(0,"#ff8c00");
    grad.addColorStop(0.35,"#ff9f1a");
    grad.addColorStop(1,"#ffa500");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.lineWidth = 2;
ctx.strokeStyle = "#5a3b00";
ctx.stroke();

    ctx.shadowBlur = 0;

    // ===== SYMBOL $ (OBRÓT + 3D) =====---------------------------------------------------------------------------
    ctx.save();
    ctx.translate(c.x, c.y);

    // delikatny obrót w czasie --------------------------------------------------------------------------------------
    let rot = Math.sin(uiTime*2 + c.y) * 0.25;
    ctx.rotate(rot);

    // cień pod literą --------------------------------------------------------------------------------------------
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.font = "bold " + (r * 1.1) + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", r*0.05, r*0.08);
 
    // główny kolor --------------------------------------------------------------------------------------------------
    ctx.fillStyle = "#5a3b00";
    ctx.fillText("$", 0, 0);

    // outline arcade ---------------------------------------------------------------------------------------------
    ctx.lineWidth = r * 0.08;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.strokeText("$", 0, 0);

    ctx.restore();

    // ===== HIGHLIGHT =====---------------------------------------------------------------------------------------
    ctx.fillStyle="rgba(255,255,200,0.7)";
    ctx.beginPath();
    ctx.arc(c.x - r*0.3, c.y - r*0.3, r*0.25, 0, Math.PI*2);
    ctx.fill();
  }
}

// Oczy zamkniete w powiekach ====================================================================================
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



//Rysowanie Gracza ==============================================================================================
  function drawPlayer(){


  let playerBottom = player.y + player.h;
  let lavaDist = dangerY - playerBottom;

  let pigColors = {
 pink:"#ff9ecb",
 ninja:"#222",
 gold:"#ffd76a",
 space:"#66e0ff"
};

const pigColor = pigColors[currentSkin] || "#ff9ecb";
  currentPigColor = pigColor;

  const cx = player.x + player.w/2;
  const cy = player.y + player.h/2;
  const baseSize = player.w * 0.65;
  let idle = Math.sin(performance.now()*0.005) * 0.02;
  const scaleY = 1 + squash + idle;
  const scaleX = 1 - squash * 0.6;

ctx.save();
ctx.translate(cx, cy);
ctx.scale(scaleX, scaleY);

const x = 0;
const y = 0;
const size = baseSize;


  const r = size;

    // ===== BOOST AURA =====--------------------------------------------------------------------------------------
if(boosting || boostAfterglow > 0){

  let t = boosting
    ? boostVisualTime
    : 1 - (boostAfterglow / BOOST_AFTERGLOW_TIME);

  ctx.shadowBlur = 15;
  ctx.shadowColor = getRainbowColor(t);

}else{
  ctx.shadowBlur = 0;
}

// ===== CIEŃ =====------------------------------------------------------------------------------------------------
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse( x + size*0.15, y + size*0.9, size*0.7, size*0.25, 0, 0, Math.PI*2 );
    ctx.fill();
    
    
    // ===== GŁOWA (gradient 3D) =====---------------------------------------------------------------------------
   let headGrad = ctx.createRadialGradient(
  x - size*0.3, y - size*0.4,
  size*0.1,
  x, y,
  size
);

headGrad.addColorStop(0, pigColor);
headGrad.addColorStop(1, shadeColor(pigColor,-0.6));
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.fill();
    
    
    // ===== USZY =====----------------------------------------------------------------------------------------


// lewe -----------------------------------------------
    ctx.fillStyle = "#ffb3c1";
ctx.beginPath();
ctx.moveTo(x - size*0.7, y - size*0.4);
ctx.lineTo(x - size*0.7, y - size*1.2);
ctx.lineTo(x - size*0.15, y - size*0.95);
ctx.fill();

// prawe----------------------------------------------
    ctx.fillStyle = "#ffb3c1";
ctx.beginPath();
ctx.moveTo(x + size*0.7, y - size*0.4);
ctx.lineTo(x + size*0.7, y - size*1.2);
ctx.lineTo(x + size*0.15, y - size*0.95);
ctx.fill();
    //===== RYJ =====----------------------------------------------------------------------------------------
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
// ===== OCZY =====------------------------------------------------------------------------------------------------

let panicLevel = 0;

if(lavaDist < 200){
  panicLevel = 1 - (lavaDist / 200);
  panicLevel = Math.max(0, panicLevel);
  panicLevel = panicLevel * panicLevel;
}

let eyeSize = size * (0.19 + panicLevel * 0.28);

let eyeOffsetX = size * 0.35;
let eyeOffsetY = size * 0.25;

let tilt = panicLevel * size * 0.12 + Math.sin(uiTime * 10) * panicLevel * 1.5;

let rageShake = Math.sin(uiTime * 40) * panicLevel * 2.5;


ctx.fillStyle = "black";
ctx.beginPath();
ctx.arc(x - eyeOffsetX + rageShake, y - eyeOffsetY - tilt, eyeSize, 0, Math.PI*2);
ctx.arc(x + eyeOffsetX + rageShake, y - eyeOffsetY + tilt, eyeSize, 0, Math.PI*2);
ctx.fill();
    // ===== POŁYSK W OCZACH =====------------------------------------------------------------------------------------
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x - size*0.32, y - size*0.3, size*0.05, 0, Math.PI*2);
    ctx.arc(x + size*0.32, y - size*0.3, size*0.05, 0, Math.PI*2);
    ctx.fill();

    // ===== OKULARY (tylko dla pink) =====---------------------------------------------------------------------------
if(currentSkin === "pink"){

  ctx.strokeStyle = "black";
  ctx.lineWidth = size * 0.18;

  ctx.strokeStyle = "black";
ctx.lineWidth = size * 0.18;

// lewa soczewka ------------------------------------------------------------------------------------------------------
ctx.beginPath();
ctx.arc(x - size*0.35, y - size*0.25, size*0.28, 0, Math.PI*2);
ctx.fill();

// prawa soczewka ---------------------------------------------------------------------------------------------------
ctx.beginPath();
ctx.arc(x + size*0.35, y - size*0.25, size*0.28, 0, Math.PI*2);
ctx.fill();

  // mostek ------------------------------------------------------------------------------------------------------
  ctx.beginPath();
  ctx.moveTo(x - size*0.07, y - size*0.25);
  ctx.lineTo(x + size*0.07, y - size*0.25);
  ctx.stroke();

}

    // ===== POWIEKI =====---------------------------------------------------------------------------------------------
if(blink > 0){
  ctx.fillStyle = pigColor;

  const h = r*0.25 * blink;

  ctx.fillRect(x - r*0.5, y - r*0.25, r*0.44, h);
  ctx.fillRect(x + r*0.06, y - r*0.25, r*0.44, h);
}



    ctx.shadowBlur = 0;

    // OGONEK -------------------------------------------------------------------------------------------------------
ctx.strokeStyle = "#ff9ecb";
ctx.lineWidth = size * 0.18;
ctx.lineCap = "round";

ctx.beginPath();

let tailX = size * 0.85;
let tailY = size * 0.15;

ctx.moveTo(tailX, tailY);

// spiralny ogonek --------------------------------------------------------------------------------------------------
const wiggle = Math.sin(performance.now()*0.01) * size*0.05;

ctx.arc(tailX + size*0.2 + wiggle, tailY, size*0.18, 0, Math.PI * 1.5);

ctx.stroke();

    ctx.restore();
  return pigColor;
}


//Dym Spalonej świni ===========================================================================================
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
//Rysowanie paniki ========================================================================================
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


// Rysowanie HUD =======================================================================================================
  function drawHUD(){

  // panel ------------------------------------------------------------------------------------------------------------
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


//Rysowanie Portfela ==================================================================================================
function drawWalletTopRight(){

  ctx.font = "20px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  ctx.shadowBlur = 4;
  ctx.shadowColor = "#ffd76a";

  ctx.fillStyle = "#ffd76a";
  ctx.fillText("$ " + wallet, GAME_WIDTH - SAFE, SAFE);

  ctx.shadowBlur = 0;
}


//Rysowanie Punktów ================================================================================================
 function drawScore(){
  ctx.textAlign="left";
ctx.textBaseline="top";
ctx.font="20px Arial";

ctx.shadowBlur = 4;
ctx.shadowColor = "#ff6fa8";   // różowy neon

ctx.fillStyle = "#ff9ecb";
ctx.fillText("Score: "+score, SAFE, SAFE);

ctx.shadowBlur = 4;
ctx.shadowColor = "#ff9ecb";

ctx.fillStyle = "#ffd1dc";
ctx.fillText("Best: "+bestScore, SAFE, SAFE+25);

   // ===== WALLET =====------------------------------------------------------------------------------------------
ctx.shadowBlur = 4;
ctx.shadowColor = "#ffd76a";

ctx.fillStyle = "#ffd76a";
ctx.fillText("$ " + wallet, SAFE, SAFE + 50);

ctx.shadowBlur = 0;


}


////////////////////////////////////////Kompasy//////////////////////////////////////////////////////////////

//Rysowanie kompasów ========================================================================================
function getCompassAngle(){
  let t = getLavaRatio();

  // zaczyna reagować dopiero gdy naprawdę niebezpiecznie -----------------------------------------------------------
  let start = 0.55;
  if(t < start) return 0;

  let danger = (t - start) / (1 - start);
  if(danger > 1) danger = 1;

  // easing — powoli, potem gwałtownie --------------------------------------------------------------------------
  danger = danger * danger;

  return danger * Math.PI/2; // do 90°
}


//Rysowanie Kompasów -------------------------------------------------------------------------------------------
function drawCompassCircle(){

  compass.x = GAME_WIDTH - SAFE - 32;
  compass.y = HUD/2;
  compass.r = 26;

  const shake = getCompassShake();
const cx = compass.x + shake;
const cy = compass.y

;

  let lavaDist = dangerY - (player.y + player.h);

  // poziom zagrożenia ----------------------------------------------------------------------------------------------
  let danger = 0;
  if(lavaDist < 280) danger = 1 - (lavaDist / 280);
  if(danger < 0) danger = 0;
  if(danger > 1) danger = 1;

  // puls -------------------------------------------------------------------------------------------------------------
  let pulse = Math.sin(uiTime * 6) * danger;
  let r = compass.r + getCompassClickPulse();

  // kolor ----------------------------------------------------------------------------------------------------------
  let color = getPigColor(lavaDist);

  ctx.shadowBlur = 25 * danger;
  ctx.shadowColor = color;

  // obręcz --------------------------------------------------------------------------------------------------------
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.shadowBlur = 0;

  // środek --------------------------------------------------------------------------------------------------
  ctx.beginPath();
  ctx.arc(cx, cy, r*0.15, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();



// obrót --------------------------------------------------------------------------------------------------
let ang = getCompassAngle();

ctx.save();
ctx.translate(cx, cy);
ctx.rotate(ang);

// strzałka --------------------------------------------------------------------------------------------------
ctx.beginPath();
ctx.moveTo(0, r*0.65);
ctx.lineTo(-r*0.35, -r*0.2);
ctx.lineTo(r*0.35, -r*0.2);
ctx.closePath();

ctx.fillStyle = "#ccc";
ctx.fill();

ctx.restore();

// ===== BOOST COUNT POD KOMPASEM ===== -----------------------------------------------------------------------
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


//interfejs =====================================================================================================
  function layoutUI(){

  // najpierw pozycja kompasu -----------------------------------------------------------------------------------
  compass.x = GAME_WIDTH - SAFE - 32;
  compass.y = HUD/2;
 
  // pauza obok kompasu (z lewej strony) ------------------------------------------------------------------------
  const gap = 14; // odstęp między ikonami
  pauseButton.x = compass.x - compass.r - gap - pauseButton.r;
  pauseButton.y = HUD/2;
}


//Rysowanie ekranu startowego =================(loadingScreen)=======================================================
function drawStartScreen(){

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

  ctx.textAlign = "center";

  ctx.font = "bold 50px Arial";
  ctx.fillStyle = "#ff9ecb";

  let bounce = Math.sin(uiTime*2)*8;

  ctx.fillText(
    "PIGGY TOWER",
    GAME_WIDTH/2,
    REAL_HEIGHT/2 - 100 + bounce
  );

  ctx.font = "22px Arial";
  ctx.fillStyle = "white";

  ctx.fillText(
    "tap to continue",
    GAME_WIDTH/2,
    REAL_HEIGHT/2 + 40
  );
}


//Rysowanie menu ==================================================================================================
function drawMenu(){

  // ciemne tło --------------------------------------------------------------------------------------------------
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

  ctx.textAlign = "center";

  // ===== TITLE -------------------------------------------------------------------------------------------------
  ctx.font = "bold 52px Arial";
  ctx.fillStyle = "#ff9ecb";

  let titleBounce = Math.sin(uiTime * 2) * 6;

  ctx.fillText(
    "PIGGY TOWER",
    GAME_WIDTH/2,
    REAL_HEIGHT/2 - 120 + titleBounce
  );

  // ===== BUTTONS --------------------------------------------------------------------------------------------------
  ctx.font = "28px Arial";

  for(let b of menuButtons){

    let pulse = 1 + Math.sin(uiTime*4) * (b.text === "PLAY" ? 0.08 : 0.03);

    ctx.save();
    ctx.translate(GAME_WIDTH/2, b.y);
    ctx.scale(pulse, pulse);

    // glow tylko dla PLAY -------------------------------------------------------------------------------------------
    if(b.text === "PLAY"){
      ctx.shadowBlur = 4;
      ctx.shadowColor = "#ff6fa8";
      ctx.fillStyle = "#ff9ecb";
    }else{
      ctx.shadowBlur = 0;
      ctx.fillStyle = "white";
    }

    ctx.fillText(b.text,0,0);

    // outline dla czytelności------------------------------------------------------------------------------------
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.strokeText(b.text,0,0);

    ctx.shadowBlur = 0;
    ctx.restore();
  }



  // ===== hint -------------------------------------------------------------------------------------------------------
  ctx.font="16px Arial";
  ctx.fillStyle="rgba(255,255,255,0.6)";
  ctx.fillText("tap PLAY to start", GAME_WIDTH/2, REAL_HEIGHT/2 + 200);
   drawWalletTopRight();
}


//Rysowanie sklepu ==============================================================================================
function drawShop(){

 ctx.fillStyle="rgba(0,0,0,0.65)";
 ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

 ctx.textAlign="center";

 ctx.font="bold 48px Arial";
 ctx.fillStyle="white";

 ctx.fillText("SHOP", GAME_WIDTH/2, REAL_HEIGHT/2 - 160);

 ctx.font="26px Arial";

 let startY = REAL_HEIGHT/2 - 60;

 for(let i=0;i<skins.length;i++){

   let s = skins[i];
   let y = startY + i*60;

   let owned = ownedSkins.includes(s.id);

   let text;

   if(owned){
     text = s.id.toUpperCase() + " ✓";
   }else{
     text = s.id.toUpperCase() + "  $" + s.price;
   }

   ctx.fillStyle="white";

   if(currentSkin === s.id){
     ctx.fillStyle="#ff9ecb";
   }

   ctx.fillText(text, GAME_WIDTH/2, y);
 }

 ctx.fillStyle="#ff9ecb";
 ctx.fillText("BACK", GAME_WIDTH/2, REAL_HEIGHT/2 + 200);

 drawWalletTopRight();
}


//Rysowanie ustawień =============================================================================================
function drawSettings(){

  ctx.fillStyle="rgba(0,0,0,0.65)";
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

  ctx.textAlign="center";

  // ===== TITLE =====----------------------------------------------------------------
  ctx.font="bold 48px Arial";
  ctx.fillStyle="white";
  ctx.fillText("SETTINGS", GAME_WIDTH/2, REAL_HEIGHT/2 - 160);


  // ===== MUSIC VOLUME =====----------------------------------------------------------
  ctx.font="22px Arial";
  ctx.fillStyle="white";
  ctx.fillText("MUSIC VOLUME", GAME_WIDTH/2, REAL_HEIGHT/2 - 90);

  let barW = 200;
  let barH = 10;
  let barX = GAME_WIDTH/2 - barW/2;
  let barY = REAL_HEIGHT/2 - 60;

  // background bar-------------------------------------------------------------------
  ctx.fillStyle="#333";
  ctx.fillRect(barX, barY, barW, barH);

  // filled bar------------------------------------------------------------------------
  ctx.fillStyle="#ff9ecb";
  ctx.fillRect(barX, barY, barW * musicVolume, barH);

  // knob-----------------------------------------------------------------------------
  ctx.beginPath();
  ctx.arc(barX + barW * musicVolume, barY + barH/2, 8, 0, Math.PI*2);
  ctx.fillStyle="white";
  ctx.fill();


  // ===== VIBRATION =====--------------------------------------------------------------
  ctx.font="24px Arial";
  ctx.fillStyle="white";

  let vibText = vibrationEnabled ? "VIBRATION: ON" : "VIBRATION: OFF";
  ctx.fillText(vibText, GAME_WIDTH/2, REAL_HEIGHT/2 + 10);


 
  // ===== FPS =====
let fpsText = showFPS ? "FPS: ON" : "FPS: OFF";
ctx.fillText(fpsText, GAME_WIDTH/2, REAL_HEIGHT/2 + 60);


  drawWalletTopRight();


  // ===== BUTTONS =====-------------------------------------------------------------------
  for(let b of settingsButtons){

    ctx.font = (b.text === "RESET STATS") ? "20px Arial" : "26px Arial";

    let pulse = 1 + Math.sin(uiTime*4) * (confirmReset ? 0.16 : 0.03);

    ctx.save();
    ctx.translate(GAME_WIDTH/2, b.y);
    ctx.scale(pulse,pulse);

    ctx.strokeStyle="rgba(0,0,0,0.5)";
    ctx.lineWidth=2;

    let label = b.text;

    if(b.text === "RESET STATS" && confirmReset){
      label = "CONFIRM RESET";
    }

    ctx.strokeText(label,0,0);

    if(b.text === "RESET STATS"){
      ctx.fillStyle="#ff4444";
    }else{
      ctx.fillStyle="#ff9ecb";
    }

    ctx.fillText(label,0,0);

    ctx.restore();
  }


  // ===== CONFIRM RESET OPTIONS =====------------------------------------------------------------
  if(confirmReset){

    ctx.font = "22px Arial";

    ctx.fillStyle = "#ff4444";
    ctx.fillText("YES", GAME_WIDTH/2 - 40, REAL_HEIGHT/2 + 140);

    ctx.fillStyle = "#ff9ecb";
    ctx.fillText("NO", GAME_WIDTH/2 + 40, REAL_HEIGHT/2 + 140);

  }
}

//GameoverSCREEN =========================================================================================
function drawOverlay(title, sub){
  // ciemne tło
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cx = GAME_WIDTH / 2;
  const cy = REAL_HEIGHT / 2 - 40;

  // ================= DEAD -------------------------------------------------------------------------------------


  if(gameState === "dead"){

    ctx.font = "bold 64px Arial";

    // czerwony glow ---------------------------------------------------------------------------------------------------
    ctx.shadowBlur = 4;
    ctx.shadowColor = "#ff0000";

    ctx.fillStyle = "#ff1a1a";


    ctx.shadowBlur = 0;

    // outline horror
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#330000";

    ctx.fillStyle = "#ff1a1a";
    ctx.fillText("GAME OVER", cx, cy);

    // ===== REALISTIC 3D BACON ----------------------------------------------------------------------------------------
if(baconMode){

  let bx = GAME_WIDTH/2;
  let targetY = REAL_HEIGHT/2 + 95;

// animacja spadania + bounce ------------------------------------------------------------------------------------------
let drop = Math.min(baconSpawnTime * 600, 140);
let bounce = Math.sin(Math.min(baconSpawnTime*6, Math.PI)) * 12;

let by = targetY - 140 + drop - bounce;

  let wobble = Math.sin(uiTime*2) * 5;

  ctx.save();
  ctx.translate(bx + wobble, by);
  ctx.rotate(Math.sin(uiTime*1.5)*0.08);

  const w = 110;
  const h = 28;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
ctx.beginPath();
ctx.ellipse(0, 18, 40, 8, 0, 0, Math.PI*2);
ctx.fill();

  // ===== falowany kształt =====------------------------------------------------------------------------------
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

  // ===== mięso gradient =====-------------------------------------------------------------------------------
  let meatGrad = ctx.createLinearGradient(0, -h/2, 0, h/2);
  meatGrad.addColorStop(0, "#ff8a8a");
  meatGrad.addColorStop(0.5, "#ff4d4d");
  meatGrad.addColorStop(1, "#b30000");

  ctx.fillStyle = meatGrad;
  ctx.fill();



  // ===== warstwy tłuszczu =====-------------------------------------------------------------------------------
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

  // ===== połysk =====-------------------------------------------------------------------------------
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, -6, 35, 6, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
for(let i=0;i<3;i++){
  let steamY = -20 - i*8 - Math.sin(uiTime*2+i)*3;
  ctx.beginPath();
  ctx.arc(-20 + i*20, steamY, 6, 0, Math.PI*2);
  ctx.fill();
}

  ctx.restore();
}

    for(let b of gameOverButtons){

  let pulse = 1 + Math.sin(uiTime*4)*0.04;

  ctx.save();
  ctx.translate(GAME_WIDTH/2, b.y);
  ctx.scale(pulse,pulse);

  // glow tylko restart -------------------------------------------------------------------------------
  if(b.text === "RESTART"){
    ctx.shadowBlur = 5;
    ctx.shadowColor = "#ff2a2a";
  }

  ctx.fillStyle="white";
  ctx.fillText(b.text,0,0);

  ctx.shadowBlur = 0;

  ctx.restore();
}
    // ===== HORROR BLOOD DRIP -------------------------------------------------------------------------------
for(let i = -4; i <= 4; i++){

  let baseX = cx + i * 32;

  // lekki chaos -------------------------------------------------------------------------------
  let wobble = Math.sin(uiTime*2 + i*1.3) * 4;
  let dripX = baseX + wobble;

  // długość zmienna -------------------------------------------------------------------------------
  let dripLen = 25 + Math.sin(uiTime*3 + i*2) * 18;

  // szerokość losowa -------------------------------------------------------------------------------
  let width = 6 + (Math.sin(i*3.7)*2);

  // kolor główny -------------------------------------------------------------------------------
  ctx.fillStyle = "#7a0000";

  ctx.beginPath();
  ctx.moveTo(dripX - width/2, cy + 8);
  ctx.lineTo(dripX - width/2, cy + dripLen);
  ctx.lineTo(dripX + width/2, cy + dripLen);
  ctx.lineTo(dripX + width/2, cy + 8);
  ctx.closePath();
  ctx.fill();

  // okrągła kropla na końcu -------------------------------------------------------------------------------
  ctx.beginPath();
  ctx.arc(dripX, cy + dripLen, width * 0.6, 0, Math.PI*2);
  ctx.fill();

  // połysk krwi -------------------------------------------------------------------------------
  ctx.fillStyle = "rgba(255,80,80,0.25)";
  ctx.beginPath();
  ctx.arc(dripX - width*0.2, cy + dripLen - width*0.2, width*0.25, 0, Math.PI*2);
  ctx.fill();
}

  }

  // ================= INNE STANY ====================================================================================
  else{
    ctx.font = "50px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(title, cx, cy);
  }

if(gameState !== "dead"){
  ctx.font = "25px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(sub, GAME_WIDTH/2, REAL_HEIGHT/2 + 30);
}
}


//Rysowanie pauzy ===================================================================================================
function drawPauseOverlay(){

  ctx.fillStyle="rgba(0,0,0,0.65)";
  ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);

  ctx.textAlign="center";

  ctx.font="bold 52px Arial";
  ctx.fillStyle="white";

  ctx.fillText("PAUSE", GAME_WIDTH/2, REAL_HEIGHT/2 - 80);

  ctx.font="26px Arial";

  for(let b of pauseButtons){

    let pulse = 1 + Math.sin(uiTime*4)*0.04;

    ctx.save();
    ctx.translate(GAME_WIDTH/2, b.y);
    ctx.scale(pulse,pulse);

    ctx.fillStyle="white";
    ctx.fillText(b.text,0,0);

    ctx.restore();
  }

}

//Rysowanie stron ================================================================================================
function drawOverlayLayer(){

  if(gameState==="start") drawStartScreen();

  if(gameState==="menu")
    drawMenu();
  if(gameState==="shop") drawShop();

  if(gameState==="settings")
    drawSettings();

  if(gameState==="dead")
    drawOverlay("GAME OVER","tap to restart");

  if(gameState==="loading")
    drawOverlay("loading...","");

  if(gameState==="pause")
    drawPauseOverlay();

}


//Rysowanie pauzy =================================================================================================
function drawPauseButton(){
  ctx.beginPath();
  ctx.arc(pauseButton.x, pauseButton.y, pauseButton.r, 0, Math.PI*2);
  ctx.fillStyle = "#444";
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.fillRect(pauseButton.x-5, pauseButton.y-8, 4,16);
  ctx.fillRect(pauseButton.x+1, pauseButton.y-8, 4,16);
}

// ================= DRAW ======================================================================================

function draw(){
  layoutUI();

  ctx.clearRect(0,0,GAME_WIDTH,REAL_HEIGHT);
  drawBackground();

  const shake = getScreenShakeOffset();

  // świat tylko podczas gry ---------------------------------------------------------------------------------
  if(gameState === "play" || gameState === "pause" || gameState === "dead"){
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawWorld();
    ctx.restore();
  }

  // HUD stabilny ------------------------------------------------------------------------------------------------------
  if(gameState === "play" || gameState === "pause"){
    drawHUD();
  }

  // overlay + UI ----------------------------------------------------------------------------------------------------
  drawOverlayLayer();

  if(gameState === "play")
    drawPauseButton();

  // flash na końcu -------------------------------------------------------------------------------------------------
  if(boostFlash > 0){
    ctx.fillStyle = "rgba(255,255,255," + (boostFlash*0.35) + ")";
    ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);
  }

  if(deathFlash > 0){
    ctx.fillStyle = "rgba(255,0,0," + (deathFlash * 0.6) + ")";
    ctx.fillRect(0,0,GAME_WIDTH,REAL_HEIGHT);
  }
  ctx.font = "14px Arial";
ctx.fillStyle = "lime";
ctx.textAlign = "right";
if(showFPS){
  ctx.font = "14px Arial";
  ctx.fillStyle = "lime";
  ctx.textAlign = "right";
  ctx.fillText("FPS: " + fps, GAME_WIDTH - 10, REAL_HEIGHT - 10);
}
}
// ================= LOOP =============================================================================================

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

gameState = "start";
initPlatforms();

requestAnimationFrame(loop);

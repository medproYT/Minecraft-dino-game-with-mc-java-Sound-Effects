const dino = document.getElementById("dino");
const cactus = document.getElementById("cactus");
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("high-score");
const gameOverText = document.getElementById("game-over-text");
const bgMusic = document.getElementById("bg-music");
const walkingSound = document.getElementById("walking-sound");
const deathSound = document.getElementById("death-sound");
const gameContainer = document.querySelector('.game-container');
const milestoneText = document.getElementById("milestone-text");
const cheatCodeInput = document.getElementById("cheat-code");
const cheatApplyBtn = document.getElementById("cheat-apply");
const cheatStatus = document.getElementById("cheat-status");
let immortal = false;

let score = 0;
let highScore = localStorage.getItem("dino-high-score") ? parseInt(localStorage.getItem("dino-high-score")) : 0;
let isAlive = true;
let lastTimestamp = null;
let scoreAccumulator = 0;
// Cactus speed control (duration in ms). Lower duration = faster obstacle.
let baseCactusDuration = 1500; // initial animation duration (matches CSS default)
let minCactusDuration = 900;   // fastest allowed duration (ms) — raised to avoid super-fast speed
let totalElapsed = 0;          // total elapsed time since spawn (ms)
const speedDecreasePerSecond = 20; // ms decrease per second — much slower acceleration
// Stop increasing speed after this many seconds (prevents indefinite acceleration)
const maxSpeedTime = 60; // seconds
// Speed lock when reaching score threshold
let speedLocked = false;
let lockedElapsed = 0;
let milestoneShown = false;
let farlandsShown = false;

// Display high score on load
highScoreDisplay.innerText = "High Score: " + highScore;

function jump() {
    if (!dino.classList.contains("jump")) {
        dino.classList.add("jump");
        setTimeout(function () {
            dino.classList.remove("jump");
        }, 500); // Must match CSS animation duration
    }
}

document.addEventListener("keydown", function (event) {
    if (event.code === "Space" || event.code === "ArrowUp") {
        if (!isAlive) {
            restartGame();
        } else {
            jump();
        }
    }
});

// Press 'r' to die (force death)
document.addEventListener('keydown', function(e) {
    if (e.key === 'r' || e.code === 'KeyR') {
        triggerDeath(true);
    }
});

// Tap / click support for jump and restart
if (gameContainer) {
    gameContainer.addEventListener('pointerdown', function (e) {
        // Prevent text selection / default touch behavior
        e.preventDefault();
        if (!isAlive) {
            restartGame();
        } else {
            jump();
        }
    });
}

// Cheat code handling
if (cheatApplyBtn && cheatCodeInput) {
    function applyCheat() {
        const val = (cheatCodeInput.value || "").trim();
        if (val === "6776") {
            immortal = true;
            if (cheatStatus) cheatStatus.innerText = "Immortality enabled";
            if (!isAlive) {
                if (cheatStatus) cheatStatus.innerText = "Immortality enabled — restarting";
                restartGame(true);
            }
        } else {
            immortal = false;
            if (cheatStatus) cheatStatus.innerText = "Invalid code";
        }
        setTimeout(() => { if (cheatStatus) cheatStatus.innerText = ""; }, 3000);
    }

    cheatApplyBtn.addEventListener('click', applyCheat);
    cheatCodeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') applyCheat();
    });
}

function updateScore(deltaTime) {
    scoreAccumulator += deltaTime;
    if (scoreAccumulator >= 100) {
        const earned = Math.floor(scoreAccumulator / 100);
        score += earned;
        scoreAccumulator -= earned * 100;
        scoreDisplay.innerText = "Score: " + score;
    }
}

function getHitbox(rect, xPadding = 0.2, topPadding = 0.15, bottomPadding = 0.06) {
    return {
        left: rect.left + rect.width * xPadding,
        right: rect.right - rect.width * xPadding,
        top: rect.top + rect.height * topPadding,
        bottom: rect.bottom - rect.height * bottomPadding,
    };
}

function checkCollision() {
    if (immortal) {
        return false;
    }

    const dinoRect = dino.getBoundingClientRect();
    const cactusRect = cactus.getBoundingClientRect();

    const dinoBox = getHitbox(dinoRect, 0.2, 0.18, 0.05);
    const cactusBox = getHitbox(cactusRect, 0.18, 0.40, 0.35);

    const hitX = cactusBox.left < dinoBox.right && cactusBox.right > dinoBox.left;
    const hitY = cactusBox.top < dinoBox.bottom && cactusBox.bottom > dinoBox.top;

    return hitX && hitY;
}

function triggerDeath(force = false) {
    if (!isAlive) return;
    if (!force && immortal) return;

    cactus.classList.remove("block-animate");
    cactus.style.left = window.getComputedStyle(cactus).getPropertyValue("left");
    isAlive = false;

    // Pause sounds and play death sound
    try { bgMusic.pause(); } catch (e) {}
    try { walkingSound.pause(); } catch (e) {}
    try { deathSound.currentTime = 0; deathSound.play(); } catch (e) {}

    // Save high score if current score is higher
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("dino-high-score", highScore);
        highScoreDisplay.innerText = "High Score: " + highScore;
    }

    gameOverText.style.display = "block";
}

function gameLoop(timestamp) {
    if (!isAlive) {
        return;
    }

    if (lastTimestamp === null) {
        lastTimestamp = timestamp;
    }

    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    updateScore(deltaTime);

    // Show milestone message at 350 score
    if (!milestoneShown && score >= 350) {
        milestoneShown = true;
        if (milestoneText) {
            milestoneText.innerText = "Congrats on reaching 350";
            milestoneText.style.display = "block";
            setTimeout(() => {
                milestoneText.style.display = "none";
            }, 3000);
        }
    }

    // Show Farlands message at 999 score and restart after the celebration
    if (!farlandsShown && score >= 999) {
        farlandsShown = true;
        if (milestoneText) {
            milestoneText.innerText = "You've Reached The Minecraft Farlands!";
            milestoneText.style.display = "block";
            setTimeout(() => {
                milestoneText.style.display = "none";
                restartGame(true);
            }, 4000);
        } else {
            restartGame(true);
        }
    }

    // Update total elapsed time and gradually speed up the cactus, unless locked by score
    if (!speedLocked) {
        totalElapsed += deltaTime;
    }

    // Lock speed when score threshold reached
    if (!speedLocked && score >= 100) {
        speedLocked = true;
        lockedElapsed = totalElapsed;
    }

    const effectiveElapsed = speedLocked ? lockedElapsed : totalElapsed;
    const cappedElapsed = Math.min(effectiveElapsed, maxSpeedTime * 1000);
    const decrease = (cappedElapsed / 1000) * speedDecreasePerSecond;
    const newDuration = Math.max(minCactusDuration, baseCactusDuration - decrease);
    // Apply new duration to the cactus animation (overrides CSS)
    cactus.style.animationDuration = newDuration + "ms";

    if (checkCollision()) {
        triggerDeath();
        return;
    }

    requestAnimationFrame(gameLoop);
}

function restartGame(preserveImmortality = false) {
    isAlive = true;
    score = 0;
    scoreAccumulator = 0;
    lastTimestamp = null;
    totalElapsed = 0;
    speedLocked = false;
    lockedElapsed = 0;
    milestoneShown = false;
    farlandsShown = false;
    if (milestoneText) milestoneText.style.display = "none";
    if (!preserveImmortality) {
        immortal = false;
    }
    scoreDisplay.innerText = "Score: 0";
    gameOverText.style.display = "none";
    dino.classList.remove("jump");

    cactus.style.left = "600px";
    cactus.classList.remove("block-animate");
    void cactus.offsetWidth;
    cactus.classList.add("block-animate");

    // reset cactus speed
    cactus.style.animationDuration = baseCactusDuration + "ms";

    bgMusic.currentTime = 0;
    bgMusic.play();
    walkingSound.currentTime = 0;
    walkingSound.play();
    requestAnimationFrame(gameLoop);
}

// Start the game loop once on load
cactus.classList.add("block-animate");
// set initial cactus animation duration
cactus.style.animationDuration = baseCactusDuration + "ms";
bgMusic.play();
walkingSound.play();
requestAnimationFrame(gameLoop);

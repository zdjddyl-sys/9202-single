const screens = {
  home: document.getElementById("homeScreen"),
  intro: document.getElementById("introScreen"),
  story: document.getElementById("storyScreen"),
  final: document.getElementById("finalScreen"),
};

const app = document.getElementById("app");
const bgMusic = document.getElementById("bgMusic");
const soundToggle = document.getElementById("soundToggle");
const miaFigure = document.getElementById("miaFigure");
const supportBubble = document.getElementById("supportBubble");
const successBubble = document.getElementById("successBubble");
const sceneText = document.getElementById("sceneText");
const guidanceText = document.getElementById("guidanceText");
const breathWord = document.getElementById("breathWord");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const danmakuWall = document.getElementById("danmakuWall");

let currentStoryStep = "nervous";
let meditationTimers = [];
let breathTimer = null;
let danmakuTimer = null;
let danmakuIndex = 0;
let activeScreenName = "home";
let isSoundOn = true;
let currentAudioSource = "default";
let pendingAutoplay = false;

const audioSources = {
  default: "assets/calm-ambient.mp3",
  hobby: "assets/hobby-audio.mp3",
};

if (bgMusic) {
  bgMusic.volume = 0.28;
}

const supportMessages = [
  "You are not alone.",
  "Take your time.",
  "You are safe now.",
  "One breath at a time.",
  "It is okay to rest.",
  "You did your best.",
  "Healing is not a race.",
  "Small steps still matter.",
];

const storySteps = {
  nervous: {
    bodyClass: "state-nervous",
    bubbleText: "Help Mia",
    sceneText: "Mia feels tense, unsafe, and overwhelmed.",
    guidanceText: "",
    next: "musicPrompt",
  },
  musicPrompt: {
    bodyClass: "state-music-prompt",
    bubbleText: "Encourage her to try her hobby",
    sceneText: "Mia still feels tense, but a gentle activity may help her stay present.",
    guidanceText: "",
    next: "music",
  },
  music: {
    bodyClass: "state-music",
    bubbleText: "Encourage her to close her eyes and breathe deeply",
    sceneText: "Music helps Mia feel a little less tense, but she still feels heavy inside.",
    guidanceText: "",
    next: "breathing",
  },
  breathing: {
    bodyClass: "state-breathing",
    bubbleText: "Encourage her to try meditation",
    sceneText: "Mia's breathing becomes slower, but she still needs a quiet moment to feel grounded.",
    guidanceText: "Inhale...",
    next: "meditation",
  },
};

function clearTimers() {
  meditationTimers.forEach((timer) => clearTimeout(timer));
  meditationTimers = [];

  if (breathTimer) {
    clearInterval(breathTimer);
    breathTimer = null;
  }
}

function showScreen(screenName) {
  if (screenName === activeScreenName) {
    return;
  }

  const previousName = activeScreenName;
  const previousScreen = screens[previousName];
  const nextScreen = screens[screenName];
  activeScreenName = screenName;

  nextScreen.hidden = false;
  nextScreen.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    nextScreen.classList.add("is-active");

    if (previousScreen) {
      previousScreen.classList.remove("is-active");
      previousScreen.setAttribute("aria-hidden", "true");
    }
  });

  if (previousScreen) {
    setTimeout(() => {
      if (activeScreenName !== previousName) {
        previousScreen.hidden = true;
      }
    }, 580);
  }
}

function setStoryClass(className) {
  app.className = `app ${className}`.trim();
}

function renderStoryStep(stepName) {
  clearTimers();
  currentStoryStep = stepName;

  const step = storySteps[stepName];
  showScreen("story");
  setStoryClass(step.bodyClass);

  miaFigure.setAttribute("data-state", stepName);
  sceneText.textContent = step.sceneText;
  guidanceText.textContent = step.guidanceText;
  supportBubble.textContent = step.bubbleText;
  supportBubble.classList.remove("is-hidden");
  successBubble.classList.remove("is-visible");

  if (stepName === "breathing") {
    startBreathWords();
  }
}

function requestAudioPlay() {
  if (!bgMusic || !isSoundOn) {
    return;
  }

  bgMusic
    .play()
    .then(() => {
      pendingAutoplay = false;
      updateSoundButton();
    })
    .catch(() => {
      pendingAutoplay = true;
      updateSoundButton();
    });
}

function switchAudioSource(sourceName) {
  if (!bgMusic || currentAudioSource === sourceName) {
    return;
  }

  currentAudioSource = sourceName;
  bgMusic.pause();
  bgMusic.setAttribute("src", audioSources[sourceName]);
  bgMusic.src = audioSources[sourceName];
  bgMusic.load();

  if (isSoundOn) {
    requestAudioPlay();
  }
}

function startBreathWords() {
  const words = ["Inhale...", "Exhale..."];
  let index = 0;
  breathWord.textContent = words[index];
  guidanceText.textContent = words[index];

  breathTimer = setInterval(() => {
    index = (index + 1) % words.length;
    breathWord.textContent = words[index];
    guidanceText.textContent = words[index];
  }, 1750);
}

// The meditation sequence is timed so the user can watch Mia gradually settle.
function startMeditation() {
  clearTimers();
  showScreen("story");
  setStoryClass("state-meditation");
  miaFigure.setAttribute("data-state", "meditation");
  supportBubble.classList.add("is-hidden");
  successBubble.classList.remove("is-visible");
  sceneText.textContent = "Mia finds a quiet moment and begins to settle.";
  guidanceText.textContent = "Find a quiet moment.";

  const steps = [
    "Find a quiet moment.",
    "Breathe in slowly.",
    "Breathe out gently.",
    "You are safe in this moment.",
  ];

  steps.forEach((text, index) => {
    meditationTimers.push(
      setTimeout(() => {
        guidanceText.textContent = text;
      }, index * 1700)
    );
  });

  meditationTimers.push(
    setTimeout(() => {
      sceneText.textContent =
        "In this story, meditation helps Mia feel calmer for now.";
      guidanceText.textContent = "";
      successBubble.classList.add("is-visible");
      supportBubble.textContent = "Congratulations";
      supportBubble.classList.remove("is-hidden");
      currentStoryStep = "complete";
    }, 7200)
  );
}

function handleStoryBubble() {
  if (currentStoryStep === "complete") {
    showFinal();
    return;
  }

  if (currentStoryStep === "musicPrompt") {
    switchAudioSource("hobby");
  }

  if (currentStoryStep === "music") {
    switchAudioSource("default");
  }

  const nextStep = storySteps[currentStoryStep].next;
  if (nextStep === "meditation") {
    startMeditation();
    return;
  }

  renderStoryStep(nextStep);
}

function showFinal() {
  clearTimers();
  showScreen("final");
  setStoryClass("");
  startDanmaku();
}

function restartExperience() {
  clearTimers();
  stopDanmaku();
  currentStoryStep = "nervous";
  switchAudioSource("default");
  showScreen("home");
  setStoryClass("");
}

function createFloatingMessage(text, isUser = false) {
  const message = document.createElement("span");
  message.className = `floating-message${isUser ? " is-user" : ""}`;
  message.textContent = text;
  message.style.setProperty("--top", `${8 + Math.random() * 78}%`);
  message.style.setProperty("--duration", `${17 + Math.random() * 8}s`);
  danmakuWall.appendChild(message);
  message.addEventListener("animationend", () => message.remove());
}

function startDanmaku() {
  stopDanmaku();
  danmakuWall.replaceChildren();
  supportMessages.slice(0, 5).forEach((message, index) => {
    setTimeout(() => createFloatingMessage(message), index * 550);
  });

  danmakuTimer = setInterval(() => {
    createFloatingMessage(supportMessages[danmakuIndex % supportMessages.length]);
    danmakuIndex += 1;
  }, 2300);
}

function stopDanmaku() {
  if (danmakuTimer) {
    clearInterval(danmakuTimer);
    danmakuTimer = null;
  }
}

function updateSoundButton() {
  soundToggle.textContent = isSoundOn ? "Sound On" : "Sound Off";
  soundToggle.setAttribute("aria-pressed", String(isSoundOn));
}

function toggleMusic() {
  if (!bgMusic) {
    return;
  }

  if (isSoundOn && bgMusic.paused) {
    requestAudioPlay();
    return;
  }

  if (isSoundOn) {
    bgMusic.pause();
    isSoundOn = false;
    pendingAutoplay = false;
    updateSoundButton();
    return;
  }

  isSoundOn = true;
  updateSoundButton();
  requestAudioPlay();
}

function unlockAutoplayOnFirstGesture(event) {
  if (event.target === soundToggle || soundToggle.contains(event.target)) {
    return;
  }

  if (pendingAutoplay && isSoundOn) {
    requestAudioPlay();
  }
}

document.addEventListener("click", (event) => {
  const action = event.target.dataset.action;

  if (action === "show-intro") {
    showScreen("intro");
  }

  if (action === "start-story") {
    renderStoryStep("nervous");
  }

  if (action === "restart") {
    restartExperience();
  }
});

supportBubble.addEventListener("click", handleStoryBubble);
soundToggle.addEventListener("click", toggleMusic);
document.addEventListener("pointerdown", unlockAutoplayOnFirstGesture);
updateSoundButton();
requestAudioPlay();

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();

  if (!text) {
    return;
  }

  createFloatingMessage(text, true);
  messageInput.value = "";
});

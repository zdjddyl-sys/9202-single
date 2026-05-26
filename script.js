const screens = {
  home: document.getElementById("homeScreen"),
  intro: document.getElementById("introScreen"),
  story: document.getElementById("storyScreen"),
  final: document.getElementById("finalScreen"),
};

const app = document.getElementById("app");
const bgMusic = document.getElementById("bgMusic");
const soundToggle = document.getElementById("soundToggle");
const cameraFeed = document.getElementById("cameraFeed");
const miaFigure = document.getElementById("miaFigure");
const supportBubble = document.getElementById("supportBubble");
const successBubble = document.getElementById("successBubble");
const sceneText = document.getElementById("sceneText");
const guidanceText = document.getElementById("guidanceText");
const breathWord = document.getElementById("breathWord");
const messageForm = document.getElementById("messageForm");
const messageName = document.getElementById("messageName");
const messageInput = document.getElementById("messageInput");
const danmakuWall = document.getElementById("danmakuWall");

let currentStoryStep = "nervous";
let meditationTimers = [];
let breathTimer = null;
let activeScreenName = "home";
let isSoundOn = true;
let currentAudioSource = "default";
let pendingAutoplay = false;
let cameraStream = null;
const messageStorageKey = "ptsd-support-message-board";

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

const starterMessages = supportMessages.slice(0, 5).map((text, index) => ({
  id: `starter-${index}`,
  author: "Support",
  text,
  isUser: false,
  createdAt: "",
}));

let boardMessages = loadBoardMessages();

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
  const keepCamera = app.classList.contains("camera-mode");
  app.className = ["app", className, keepCamera ? "camera-mode" : ""]
    .filter(Boolean)
    .join(" ");
}

async function startCameraBackground() {
  if (cameraStream || !cameraFeed) {
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
      },
      audio: false,
    });

    cameraFeed.srcObject = cameraStream;
    app.classList.add("camera-mode");
  } catch {
    cameraStream = null;
    app.classList.remove("camera-mode");
  }
}

function stopCameraBackground() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  if (cameraFeed) {
    cameraFeed.srcObject = null;
  }

  app.classList.remove("camera-mode");
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
  stopCameraBackground();
  showScreen("final");
  setStoryClass("");
  renderMessageBoard();
}

function restartExperience() {
  clearTimers();
  stopCameraBackground();
  currentStoryStep = "nervous";
  switchAudioSource("default");
  showScreen("home");
  setStoryClass("");
}

function loadBoardMessages() {
  try {
    const storedMessages = JSON.parse(localStorage.getItem(messageStorageKey));

    if (Array.isArray(storedMessages) && storedMessages.length > 0) {
      return storedMessages
        .filter((message) => message && typeof message.text === "string")
        .slice(-80);
    }
  } catch {
    localStorage.removeItem(messageStorageKey);
  }

  return starterMessages;
}

function saveBoardMessages() {
  localStorage.setItem(messageStorageKey, JSON.stringify(boardMessages.slice(-80)));
}

function getInitials(author) {
  const cleanAuthor = author.trim();

  if (!cleanAuthor) {
    return "?";
  }

  return cleanAuthor
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatMessageTime(createdAt) {
  if (!createdAt) {
    return "Saved";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function createBoardMessage(message) {
  const item = document.createElement("article");
  item.className = `board-message${message.isUser ? " is-user" : ""}`;

  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.textContent = getInitials(message.author || "Guest");

  const body = document.createElement("div");
  const meta = document.createElement("div");
  meta.className = "message-meta";

  const author = document.createElement("span");
  author.className = "message-author";
  author.textContent = message.author || "Guest";

  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = formatMessageTime(message.createdAt);

  const text = document.createElement("p");
  text.className = "message-text";
  text.textContent = message.text;

  meta.append(author, time);
  body.append(meta, text);
  item.append(avatar, body);

  return item;
}

function renderMessageBoard(scrollToLatest = false) {
  danmakuWall.replaceChildren();
  boardMessages.forEach((message) => {
    danmakuWall.appendChild(createBoardMessage(message));
  });

  if (scrollToLatest) {
    danmakuWall.scrollTop = danmakuWall.scrollHeight;
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
    startCameraBackground();
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
  const author = messageName.value.trim() || "Guest";

  if (!text) {
    return;
  }

  boardMessages.push({
    id: `user-${Date.now()}`,
    author,
    text,
    isUser: true,
    createdAt: new Date().toISOString(),
  });
  saveBoardMessages();
  renderMessageBoard(true);
  messageInput.value = "";
});

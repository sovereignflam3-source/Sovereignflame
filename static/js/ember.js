const SOUND_CONFIG = {
  flame: { datasetKey: "flameSrc", volume: 0.3, animationClass: "is-flaring" },
  mutatio: { datasetKey: "mutatioSrc", volume: 0.28, animationClass: "is-surging" },
  feral: { datasetKey: "feralSrc", volume: 0.22, animationClass: "is-startled" },
};

const SOUND_COOLDOWN_MS = 520;
const ANIMATION_CLASSES = Object.values(SOUND_CONFIG).map(({ animationClass }) => animationClass);

export function selectEmberSound(random = Math.random) {
  if (random() < 1 / 40) {
    return "feral";
  }
  if (random() < 1 / 12) {
    return "mutatio";
  }
  return "flame";
}

function createPlayer() {
  const audio = new Audio();
  audio.preload = "auto";
  return audio;
}

function stopAudio(audio) {
  if (!audio) {
    return;
  }

  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {}
}

function reportPlaybackFailure(error) {
  const isLocalDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocalDevelopment) {
    console.warn("Ember audio playback failed.", error);
  }
}

function animateEmber(emberFamiliar, animationClass, previousTimer) {
  window.clearTimeout(previousTimer);
  ANIMATION_CLASSES.forEach((className) => emberFamiliar.classList.remove(className));
  void emberFamiliar.offsetWidth;
  emberFamiliar.classList.add(animationClass);

  return window.setTimeout(() => {
    emberFamiliar.classList.remove(animationClass);
  }, 540);
}

function initializeEmberFamiliar() {
  const emberFamiliar = document.getElementById("ember-familiar");
  if (!emberFamiliar) {
    return;
  }

  let player = null;
  let lastSoundAt = Number.NEGATIVE_INFINITY;
  let animationTimer = null;

  emberFamiliar.addEventListener("click", () => {
    const now = performance.now();
    if (now - lastSoundAt < SOUND_COOLDOWN_MS) {
      animationTimer = animateEmber(emberFamiliar, SOUND_CONFIG.flame.animationClass, animationTimer);
      return;
    }

    lastSoundAt = now;
    const soundName = selectEmberSound();
    const config = SOUND_CONFIG[soundName];
    const source = emberFamiliar.dataset[config.datasetKey];

    player ||= createPlayer();
    stopAudio(player);
    player.src = source;
    player.muted = false;
    player.volume = config.volume;
    animationTimer = animateEmber(emberFamiliar, config.animationClass, animationTimer);

    const playback = player.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(reportPlaybackFailure);
    }
  });
}

initializeEmberFamiliar();

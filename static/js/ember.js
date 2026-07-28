const SOUND_CONFIG = {
  flame: { datasetKey: "flameSrc", volume: 0.3, animationClass: "is-flaring" },
  mutatio: { datasetKey: "mutatioSrc", volume: 0.28, animationClass: "is-surging" },
  feral: { datasetKey: "feralSrc", volume: 0.22, animationClass: "is-startled" },
};

const SOUND_COOLDOWN_MS = 520;
const ANIMATION_CLASSES = Object.values(SOUND_CONFIG).map(({ animationClass }) => animationClass);

export function selectEmberSound(random = Math.random) {
  const feralSelected = random() < 1 / 40;
  const mutatioSelected = random() < 1 / 12;

  if (feralSelected) {
    return "feral";
  }
  if (mutatioSelected) {
    return "mutatio";
  }
  return "flame";
}

function createPlayers(emberFamiliar) {
  return Object.fromEntries(
    Object.entries(SOUND_CONFIG).map(([name, config]) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.volume = config.volume;
      audio.src = emberFamiliar.dataset[config.datasetKey];
      return [name, audio];
    }),
  );
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

  const players = createPlayers(emberFamiliar);
  let currentAudio = null;
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
    const sound = players[soundName];

    stopAudio(currentAudio);
    currentAudio = sound;
    animationTimer = animateEmber(emberFamiliar, SOUND_CONFIG[soundName].animationClass, animationTimer);

    const playback = sound.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {});
    }
  });
}

initializeEmberFamiliar();

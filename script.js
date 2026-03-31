const emotionCards = [
  { key: 'happy', label: 'Happy', image: 'happy.png' },
  { key: 'sad', label: 'Sad', image: 'img/sad.png' },
  { key: 'angry', label: 'Angry', image: 'img/angry.png' },
  { key: 'funny', label: 'Funny', image: 'img/funny.png' },
  { key: 'scared', label: 'Scared', image: 'img/scared.png' },
  { key: 'sleepy', label: 'Sleepy', image: 'img/sleepy.png' },
  { key: 'tired', label: 'Tired', image: 'img/tired.png' },
];

const carouselImg = document.getElementById('carouselImg');
const carouselLabel = document.getElementById('carouselLabel');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const startBtn = document.getElementById('startBtn');
const container = document.querySelector('.container');

const targetBox = document.getElementById('targetBox');
const targetName = document.getElementById('targetName');
const scoreBox = document.getElementById('scoreBox');
const progressBox = document.getElementById('progressBox');
const summaryContainer = document.getElementById('summaryContainer');
const summaryBox = document.getElementById('summaryBox');
const choicesGrid = document.getElementById('choicesGrid');
const resultBox = document.getElementById('resultBox');
const restartBtn = document.getElementById('restartBtn');
const nextLvlBtn = document.getElementById('nextlvl');
const levelBadge = document.getElementById('levelBadge');
const missionBox = document.getElementById('missionBox');
const successOverlay = document.getElementById('successOverlay');
const overlayMessage = document.getElementById('overlayMessage');
const overlayNextBtn = document.getElementById('overlayNextBtn');

function showOverlay(message, btnText, onClick) {
  if (overlayMessage) overlayMessage.textContent = message;
  const currentBtn = document.getElementById('overlayNextBtn');
  if (currentBtn) {
    currentBtn.textContent = btnText;
    const newBtn = currentBtn.cloneNode(true);
    currentBtn.parentNode.replaceChild(newBtn, currentBtn);
    newBtn.addEventListener('click', onClick);
  }
  if (successOverlay) successOverlay.classList.remove('hidden');
}


const MISSIONS = {
  1: '🎯 Mission: Look at the emotion shown and tap the matching face.',
  2: '🔢 Mission: Match 5 different emotions one by one. Complete all 5!',
  3: '🧠 Mission: Memorise the series in 10 seconds, then repeat it in order!',
};

function setLevelUI(level) {
  if (levelBadge) levelBadge.textContent = 'Level ' + level;
  if (missionBox) missionBox.textContent = MISSIONS[level] || '';
}

let currentIndex = 0;
let gameTarget = null;
let gameScore = 0;
let gameFinished = false;
let gameLevel = 1;
let phaseSequence = [];
let sequenceIndex = 0;

// Level 3
let lvl3Sequence = [];
let lvl3CurrentStep = 0;
let lvl3FirstTryScore = 0;  // counts correct on first attempt
const lvl3MemoryBox = document.getElementById('lvl3MemoryBox');
const lvl3SeriesRow = document.getElementById('lvl3SeriesRow');
const lvl3Countdown = document.getElementById('lvl3Countdown');
const lvl3StatusBox = document.getElementById('lvl3StatusBox');
const lvl3ProgressRow = document.getElementById('lvl3ProgressRow');

const audioContext = window.AudioContext ? new AudioContext() : null;

function playTone(frequency, duration = 0.12, type = 'sine', timeOffset = 0) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime + timeOffset;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playSuccessSound() {
  if (!audioContext) {
    return;
  }
  playTone(740, 0.12, 'triangle');
  playTone(1040, 0.12, 'triangle', 0.08);
}

function playErrorSound() {
  if (!audioContext) {
    return;
  }
  playTone(180, 0.16, 'sawtooth');
}

function pulseTarget() {
  if (!targetBox) {
    return;
  }
  targetBox.classList.add('pulse');
  setTimeout(() => targetBox.classList.remove('pulse'), 400);
}

function animateChoice(button, result) {
  if (!button) {
    return;
  }
  button.classList.add(result);
  setTimeout(() => button.classList.remove(result), 350);
}

function updateCarousel(index) {
  const card = emotionCards[index];
  carouselImg.src = `img/${card.image}`;
  carouselImg.alt = `${card.label} face`;
  carouselLabel.textContent = card.label;
}

function changeIndex(delta) {
  currentIndex = (currentIndex + delta + emotionCards.length) % emotionCards.length;
  updateCarousel(currentIndex);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function generateChoices(targetKey, count = 6) {
  const targetCard = emotionCards.find((item) => item.key === targetKey);
  if (!targetCard) {
    return [];
  }

  const choices = [targetCard];
  const distractors = emotionCards.filter((item) => item.key !== targetKey);

  while (choices.length < count && distractors.length > 0) {
    const randomIndex = Math.floor(Math.random() * distractors.length);
    choices.push(distractors.splice(randomIndex, 1)[0]);
  }

  return choices.sort(() => Math.random() - 0.5);
}

function renderChoices(choices, grid) {
  grid.innerHTML = '';

  choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.dataset.key = choice.key;

    const img = document.createElement('img');
    img.src = `img/${choice.image}`;
    img.alt = `${choice.label} face`;

    const label = document.createElement('div');
    label.textContent = choice.label;

    button.appendChild(img);
    button.appendChild(label);
    button.addEventListener('click', () => onChoiceSelected(choice.key, button));
    grid.appendChild(button);
  });
}

function updateScore() {
  if (scoreBox) {
    scoreBox.textContent = `EXP: ${gameScore} / 5`;
  }
}

function createProgressBoxes(count = 5) {
  if (!progressBox) {
    return;
  }

  progressBox.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');
    item.className = 'progress-item';
    progressBox.appendChild(item);
  }
  progressBox.classList.remove('hidden');
}

function updateProgressBoxes(completed) {
  if (!progressBox) {
    return;
  }

  const items = progressBox.querySelectorAll('.progress-item');
  items.forEach((item, index) => {
    item.classList.toggle('filled', index < completed);
  });
}

function showSummaryCards(sequence) {
  if (!summaryContainer || !summaryBox) {
    return;
  }

  summaryBox.innerHTML = '';
  sequence.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'summary-card';

    const img = document.createElement('img');
    img.src = `img/${item.image}`;
    img.alt = `${item.label} face`;

    const label = document.createElement('span');
    label.textContent = item.label;

    card.appendChild(img);
    card.appendChild(label);
    summaryBox.appendChild(card);
  });

  summaryContainer.classList.remove('hidden');
}

function hideSummaryCards() {
  if (!summaryContainer || !summaryBox) {
    return;
  }

  summaryBox.innerHTML = '';
  summaryContainer.classList.add('hidden');
}

function createLevelSequence(startKey, count = 5) {
  const available = [...emotionCards];
  const sequence = [];

  const normalized = startKey ? startKey.toLowerCase() : '';
  const first = available.find((item) => item.key.toLowerCase() === normalized || item.label.toLowerCase() === normalized);
  if (first) {
    sequence.push(first);
    available.splice(available.indexOf(first), 1);
  }

  while (sequence.length < count && available.length > 0) {
    const randomIndex = Math.floor(Math.random() * available.length);
    sequence.push(available.splice(randomIndex, 1)[0]);
  }

  return sequence;
}

function setCurrentTarget(target) {
  gameTarget = target;
  if (targetName) {
    targetName.textContent = gameTarget.label;
  }
}

function chooseNewTarget() {
  const otherCards = emotionCards.filter((item) => item.key !== gameTarget.key);
  if (otherCards.length === 0) {
    return;
  }
  gameTarget = otherCards[Math.floor(Math.random() * otherCards.length)];
  if (targetName) {
    targetName.textContent = gameTarget.label;
  }
}

function endGame() {
  gameFinished = true;
  if (choicesGrid) {
    choicesGrid.querySelectorAll('button').forEach((button) => {
      button.disabled = true;
    });
  }
  if (restartBtn) restartBtn.classList.remove('hidden');
  if (nextLvlBtn) {
    if (gameLevel === 2) {
      nextLvlBtn.textContent = 'Continue to Level 3 →';
      nextLvlBtn.classList.remove('hidden');
    } else {
      nextLvlBtn.classList.add('hidden');
    }
  }
}

// ── Level 3 ──────────────────────────────────────────────
function startLevel3(sequence) {
  lvl3Sequence = sequence;
  lvl3CurrentStep = 0;
  lvl3FirstTryScore = 0;
  gameLevel = 3;
  gameFinished = false;
  setLevelUI(3);

  // clear any previous _failed flags
  lvl3Sequence.forEach(item => { item._failed = false; });

  // hide overlay if open
  if (successOverlay) successOverlay.classList.add('hidden');

  // hide game elements, show memory box
  if (targetBox) targetBox.classList.add('hidden');
  if (progressBox) progressBox.classList.add('hidden');
  if (summaryContainer) summaryContainer.classList.add('hidden');
  if (resultBox) { resultBox.textContent = ''; resultBox.classList.add('hidden'); }
  if (restartBtn) restartBtn.classList.add('hidden');
  if (nextLvlBtn) nextLvlBtn.classList.add('hidden');
  if (lvl3StatusBox) lvl3StatusBox.classList.add('hidden');

  // build series row
  lvl3SeriesRow.innerHTML = '';
  sequence.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'lvl3-series-card';

    const num = document.createElement('div');
    num.className = 'lvl3-series-num';
    num.textContent = i + 1;

    const img = document.createElement('img');
    img.src = `img/${item.image}`;
    img.alt = item.label;

    const lbl = document.createElement('span');
    lbl.textContent = item.label;

    card.appendChild(num);
    card.appendChild(img);
    card.appendChild(lbl);
    lvl3SeriesRow.appendChild(card);
  });

  // hide everything except the memory box
  if (choicesGrid) choicesGrid.classList.add('hidden');
  if (targetBox) targetBox.classList.add('hidden');
  if (progressBox) progressBox.classList.add('hidden');
  if (resultBox) { resultBox.textContent = ''; resultBox.classList.add('hidden'); }
  if (lvl3StatusBox) lvl3StatusBox.classList.add('hidden');

  lvl3MemoryBox.classList.remove('hidden');

  // countdown 10 → 0 then hide and start recall
  let timeLeft = 10;
  lvl3Countdown.textContent = `Hiding in ${timeLeft}s…`;
  const timer = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft > 0) {
      lvl3Countdown.textContent = `Hiding in ${timeLeft}s…`;
    } else {
      clearInterval(timer);
      lvl3Countdown.textContent = '';
      lvl3MemoryBox.classList.add('hidden');
      if (choicesGrid) choicesGrid.classList.remove('hidden');
      beginLvl3Recall();
    }
  }, 1000);
}

function buildLvl3ProgressRow() {
  lvl3ProgressRow.innerHTML = '';
  lvl3Sequence.forEach((item, i) => {
    const slot = document.createElement('div');
    slot.className = 'lvl3-slot';
    slot.id = `lvl3slot-${i}`;

    const img = document.createElement('img');
    img.src = `img/${item.image}`;
    img.alt = item.label;
    img.className = 'hidden';

    const q = document.createElement('span');
    q.className = 'lvl3-slot-q';
    q.textContent = '?';

    slot.appendChild(img);
    slot.appendChild(q);
    lvl3ProgressRow.appendChild(slot);
  });
}

function fillLvl3Slot(index) {
  const slot = document.getElementById(`lvl3slot-${index}`);
  if (!slot) return;
  slot.querySelector('img').classList.remove('hidden');
  slot.querySelector('.lvl3-slot-q').classList.add('hidden');
  slot.classList.add('filled');
}

function beginLvl3Recall() {
  lvl3CurrentStep = 0;
  buildLvl3ProgressRow();
  lvl3StatusBox.classList.remove('hidden');
  if (targetBox) targetBox.classList.remove('hidden');
  showLvl3Step();
}

function showLvl3Step() {
  if (lvl3CurrentStep >= lvl3Sequence.length) return;
  const current = lvl3Sequence[lvl3CurrentStep];
  // update target box to show which number we're on
  if (targetName) targetName.textContent = `${lvl3CurrentStep + 1} of ${lvl3Sequence.length}`;
  if (targetBox) {
    targetBox.innerHTML = `Emotion <strong>${lvl3CurrentStep + 1}</strong> of ${lvl3Sequence.length} — what was it?`;
  }
  renderLvl3Choices();
}

function renderLvl3Choices() {
  if (!choicesGrid) return;
  const correct = lvl3Sequence[lvl3CurrentStep];
  const distractors = emotionCards.filter(c => c.key !== correct.key);
  const distractor = distractors[Math.floor(Math.random() * distractors.length)];
  const pair = [correct, distractor].sort(() => Math.random() - 0.5);

  choicesGrid.innerHTML = '';
  pair.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.dataset.key = choice.key;

    const img = document.createElement('img');
    img.src = `img/${choice.image}`;
    img.alt = choice.label;

    const label = document.createElement('div');
    label.textContent = choice.label;

    button.appendChild(img);
    button.appendChild(label);
    button.addEventListener('click', () => onLvl3ChoiceSelected(choice.key, button));
    choicesGrid.appendChild(button);
  });
}

function onLvl3ChoiceSelected(selectedKey, button) {
  if (gameFinished) return;
  const expected = lvl3Sequence[lvl3CurrentStep];

  if (selectedKey === expected.key) {
    animateChoice(button, 'correct');
    playSuccessSound();
    if (!expected._failed) lvl3FirstTryScore += 1;
    fillLvl3Slot(lvl3CurrentStep);
    lvl3CurrentStep += 1;

    if (lvl3CurrentStep >= lvl3Sequence.length) {
      // all done — only 5/5 first-try counts as a win
      gameFinished = true;
      if (targetBox) targetBox.classList.add('hidden');
      if (lvl3StatusBox) lvl3StatusBox.classList.add('hidden');
      choicesGrid.querySelectorAll('button').forEach(b => b.disabled = true);
      setTimeout(() => {
        if (lvl3FirstTryScore === lvl3Sequence.length) {
          showCongratsScreen();
        } else {
          if (choicesGrid) choicesGrid.classList.add('hidden');
          if (lvl3StatusBox) lvl3StatusBox.classList.add('hidden');
          if (targetBox) targetBox.classList.add('hidden');
          if (resultBox) { resultBox.textContent = ''; resultBox.classList.add('hidden'); }
          if (restartBtn) restartBtn.classList.add('hidden');
          showOverlay(
            '💪 Good try! Watch the order again and give it another shot!',
            '🔁 Try Level Again',
            () => {
              successOverlay.classList.add('hidden');
              replayLevel3WithSeries(lvl3Sequence);
            }
          );
        }
      }, 600);
    } else {
      // short pause then next question
      choicesGrid.querySelectorAll('button').forEach(b => b.disabled = true);
      setTimeout(() => showLvl3Step(), 600);
    }
  } else {
    // mark step as failed — won't count toward 5/5
    if (!expected._failed) expected._failed = true;
    animateChoice(button, 'wrong');
    playErrorSound();
    // show error and disable only this button — player keeps trying
    if (resultBox) {
      resultBox.textContent = '❌ Not quite! Try again.';
      resultBox.style.color = '#d00000';
      resultBox.classList.remove('hidden');
    }
    button.disabled = true;
  }
}

function replayLevel3WithSeries(sequence) {
  // Reset state
  lvl3Sequence = sequence;
  lvl3CurrentStep = 0;
  lvl3FirstTryScore = 0;
  gameFinished = false;
  lvl3Sequence.forEach(item => { item._failed = false; });

  // Hide game elements
  if (choicesGrid) choicesGrid.classList.add('hidden');
  if (targetBox) targetBox.classList.add('hidden');
  if (progressBox) progressBox.classList.add('hidden');
  if (resultBox) { resultBox.textContent = ''; resultBox.classList.add('hidden'); }
  if (lvl3StatusBox) lvl3StatusBox.classList.add('hidden');
  if (restartBtn) restartBtn.classList.add('hidden');
  if (nextLvlBtn) nextLvlBtn.classList.add('hidden');

  // Rebuild and show the series to memorise
  lvl3SeriesRow.innerHTML = '';
  sequence.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'lvl3-series-card';

    const num = document.createElement('div');
    num.className = 'lvl3-series-num';
    num.textContent = i + 1;

    const img = document.createElement('img');
    img.src = `img/${item.image}`;
    img.alt = item.label;

    const lbl = document.createElement('span');
    lbl.textContent = item.label;

    card.appendChild(num);
    card.appendChild(img);
    card.appendChild(lbl);
    lvl3SeriesRow.appendChild(card);
  });

  lvl3MemoryBox.classList.remove('hidden');

  // Countdown then start recall
  let timeLeft = 10;
  lvl3Countdown.textContent = `Hiding in ${timeLeft}s…`;
  const timer = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft > 0) {
      lvl3Countdown.textContent = `Hiding in ${timeLeft}s…`;
    } else {
      clearInterval(timer);
      lvl3Countdown.textContent = '';
      lvl3MemoryBox.classList.add('hidden');
      if (choicesGrid) choicesGrid.classList.remove('hidden');
      beginLvl3Recall();
    }
  }, 1000);
}

function resolveTargetKey(targetKey) {
  if (!targetKey) {
    return emotionCards[Math.floor(Math.random() * emotionCards.length)].key;
  }

  const normalized = targetKey.trim().toLowerCase();
  const found = emotionCards.find((item) =>
    item.key.toLowerCase() === normalized || item.label.toLowerCase() === normalized
  );

  return found ? found.key : emotionCards[Math.floor(Math.random() * emotionCards.length)].key;
}

function startGamePage(targetKey) {
  const levelParam = parseInt(getQueryParam('level'), 10);
  gameLevel = levelParam === 2 ? 2 : 1;
  const validTarget = resolveTargetKey(targetKey);

  gameScore = 0;
  gameFinished = false;
  sequenceIndex = 0;
  phaseSequence = [];

  hideSummaryCards();
  setLevelUI(gameLevel);

  if (nextLvlBtn) nextLvlBtn.classList.add('hidden');
  if (restartBtn) restartBtn.classList.add('hidden');
  if (resultBox) { resultBox.textContent = ''; resultBox.classList.add('hidden'); }
  if (scoreBox) scoreBox.classList.add('hidden');

  if (gameLevel === 2) {
    phaseSequence = createLevelSequence(validTarget, 5);
    if (phaseSequence.length === 0) return;
    setCurrentTarget(phaseSequence[sequenceIndex]);
    if (targetBox) targetBox.classList.remove('hidden');
    createProgressBoxes(5);
    updateProgressBoxes(gameScore);
    if (choicesGrid) renderChoices(generateChoices(gameTarget.key, 6), choicesGrid);
    return;
  }

  // Level 1
  if (progressBox) progressBox.classList.add('hidden');
  gameTarget = emotionCards.find((item) => item.key === validTarget);
  if (!gameTarget) return;
  if (targetName) targetName.textContent = gameTarget.label;
  if (targetBox) targetBox.classList.remove('hidden');
  if (choicesGrid) renderChoices(generateChoices(gameTarget.key, 6), choicesGrid);
}

function onChoiceSelected(selectedKey, button) {
  if (!gameTarget || !resultBox || gameFinished) {
    return;
  }

  if (selectedKey === gameTarget.key) {
    animateChoice(button, 'correct');
    playSuccessSound();
    pulseTarget();

    if (gameLevel === 1) {
      // disable choices immediately
      choicesGrid.querySelectorAll('button').forEach(b => b.disabled = true);
      // show overlay after 2 seconds
      setTimeout(() => {
        if (overlayMessage) overlayMessage.textContent = '⭐ Great job! You matched the emotion. Ready for the next level?';
        if (successOverlay) successOverlay.classList.remove('hidden');
      }, 1000);
      return;
    }

    gameScore += 1;
    updateProgressBoxes(gameScore);

    if (gameScore >= 5) {
      showSummaryCards(phaseSequence);
      endGame();
      setTimeout(() => {
        hideSummaryCards();
        if (resultBox) { resultBox.textContent = ''; resultBox.classList.add('hidden'); }
        if (restartBtn) restartBtn.classList.add('hidden');
        if (nextLvlBtn) nextLvlBtn.classList.add('hidden');
        showOverlay(
          '🏆 Level 2 complete! You matched all 5 emotions!',
          'Continue',
          () => {
            successOverlay.classList.add('hidden');
            startLevel3(phaseSequence);
          }
        );
      }, 800);
    } else {
      sequenceIndex += 1;
      if (sequenceIndex < phaseSequence.length) {
        setCurrentTarget(phaseSequence[sequenceIndex]);
      }
      if (choicesGrid) renderChoices(generateChoices(gameTarget.key, 6), choicesGrid);
      resultBox.textContent = `✅ Correct! ${5 - gameScore} emotion${5 - gameScore === 1 ? '' : 's'} left.`;
      resultBox.style.color = '#2d6a4f';
    }
  } else {
    animateChoice(button, 'wrong');
    playErrorSound();
    const selected = emotionCards.find((item) => item.key === selectedKey);
    resultBox.textContent = `❌ That is ${selected.label}. Try again!`;
    resultBox.style.color = '#d00000';
  }

  resultBox.classList.remove('hidden');
}

function showCongratsScreen() {
  // hide everything
  if (choicesGrid) choicesGrid.classList.add('hidden');
  if (lvl3StatusBox) lvl3StatusBox.classList.add('hidden');
  if (progressBox) progressBox.classList.add('hidden');
  if (resultBox) { resultBox.textContent=''; resultBox.classList.add('hidden'); }
  if (successOverlay) successOverlay.classList.add('hidden');

  const container = document.querySelector('.container');
  const congrats = document.createElement('div');
  congrats.id = 'congratsScreen';
  congrats.className = 'congrats-screen';
  congrats.innerHTML = `
    <div class="congrats-stars">⭐⭐⭐</div>
    <h2 class="congrats-title">Amazing!</h2>
    <img class="congrats-img" src="img/congrats.png" alt="Celebration characters" />
    <p class="congrats-msg">You remembered all 5 emotions in the correct order.<br>You are an emotion champion! 🏆</p>
    <button class="start congrats-btn" onclick="window.location.href='index.html'">🏠 Play Again</button>
  `;
  container.appendChild(congrats);
  // animate in
  requestAnimationFrame(() => congrats.classList.add('visible'));
}

function setupIndexPage() {
  if (!carouselImg || !leftBtn || !rightBtn || !startBtn) {
    return;
  }

  updateCarousel(currentIndex);
  leftBtn.addEventListener('click', () => changeIndex(-1));
  rightBtn.addEventListener('click', () => changeIndex(1));
  startBtn.addEventListener('click', () => {
    const selectedKey = emotionCards[currentIndex].key;
    window.location.href = `game.html?target=${encodeURIComponent(selectedKey)}`;
  });
}

function setupGamePage() {
  if (!choicesGrid || !targetBox || !targetName) {
    return;
  }

  const targetKey = getQueryParam('target');
  startGamePage(targetKey);

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (nextLvlBtn) {
    nextLvlBtn.addEventListener('click', () => {
      if (gameLevel === 2) {
        startLevel3(phaseSequence);
      } else {
        window.location.href = 'game.html?level=2';
      }
    });
  }

  if (overlayNextBtn) {
    overlayNextBtn.addEventListener('click', () => {
      window.location.href = 'game.html?level=2';
    });
  }
}

setupIndexPage();
setupGamePage();

  const reviewControls = $('game-review-controls');
  const reviewWorlds = reviewControls?.querySelectorAll('[data-review-world]');
  const canReview = () => running && scene === 'level' && level?.review && !move && !fading && !inSettings;
  let shownReviewWorld = null;

  function updateReviewControls() {
    if (!reviewControls) return;
    const active = canReview();
    reviewControls.hidden = !active;
    if (!active) {
      shownReviewWorld = null;
      return;
    }
    const world = reviewWorlds[current];
    if (shownReviewWorld !== world) {
      reviewWorlds.forEach(item => { item.hidden = item !== world; });
      const scenario = world.querySelector('[data-review-scenario]');
      if (scenario) scenario.value = String(reviewScenario);
      const invulnerable = world.querySelector('[data-review-invulnerable]');
      if (invulnerable) invulnerable.checked = reviewInvulnerable;
      shownReviewWorld = world;
    }
    const practice = world.querySelector('[data-review-practice]');
    if (practice) practice.hidden = !mechanicOf(current).canReviewPractice(level);
  }

  if (reviewControls) {
    reviewControls.addEventListener('pointermove', event => {
      event.stopPropagation();
      pointer.inside = false;
    });
    reviewControls.addEventListener('change', event => {
      if (!canReview() || !event.target.matches('[data-review-invulnerable]')) return;
      reviewInvulnerable = event.target.checked;
      mechanicOf(current).setReviewInvulnerable(level, reviewInvulnerable);
    });
    reviewControls.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !canReview()) return;
      const mechanic = mechanicOf(current);
      if (button.id === 'game-review-next') {
        goOn();
      } else if (button.hasAttribute('data-review-play')) {
        reviewScenario = Number(reviewWorlds[current].querySelector('[data-review-scenario]').value);
        fadeReset();
      } else if (button.hasAttribute('data-review-practice')) {
        mechanic.startReviewPractice(level);
      } else if (button.dataset.reviewSound) {
        const effect = $(button.dataset.reviewSound).value;
        const cue = mechanic.reviewSounds?.[effect];
        if (cue) cue(level);
        else sound()?.[effect]?.();
      }
    });
  }

/* ==========================================================================
   Police Network Login - Split-Flap Text Transition & Interactive Animations
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('splitFlapTitle');
  if (!container) return;

  const phrases = ["Welcome Officer", "Dispatch Network"];
  let phraseIndex = 0;
  let cards = [];

  // Helper to escape HTML characters safely
  function escapeHtml(char) {
    if (char === ' ') return '&nbsp;';
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    return char;
  }

  // Initialize the flap cards based on max phrase length
  function initBoard() {
    const maxLength = Math.max(...phrases.map(p => p.length));
    container.innerHTML = '';
    cards = [];

    for (let i = 0; i < maxLength; i++) {
      const card = document.createElement('div');
      card.className = 'flap-card';

      // If character is space, add a helper class for styling
      const initialChar = phrases[0][i] || ' ';
      if (initialChar === ' ') card.classList.add('space-card');

      card.innerHTML = `
        <div class="flap-half top"><span>${escapeHtml(initialChar)}</span></div>
        <div class="flap-half bottom"><span>${escapeHtml(initialChar)}</span></div>
      `;
      
      container.appendChild(card);
      cards.push(card);
    }
  }

  // Flip a single card from oldChar to newChar with staggered 3D animation
  function flipCard(cardEl, newChar, delay) {
    const topSpan = cardEl.querySelector('.flap-half.top span');
    const bottomSpan = cardEl.querySelector('.flap-half.bottom span');
    const oldChar = topSpan ? (topSpan.innerHTML === '&nbsp;' ? ' ' : topSpan.textContent) : ' ';

    if (oldChar === newChar) return;

    setTimeout(() => {
      // Manage space styling
      if (newChar === ' ') {
        cardEl.classList.add('space-card');
      } else {
        cardEl.classList.remove('space-card');
      }

      // Create animated top leaf (flips down from 0deg to -90deg)
      const leafTop = document.createElement('div');
      leafTop.className = 'flap-leaf leaf-top';
      leafTop.innerHTML = `<span>${escapeHtml(oldChar)}</span>`;

      // Create animated bottom leaf (flips in from 90deg to 0deg)
      const leafBottom = document.createElement('div');
      leafBottom.className = 'flap-leaf leaf-bottom';
      leafBottom.innerHTML = `<span>${escapeHtml(newChar)}</span>`;

      cardEl.appendChild(leafTop);
      cardEl.appendChild(leafBottom);

      // Update static top half to the new character immediately behind top leaf
      if (topSpan) topSpan.innerHTML = escapeHtml(newChar);

      // Trigger 3D rotation step 1
      requestAnimationFrame(() => {
        leafTop.style.transform = 'rotateX(-90deg)';
      });

      // Step 2: Swap to bottom leaf flipping down
      setTimeout(() => {
        leafTop.remove();
        leafBottom.style.transform = 'rotateX(0deg)';

        // Step 3: Complete flip and update static bottom half
        setTimeout(() => {
          if (bottomSpan) bottomSpan.innerHTML = escapeHtml(newChar);
          leafBottom.remove();
        }, 120);
      }, 120);

    }, delay);
  }

  // Transition the split-flap board to the next phrase
  function transitionToNextPhrase() {
    phraseIndex = (phraseIndex + 1) % phrases.length;
    const targetPhrase = phrases[phraseIndex];

    cards.forEach((cardEl, index) => {
      const newChar = targetPhrase[index] || ' ';
      // Staggered randomized delay per letter card
      const delay = index * 50 + Math.random() * 45;
      flipCard(cardEl, newChar, delay);
    });
  }

  // Initialize board and start loop
  initBoard();
  
  // Transition between phrases every 3.5 seconds
  setInterval(transitionToNextPhrase, 3500);

  /* ==========================================================================
     Frontend View Toggle (Sign In <-> Officer Registration State)
     ========================================================================== */
  let isSignUp = false;

  const signInView = document.getElementById('signInView');
  const signUpView = document.getElementById('signUpView');
  const toSignUpBtn = document.getElementById('toSignUpBtn');
  const toSignInBtn = document.getElementById('toSignInBtn');

  function updateFormView() {
    if (isSignUp) {
      if (signInView) signInView.style.display = 'none';
      if (signUpView) signUpView.style.display = 'block';
    } else {
      if (signUpView) signUpView.style.display = 'none';
      if (signInView) signInView.style.display = 'block';
    }
  }

  if (toSignUpBtn) {
    toSignUpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = true;
      updateFormView();
    });
  }

  if (toSignInBtn) {
    toSignInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = false;
      updateFormView();
    });
  }

  // Password Eye Icon Toggle
  document.querySelectorAll('.eye-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.password-input-wrapper');
      const input = wrapper ? wrapper.querySelector('input') : null;
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });
});

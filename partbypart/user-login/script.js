/* ==========================================================================
   Split-Flap (Flip Clock) Text Transition & Interactive Animations
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('splitFlapTitle');
  if (!container) return;

  const phrases = ["Nice to Meet You!", "Hello World!"];
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
  
  // Transition between "Nice to Meet You!" and "Hello World!" every 3.5 seconds
  setInterval(transitionToNextPhrase, 3500);

  /* ==========================================================================
     Frontend View Toggle (Sign In <-> Sign Up State)
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

  /* ==========================================================================
     SUPABASE AUTHENTICATION INTEGRATION (USER LOGIN & STEPPED SIGNUP)
     ========================================================================== */
  const SUPABASE_URL = 'https://jkcgutjknjykqasenwqq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PtBOjVSdVe4eKPfBDE8y6g_RUGPzvG6';

  let supabaseClient = null;
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

  // Navigation target for authenticated users
  const USER_HOME_URL = '../user-home/index.html';

  // Elements
  const loginForm = signInView ? signInView.querySelector('form.login-form') : null;
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn') || (loginForm ? loginForm.querySelector('button[type="submit"]') : null);
  const authMessage = document.getElementById('authMessage');

  // Helper to display messages cleanly in existing design
  function showMsg(container, text, type = 'error') {
    if (!container) return;
    container.textContent = text;
    container.className = `auth-message ${type}`;
    container.style.display = 'block';
  }

  function clearMsg(container) {
    if (!container) return;
    container.textContent = '';
    container.style.display = 'none';
  }

  // Email format validation (rejects test@, abc, @gmail.com, hello@, etc.)
  function isValidEmailFormat(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // --------------------------------------------------------------------------
  // 1. EMAIL + PASSWORD LOGIN
  // --------------------------------------------------------------------------
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(authMessage);

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        showMsg(authMessage, 'Please enter both email and password.', 'error');
        return;
      }

      if (!isValidEmailFormat(email)) {
        showMsg(authMessage, 'Please enter a valid email address.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(authMessage, 'Something went wrong. Please try again.', 'error');
        return;
      }

      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.dataset.originalText = loginBtn.textContent;
        loginBtn.textContent = 'Authenticating...';
      }

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          showMsg(authMessage, 'Invalid email or password.', 'error');
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = loginBtn.dataset.originalText || 'Login';
          }
        } else if (data && data.session) {
          showMsg(authMessage, 'Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = USER_HOME_URL;
          }, 400);
        }
      } catch (err) {
        showMsg(authMessage, 'Something went wrong. Please try again.', 'error');
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = loginBtn.dataset.originalText || 'Login';
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. STEPPED USER SIGN-UP FLOW (EMAIL -> OTP -> PASSWORD -> /user-home)
  // --------------------------------------------------------------------------
  const signupStep1 = document.getElementById('signupStep1');
  const signupStep2 = document.getElementById('signupStep2');
  const signupStep3 = document.getElementById('signupStep3');

  const signupEmailForm = document.getElementById('signupEmailForm');
  const signupEmailInput = document.getElementById('signup-email');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const signupEmailMsg = document.getElementById('signupEmailMsg');

  const signupOtpForm = document.getElementById('signupOtpForm');
  const otpInput = document.getElementById('otp-input');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const resendOtpBtn = document.getElementById('resendOtpBtn');
  const otpMsg = document.getElementById('otpMsg');
  const displayTargetEmail = document.getElementById('displayTargetEmail');

  const createPasswordForm = document.getElementById('createPasswordForm');
  const signupPasswordInput = document.getElementById('signup-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const createAccountBtn = document.getElementById('createAccountBtn');
  const passwordMsg = document.getElementById('passwordMsg');

  let pendingSignupEmail = '';

  // STEP 1: Validate Email & Send OTP
  if (signupEmailForm) {
    signupEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(signupEmailMsg);

      const email = signupEmailInput ? signupEmailInput.value.trim() : '';

      if (!email || !isValidEmailFormat(email)) {
        showMsg(signupEmailMsg, 'Please enter a valid email address.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(signupEmailMsg, 'Something went wrong. Please try again.', 'error');
        return;
      }

      pendingSignupEmail = email;

      if (sendOtpBtn) {
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending OTP...';
      }

      try {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email: pendingSignupEmail,
          options: {
            shouldCreateUser: true
          }
        });

        if (error) {
          showMsg(signupEmailMsg, error.message || 'Failed to send OTP. Please try again.', 'error');
          if (sendOtpBtn) {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send Verification Code';
          }
        } else {
          // Transition to Step 2: OTP Verification
          if (displayTargetEmail) displayTargetEmail.textContent = pendingSignupEmail;
          if (signupStep1) signupStep1.style.display = 'none';
          if (signupStep2) signupStep2.style.display = 'block';
          clearMsg(otpMsg);
          showMsg(otpMsg, 'Verification code sent to your email!', 'success');
        }
      } catch (err) {
        showMsg(signupEmailMsg, 'Something went wrong. Please try again.', 'error');
        if (sendOtpBtn) {
          sendOtpBtn.disabled = false;
          sendOtpBtn.textContent = 'Send Verification Code';
        }
      }
    });
  }

  // Resend OTP Link
  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMsg(otpMsg);
      if (!pendingSignupEmail || !supabaseClient) return;

      resendOtpBtn.textContent = 'Resending...';

      const { error } = await supabaseClient.auth.signInWithOtp({
        email: pendingSignupEmail,
        options: { shouldCreateUser: true }
      });

      resendOtpBtn.textContent = 'Resend OTP';

      if (error) {
        showMsg(otpMsg, 'Failed to resend OTP. Please try again.', 'error');
      } else {
        showMsg(otpMsg, 'A new OTP code has been sent to your email.', 'success');
      }
    });
  }

  // STEP 2: Verify OTP
  if (signupOtpForm) {
    signupOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(otpMsg);

      const code = otpInput ? otpInput.value.trim() : '';

      if (!code || code.length < 6) {
        showMsg(otpMsg, 'Please enter the complete 6-digit OTP code.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(otpMsg, 'Something went wrong. Please try again.', 'error');
        return;
      }

      if (verifyOtpBtn) {
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = 'Verifying...';
      }

      try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
          email: pendingSignupEmail,
          token: code,
          type: 'email'
        });

        if (error || !data.session) {
          showMsg(otpMsg, 'Invalid or expired OTP.', 'error');
          if (verifyOtpBtn) {
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.textContent = 'Verify Code';
          }
        } else {
          // OTP Verified! Transition to Step 3: Create Password
          if (signupStep2) signupStep2.style.display = 'none';
          if (signupStep3) signupStep3.style.display = 'block';
          clearMsg(passwordMsg);
        }
      } catch (err) {
        showMsg(otpMsg, 'Invalid or expired OTP.', 'error');
        if (verifyOtpBtn) {
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.textContent = 'Verify Code';
        }
      }
    });
  }

  // STEP 3: Password Creation & Account Finalization
  if (createPasswordForm) {
    createPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(passwordMsg);

      const pass = signupPasswordInput ? signupPasswordInput.value : '';
      const confirmPass = confirmPasswordInput ? confirmPasswordInput.value : '';

      if (!pass || !confirmPass) {
        showMsg(passwordMsg, 'Please fill in both password fields.', 'error');
        return;
      }

      if (pass.length < 6) {
        showMsg(passwordMsg, 'Password must be at least 6 characters.', 'error');
        return;
      }

      if (pass !== confirmPass) {
        showMsg(passwordMsg, 'Passwords do not match.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(passwordMsg, 'Something went wrong. Please try again.', 'error');
        return;
      }

      if (createAccountBtn) {
        createAccountBtn.disabled = true;
        createAccountBtn.textContent = 'Creating Account...';
      }

      try {
        const { data, error } = await supabaseClient.auth.updateUser({
          password: pass
        });

        if (error) {
          showMsg(passwordMsg, error.message || 'Failed to create password. Please try again.', 'error');
          if (createAccountBtn) {
            createAccountBtn.disabled = false;
            createAccountBtn.textContent = 'Create Account';
          }
        } else {
          showMsg(passwordMsg, 'Account created successfully! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = USER_HOME_URL;
          }, 400);
        }
      } catch (err) {
        showMsg(passwordMsg, 'Something went wrong. Please try again.', 'error');
        if (createAccountBtn) {
          createAccountBtn.disabled = false;
          createAccountBtn.textContent = 'Create Account';
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. GOOGLE & APPLE OAUTH AUTHENTICATION
  // --------------------------------------------------------------------------
  const googleBtns = document.querySelectorAll('#googleLoginBtn, #googleSignUpBtn, [aria-label*="Google"]');
  const appleBtns = document.querySelectorAll('#appleLoginBtn, #appleSignUpBtn, [aria-label*="Apple"]');

  const redirectTarget = window.location.origin + '/partbypart/user-home/index.html';

  googleBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMsg(authMessage);

      if (!supabaseClient) {
        showMsg(authMessage, 'Something went wrong. Please try again.', 'error');
        return;
      }

      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectTarget }
        });

        if (error) {
          showMsg(authMessage, 'Google authentication failed. Please verify provider configuration in Supabase.', 'error');
        }
      } catch (err) {
        showMsg(authMessage, 'Something went wrong. Please try again.', 'error');
      }
    });
  });

  appleBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMsg(authMessage);

      if (!supabaseClient) {
        showMsg(authMessage, 'Something went wrong. Please try again.', 'error');
        return;
      }

      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'apple',
          options: { redirectTo: redirectTarget }
        });

        if (error) {
          showMsg(authMessage, 'Apple authentication failed. Please verify provider configuration in Supabase.', 'error');
        }
      } catch (err) {
        showMsg(authMessage, 'Something went wrong. Please try again.', 'error');
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. SESSION PERSISTENCE & AUTO-REDIRECT
  // --------------------------------------------------------------------------
  if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        // Active session exists - redirect to user home
        window.location.href = USER_HOME_URL;
      }
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !window.location.pathname.includes('user-home')) {
        window.location.href = USER_HOME_URL;
      }
    });
  }
});

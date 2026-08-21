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
     Frontend View Toggle (Sign In <-> Sign Up <-> Forgot Password State)
     ========================================================================== */
  let isSignUp = false;
  let isSigningUp = false; // Flag to prevent auto-redirect while completing password steps

  const signInView = document.getElementById('signInView');
  const signUpView = document.getElementById('signUpView');
  const forgotPasswordView = document.getElementById('forgotPasswordView');
  const toSignUpBtn = document.getElementById('toSignUpBtn');
  const toSignInBtn = document.getElementById('toSignInBtn');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const forgotToSignInBtn = document.getElementById('forgotToSignInBtn');

  function showActiveView(viewName) {
    if (signInView) signInView.style.display = viewName === 'signIn' ? 'block' : 'none';
    if (signUpView) signUpView.style.display = viewName === 'signUp' ? 'block' : 'none';
    if (forgotPasswordView) forgotPasswordView.style.display = viewName === 'forgotPassword' ? 'block' : 'none';
  }

  document.querySelectorAll('#toSignUpBtn, .to-signup-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = true;
      isSigningUp = true;
      showActiveView('signUp');
    });
  });

  document.querySelectorAll('#toSignInBtn, .to-signin-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = false;
      isSigningUp = false;
      showActiveView('signIn');
    });
  });

  document.querySelectorAll('#forgotPasswordBtn, .forgot-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = false;
      isSigningUp = false;

      // Reset forgot steps to step 1
      const forgotStep1 = document.getElementById('forgotStep1');
      const forgotStep2 = document.getElementById('forgotStep2');
      const forgotStep3 = document.getElementById('forgotStep3');
      if (forgotStep1) forgotStep1.style.display = 'block';
      if (forgotStep2) forgotStep2.style.display = 'none';
      if (forgotStep3) forgotStep3.style.display = 'none';

      clearMsg(document.getElementById('forgotEmailMsg'));
      clearMsg(document.getElementById('forgotOtpMsg'));
      clearMsg(document.getElementById('resetPasswordMsg'));

      showActiveView('forgotPassword');
    });
  });

  document.querySelectorAll('#forgotToSignInBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = false;
      isSigningUp = false;
      showActiveView('signIn');
    });
  });

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
     SUPABASE AUTHENTICATION & SENDGRID SMTP EMAIL DELIVERY INTEGRATION
     Architecture: Frontend JS -> Supabase Auth -> SendGrid Custom SMTP -> User Email
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

  // Email format validation
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

      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
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
        showMsg(authMessage, 'Invalid email or password.', 'error');
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
  const changeEmailBtn = document.getElementById('changeEmailBtn');
  const otpMsg = document.getElementById('otpMsg');
  const displayTargetEmail = document.getElementById('displayTargetEmail');

  const createPasswordForm = document.getElementById('createPasswordForm');
  const signupPasswordInput = document.getElementById('signup-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const createAccountBtn = document.getElementById('createAccountBtn');
  const passwordMsg = document.getElementById('passwordMsg');

  let pendingSignupEmail = '';
  let resendTimer = null;
  let resendCooldown = 0;

  // Flags to prevent duplicate request execution
  let isSendingEmailOtp = false;
  let isResendingOtp = false;

  function startResendCooldown() {
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
    resendCooldown = 60;

    if (resendOtpBtn) {
      resendOtpBtn.style.pointerEvents = 'none';
      resendOtpBtn.style.opacity = '0.5';
      resendOtpBtn.style.cursor = 'not-allowed';
      resendOtpBtn.style.textDecoration = 'none';
      resendOtpBtn.textContent = `Resend OTP in ${resendCooldown}s`;
    }

    resendTimer = setInterval(() => {
      resendCooldown--;
      if (resendCooldown > 0) {
        if (resendOtpBtn) {
          resendOtpBtn.textContent = `Resend OTP in ${resendCooldown}s`;
        }
      } else {
        clearInterval(resendTimer);
        resendTimer = null;
        if (resendOtpBtn) {
          resendOtpBtn.style.pointerEvents = 'auto';
          resendOtpBtn.style.opacity = '1';
          resendOtpBtn.style.cursor = 'pointer';
          resendOtpBtn.style.textDecoration = '';
          resendOtpBtn.textContent = 'Resend OTP';
        }
      }
    }, 1000);
  }

  function stopResendCooldown() {
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
    resendCooldown = 0;
    if (resendOtpBtn) {
      resendOtpBtn.style.pointerEvents = 'auto';
      resendOtpBtn.style.opacity = '1';
      resendOtpBtn.style.cursor = 'pointer';
      resendOtpBtn.style.textDecoration = '';
      resendOtpBtn.textContent = 'Resend OTP';
    }
  }

  // STEP 1: Validate Email & Send OTP directly via Supabase Auth
  if (signupEmailForm) {
    signupEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(signupEmailMsg);

      if (isSendingEmailOtp) return;

      const email = signupEmailInput ? signupEmailInput.value.trim().toLowerCase() : '';

      if (!email || !isValidEmailFormat(email)) {
        showMsg(signupEmailMsg, 'Please enter a valid email address.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(signupEmailMsg, 'Failed to send verification code. Please try again.', 'error');
        return;
      }

      isSendingEmailOtp = true;
      pendingSignupEmail = email;
      isSigningUp = true;

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
          showMsg(signupEmailMsg, 'Failed to send verification code. Please try again.', 'error');
          if (sendOtpBtn) {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send Verification Code';
          }
        } else {
          if (displayTargetEmail) displayTargetEmail.textContent = pendingSignupEmail;
          if (signupStep1) signupStep1.style.display = 'none';
          if (signupStep2) signupStep2.style.display = 'block';
          if (otpInput) otpInput.value = '';
          clearMsg(otpMsg);
          startResendCooldown();
        }
      } catch (err) {
        showMsg(signupEmailMsg, 'Failed to send verification code. Please try again.', 'error');
        if (sendOtpBtn) {
          sendOtpBtn.disabled = false;
          sendOtpBtn.textContent = 'Send Verification Code';
        }
      } finally {
        isSendingEmailOtp = false;
      }
    });
  }

  // Change Email Link
  if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', (e) => {
      e.preventDefault();
      stopResendCooldown();
      if (otpInput) otpInput.value = '';
      clearMsg(otpMsg);
      clearMsg(signupEmailMsg);

      if (sendOtpBtn) {
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Send Verification Code';
      }
      isSendingEmailOtp = false;
      isResendingOtp = false;

      if (signupStep2) signupStep2.style.display = 'none';
      if (signupStep1) signupStep1.style.display = 'block';
      if (signupEmailInput) {
        signupEmailInput.focus();
        signupEmailInput.select();
      }
    });
  }

  // Resend OTP Link
  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (resendCooldown > 0 || isResendingOtp || !pendingSignupEmail || !supabaseClient) return;

      isResendingOtp = true;
      clearMsg(otpMsg);
      startResendCooldown();

      try {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email: pendingSignupEmail,
          options: { shouldCreateUser: true }
        });

        if (error) {
          showMsg(otpMsg, 'Failed to send verification code. Please try again.', 'error');
        } else {
          showMsg(otpMsg, 'A new OTP code has been sent to your email.', 'success');
        }
      } catch (err) {
        showMsg(otpMsg, 'Failed to send verification code. Please try again.', 'error');
      } finally {
        isResendingOtp = false;
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
        showMsg(otpMsg, 'Invalid or expired OTP.', 'error');
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
          isSigningUp = true;
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
          isSigningUp = false;
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
  // 3. STEPPED FORGOT PASSWORD FLOW (CHECK ACCOUNT -> EMAIL -> OTP -> NEW PASSWORD)
  // --------------------------------------------------------------------------
  const forgotEmailForm = document.getElementById('forgotEmailForm');
  const forgotEmailInput = document.getElementById('forgot-email');
  const sendForgotOtpBtn = document.getElementById('sendForgotOtpBtn');
  const forgotEmailMsg = document.getElementById('forgotEmailMsg');

  const forgotOtpForm = document.getElementById('forgotOtpForm');
  const forgotOtpInput = document.getElementById('forgot-otp-input');
  const verifyForgotOtpBtn = document.getElementById('verifyForgotOtpBtn');
  const resendForgotOtpBtn = document.getElementById('resendForgotOtpBtn');
  const forgotOtpMsg = document.getElementById('forgotOtpMsg');
  const displayForgotTargetEmail = document.getElementById('displayForgotTargetEmail');

  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const resetPasswordInput = document.getElementById('reset-password');
  const confirmResetPasswordInput = document.getElementById('confirm-reset-password');
  const saveNewPasswordBtn = document.getElementById('saveNewPasswordBtn');
  const resetPasswordMsg = document.getElementById('resetPasswordMsg');

  let pendingForgotEmail = '';
  let isSendingForgotOtp = false;
  let forgotResendTimer = null;
  let forgotResendCooldown = 0;

  function startForgotResendCooldown() {
    if (forgotResendTimer) {
      clearInterval(forgotResendTimer);
      forgotResendTimer = null;
    }
    forgotResendCooldown = 60;

    if (resendForgotOtpBtn) {
      resendForgotOtpBtn.style.pointerEvents = 'none';
      resendForgotOtpBtn.style.opacity = '0.5';
      resendForgotOtpBtn.style.cursor = 'not-allowed';
      resendForgotOtpBtn.style.textDecoration = 'none';
      resendForgotOtpBtn.textContent = `Resend OTP in ${forgotResendCooldown}s`;
    }

    forgotResendTimer = setInterval(() => {
      forgotResendCooldown--;
      if (forgotResendCooldown > 0) {
        if (resendForgotOtpBtn) {
          resendForgotOtpBtn.textContent = `Resend OTP in ${forgotResendCooldown}s`;
        }
      } else {
        clearInterval(forgotResendTimer);
        forgotResendTimer = null;
        if (resendForgotOtpBtn) {
          resendForgotOtpBtn.style.pointerEvents = 'auto';
          resendForgotOtpBtn.style.opacity = '1';
          resendForgotOtpBtn.style.cursor = 'pointer';
          resendForgotOtpBtn.style.textDecoration = '';
          resendForgotOtpBtn.textContent = 'Resend OTP';
        }
      }
    }, 1000);
  }

  // Forgot Step 1: Submit Email & Request Reset OTP directly via Supabase Auth
  if (forgotEmailForm) {
    forgotEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(forgotEmailMsg);

      if (isSendingForgotOtp) return;

      const email = forgotEmailInput ? forgotEmailInput.value.trim().toLowerCase() : '';

      if (!email || !isValidEmailFormat(email)) {
        showMsg(forgotEmailMsg, 'Please enter a valid email address.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(forgotEmailMsg, 'Failed to send verification code. Please try again.', 'error');
        return;
      }

      isSendingForgotOtp = true;
      pendingForgotEmail = email;
      isSigningUp = true; // Prevent auto-redirect during forgot password steps

      if (sendForgotOtpBtn) {
        sendForgotOtpBtn.disabled = true;
        sendForgotOtpBtn.textContent = 'Sending OTP...';
      }

      try {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email: pendingForgotEmail,
          options: { shouldCreateUser: false }
        });

        if (error) {
          showMsg(forgotEmailMsg, 'No account found with this email. Please check your email or create an account.', 'error');
          if (sendForgotOtpBtn) {
            sendForgotOtpBtn.disabled = false;
            sendForgotOtpBtn.textContent = 'Send Verification Code';
          }
        } else {
          if (displayForgotTargetEmail) displayForgotTargetEmail.textContent = pendingForgotEmail;
          const forgotStep1 = document.getElementById('forgotStep1');
          const forgotStep2 = document.getElementById('forgotStep2');
          if (forgotStep1) forgotStep1.style.display = 'none';
          if (forgotStep2) forgotStep2.style.display = 'block';
          if (forgotOtpInput) forgotOtpInput.value = '';
          clearMsg(forgotOtpMsg);
          startForgotResendCooldown();
        }
      } catch (err) {
        showMsg(forgotEmailMsg, 'Failed to send verification code. Please try again.', 'error');
        if (sendForgotOtpBtn) {
          sendForgotOtpBtn.disabled = false;
          sendForgotOtpBtn.textContent = 'Send Verification Code';
        }
      } finally {
        isSendingForgotOtp = false;
      }
    });
  }

  // Forgot Step 2: Verify OTP
  if (forgotOtpForm) {
    forgotOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(forgotOtpMsg);

      const code = forgotOtpInput ? forgotOtpInput.value.trim() : '';

      if (!code || code.length < 6) {
        showMsg(forgotOtpMsg, 'Invalid or expired OTP.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(forgotOtpMsg, 'Something went wrong. Please try again.', 'error');
        return;
      }

      if (verifyForgotOtpBtn) {
        verifyForgotOtpBtn.disabled = true;
        verifyForgotOtpBtn.textContent = 'Verifying...';
      }

      try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
          email: pendingForgotEmail,
          token: code,
          type: 'email'
        });

        if (error || !data.session) {
          showMsg(forgotOtpMsg, 'Invalid or expired OTP.', 'error');
          if (verifyForgotOtpBtn) {
            verifyForgotOtpBtn.disabled = false;
            verifyForgotOtpBtn.textContent = 'Verify Code';
          }
        } else {
          isSigningUp = true;
          const forgotStep2 = document.getElementById('forgotStep2');
          const forgotStep3 = document.getElementById('forgotStep3');
          if (forgotStep2) forgotStep2.style.display = 'none';
          if (forgotStep3) forgotStep3.style.display = 'block';
          clearMsg(resetPasswordMsg);
        }
      } catch (err) {
        showMsg(forgotOtpMsg, 'Invalid or expired OTP.', 'error');
        if (verifyForgotOtpBtn) {
          verifyForgotOtpBtn.disabled = false;
          verifyForgotOtpBtn.textContent = 'Verify Code';
        }
      }
    });
  }

  // Forgot Resend OTP link
  if (resendForgotOtpBtn) {
    resendForgotOtpBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (forgotResendCooldown > 0 || !pendingForgotEmail || !supabaseClient) return;

      clearMsg(forgotOtpMsg);
      startForgotResendCooldown();

      try {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email: pendingForgotEmail,
          options: { shouldCreateUser: false }
        });

        if (error) {
          showMsg(forgotOtpMsg, 'Failed to send verification code. Please try again.', 'error');
        } else {
          showMsg(forgotOtpMsg, 'A new OTP code has been sent to your email.', 'success');
        }
      } catch (err) {
        showMsg(forgotOtpMsg, 'Failed to send verification code. Please try again.', 'error');
      }
    });
  }

  // Forgot Step 3: Save New Password
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(resetPasswordMsg);

      const pass = resetPasswordInput ? resetPasswordInput.value : '';
      const confirmPass = confirmResetPasswordInput ? confirmResetPasswordInput.value : '';

      if (!pass || !confirmPass) {
        showMsg(resetPasswordMsg, 'Please fill in both password fields.', 'error');
        return;
      }

      if (pass.length < 6) {
        showMsg(resetPasswordMsg, 'Password must be at least 6 characters.', 'error');
        return;
      }

      if (pass !== confirmPass) {
        showMsg(resetPasswordMsg, 'Passwords do not match.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(resetPasswordMsg, 'Something went wrong. Please try again.', 'error');
        return;
      }

      if (saveNewPasswordBtn) {
        saveNewPasswordBtn.disabled = true;
        saveNewPasswordBtn.textContent = 'Saving Password...';
      }

      try {
        const { data, error } = await supabaseClient.auth.updateUser({
          password: pass
        });

        if (error) {
          showMsg(resetPasswordMsg, error.message || 'Failed to update password. Please try again.', 'error');
          if (saveNewPasswordBtn) {
            saveNewPasswordBtn.disabled = false;
            saveNewPasswordBtn.textContent = 'Save New Password';
          }
        } else {
          isSigningUp = false;
          // Sign out so user can sign in with new password
          await supabaseClient.auth.signOut();
          showMsg(resetPasswordMsg, 'Password updated successfully! Redirecting to sign in...', 'success');
          setTimeout(() => {
            showActiveView('signIn');
            if (emailInput) emailInput.value = pendingForgotEmail;
            showMsg(authMessage, 'Password updated successfully. Please login with your new password.', 'success');
          }, 1200);
        }
      } catch (err) {
        showMsg(resetPasswordMsg, 'Failed to update password. Please try again.', 'error');
        if (saveNewPasswordBtn) {
          saveNewPasswordBtn.disabled = false;
          saveNewPasswordBtn.textContent = 'Save New Password';
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 4. GOOGLE & APPLE OAUTH AUTHENTICATION
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
  // 5. SESSION PERSISTENCE & AUTO-REDIRECT
  // --------------------------------------------------------------------------
  if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user && !isSigningUp) {
        window.location.href = USER_HOME_URL;
      }
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !isSigningUp && !window.location.pathname.includes('user-home')) {
        window.location.href = USER_HOME_URL;
      }
    });
  }
});

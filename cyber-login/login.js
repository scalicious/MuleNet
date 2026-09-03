/* ==========================================================================
   SENTINEL // THREAT INTELLIGENCE SOC - LOGIN & AUTHENTICATION CONTROLLER
   Architecture: Frontend JS -> Supabase Auth JS SDK -> Supabase Backend
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Supabase Configuration (Reusing Project Credentials)
  const SUPABASE_URL = 'https://jkcgutjknjykqasenwqq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PtBOjVSdVe4eKPfBDE8y6g_RUGPzvG6';

  // Initialize Supabase Client
  function getSupabaseClient() {
    if (window._cyberSupabaseClient) return window._cyberSupabaseClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      window._cyberSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
      return window._cyberSupabaseClient;
    }
    return null;
  }

  const supabaseClient = getSupabaseClient();

  // Target Destination URL after successful authentication
  const DASHBOARD_URL = './dashboard.html';

  // DOM Elements
  const panelTitle = document.getElementById('panelTitle');
  const panelSubtitle = document.getElementById('panelSubtitle');
  const signInView = document.getElementById('signInView');
  const signUpView = document.getElementById('signUpView');
  const forgotPasswordView = document.getElementById('forgotPasswordView');
  
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const authMessage = document.getElementById('authMessage');

  let isSigningUp = false; // Flag to prevent auto-redirect during multi-step registration or reset

  // --------------------------------------------------------------------------
  // View Switcher & Title Controller
  // --------------------------------------------------------------------------
  function showActiveView(viewName) {
    if (signInView) signInView.style.display = viewName === 'signIn' ? 'block' : 'none';
    if (signUpView) signUpView.style.display = viewName === 'signUp' ? 'block' : 'none';
    if (forgotPasswordView) forgotPasswordView.style.display = viewName === 'forgotPassword' ? 'block' : 'none';

    if (panelTitle && panelSubtitle) {
      if (viewName === 'signIn') {
        panelTitle.textContent = 'Operator Login';
        panelSubtitle.textContent = 'Enter authorized credentials to access Threat Intelligence Portal';
      } else if (viewName === 'signUp') {
        panelTitle.textContent = 'Authorization Request';
        panelSubtitle.textContent = 'Verify email address to register new Security Operator';
      } else if (viewName === 'forgotPassword') {
        panelTitle.textContent = 'Clearance Key Recovery';
        panelSubtitle.textContent = 'Follow identity verification steps to reset clearance key';
      }
    }
  }

  // Navigation Links Event Listeners
  document.querySelectorAll('#toSignUpBtn, .to-signup-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isSigningUp = true;
      showActiveView('signUp');
    });
  });

  document.querySelectorAll('#toSignInBtn, .to-signin-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isSigningUp = false;
      showActiveView('signIn');
    });
  });

  document.querySelectorAll('#forgotPasswordBtn, .forgot-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isSigningUp = true;
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
      isSigningUp = false;
      showActiveView('signIn');
    });
  });

  // Password Visibility (Eye Icon) Toggle
  document.querySelectorAll('.eye-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.password-input-wrapper');
      const input = wrapper ? wrapper.querySelector('input') : null;
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });

  // UI Message Helpers
  function showMsg(container, text, type = 'error') {
    if (!container) return;
    container.textContent = text;
    container.className = `auth-message ${type}`;
    container.style.display = 'flex';
  }

  function clearMsg(container) {
    if (!container) return;
    container.textContent = '';
    container.style.display = 'none';
  }

  function isValidEmailFormat(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }


  // ==========================================================================
  // 1. EMAIL + PASSWORD LOGIN
  // ==========================================================================
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(authMessage);

      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        showMsg(authMessage, 'Please enter both email and clearance key.', 'error');
        return;
      }

      if (!isValidEmailFormat(email)) {
        showMsg(authMessage, 'Please enter a valid operator email address.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(authMessage, 'Supabase client failed to initialize. Try refreshing.', 'error');
        return;
      }

      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.dataset.originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<span>AUTHENTICATING...</span>';
      }

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          showMsg(authMessage, 'Invalid clearance credentials. Access denied.', 'error');
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = loginBtn.dataset.originalText || '<span>AUTHENTICATE OPERATOR</span>';
          }
        } else if (data && data.session) {
          showMsg(authMessage, 'Authentication granted! Accessing SOC portal...', 'success');
          setTimeout(() => {
            window.location.href = DASHBOARD_URL;
          }, 500);
        }
      } catch (err) {
        showMsg(authMessage, 'Authentication failed due to system exception.', 'error');
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = loginBtn.dataset.originalText || '<span>AUTHENTICATE OPERATOR</span>';
        }
      }
    });
  }


  // ==========================================================================
  // 2. STEPPED SIGN-UP FLOW (EMAIL -> OTP -> PASSWORD -> DASHBOARD)
  // ==========================================================================
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

  function startResendCooldown() {
    if (resendTimer) clearInterval(resendTimer);
    resendCooldown = 60;

    if (resendOtpBtn) {
      resendOtpBtn.style.pointerEvents = 'none';
      resendOtpBtn.style.opacity = '0.5';
      resendOtpBtn.textContent = `Resend in ${resendCooldown}s`;
    }

    resendTimer = setInterval(() => {
      resendCooldown--;
      if (resendCooldown > 0) {
        if (resendOtpBtn) resendOtpBtn.textContent = `Resend in ${resendCooldown}s`;
      } else {
        clearInterval(resendTimer);
        resendTimer = null;
        if (resendOtpBtn) {
          resendOtpBtn.style.pointerEvents = 'auto';
          resendOtpBtn.style.opacity = '1';
          resendOtpBtn.textContent = 'Resend OTP';
        }
      }
    }, 1000);
  }

  // STEP 1: Submit Email for Registration OTP
  if (signupEmailForm) {
    signupEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(signupEmailMsg);

      const email = signupEmailInput ? signupEmailInput.value.trim().toLowerCase() : '';

      if (!email || !isValidEmailFormat(email)) {
        showMsg(signupEmailMsg, 'Please enter a valid operator email address.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(signupEmailMsg, 'Supabase client unavailable. Please try again.', 'error');
        return;
      }

      pendingSignupEmail = email;
      isSigningUp = true;

      if (sendOtpBtn) {
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = '<span>DISPATCHING CODE...</span>';
      }

      try {
        // Check 1: Query profiles table if available
        try {
          const { data: existingProfile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('email', pendingSignupEmail)
            .maybeSingle();

          if (existingProfile) {
            showMsg(signupEmailMsg, 'An account with this email already exists. Please log in or recover your clearance key.', 'error');
            if (sendOtpBtn) {
              sendOtpBtn.disabled = false;
              sendOtpBtn.innerHTML = '<span>SEND VERIFICATION CODE</span>';
            }
            return;
          }
        } catch (profileErr) {
          // Profiles check failed or table doesn't have email column, fallback to Auth check
        }

        // Check 2: Test if user already exists in Supabase Auth
        const { error: checkUserError } = await supabaseClient.auth.signInWithOtp({
          email: pendingSignupEmail,
          options: { shouldCreateUser: false }
        });

        // If no error occurred, it means the user ALREADY exists in Supabase Auth!
        if (!checkUserError) {
          showMsg(signupEmailMsg, 'An account with this email already exists. Please log in or recover your clearance key.', 'error');
          if (sendOtpBtn) {
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<span>SEND VERIFICATION CODE</span>';
          }
          return;
        }

        // User does not exist, proceed to dispatch Sign Up OTP with shouldCreateUser: true
        const { error } = await supabaseClient.auth.signInWithOtp({
          email: pendingSignupEmail,
          options: { shouldCreateUser: true }
        });

        if (error) {
          showMsg(signupEmailMsg, error.message || 'Failed to dispatch verification code.', 'error');
          if (sendOtpBtn) {
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<span>SEND VERIFICATION CODE</span>';
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
        showMsg(signupEmailMsg, 'Failed to send verification code. Try again.', 'error');
        if (sendOtpBtn) {
          sendOtpBtn.disabled = false;
          sendOtpBtn.innerHTML = '<span>SEND VERIFICATION CODE</span>';
        }
      }
    });
  }

  // Change Email Link during Registration
  if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (resendTimer) clearInterval(resendTimer);
      if (signupStep2) signupStep2.style.display = 'none';
      if (signupStep1) signupStep1.style.display = 'block';
      if (sendOtpBtn) {
        sendOtpBtn.disabled = false;
        sendOtpBtn.innerHTML = '<span>SEND VERIFICATION CODE</span>';
      }
    });
  }

  // Resend OTP Link
  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (resendCooldown > 0 || !pendingSignupEmail || !supabaseClient) return;

      clearMsg(otpMsg);
      startResendCooldown();

      try {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email: pendingSignupEmail,
          options: { shouldCreateUser: true }
        });

        if (error) {
          showMsg(otpMsg, 'Failed to resend code. Please try again.', 'error');
        } else {
          showMsg(otpMsg, 'New OTP verification code dispatched.', 'success');
        }
      } catch (err) {
        showMsg(otpMsg, 'Failed to resend code. Please try again.', 'error');
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
        showMsg(otpMsg, 'Please enter a valid 6-digit OTP code.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(otpMsg, 'Supabase client unavailable.', 'error');
        return;
      }

      if (verifyOtpBtn) {
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerHTML = '<span>VERIFYING CODE...</span>';
      }

      try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
          email: pendingSignupEmail,
          token: code,
          type: 'email'
        });

        if (error || !data.session) {
          showMsg(otpMsg, 'Invalid or expired verification code.', 'error');
          if (verifyOtpBtn) {
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerHTML = '<span>VERIFY SECURITY CODE</span>';
          }
        } else {
          isSigningUp = true;
          if (signupStep2) signupStep2.style.display = 'none';
          if (signupStep3) signupStep3.style.display = 'block';
          clearMsg(passwordMsg);
        }
      } catch (err) {
        showMsg(otpMsg, 'Verification failed. Try again.', 'error');
        if (verifyOtpBtn) {
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.innerHTML = '<span>VERIFY SECURITY CODE</span>';
        }
      }
    });
  }

  // STEP 3: Password Creation
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
        showMsg(passwordMsg, 'Clearance key must be at least 6 characters.', 'error');
        return;
      }

      if (pass !== confirmPass) {
        showMsg(passwordMsg, 'Clearance keys do not match.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(passwordMsg, 'Supabase client unavailable.', 'error');
        return;
      }

      if (createAccountBtn) {
        createAccountBtn.disabled = true;
        createAccountBtn.innerHTML = '<span>INITIALIZING OPERATOR...</span>';
      }

      try {
        const { error } = await supabaseClient.auth.updateUser({ password: pass });

        if (error) {
          showMsg(passwordMsg, error.message || 'Failed to create password.', 'error');
          if (createAccountBtn) {
            createAccountBtn.disabled = false;
            createAccountBtn.innerHTML = '<span>FINALIZE AUTHORIZATION</span>';
          }
        } else {
          isSigningUp = false;
          showMsg(passwordMsg, 'Operator authorized successfully! Accessing portal...', 'success');
          setTimeout(() => {
            window.location.href = DASHBOARD_URL;
          }, 500);
        }
      } catch (err) {
        showMsg(passwordMsg, 'Account setup failed. Try again.', 'error');
        if (createAccountBtn) {
          createAccountBtn.disabled = false;
          createAccountBtn.innerHTML = '<span>FINALIZE AUTHORIZATION</span>';
        }
      }
    });
  }


  // ==========================================================================
  // 3. STEPPED FORGOT PASSWORD FLOW
  // ==========================================================================
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

  if (forgotEmailForm) {
    forgotEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(forgotEmailMsg);

      const email = forgotEmailInput ? forgotEmailInput.value.trim().toLowerCase() : '';

      if (!email || !isValidEmailFormat(email)) {
        showMsg(forgotEmailMsg, 'Please enter a valid operator email address.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(forgotEmailMsg, 'Supabase client unavailable.', 'error');
        return;
      }

      pendingForgotEmail = email;
      isSigningUp = true;

      if (sendForgotOtpBtn) {
        sendForgotOtpBtn.disabled = true;
        sendForgotForgotBtnText('DISPATCHING RECOVERY CODE...');
      }

      try {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email: pendingForgotEmail,
          options: { shouldCreateUser: false }
        });

        if (error) {
          showMsg(forgotEmailMsg, 'No account found matching this email address.', 'error');
          if (sendForgotOtpBtn) {
            sendForgotOtpBtn.disabled = false;
            sendForgotForgotBtnText('SEND RECOVERY CODE');
          }
        } else {
          if (displayForgotTargetEmail) displayForgotTargetEmail.textContent = pendingForgotEmail;
          const forgotStep1 = document.getElementById('forgotStep1');
          const forgotStep2 = document.getElementById('forgotStep2');
          if (forgotStep1) forgotStep1.style.display = 'none';
          if (forgotStep2) forgotStep2.style.display = 'block';
          if (forgotOtpInput) forgotOtpInput.value = '';
          clearMsg(forgotOtpMsg);
        }
      } catch (err) {
        showMsg(forgotEmailMsg, 'Failed to dispatch recovery code.', 'error');
        if (sendForgotOtpBtn) {
          sendForgotOtpBtn.disabled = false;
          sendForgotForgotBtnText('SEND RECOVERY CODE');
        }
      }
    });
  }

  function sendForgotForgotBtnText(txt) {
    if (sendForgotOtpBtn) sendForgotOtpBtn.innerHTML = `<span>${txt}</span>`;
  }

  if (forgotOtpForm) {
    forgotOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(forgotOtpMsg);

      const code = forgotOtpInput ? forgotOtpInput.value.trim() : '';

      if (!code || code.length < 6) {
        showMsg(forgotOtpMsg, 'Please enter a valid 6-digit OTP code.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(forgotOtpMsg, 'Supabase client unavailable.', 'error');
        return;
      }

      if (verifyForgotOtpBtn) {
        verifyForgotOtpBtn.disabled = true;
        verifyForgotOtpBtn.innerHTML = '<span>VERIFYING CODE...</span>';
      }

      try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
          email: pendingForgotEmail,
          token: code,
          type: 'email'
        });

        if (error || !data.session) {
          showMsg(forgotOtpMsg, 'Invalid or expired recovery code.', 'error');
          if (verifyForgotOtpBtn) {
            verifyForgotOtpBtn.disabled = false;
            verifyForgotOtpBtn.innerHTML = '<span>VERIFY RECOVERY CODE</span>';
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
        showMsg(forgotOtpMsg, 'Recovery code verification failed.', 'error');
        if (verifyForgotOtpBtn) {
          verifyForgotOtpBtn.disabled = false;
          verifyForgotOtpBtn.innerHTML = '<span>VERIFY RECOVERY CODE</span>';
        }
      }
    });
  }

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
        showMsg(resetPasswordMsg, 'Clearance key must be at least 6 characters.', 'error');
        return;
      }

      if (pass !== confirmPass) {
        showMsg(resetPasswordMsg, 'Clearance keys do not match.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(resetPasswordMsg, 'Supabase client unavailable.', 'error');
        return;
      }

      if (saveNewPasswordBtn) {
        saveNewPasswordBtn.disabled = true;
        saveNewPasswordBtn.innerHTML = '<span>UPDATING KEY...</span>';
      }

      try {
        const { error } = await supabaseClient.auth.updateUser({ password: pass });

        if (error) {
          showMsg(resetPasswordMsg, error.message || 'Failed to update clearance key.', 'error');
          if (saveNewPasswordBtn) {
            saveNewPasswordBtn.disabled = false;
            saveNewPasswordBtn.innerHTML = '<span>UPDATE CLEARANCE KEY</span>';
          }
        } else {
          isSigningUp = false;
          await supabaseClient.auth.signOut();
          showMsg(resetPasswordMsg, 'Clearance key updated! Redirecting to login...', 'success');
          setTimeout(() => {
            showActiveView('signIn');
            if (emailInput) emailInput.value = pendingForgotEmail;
            showMsg(authMessage, 'Clearance key updated successfully. Please log in.', 'success');
          }, 1200);
        }
      } catch (err) {
        showMsg(resetPasswordMsg, 'Failed to update clearance key.', 'error');
        if (saveNewPasswordBtn) {
          saveNewPasswordBtn.disabled = false;
          saveNewPasswordBtn.innerHTML = '<span>UPDATE CLEARANCE KEY</span>';
        }
      }
    });
  }


  // ==========================================================================
  // 4. SESSION PERSISTENCE & AUTO-REDIRECT
  // ==========================================================================
  if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user && !isSigningUp) {
        window.location.href = DASHBOARD_URL;
      }
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !isSigningUp && !window.location.pathname.includes('dashboard')) {
        window.location.href = DASHBOARD_URL;
      }
    });
  }
});

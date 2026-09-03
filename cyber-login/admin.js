/* ==========================================================================
   SENTINEL // ADMIN PORTAL - AUTHENTICATION & PRE-AUTHORIZATION CONTROLLER
   Architecture: Frontend JS -> Supabase Auth JS SDK -> Admin Pre-Approval Check
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Supabase Project Credentials
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

  // Target Destination URL after successful Admin login
  const ADMIN_DASHBOARD_URL = './admin-dashboard.html';

  // DOM Elements
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminEmailInput = document.getElementById('adminEmail');
  const adminPasswordInput = document.getElementById('adminPassword');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const adminAuthMessage = document.getElementById('adminAuthMessage');

  // Eye Icon Password Toggle
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

  // Check if an email is in the authorized admin list
  async function isAuthorizedAdmin(email) {
    let authorizedList = JSON.parse(localStorage.getItem('sentinel_authorized_admins') || '[]');
    if (authorizedList.includes(email.toLowerCase())) {
      return true;
    }

    // Secondary Check: Query Supabase profiles table for admin role
    try {
      if (supabaseClient) {
        const { data } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (data && data.role === 'admin') {
          authorizedList.push(email.toLowerCase());
          localStorage.setItem('sentinel_authorized_admins', JSON.stringify(authorizedList));
          return true;
        }
      }
    } catch (err) {}

    // Initial Default Seed: If no admins pre-authorized yet, authorize first admin login
    if (authorizedList.length === 0) {
      authorizedList.push(email.toLowerCase());
      localStorage.setItem('sentinel_authorized_admins', JSON.stringify(authorizedList));
      return true;
    }

    return false;
  }

  // ==========================================================================
  // ADMIN LOGIN SUBMIT HANDLER
  // ==========================================================================
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg(adminAuthMessage);

      const email = adminEmailInput ? adminEmailInput.value.trim().toLowerCase() : '';
      const password = adminPasswordInput ? adminPasswordInput.value : '';

      if (!email || !password) {
        showMsg(adminAuthMessage, 'Please enter both admin email and password.', 'error');
        return;
      }

      if (!isValidEmailFormat(email)) {
        showMsg(adminAuthMessage, 'Please enter a valid admin email address.', 'error');
        return;
      }

      if (!supabaseClient) {
        showMsg(adminAuthMessage, 'Supabase client unavailable. Try refreshing.', 'error');
        return;
      }

      if (adminLoginBtn) {
        adminLoginBtn.disabled = true;
        adminLoginBtn.dataset.originalText = adminLoginBtn.innerHTML;
        adminLoginBtn.innerHTML = '<span>Signing in as Admin...</span>';
      }

      try {
        // Authenticate with Supabase Auth
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          showMsg(adminAuthMessage, 'Invalid admin email or password.', 'error');
          if (adminLoginBtn) {
            adminLoginBtn.disabled = false;
            adminLoginBtn.innerHTML = adminLoginBtn.dataset.originalText || '<span>Sign In as Admin</span>';
          }
        } else if (data && data.session) {
          
          // Verify Admin Pre-Authorization
          const authorized = await isAuthorizedAdmin(email);

          if (!authorized) {
            await supabaseClient.auth.signOut();
            showMsg(adminAuthMessage, 'Access Denied: Email address is not authorized for Admin Portal access.', 'error');
            if (adminLoginBtn) {
              adminLoginBtn.disabled = false;
              adminLoginBtn.innerHTML = adminLoginBtn.dataset.originalText || '<span>Sign In as Admin</span>';
            }
          } else {
            showMsg(adminAuthMessage, 'Admin authorization granted! Accessing Command Center...', 'success');
            setTimeout(() => {
              window.location.href = ADMIN_DASHBOARD_URL;
            }, 500);
          }
        }
      } catch (err) {
        showMsg(adminAuthMessage, 'Admin authentication failed due to system exception.', 'error');
        if (adminLoginBtn) {
          adminLoginBtn.disabled = false;
          adminLoginBtn.innerHTML = adminLoginBtn.dataset.originalText || '<span>Sign In as Admin</span>';
        }
      }
    });
  }

  // ==========================================================================
  // ADMIN SESSION PERSISTENCE & AUTO-REDIRECT
  // ==========================================================================
  if (supabaseClient) {
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      if (session && session.user && window.location.pathname.includes('admin-login')) {
        const authorized = await isAuthorizedAdmin(session.user.email);
        if (authorized) {
          window.location.href = ADMIN_DASHBOARD_URL;
        }
      }
    });
  }
});

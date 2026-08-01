/* ===== North Star Technologies - Scripts ===== */

document.addEventListener('DOMContentLoaded', function () {
  const navbar = document.getElementById('navbar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  const yearEl = document.getElementById('year');

  /* ---------- Footer year ---------- */
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ---------- Navbar scroll state ---------- */
  const onScroll = function () {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll);
  onScroll();

  /* ---------- Mobile menu toggle ---------- */
  const toggleMenu = function (open) {
    const isOpen = open !== undefined ? open : !navLinks.classList.contains('open');
    navLinks.classList.toggle('open', isOpen);
    mobileMenuBtn.classList.toggle('open', isOpen);
    mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  };

  mobileMenuBtn.addEventListener('click', function () {
    toggleMenu();
  });

  /* Close menu when a nav link is clicked */
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      toggleMenu(false);
    });
  });

  /* Close menu on outside click / Escape */
  document.addEventListener('click', function (e) {
    if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
      toggleMenu(false);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      toggleMenu(false);
    }
  });

  /* ---------- Active nav link on scroll ---------- */
  const sections = document.querySelectorAll('main section[id]');
  const navAnchors = navLinks.querySelectorAll('a[href^="#"]');

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navAnchors.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach(function (s) {
    observer.observe(s);
  });

  /* ---------- Contact form validation + demo submit ---------- */
  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const phone = document.getElementById('phone');
      const message = document.getElementById('message');

      let valid = true;
      const inputs = [name, email, message];
      inputs.forEach(function (el) {
        if (!el.value.trim()) {
          el.classList.add('error');
          valid = false;
        } else {
          el.classList.remove('error');
        }
      });

      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.classList.add('error');
        valid = false;
      }

      if (phone.value.trim() && !/^(\+91[\-\s]?)?[0-9]{10}$/.test(phone.value.trim())) {
        phone.classList.add('error');
        valid = false;
      }

      if (!valid) {
        statusEl.textContent = 'Please fill in the highlighted fields correctly.';
        statusEl.className = 'form-status error';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      statusEl.textContent = '';

      const payload = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        message: message.value.trim()
      };

      console.log('Form submitted (demo handler):', payload);

      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        statusEl.textContent = 'Thank you! Your message has been recorded. We will get back to you shortly.';
        statusEl.className = 'form-status success';
        form.reset();
      }, 900);
    });

    /* Clear error styling on input */
    form.querySelectorAll('input, textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        el.classList.remove('error');
      });
    });
  }
});

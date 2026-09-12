/* ===== North Star Technologies - Scripts ===== */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================
  // GOOGLE APPS SCRIPT WEB APP URL
  // =========================================================
  const SHEET_API_URL =
    'https://script.google.com/macros/s/AKfycbzgLR3RUV3yIO8BXA6fMol2A7snpIwr_2zEubAAxfnoY-VkDUF9syTM11ODXbPEccGH/exec';

  // =========================================================
  // INPUT SANITIZATION UTILITIES
  // =========================================================
  const sanitize = {
    text: (str) => {
      if (typeof str !== 'string') return '';
      return str
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .slice(0, 5000);
    },
    email: (str) => {
      if (typeof str !== 'string') return '';
      return str.trim().toLowerCase().slice(0, 254);
    },
    phone: (str) => {
      if (typeof str !== 'string') return '';
      return str.replace(/\D/g, '').slice(0, 15);
    },
    service: (str) => {
      if (typeof str !== 'string') return '';
      return str.trim().slice(0, 100);
    },
    message: (str) => {
      if (typeof str !== 'string') return '';
      return str
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .slice(0, 10000);
    }
  };

  // =========================================================
  // IP ADDRESS & LOCATION CAPTURE
  // =========================================================
  let userIP = 'Unknown';
  let userLocation = 'Unknown';
  const pageLoadTime = Date.now();

  async function captureIP() {
    try {
      // Primary: ipapi.co (Provides IP + City + State + Country)
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        cache: 'no-cache'
      });
      if (response.ok) {
        const data = await response.json();
        userIP = data.ip || 'Unknown';
        userLocation = [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'Unknown';
      } else {
        throw new Error('ipapi request failed');
      }
    } catch (error) {
      try {
        // Fallback: ipify.org
        const response2 = await fetch('https://api.ipify.org?format=json', {
          method: 'GET',
          cache: 'no-cache'
        });
        if (response2.ok) {
          const data2 = await response2.json();
          userIP = data2.ip || 'Unknown';
        }
      } catch (err2) {
        console.warn('Could not capture IP:', err2);
        userIP = 'Unknown';
      }
    }
    
    // Populate hidden field in form
    const ipField = document.getElementById('ip');
    if (ipField) {
      ipField.value = userIP;
    }
  }

  captureIP();


  // =========================================================
  // FOOTER YEAR
  // =========================================================
  const yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }


  // =========================================================
  // MOBILE NAVIGATION
  // =========================================================
  const navbar = document.getElementById('navbar');
  const menuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  if (menuBtn && navLinks) {

    menuBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');

      menuBtn.setAttribute(
        'aria-expanded',
        String(isOpen)
      );
    });

    navLinks.querySelectorAll('a').forEach(link => {

      link.addEventListener('click', () => {
        navLinks.classList.remove('open');

        menuBtn.setAttribute(
          'aria-expanded',
          'false'
        );
      });

    });
  }


  // =========================================================
  // NAVBAR SCROLL EFFECT
  // =========================================================
  window.addEventListener(
    'scroll',
    () => {

      if (!navbar) return;

      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }

    },
    { passive: true }
  );


  // =========================================================
  // ACTIVE NAVIGATION LINK
  // =========================================================
  const sections =
    document.querySelectorAll('main section[id]');

  const navAnchors =
    document.querySelectorAll('.nav-links a');

  const setActiveLink = () => {

    let currentId =
      sections[0] ? sections[0].id : '';

    const scrollPos =
      window.scrollY + 120;

    sections.forEach(section => {

      if (section.offsetTop <= scrollPos) {
        currentId = section.id;
      }

    });

    navAnchors.forEach(a => {

      a.classList.toggle(
        'active',
        a.getAttribute('href') === `#${currentId}`
      );

    });

  };

  window.addEventListener(
    'scroll',
    setActiveLink,
    { passive: true }
  );

  setActiveLink();


  // =========================================================
  // SCROLL REVEAL ANIMATION
  // =========================================================
  const revealEls =
    document.querySelectorAll('.reveal');

  if (
    'IntersectionObserver' in window &&
    revealEls.length
  ) {

    const observer =
      new IntersectionObserver(
        (entries) => {

          entries.forEach(entry => {

            if (entry.isIntersecting) {

              entry.target.classList.add(
                'is-visible'
              );

              observer.unobserve(
                entry.target
              );
            }

          });

        },
        {
          threshold: 0.12
        }
      );

    revealEls.forEach(el => {
      observer.observe(el);
    });

  } else {

    revealEls.forEach(el => {
      el.classList.add('is-visible');
    });

  }


  // =========================================================
  // PHONE: LIMIT TO 10 DIGITS
  // =========================================================
  const phoneInput =
    document.getElementById('phone');

  if (phoneInput) {

    phoneInput.addEventListener(
      'input',
      () => {

        let value =
          phoneInput.value.replace(/\D/g, '');

        phoneInput.value =
          value.slice(0, 10);

      }
    );

  }


  // =========================================================
  // CONTACT FORM
  // =========================================================
  const form =
    document.getElementById('contactForm');

  const status =
    document.getElementById('formStatus');

  const submitBtn =
    document.getElementById('submitBtn');


  if (!form) return;


  form.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();

      // -----------------------------------------------------
      // ANTI-SPAM: HONEYPOT & TIME GATE CHECKS
      // -----------------------------------------------------
      const hpValue = document.getElementById('website_hp')?.value;
      if (hpValue) {
        status.textContent = "Thanks! We've received your message and will get back to you shortly.";
        status.className = 'form-status success';
        form.reset();
        return;
      }

      const timeTaken = (Date.now() - pageLoadTime) / 1000;
      if (timeTaken < 3) {
        status.textContent = "Thanks! We've received your message and will get back to you shortly.";
        status.className = 'form-status success';
        form.reset();
        return;
      }

      // -----------------------------------------------------
      // GET & SANITIZE FORM VALUES
      // -----------------------------------------------------
      const name =
        sanitize.text(form.name.value);

      const company =
        sanitize.text(form.company.value);

      const email =
        sanitize.email(form.email.value);

      const phone =
        sanitize.phone(form.phone.value);

      const service =
        sanitize.service(form.service.value);

      const message =
        sanitize.message(form.message.value);

      const consent =
        form.consent.checked;


      // -----------------------------------------------------
      // VALIDATION
      // -----------------------------------------------------
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const phonePattern =
        /^[0-9]{10}$/;


      if (!name || !email || !message) {

        status.textContent =
          'Please fill in your name, email, and message.';

        status.className =
          'form-status error';

        return;
      }


      if (!consent) {

        status.textContent =
          'Please agree to the Privacy Policy to continue.';

        status.className =
          'form-status error';

        return;
      }


      if (!emailPattern.test(email)) {

        status.textContent =
          'Please enter a valid email address.';

        status.className =
          'form-status error';

        return;
      }


      if (phone && !phonePattern.test(phone)) {

        status.textContent =
          'Please enter a valid 10-digit mobile number.';

        status.className =
          'form-status error';

        return;
      }


      // -----------------------------------------------------
      // CHECK API URL
      // -----------------------------------------------------
      if (
        !SHEET_API_URL ||
        SHEET_API_URL.includes(
          'YOUR_GOOGLE_APPS_SCRIPT'
        )
      ) {

        console.error(
          'SHEET_API_URL has not been configured.'
        );

        status.textContent =
          'The contact form is not configured yet. Please contact us directly.';

        status.className =
          'form-status error';

        return;
      }


      // -----------------------------------------------------
      // DISABLE BUTTON
      // -----------------------------------------------------
      submitBtn.disabled = true;

      submitBtn.textContent =
        'Sending...';

      status.textContent = '';

      status.className =
        'form-status';


      // -----------------------------------------------------
      // CREATE FORM DATA
      // -----------------------------------------------------
      const formData =
        new URLSearchParams();

      formData.append(
        'name',
        name
      );

      formData.append(
        'company',
        company
      );

      formData.append(
        'email',
        email
      );

      formData.append(
        'phone',
        phone
      );

      formData.append(
        'service',
        service
      );

      formData.append(
        'message',
        message
      );

      formData.append(
        'consent',
        consent ? 'Yes' : 'No'
      );

      formData.append(
        'timestamp',
        new Date().toLocaleString(
          'en-IN',
          {
            timeZone: 'Asia/Kolkata'
          }
        )
      );

      formData.append('ip', userIP);
      formData.append('location', userLocation);


      // -----------------------------------------------------
      // SEND TO GOOGLE APPS SCRIPT
      // -----------------------------------------------------
      try {

        console.log(
          'Sending inquiry to Google Apps Script...'
        );

        const response =
          await fetch(
            SHEET_API_URL,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: formData.toString()
            }
          );

        // ---------------------------------------------------
        // CHECK HTTP RESPONSE
        // ---------------------------------------------------
        if (!response.ok) {

          throw new Error(
            `HTTP error: ${response.status}`
          );

        }


        // ---------------------------------------------------
        // READ RESPONSE
        // ---------------------------------------------------
        const result =
          await response.json();

        console.log(
          'Google Apps Script response:',
          result
        );


        // ---------------------------------------------------
        // SUCCESS
        // ---------------------------------------------------
        if (
          result.result === 'success'
        ) {

          status.textContent =
            `Thanks, ${name.split(' ')[0]}! We've received your message and will get back to you shortly.`;

          status.className =
            'form-status success';

          form.reset();

        } else {

          throw new Error(
            result.error ||
            'Google Apps Script returned an error.'
          );

        }


      } catch (error) {

        // ---------------------------------------------------
        // ERROR
        // ---------------------------------------------------
        console.error(
          'Contact form submission failed:',
          error
        );

        status.textContent =
          'Sorry, we could not send your message. Please try again or contact us directly.';

        status.className =
          'form-status error';


      } finally {

        // ---------------------------------------------------
        // RESTORE BUTTON
        // ---------------------------------------------------
        submitBtn.disabled = false;

        submitBtn.textContent =
          'Request a Consultation';

      }

    }
  );

});

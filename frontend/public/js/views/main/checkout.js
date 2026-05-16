// /js/views/main/checkout.js — Checkout page renderer
import { el, clear, toast, $ } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api, errorMessage, getConfig } from '../../lib/api.js';
import { isAuthed } from '../../lib/auth.js';
import { renderNavbar, renderFooter, statusBar } from './shared.js';

export async function renderCheckout(root) {
  clear(root);
  const planData = JSON.parse(localStorage.getItem('tl_selected_plan') || '{}');
  if (!planData.plan) {
    window.location.hash = '#/';
    return;
  }

  const { plan, optIdx, isDemo } = planData;
  const opt = isDemo ? { period: plan.duration, price: plan.price_usd } : plan.options[optIdx];

  root.appendChild(statusBar());
  root.appendChild(renderNavbar());

  const container = el('div', { class: 'section', style: { minHeight: '80vh', paddingTop: '120px' } },
    el('a', { href: '#/', class: 'row gap-8', style: { color: 'var(--muted)', fontSize: '13px', marginBottom: '32px' }, html: `${icons.arrowRight('sm')} Back to Home` }),
    
    // Steps
    el('div', { class: 'checkout-steps', style: { marginBottom: '40px' } },
      renderStep('1', 'Contact Info', 'active', 'message'),
      renderStep('2', 'Payment', '', 'receipt'),
      renderStep('3', 'Verify', '', 'shield'),
    ),

    el('div', { id: 'checkout-main-content', style: { width: '100%', maxWidth: '600px', margin: '0 auto' } },
      renderContactStep(plan, opt, isDemo, (data) => {
        renderPaymentStage(plan, opt, isDemo, data);
      })
    )
  );

  root.appendChild(container);
  root.appendChild(renderFooter());
}

function renderStep(num, label, state, icon) {
  return el('div', { class: `checkout-step ${state}` },
    el('div', { class: 'step-icon', html: icons[icon] ? icons[icon]('sm') : num }),
    el('span', { class: 'step-label' }, label)
  );
}

function renderContactStep(plan, opt, isDemo, onNext) {
  return el('div', { class: 'tl-card checkout-card' },
    el('div', { class: 'row gap-12', style: { marginBottom: '24px' } },
      el('div', { class: 'center', style: { width: '40px', height: '40px', background: 'rgba(94, 234, 212, 0.1)', borderRadius: '10px', color: 'var(--cyan)' }, html: icons.message() }),
      el('div', {},
        el('h2', { style: { margin: 0, fontSize: '20px' } }, 'Contact Information'),
        el('p', { class: 'sub', style: { margin: 0, fontSize: '13px' } }, 'We\'ll send your license details here')
      )
    ),
    el('div', { style: { display: 'grid', gap: '20px' } },
      renderField('Full Name', 'checkout_name', 'Enter your full name'),
      renderField('Email Address', 'checkout_email', 'your@email.com', 'email'),
      
      el('div', { class: 'row gap-12', style: { alignItems: 'flex-start' } },
        el('div', { class: 'field', style: { width: '100px' } },
          el('label', { for: 'checkout_cc', style: { fontSize: '13px', marginBottom: '6px', display: 'block' } }, 'Code'),
          el('input', { id: 'checkout_cc', type: 'text', placeholder: '+1', required: true })
        ),
        el('div', { class: 'field', style: { flex: 1 } },
          el('label', { for: 'checkout_contact', style: { fontSize: '13px', marginBottom: '6px', display: 'block' } }, 'WhatsApp or Telegram'),
          el('input', { id: 'checkout_contact', type: 'text', placeholder: '1234567890 or @username', required: true })
        )
      ),
      
      el('div', { class: 'row gap-12', style: { padding: '16px', background: 'rgba(20, 184, 166, 0.05)', border: '1px solid rgba(94, 234, 212, 0.1)', borderRadius: '10px' } },
        el('div', { style: { color: 'var(--green)' }, html: icons.shield('sm') }),
        el('p', { style: { fontSize: '13px', color: 'var(--muted)', margin: 0 } }, 'Your information is encrypted and secure.')
      ),

      el('button', { 
        class: 'btn primary full lg', 
        onClick: () => {
          const name = $('#checkout_name').value.trim();
          const email = $('#checkout_email').value.trim();
          const cc = $('#checkout_cc').value.trim();
          const number = $('#checkout_contact').value.trim();

          if (!name || !email || !cc || !number) {
            toast({ title: 'Missing fields', description: 'Please fill in all required contact information.', kind: 'error' });
            return;
          }
          const contact = `${cc} ${number}`;
          onNext({ name, email, contact });
        }
      }, 'Continue to Payment')
    )
  );
}

function renderPaymentStage(plan, opt, isDemo, contactData) {
  // Update progress bar
  const steps = document.querySelectorAll('.checkout-step');
  steps[0].classList.add('completed');
  steps[0].classList.remove('active');
  steps[1].classList.add('active');

  const mainContent = $('#checkout-main-content');
  clear(mainContent);

  const price = opt.price_usd ?? opt.price ?? 0;

  mainContent.appendChild(el('div', { class: 'tl-card checkout-card', style: { display: 'grid', gap: '24px' } },
    el('div', { class: 'row gap-12' },
      el('div', { class: 'center', style: { width: '40px', height: '40px', background: 'rgba(94, 234, 212, 0.1)', borderRadius: '10px', color: 'var(--cyan)' }, html: icons.receipt() }),
      el('div', {},
        el('h2', { style: { margin: 0, fontSize: '20px' } }, 'Order Activation'),
        el('p', { class: 'sub', style: { margin: 0, fontSize: '13px' } }, 'Finalize your request details')
      )
    ),

    // Order Summary integrated
    el('div', { style: { padding: '20px', background: 'rgba(8, 12, 16, 0.4)', borderRadius: '12px', border: '1px solid rgba(94, 234, 212, 0.08)' } },
      el('h3', { style: { fontSize: '14px', marginBottom: '16px', color: 'var(--text-strong)' } }, 'Order Summary'),
      el('div', { style: { display: 'grid', gap: '12px' } },
        el('div', { class: 'row', style: { justifyContent: 'space-between', fontSize: '13px' } }, el('span', { style: { color: 'var(--muted)' } }, 'Plan'), el('span', { style: { color: 'var(--text-strong)' } }, isDemo ? 'Demo Access' : plan.name)),
        el('div', { class: 'row', style: { justifyContent: 'space-between', fontSize: '13px' } }, el('span', { style: { color: 'var(--muted)' } }, 'Duration'), el('span', { style: { color: 'var(--text-strong)' } }, opt.period)),
        el('div', { style: { margin: '12px 0', borderTop: '1px dashed rgba(94, 234, 212, 0.1)' } }),
        el('div', { class: 'row', style: { justifyContent: 'space-between' } }, el('span', { style: { color: 'var(--text-strong)', fontWeight: 600 } }, 'Total Due'), el('span', { style: { color: 'var(--cyan)', fontWeight: 700, fontSize: '18px' } }, `$${price}`))
      )
    ),

    el('div', { style: { padding: '16px', background: 'rgba(251, 191, 36, 0.03)', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: '10px' } },
      el('div', { class: 'row gap-12', style: { color: 'var(--amber)', marginBottom: '8px' } }, 
        el('div', { html: icons.zap('sm') }), 
        el('span', { style: { fontWeight: 600, fontSize: '13px' } }, 'Manual Verification Required')
      ),
      el('p', { style: { fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 } }, 'To ensure the security of our network, all new licenses are manually reviewed. Click below to submit your request.')
    ),

    el('div', { id: 'checkout-recaptcha', style: { marginBottom: '8px', minHeight: '78px' } }),

    el('button', {
      class: 'btn primary full lg',
      id: 'final-submit-btn',
      onClick: async (e) => {
        const btn = e.currentTarget;
        const recaptchaToken = window.grecaptcha ? grecaptcha.getResponse() : null;
        btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing\u2026';
        try {
          await submitLead(plan, null, isDemo, contactData, recaptchaToken);
        } finally {
          btn.disabled = false; btn.innerHTML = 'Complete Request';
        }
      }
    }, 'Complete Request')
  ));
  mainContent.appendChild(card);

  // Render reCAPTCHA
  setTimeout(async () => {
    const el = document.getElementById('checkout-recaptcha');
    if (el && window.grecaptcha) {
      const config = await getConfig();
      if (config.recaptcha_site_key) {
        grecaptcha.render(el, { sitekey: config.recaptcha_site_key });
      }
    }
  }, 100);
}

function renderField(label, id, placeholder, type = 'text') {
  return el('div', { class: 'field' },
    el('label', { for: id, style: { fontSize: '13px', marginBottom: '6px' } }, label),
    el('input', { id, type, placeholder, required: true })
  );
}

async function submitLead(plan, optIdx, isDemo, data, recaptchaToken) {
  try {
    const planData = JSON.parse(localStorage.getItem('tl_selected_plan') || '{}');
    const finalOptIdx = optIdx !== null ? optIdx : planData.optIdx;

    const body = isDemo 
      ? { demo: true, guest_name: data.name, guest_email: data.email, guest_contact: data.contact, recaptcha_token: recaptchaToken }
      : { plan_id: plan.id, option_index: finalOptIdx, guest_name: data.name, guest_email: data.email, guest_contact: data.contact, recaptcha_token: recaptchaToken };
    
    await api.post('/requests', body);
    
    // Switch to success state
    const container = $('#checkout-main-content');
    clear(container);
    container.appendChild(renderSuccessState());
    
    // Update steps
    const steps = document.querySelectorAll('.checkout-step');
    steps[1].classList.add('completed');
    steps[1].classList.remove('active');
    steps[2].classList.add('active');
    
    toast({ title: 'Request submitted!', description: 'Our team will contact you shortly.', kind: 'success' });
  } catch (e) {
    toast({ title: 'Submission failed', description: errorMessage(e), kind: 'error' });
  }
}

function renderSuccessState() {
  return el('div', { class: 'tl-card checkout-card center', style: { textAlign: 'center', padding: '60px 40px' } },
    el('div', { class: 'center', style: { width: '80px', height: '80px', background: 'rgba(94, 234, 212, 0.1)', borderRadius: '50%', color: 'var(--green)', marginBottom: '24px' }, html: icons.check('lg') }),
    el('h2', { style: { fontSize: '24px', marginBottom: '12px' } }, 'Request Received!'),
    el('p', { class: 'tl-sub', style: { margin: '0 auto 30px', fontSize: '14px' } }, 'Thank you for your interest. Our team will reach out to you via the provided contact method shortly.'),
    el('a', { href: '#/', class: 'btn primary full' }, 'Return to Home')
  );
}

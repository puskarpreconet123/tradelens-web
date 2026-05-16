// /js/views/main/checkout.js — Checkout page renderer
import { el, clear, toast, $ } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api, errorMessage } from '../../lib/api.js';
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

  const container = el('div', { class: 'section', style: { minHeight: '80vh', paddingTop: '140px' } },
    el('a', { href: '#/', class: 'row gap-8', style: { color: 'var(--muted)', fontSize: '13px', marginBottom: '32px' }, html: `${icons.arrowRight('sm')} Back to Home` }),
    
    // Steps
    el('div', { class: 'checkout-steps', style: { marginBottom: '32px' } },
      renderStep('1', 'Contact Info', 'active', 'message'),
      renderStep('2', 'Payment', '', 'receipt'),
      renderStep('3', 'Verify', '', 'shield'),
    ),

    el('div', { id: 'checkout-main-content' },
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
  return el('div', { style: { display: 'flex', justifyContent: 'center' } },
    el('div', { class: 'tl-card checkout-card', style: { maxWidth: '520px', width: '100%' } },
      el('div', { class: 'row gap-12', style: { marginBottom: '16px' } },
        el('div', { class: 'center', style: { width: '40px', height: '40px', background: 'rgba(94, 234, 212, 0.1)', borderRadius: '10px', color: 'var(--cyan)' }, html: icons.message() }),
        el('div', {},
          el('h2', {}, 'Contact Information'),
          el('p', { class: 'sub', style: { margin: 0 } }, 'We\'ll send your license details here')
        )
      ),
      el('div', { style: { display: 'grid', gap: '20px' } },
        renderField('Full Name', 'checkout_name', 'Enter your full name'),
        renderField('Email Address', 'checkout_email', 'your@email.com', 'email'),
        renderField('WhatsApp or Telegram', 'checkout_contact', '+1234567890 or @username'),
        
        el('div', { class: 'row gap-12', style: { padding: '16px', background: 'rgba(20, 184, 166, 0.05)', border: '1px solid rgba(94, 234, 212, 0.1)', borderRadius: '10px' } },
          el('div', { style: { color: 'var(--green)' }, html: icons.shield('sm') }),
          el('p', { style: { fontSize: '13px', color: 'var(--muted)', margin: 0 } }, 'Your information is encrypted and secure. We\'ll use this to deliver your license.')
        ),

        el('button', { 
          class: 'btn primary full lg', 
          onClick: () => {
            const name = $('#checkout_name').value.trim();
            const email = $('#checkout_email').value.trim();
            const contact = $('#checkout_contact').value.trim();

            if (!name || !email || !contact) {
              toast({ title: 'Missing fields', description: 'Please fill in all required contact information.', kind: 'error' });
              return;
            }
            onNext({ name, email, contact });
          }
        }, 'Continue to Payment')
      )
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

  mainContent.appendChild(el('div', { class: 'checkout-wrap' },
    // Main Payment Info
    el('div', { class: 'tl-card checkout-card' },
      el('div', { class: 'row gap-12', style: { marginBottom: '24px' } },
        el('div', { class: 'center', style: { width: '40px', height: '40px', background: 'rgba(94, 234, 212, 0.1)', borderRadius: '10px', color: 'var(--cyan)' }, html: icons.receipt() }),
        el('div', {},
          el('h2', {}, 'Payment Details'),
          el('p', { class: 'sub', style: { margin: 0 } }, 'Complete your request activation')
        )
      ),

      el('div', { style: { padding: '20px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '10px', marginBottom: '24px' } },
        el('div', { class: 'row gap-12', style: { color: 'var(--amber)', marginBottom: '8px' } }, 
          el('div', { html: icons.zap('sm') }), 
          el('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Manual Verification Required')
        ),
        el('p', { style: { fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 } }, 'To ensure the security of our network, all new licenses are manually reviewed. Click the button below to submit your request for administrator approval.')
      ),

      el('button', {
        class: 'btn primary full lg',
        id: 'final-submit-btn',
        onClick: async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing\u2026';
          try {
            await submitLead(plan, null, isDemo, contactData); // null for optIdx as we already have opt
          } finally {
            btn.disabled = false; btn.innerHTML = 'Complete Request';
          }
        }
      }, 'Complete Request')
    ),

    // Order Summary
    el('div', {},
      el('div', { class: 'tl-card summary-card' },
        el('h3', {}, 'Order Summary'),
        el('div', { class: 'summary-item' }, el('span', { class: 'label' }, 'Plan'), el('span', { class: 'val' }, isDemo ? 'Demo Access' : plan.name)),
        el('div', { class: 'summary-item' }, el('span', { class: 'label' }, 'Duration'), el('span', { class: 'val' }, opt.period)),
        el('div', { class: 'summary-total' }, el('span', { class: 'label' }, 'Total Due'), el('span', { class: 'val' }, `$${price}`)),
        el('div', { style: { marginTop: '20px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' } }, 'No payment required upfront. Our team will verify and activate your license.')
      )
    )
  ));
}

function renderField(label, id, placeholder, type = 'text') {
  return el('div', { class: 'field' },
    el('label', { for: id }, label),
    el('input', { id, type, placeholder, required: true })
  );
}

async function submitLead(plan, optIdx, isDemo, data) {
  try {
    const planData = JSON.parse(localStorage.getItem('tl_selected_plan') || '{}');
    const finalOptIdx = optIdx !== null ? optIdx : planData.optIdx;

    const body = isDemo 
      ? { demo: true, guest_name: data.name, guest_email: data.email, guest_contact: data.contact }
      : { plan_id: plan.id, option_index: finalOptIdx, guest_name: data.name, guest_email: data.email, guest_contact: data.contact };
    
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
  return el('div', { style: { display: 'flex', justifyContent: 'center' } },
    el('div', { class: 'tl-card checkout-card center', style: { textAlign: 'center', padding: '60px 40px', maxWidth: '600px', width: '100%' } },
      el('div', { class: 'center', style: { width: '80px', height: '80px', background: 'rgba(94, 234, 212, 0.1)', borderRadius: '50%', color: 'var(--green)', marginBottom: '24px' }, html: icons.check('lg') }),
      el('h2', {}, 'Request Received!'),
      el('p', { class: 'tl-sub', style: { margin: '0 auto 30px' } }, 'Thank you for your interest. An administrator has been notified and will reach out to you via the provided contact method to finalize your setup.'),
      el('a', { href: '#/', class: 'btn ghost' }, 'Back to Homepage')
    )
  );
}

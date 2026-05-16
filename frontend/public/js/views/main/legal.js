// /js/views/main/legal.js — Legal pages renderer
import { el, clear } from '../../lib/ui.js';
import { renderNavbar, renderFooter, statusBar } from './shared.js';

export function renderTerms(root) {
  renderLegal(root, 'Terms and Conditions', `
    <h3>1. Acceptance of Terms</h3>
    <p>By accessing and using EduFlash, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our software.</p>
    
    <h3>2. Use License</h3>
    <p>We grant you a personal, non-transferable license to use the EduFlash software for your own trading activities. You may not reverse engineer, decompile, or attempt to extract the source code of the software.</p>
    
    <h3>3. Disclaimer</h3>
    <p>The software is provided "as is". EduFlash makes no warranties, expressed or implied, and hereby disclaims all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.</p>
    
    <h3>4. Limitation of Liability</h3>
    <p>In no event shall EduFlash or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the software.</p>
    
    <h3>5. Governing Law</h3>
    <p>These terms and conditions are governed by and construed in accordance with the laws of our operating jurisdiction and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
  `);
}

export function renderPrivacy(root) {
  renderLegal(root, 'Privacy Policy', `
    <h3>1. Information We Collect</h3>
    <p>We collect information you provide directly to us when you request a plan, such as your email address and messaging handles (WhatsApp/Telegram). We do not collect or store your private keys or sensitive wallet data.</p>
    
    <h3>2. How We Use Information</h3>
    <p>We use the information we collect to process your license requests, provide customer support, and improve our software performance.</p>
    
    <h3>3. Data Security</h3>
    <p>We implement a variety of security measures to maintain the safety of your personal information. Your data is stored in secure networks and is only accessible by a limited number of persons who have special access rights to such systems.</p>
    
    <h3>4. Third-Party Disclosure</h3>
    <p>We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information unless we provide users with advance notice.</p>
    
    <h3>5. Cookies</h3>
    <p>We use cookies to help us remember and process the items in your session and understand your preferences for future visits.</p>
  `);
}

function renderLegal(root, title, htmlContent) {
  clear(root);
  root.appendChild(statusBar());
  root.appendChild(renderNavbar());
  
  const content = el('section', { class: 'section', style: { minHeight: '80vh', paddingTop: '120px' } },
    el('div', { class: 'inner', style: { maxWidth: '800px', margin: '0 auto' } },
      el('h1', { class: 'tl-h2', style: { marginBottom: '32px' } }, title),
      el('div', { class: 'tl-card', style: { padding: '40px', lineHeight: '1.8', color: '#cbd5e1' }, html: htmlContent })
    )
  );
  
  root.appendChild(content);
  root.appendChild(renderFooter());
  window.scrollTo(0, 0);
}

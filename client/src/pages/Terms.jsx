import { Link } from 'react-router-dom';
import '../styles/PrivacyPolicy.css';

export default function Terms() {
  return (
    <div className="privacy-page">
      {/* ── Nav ── */}
      <nav className="nav">
        <Link to="/" className="nav-brand-link">
          <div className="nav-brand">
            <span className="nav-icon">&#10084;</span> HealthSimplify
          </div>
        </Link>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/login">Login</Link></li>
          <li><Link to="/register" className="btn btn-nav">Get Started</Link></li>
        </ul>
      </nav>

      <main className="privacy-main">
        <div className="privacy-card">
          <h1>Terms &amp; Conditions</h1>
          <p className="privacy-effective">Effective Date: April 18, 2026</p>

          <section className="privacy-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the HealthSimplify platform (the "Service"), you agree to be
              bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms,
              you may not access or use the Service. We reserve the right to update these Terms at
              any time, and your continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section className="privacy-section">
            <h2>2. Description of Service</h2>
            <p>
              HealthSimplify is a personal health monitoring platform that allows users to track
              vital signs, manage medications, log dietary information, schedule and manage doctor
              appointments, receive appointment reminders via email and SMS, and store health-related
              notes. The Service is intended for personal, non-commercial use only.
            </p>
          </section>

          <section className="privacy-section">
            <h2>3. Eligibility</h2>
            <p>
              You must be at least 13 years of age to use the Service. If you are under 18, you
              must have the consent of a parent or legal guardian. By creating an account, you
              represent and warrant that you meet these eligibility requirements.
            </p>
          </section>

          <section className="privacy-section">
            <h2>4. Account Registration &amp; Security</h2>
            <ul>
              <li>You must provide accurate, complete, and current information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your password and account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws or regulations.</li>
              <li>Impersonate another person or misrepresent your identity.</li>
              <li>Upload or transmit malicious code, viruses, or any harmful content.</li>
              <li>Attempt to gain unauthorized access to other user accounts, the Service's infrastructure, or related systems.</li>
              <li>Use the Service to store or transmit information on behalf of third parties without their consent.</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
              <li>Use automated systems (bots, scrapers) to access the Service without our written permission.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>6. Health Information Disclaimer</h2>
            <p>
              <strong>The Service is not a substitute for professional medical advice, diagnosis, or
              treatment.</strong> HealthSimplify is a personal tracking and organizational tool. The
              information and features provided — including medication tracking, vital sign logging,
              and conflict detection alerts — are for informational purposes only.
            </p>
            <ul>
              <li>Always seek the advice of your physician or qualified health provider with any questions regarding a medical condition.</li>
              <li>Never disregard professional medical advice or delay seeking it because of information displayed in the Service.</li>
              <li>Medication conflict alerts are informational and may not cover all possible interactions. Always consult your pharmacist or doctor.</li>
              <li>In case of a medical emergency, call your local emergency services immediately.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>7. Appointment Reminders &amp; Notifications</h2>
            <ul>
              <li>The Service offers optional email and SMS reminders for scheduled appointments.</li>
              <li>Reminders are sent as a convenience and are not guaranteed. Delivery depends on third-party services (SendGrid, Twilio) and network conditions.</li>
              <li>You are solely responsible for attending your appointments regardless of whether a reminder is received.</li>
              <li>Standard messaging and data rates may apply for SMS notifications. You may opt out of SMS at any time by removing your phone number from the appointment.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>8. User Content &amp; Data</h2>
            <ul>
              <li>You retain ownership of all health data, notes, and information you enter into the Service ("User Content").</li>
              <li>By using the Service, you grant us a limited license to store, process, and display your User Content solely for the purpose of providing the Service to you.</li>
              <li>You are responsible for the accuracy of the information you enter. We are not liable for decisions made based on inaccurate data.</li>
              <li>We do not access, review, or use your health data for advertising, marketing, or any purpose other than operating the Service.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>9. Intellectual Property</h2>
            <p>
              The Service, including its design, logos, text, graphics, and software, is the
              property of HealthSimplify and is protected by applicable intellectual property laws.
              You may not copy, modify, distribute, or create derivative works from any part of the
              Service without our prior written consent.
            </p>
          </section>

          <section className="privacy-section">
            <h2>10. Third-Party Services</h2>
            <p>
              The Service integrates with third-party providers including Google Firebase, SendGrid,
              and Twilio. Your use of these services is subject to their respective terms and
              conditions. We are not responsible for the availability, accuracy, or reliability of
              third-party services.
            </p>
          </section>

          <section className="privacy-section">
            <h2>11. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, HealthSimplify and its owners, officers,
              employees, and affiliates shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from:
            </p>
            <ul>
              <li>Your use or inability to use the Service.</li>
              <li>Any errors, inaccuracies, or omissions in the content or features of the Service.</li>
              <li>Unauthorized access to or alteration of your data.</li>
              <li>Failure to deliver appointment reminders or notifications.</li>
              <li>Any actions taken or not taken based on information provided by the Service.</li>
            </ul>
            <p>
              The Service is provided on an "as is" and "as available" basis without warranties of
              any kind, either express or implied.
            </p>
          </section>

          <section className="privacy-section">
            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless HealthSimplify from any claims,
              damages, losses, liabilities, and expenses (including reasonable attorneys' fees)
              arising from your use of the Service, your violation of these Terms, or your violation
              of any rights of a third party.
            </p>
          </section>

          <section className="privacy-section">
            <h2>13. Termination</h2>
            <ul>
              <li>You may stop using the Service and delete your account at any time.</li>
              <li>We may suspend or terminate your access to the Service at our discretion if you violate these Terms or engage in conduct that we determine is harmful to the Service or other users.</li>
              <li>Upon termination, your right to use the Service ceases immediately. We may delete your data in accordance with our <Link to="/privacy">Privacy Policy</Link>.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              United States, without regard to conflict of law principles. Any disputes arising
              from these Terms or the Service shall be resolved in the appropriate courts of the
              applicable jurisdiction.
            </p>
          </section>

          <section className="privacy-section">
            <h2>15. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that
              provision shall be limited or eliminated to the minimum extent necessary so that the
              remaining provisions of these Terms remain in full force and effect.
            </p>
          </section>

          <section className="privacy-section">
            <h2>16. Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us through
              our <Link to="/#contact">contact form</Link> or email us at
              support@healthsimplify.com.
            </p>
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="nav-icon">&#10084;</span> HealthSimplify
          </div>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/#contact">Contact</Link>
          </div>
          <p className="footer-copy">&copy; 2026 HealthSimplify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

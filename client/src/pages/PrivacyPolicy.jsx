import { Link } from 'react-router-dom';
import BrandLink from '../components/BrandLink';
import '../styles/PrivacyPolicy.css';

export default function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      {/* ── Nav ── */}
      <nav className="nav">
        <BrandLink className="nav-brand nav-brand-link" iconClassName="nav-icon" />
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/login">Login</Link></li>
          <li><Link to="/register" className="btn btn-nav">Get Started</Link></li>
        </ul>
      </nav>

      <main className="privacy-main">
        <div className="privacy-card">
          <h1>Privacy Policy</h1>
          <p className="privacy-effective">Effective Date: April 18, 2026</p>

          <section className="privacy-section">
            <h2>1. Introduction</h2>
            <p>
              HealthSimplify ("we," "our," or "us") is committed to protecting the privacy of your
              personal and health-related information. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our personal health
              monitoring platform (the "Service"). By accessing or using the Service, you agree to
              the terms of this Privacy Policy.
            </p>
          </section>

          <section className="privacy-section">
            <h2>2. Information We Collect</h2>

            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, username, and password when you register.</li>
              <li><strong>Personal Health Information:</strong> Age, gender, height, weight, vital signs, medication details, dietary data, and notes you enter into the platform.</li>
              <li><strong>Doctor &amp; Provider Information:</strong> Doctor names, phone numbers, appointment dates, times, locations, and visit notes.</li>
              <li><strong>Contact Information:</strong> Phone number (when provided for SMS reminders) and email address.</li>
              <li><strong>Communications:</strong> Messages you send through our contact form.</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li><strong>Usage Data:</strong> Pages visited, features used, and interaction patterns.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
              <li><strong>Log Data:</strong> IP address, access times, and referring URLs.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and maintain the Service.</li>
              <li>Create and manage your account.</li>
              <li>Track and display your health data, medications, appointments, and vital signs.</li>
              <li>Send appointment reminders via email and SMS at your request.</li>
              <li>Detect potential medication conflicts and send safety alerts.</li>
              <li>Respond to your inquiries and provide customer support.</li>
              <li>Improve and personalize the Service.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>4. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> We use trusted third-party services to operate the platform, including Firebase (authentication and database), SendGrid (email delivery), and Twilio (SMS delivery). These providers only access your data as needed to perform their services and are bound by their own privacy policies.</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, court order, or governmental request.</li>
              <li><strong>Safety:</strong> We may share information to protect the rights, safety, or property of HealthSimplify, our users, or the public.</li>
              <li><strong>With Your Consent:</strong> We may share information for any other purpose with your explicit consent.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>5. Data Storage &amp; Security</h2>
            <p>
              Your data is stored using Google Firebase, which provides encryption at rest and in
              transit. We implement reasonable administrative, technical, and physical safeguards to
              protect your information. However, no method of transmission or storage is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="privacy-section">
            <h2>6. Your Rights &amp; Choices</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access</strong> your personal data stored in the platform.</li>
              <li><strong>Update or correct</strong> your information through your account settings.</li>
              <li><strong>Delete</strong> your account and associated data by contacting us.</li>
              <li><strong>Opt out</strong> of appointment reminders by toggling reminders off for individual appointments.</li>
              <li><strong>Withdraw consent</strong> for SMS notifications at any time by removing your phone number.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>7. Cookies &amp; Tracking</h2>
            <p>
              The Service uses essential cookies and local storage for authentication and session
              management. We may use analytics tools to understand how the Service is used. You can
              control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="privacy-section">
            <h2>8. Third-Party Services</h2>
            <p>Our Service integrates with the following third-party providers:</p>
            <ul>
              <li><strong>Google Firebase:</strong> Authentication, database, and hosting.</li>
              <li><strong>SendGrid (Twilio):</strong> Email delivery for appointment reminders.</li>
              <li><strong>Twilio:</strong> SMS delivery for appointment reminders.</li>
            </ul>
            <p>
              Each of these providers has their own privacy policies governing the use of your data.
              We encourage you to review their respective policies.
            </p>
          </section>

          <section className="privacy-section">
            <h2>9. Children's Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 13. We do not knowingly
              collect personal information from children under 13. If we become aware that a child
              under 13 has provided us with personal information, we will take steps to delete such
              information.
            </p>
          </section>

          <section className="privacy-section">
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will revise the
              "Effective Date" at the top of this page. We encourage you to review this policy
              periodically to stay informed about how we are protecting your information.
            </p>
          </section>

          <section className="privacy-section">
            <h2>11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please
              contact us through our <Link to="/#contact">contact form</Link> or email us at
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

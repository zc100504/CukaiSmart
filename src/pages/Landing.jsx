import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  PlayCircle,
  ScanText,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  UserCheck,
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar.jsx';
import Logo from '../components/Logo.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import HeroVisual from '../components/hero/HeroVisual.jsx';
import { usePrefersReducedMotion } from '../components/useMediaQuery.js';

const DEMO_STEPS = [
  {
    icon: Upload,
    title: 'Upload a document',
    text: 'Drop in a sales invoice or a supplier receipt — PDF, JPG or PNG.',
  },
  {
    icon: ScanText,
    title: 'AI extracts and checks',
    text: 'Supplier, TIN, amounts and SST are read and checked against e-Invoice rules.',
  },
  {
    icon: UserCheck,
    title: 'You confirm what’s flagged',
    text: 'Low-confidence fields, like a faded TIN, wait for your check before approval.',
  },
  {
    icon: FileCheck2,
    title: 'Get MyInvois-ready data',
    text: 'Sales invoices become MyInvois-ready JSON; purchases export to your accounting records.',
  },
];

const HOW_IT_WORKS = [
  {
    icon: Upload,
    title: 'Upload',
    text: 'Sales invoices and purchase receipts, one at a time or in a batch, for any client.',
  },
  {
    icon: Sparkles,
    title: 'AI extracts and checks',
    text: 'Fields are extracted with a confidence score and validated: TIN format, totals, classification codes and duplicates.',
  },
  {
    icon: ShieldCheck,
    title: 'You approve',
    text: 'Nothing is final until a person approves it. Every edit is recorded in the audit trail.',
  },
];

const PLANS = [
  {
    icon: Store,
    name: 'SME',
    price: 'RM 49',
    period: '/ month',
    description: 'For a single business getting ready for e-Invoicing.',
    features: ['Up to 100 documents / month', 'Sales e-Invoices and purchase receipts', 'MyInvois-ready JSON and CSV export', 'Audit trail'],
  },
  {
    icon: Building2,
    name: 'Accounting Firm',
    price: 'RM 399',
    period: '/ month',
    description: 'For firms managing e-Invoicing for many clients.',
    features: ['10,000 pooled documents / month', 'Unlimited clients with a client switcher', 'Review queue sorted by urgency', 'Team audit trail'],
    featured: true,
  },
];

export default function Landing() {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const [demoOpen, setDemoOpen] = useState(false);

  // Scroll to the section in the URL hash (or to the top for "/").
  useEffect(() => {
    const behavior = reducedMotionRef.current ? 'auto' : 'smooth';
    const id = location.hash.slice(1);
    const target = id && document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior, block: 'start' });
      target.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
    // location.key changes on every navigation, so clicking the same link twice still scrolls.
  }, [location.key, location.hash]);

  return (
    <div className="public-page">
      <PublicNavbar sticky />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__text">
            <p className="hero__pill">
              <span className="hero__pill-tag">New</span>
              Introducing Next-Gen AI Agent
            </p>
            <h1 id="hero-title" className="text-display">
              <span className="text-highlight-lg">AI Tax Agent</span> is ready to help Malaysia’s businesses
            </h1>
            <p className="hero__sub">
              Get ready for e-Invoicing without the paperwork. Upload invoices and receipts, let AI extract and check
              the details, and approve MyInvois-ready records in minutes.
            </p>
            <div className="row">
              <Button to="/signup" size="lg">
                Start Trial
              </Button>
              <Button variant="secondary" size="lg" icon={PlayCircle} onClick={() => setDemoOpen(true)}>
                Watch Demo
              </Button>
            </div>
            <p className="text-caption">Free trial · No card needed · Prototype with sample data</p>
          </div>
          <HeroVisual />
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how-it-works" className="landing-section" tabIndex={-1} aria-labelledby="how-title">
          <div className="landing-section__head">
            <h2 id="how-title" className="text-h1">
              How it works
            </h2>
            <p className="text-secondary">Three steps from a paper invoice to compliant records.</p>
          </div>
          <ol className="steps-grid">
            {HOW_IT_WORKS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="card step-card">
                <div className="row-between">
                  <span className="step-card__icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="step-card__num">Step {i + 1}</span>
                </div>
                <h3 className="text-h3">{title}</h3>
                <p className="text-secondary">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Pricing ---------- */}
        <section id="pricing" className="landing-section landing-section--muted" tabIndex={-1} aria-labelledby="pricing-title">
          <div className="landing-section__head">
            <span className="chip chip--gold">Placeholder pricing</span>
            <h2 id="pricing-title" className="text-h1">
              Pricing
            </h2>
            <p className="text-secondary">Simple plans for businesses and the firms that support them.</p>
          </div>
          <div className="pricing-grid">
            {PLANS.map(({ icon: Icon, name, price, period, description, features, featured }) => (
              <Card key={name} className={`plan ${featured ? 'plan--featured' : ''}`}>
                <div className="stack">
                  <div className="row-between">
                    <span className="row-sm">
                      <Icon size={20} className="plan__icon" aria-hidden="true" />
                      <h3 className="text-h2">{name}</h3>
                    </span>
                    <span className="chip chip--gold">Placeholder pricing</span>
                  </div>
                  <p className="text-secondary">{description}</p>
                  <p className="plan__price">
                    {price} <span className="text-secondary">{period}</span>
                  </p>
                  <ul className="plan__features">
                    {features.map((f) => (
                      <li key={f}>
                        <CheckCircle2 size={18} aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button to="/signup" variant={featured ? 'primary' : 'secondary'} block>
                    Start Trial — {name}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------- About ---------- */}
        <section id="about" className="landing-section" tabIndex={-1} aria-labelledby="about-title">
          <div className="about">
            <div className="stack">
              <h2 id="about-title" className="text-h1">
                About CukaiSmart
              </h2>
              <p className="text-body-lg">
                Malaysia’s e-Invoicing rollout asks every business to issue and keep structured invoice data. CukaiSmart
                helps SMEs and their accountants get there with less typing: AI does the reading, people make the
                decisions.
              </p>
              <p className="text-secondary">
                This is a proof-of-concept prototype built for a university project. All companies, numbers and
                submissions are fictional, and nothing is sent to LHDN.
              </p>
            </div>
            <ul className="about__points">
              <li>
                <ShieldCheck size={20} aria-hidden="true" /> Human approval before anything is final
              </li>
              <li>
                <ScanText size={20} aria-hidden="true" /> Clear reasons for every low-confidence field
              </li>
              <li>
                <FileCheck2 size={20} aria-hidden="true" /> Full audit trail of edits and exports
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <Logo to="/" />
        <p className="text-caption">Prototype — sample data only</p>
      </footer>

      <Modal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        title="How the demo works"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDemoOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setDemoOpen(false);
                navigate('/signup');
              }}
            >
              Start Trial
            </Button>
          </>
        }
      >
        <ol className="demo-steps">
          {DEMO_STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <span className="demo-steps__icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span>
                <span className="text-label">
                  {i + 1}. {title}
                </span>
                <span className="demo-steps__text">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Modal>
    </div>
  );
}

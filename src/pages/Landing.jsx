import PublicNavbar from '../components/PublicNavbar.jsx';
import Button from '../components/Button.jsx';
import ComingSoon from '../components/ComingSoon.jsx';

export default function Landing() {
  return (
    <div className="public-page">
      <PublicNavbar />
      <main className="public-page__main">
        <div className="stack-lg landing-placeholder">
          <h1 className="text-display">AI-assisted e-Invoicing for Malaysian SMEs</h1>
          <p className="text-body-lg text-secondary">
            Upload invoices and receipts, let AI extract the data, review what matters and get{' '}
            <span className="text-highlight">MyInvois-ready</span> records.
          </p>
          <div className="row">
            <Button to="/login" size="lg">
              Get Started
            </Button>
            <Button to="/style-guide" variant="secondary" size="lg">
              View style guide
            </Button>
          </div>
          <ComingSoon title="Full landing page coming in a later phase" />
        </div>
      </main>
      <footer className="prototype-footer">Prototype — sample data only</footer>
    </div>
  );
}

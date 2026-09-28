import { Check } from 'lucide-react';

const CHIPS = ['Supplier', 'TIN', 'Total'];

/**
 * Static HTML/CSS version of the hero scene in its settled final state (all chips verified).
 * Shown while the 3D scene loads, when WebGL is unavailable, and below 1024px.
 */
export default function HeroFallback() {
  return (
    <div className="hero-fallback" aria-hidden="true">
      <div className="hf-paper hf-receipt">
        <p className="hf-receipt__shop">KEDAI RUNCIT MAJU</p>
        <span className="hf-bar hf-bar--center" style={{ width: '70%' }} />
        <span className="hf-bar hf-bar--center" style={{ width: '50%' }} />
        <hr className="hf-dash" />
        {[62, 48, 70, 40].map((w) => (
          <span key={w} className="hf-row">
            <span className="hf-bar" style={{ width: `${w}%` }} />
            <span className="hf-bar" style={{ width: '18%' }} />
          </span>
        ))}
        <hr className="hf-dash" />
        <span className="hf-row hf-receipt__total">
          <span>TOTAL</span>
          <span>RM 86.40</span>
        </span>
        <span className="hf-barcode" />
      </div>

      <div className="hf-paper hf-invoice">
        <div className="hf-invoice__head">
          <span className="hf-invoice__title">INVOICE</span>
          <span className="hf-invoice__no">INV-2026-0412</span>
        </div>
        <p className="hf-invoice__supplier">Ali Trading Sdn Bhd</p>
        <span className="hf-bar" style={{ width: '45%' }} />
        <p className="hf-invoice__tin">
          <span>TIN</span> C2088014502
        </p>
        <span className="hf-table-head" />
        {[70, 55, 64, 48].map((w) => (
          <span key={w} className="hf-row">
            <span className="hf-bar" style={{ width: `${w}%` }} />
            <span className="hf-bar" style={{ width: '16%' }} />
          </span>
        ))}
        <span className="hf-row hf-invoice__total">
          <span>Total</span>
          <span>RM 1,240.00</span>
        </span>
      </div>

      <div className="hf-card">
        <div className="hf-card__head">
          <span className="hf-card__check">
            <Check size={14} strokeWidth={3} />
          </span>
          <span>
            <span className="hf-card__title">MyInvois-ready</span>
            <span className="hf-card__sub">3 of 3 fields verified</span>
          </span>
        </div>
        {CHIPS.map((label) => (
          <span key={label} className="hf-chip">
            <span className="hf-chip__icon">
              <Check size={12} strokeWidth={3} />
            </span>
            <span className="hf-chip__label">{label}</span>
            <span className="hf-chip__state">Verified</span>
          </span>
        ))}
        <span className="hf-card__foot">Validated · Ready to submit</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Building2, Mail, Store, User } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Checkbox from '../components/Checkbox.jsx';
import Input from '../components/Input.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import Logo from '../components/Logo.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACCOUNT_TYPES = [
  { value: 'sme', label: 'SME', description: 'One business, its own invoices', icon: Store },
  { value: 'firm', label: 'Accounting firm', description: 'Many clients, one workspace', icon: Building2 },
];

// Order matters: the first invalid field in this list receives focus on submit.
const FIELD_ORDER = ['name', 'email', 'company', 'accountType', 'password', 'terms'];

function validate(v) {
  const errors = {};
  if (!v.name.trim()) errors.name = 'Enter your full name.';
  if (!v.email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(v.email.trim())) errors.email = 'Enter a valid email, like name@company.my.';
  if (!v.company.trim()) errors.company = 'Enter your company name.';
  if (!v.accountType) errors.accountType = 'Choose an account type.';
  if (!v.password) errors.password = 'Create a password.';
  else if (v.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (!v.terms) errors.terms = 'Please accept the terms to continue.';
  return errors;
}

/** 0 = empty, 1 weak, 2 fair, 3 strong */
function passwordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 2) return 1;
  if (score === 3) return 2;
  return 3;
}

const STRENGTH = {
  1: { label: 'Weak', hint: 'Add length, numbers or symbols.' },
  2: { label: 'Fair', hint: 'Add a symbol or more characters to make it stronger.' },
  3: { label: 'Strong', hint: 'Good password.' },
};

function StrengthHint({ password }) {
  const level = passwordStrength(password);
  if (!level) return 'At least 8 characters. Mix letters, numbers and symbols.';
  const { label, hint } = STRENGTH[level];
  return (
    <span className={`strength strength--${level}`}>
      <span className="strength__bars" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`strength__bar ${i <= level ? 'is-on' : ''}`} />
        ))}
      </span>
      <span>
        <span className="strength__label">Strength: {label}.</span> {hint}
      </span>
    </span>
  );
}

export default function Signup() {
  const { signup } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', company: '', accountType: '', password: '', terms: false });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(values);
  const show = (field) => (touched[field] || submitted ? errors[field] : undefined);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
  };
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const firstInvalid = FIELD_ORDER.find((f) => errors[f]);
    if (firstInvalid) {
      document.getElementById(`signup-${firstInvalid}`)?.focus();
      return;
    }
    const result = signup(values);
    if (!result.ok) {
      toast.error('Could not create account', result.message);
      return;
    }
    const firstName = values.name.trim().split(/\s+/)[0];
    navigate('/app/dashboard', { replace: true });
    toast.success(`Welcome to CukaiSmart, ${firstName}`, 'Sample clients and documents are loaded so you can explore.');
  };

  const accountTypeError = show('accountType');
  const termsError = show('terms');

  return (
    <div className="auth-page">
      <div className="auth-page__inner auth-page__inner--wide">
        <Logo to="/" size="lg" />
        <Card>
          <form className="stack" onSubmit={handleSubmit} noValidate>
            <div className="stack-sm">
              <h1 className="text-h2">Create your account</h1>
              <p className="text-caption">Start a free trial. Prototype — no real account is created.</p>
            </div>

            <Input
              id="signup-name"
              label="Full name"
              icon={User}
              required
              value={values.name}
              onChange={set('name')}
              onBlur={blur('name')}
              error={show('name')}
              autoComplete="name"
            />
            <Input
              id="signup-email"
              label="Work email"
              type="email"
              icon={Mail}
              required
              value={values.email}
              onChange={set('email')}
              onBlur={blur('email')}
              error={show('email')}
              autoComplete="email"
            />
            <Input
              id="signup-company"
              label="Company name"
              icon={Building2}
              required
              value={values.company}
              onChange={set('company')}
              onBlur={blur('company')}
              error={show('company')}
              autoComplete="organization"
            />

            <fieldset
              className={`field choice-group ${accountTypeError ? 'field--error' : ''}`}
              aria-describedby={accountTypeError ? 'signup-accountType-error' : undefined}
            >
              <legend className="field__label">
                Account type<span className="field__required" aria-hidden="true">*</span>
              </legend>
              <div className="choice-group__options">
                {ACCOUNT_TYPES.map(({ value, label, description, icon: Icon }, i) => (
                  <label key={value} className={`choice ${values.accountType === value ? 'choice--selected' : ''}`}>
                    <input
                      id={i === 0 ? 'signup-accountType' : undefined}
                      type="radio"
                      name="accountType"
                      value={value}
                      checked={values.accountType === value}
                      onChange={set('accountType')}
                      onBlur={blur('accountType')}
                      className="choice__input"
                    />
                    <Icon size={20} className="choice__icon" aria-hidden="true" />
                    <span className="choice__text">
                      <span className="text-label">{label}</span>
                      <span className="text-caption">{description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {accountTypeError && (
                <p className="field__error" id="signup-accountType-error">
                  <AlertCircle size={14} aria-hidden="true" />
                  {accountTypeError}
                </p>
              )}
            </fieldset>

            <PasswordInput
              id="signup-password"
              label="Password"
              required
              value={values.password}
              onChange={set('password')}
              onBlur={blur('password')}
              error={show('password')}
              helper={<StrengthHint password={values.password} />}
              autoComplete="new-password"
            />

            <div className={`field ${termsError ? 'field--error' : ''}`}>
              <Checkbox
                id="signup-terms"
                label="I agree to the Terms of Service and Privacy Policy"
                checked={values.terms}
                onChange={set('terms')}
                onBlur={blur('terms')}
                aria-invalid={termsError ? 'true' : undefined}
                aria-describedby={termsError ? 'signup-terms-error' : undefined}
              />
              {termsError && (
                <p className="field__error" id="signup-terms-error">
                  <AlertCircle size={14} aria-hidden="true" />
                  {termsError}
                </p>
              )}
            </div>

            <Button type="submit" block size="lg">
              Create account
            </Button>
          </form>
        </Card>
        <p className="text-caption auth-page__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <p className="text-caption-sm">Prototype — sample data only</p>
      </div>
    </div>
  );
}

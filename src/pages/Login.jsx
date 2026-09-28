import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import Logo from '../components/Logo.jsx';

export default function Login() {
  const { login, user } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email);
    const from = location.state?.from;
    navigate(from && from.startsWith('/app') ? from : '/app/dashboard', { replace: true });
  };

  const handleForgot = () => {
    toast.info('Reset link sent (simulated)', 'No email was actually sent — this is a prototype.');
  };

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <Logo to="/" size="lg" />
        <Card>
          <form className="stack" onSubmit={handleSubmit}>
            <div className="stack-sm">
              <h1 className="text-h2">Log in</h1>
              <p className="text-caption">Prototype: any email and password will work.</p>
            </div>
            <Input
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              labelAction={
                <button type="button" className="link-btn" onClick={handleForgot}>
                  Forgot password?
                </button>
              }
            />
            <Button type="submit" block size="lg">
              Log in
            </Button>
          </form>
        </Card>
        <p className="text-caption auth-page__switch">
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </p>
        <p className="text-caption-sm">Prototype — sample data only</p>
      </div>
    </div>
  );
}

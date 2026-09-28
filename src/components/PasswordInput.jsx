import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Input from './Input.jsx';

/** Password field with a show/hide toggle. Accepts every Input prop. */
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <Input
      icon={Lock}
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="icon-btn icon-btn--field"
          onClick={() => setVisible((v) => !v)}
          aria-label="Show password"
          aria-pressed={visible}
        >
          <Icon size={18} aria-hidden="true" />
        </button>
      }
    />
  );
}

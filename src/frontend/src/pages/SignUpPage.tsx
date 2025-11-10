import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Input, Label } from '@src/components/Inputs';
import { useApi } from '@src/lib/api/ApiProvider';
import { notification } from 'antd';
import { Form } from 'radix-ui';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const SignUpPage = () => {
  const [username, setUsername] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const api = useApi();

  const navigate = useNavigate();

  return (
    <Form.Root
      onSubmit={async e => {
        e.preventDefault();

        const registerRes = await api.register(username, password);
        if (registerRes.ok === false) {
          notification.error({
            message: 'Failed to register',
            description: registerRes.message,
          });
          return;
        }

        const loginRes = await api.login(username, password);

        if (loginRes.ok === false) {
          notification.error({
            message: 'Failed to log in',
            description: loginRes.message,
          });
          return;
        }

        navigate('/dashboard');
      }}
      className="m-auto flex w-[360px] flex-col gap-3"
    >
      <h1 className="mx-auto text-2xl">Sign Up</h1>
      <Form.Field name="username">
        <Label>Username</Label>
        <Form.Control asChild>
          <Input
            minLength={3}
            required
            placeholder="username"
            PrefixIcon={
              <Icon
                style={{ color: 'black' }}
                icon="material-symbols:person"
                className="size-full"
              />
            }
            onInvalidCapture={() => {
              setUsernameError('Must be at least 3 characters long');
            }}
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </Form.Control>
        {usernameError && (
          <div className="mt-1 text-sm text-red-500">{usernameError}</div>
        )}
      </Form.Field>

      <Form.Field name="password">
        <Label>Password</Label>
        <Form.Control asChild>
          <Input
            placeholder="********"
            value={password}
            type="password"
            minLength={3}
            required
            onInvalidCapture={() => {
              setPasswordError('Must be at least 3 characters long');
            }}
            PrefixIcon={
              <Icon
                style={{ color: 'black' }}
                icon="material-symbols:lock-outline"
                className="size-full"
              />
            }
            onChange={e => setPassword(e.target.value)}
          />
        </Form.Control>
        {passwordError && (
          <div className="mt-1 text-sm text-red-500">{passwordError}</div>
        )}
      </Form.Field>

      <Button type="submit" className="mt-2 w-full">
        Submit
      </Button>

      <div>
        Already have an account?
        <NavLink
          to={'/auth/login'}
          className="underscore ml-2 text-blue-700 transition-all hover:opacity-70"
        >
          Login now
        </NavLink>
      </div>
    </Form.Root>
  );
};

export default SignUpPage;

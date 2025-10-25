import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Input, Label } from '@src/components/Inputs';
import { useToast } from '@src/components/Toast';
import { api } from '@src/lib/api';
import { Form } from 'radix-ui';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const SignInPage = () => {
  const [username, setUsername] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <Form.Root
      onSubmit={async e => {
        e.preventDefault();

        const res = await api.login(username, password);
        if (res.ok === false) {
          toast({
            title: res.message,
            variant: 'warning',
          });
          return;
        }

        navigate('/dashboard');
      }}
      className="m-auto flex w-[360px] flex-col gap-3"
    >
      <h1 className="mx-auto text-2xl">Login</h1>
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
        Dont have an account?
        <NavLink
          to={'/auth/register'}
          className="underscore ml-2 text-blue-700 transition-all hover:opacity-70"
        >
          Register now{' '}
        </NavLink>
      </div>
    </Form.Root>
  );
};

export default SignInPage;

import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Input, Label } from '@src/components/Inputs';
import { Spinner } from '@src/components/Spinner';
import { useApi } from '@src/lib/api/ApiProvider';
import { notification } from 'antd';
import { Form } from 'radix-ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthTexts } from './auth/authTexts';

const SignInPage = () => {
  const t = useAuthTexts();
  const [username, setUsername] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const api = useApi();

  const navigate = useNavigate();

  return (
    <Form.Root
      onSubmit={async e => {
        setIsLoading(true);
        e.preventDefault();

        const res = await api.login(username, password);
        if (res.ok === false) {
          notification.error({
            message: t.loginFailed,
            description: res.message,
          });
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
        navigate('/dashboard');
      }}
      className="flex w-full flex-col gap-3"
    >
      <Form.Field name="username">
        <Label>{t.username}</Label>
        <Form.Control asChild>
          <Input
            minLength={3}
            required
            placeholder={t.usernamePlaceholder}
            autoComplete="username"
            PrefixIcon={
              <Icon
                style={{ color: 'black' }}
                icon="material-symbols:person"
                className="size-full"
              />
            }
            onInvalidCapture={() => {
              setUsernameError(t.minLength);
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
        <Label>{t.password}</Label>
        <Form.Control asChild>
          <Input
            placeholder="********"
            value={password}
            type="password"
            autoComplete="current-password"
            minLength={3}
            required
            onInvalidCapture={() => {
              setPasswordError(t.minLength);
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

      <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
        {isLoading && <Spinner />}
        {t.submitSignIn}
      </Button>
    </Form.Root>
  );
};

export default SignInPage;

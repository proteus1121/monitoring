import { Spinner } from '@src/components/Spinner';
import { Button } from '@src/components/Button';
import { useAppForm } from '@src/components/Form';
import { FieldGroup } from '@src/components/Field';
import z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  useCreateUserMutation,
  useLoginMutation,
} from '@src/redux/generatedApi';
import { notification } from 'antd';
import { AuthTexts, useAuthTexts } from './auth/authTexts';

const signUpSchema = (t: AuthTexts) =>
  z
    .object({
      username: z
        .string()
        .min(3, t.minLength)
        .refine(s => !/\s/.test(s), {
          message: t.noSpaces,
        }),
      password: z.string().min(3, t.minLength),
      passwordConfirmation: z.string(),
    })
    .superRefine((val, ctx) => {
      if (
        val.passwordConfirmation !== val.password ||
        val.password.length === 0
      ) {
        ctx.addIssue({
          code: 'custom',
          origin: 'string',
          message: t.passwordsMustMatch,
          path: ['passwordConfirmation'],
        });
      }
    });

export default function SignUpPage() {
  const t = useAuthTexts();
  const schema = useMemo(() => signUpSchema(t), [t]);
  const [register] = useCreateUserMutation();
  const [login] = useLoginMutation();
  const navigate = useNavigate();

  const form = useAppForm({
    defaultValues: {
      username: '',
      password: '',
      passwordConfirmation: '',
    },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      const parsed = schema.safeParse(value);

      if (!parsed.success) {
        return;
      }

      const { username, password } = parsed.data;

      const registerRes = await register({
        userRequest: {
          password,
          username,
        },
      });
      if (Boolean(registerRes.error)) {
        notification.error({
          message: t.registerFailed,
          description: JSON.stringify(registerRes.error),
        });
        return;
      }

      const loginRes = await login({ loginRequest: { username, password } });
      if (Boolean(loginRes.error)) {
        notification.error({
          message: t.loginFailed,
          description: JSON.stringify(loginRes.error),
        });
        return;
      }

      navigate('/dashboard');
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.AppField
          name="username"
          children={field => (
            <field.TextField
              label={t.username}
              placeholder={t.usernamePlaceholder}
            />
          )}
        />
        <form.AppField
          name="password"
          children={field => (
            <field.PasswordField label={t.password} placeholder="********" />
          )}
        />
        <form.AppField
          name="passwordConfirmation"
          children={field => (
            <field.PasswordField
              label={t.passwordConfirmation}
              placeholder="********"
            />
          )}
        />
      </FieldGroup>

      <form.Subscribe
        selector={state => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting && <Spinner />}
            {t.submitSignUp}
          </Button>
        )}
      />
    </form>
  );
}

import { Spinner } from '@src/components/Spinner';
import { Button } from '@src/components/Button';
import { useAppForm } from '@src/components/Form';
import { FieldGroup } from '@src/components/Field';
import z from 'zod';
import { NavLink, useNavigate } from 'react-router-dom';
import { Card } from '@src/components/Card';
import {
  useCreateUserMutation,
  useLoginMutation,
} from '@src/redux/generatedApi';
import { notification } from 'antd';

const SignUpSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters long')
      .refine(s => !/\s/.test(s), {
        message: 'Cannot contain spaces.',
      }),
    password: z.string().min(3, 'Password must be at least 3 characters long'),
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
        message: 'Passwords must match',
        path: ['passwordConfirmation'],
      });
    }
  });

export default function SignUpPage() {
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
      onSubmit: SignUpSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = SignUpSchema.safeParse(value);

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
          message: 'Failed to register',
          description: JSON.stringify(registerRes),
        });
        return;
      }

      const loginRes = await login({ loginRequest: { username, password } });
      if (Boolean(loginRes.error)) {
        notification.error({
          message: 'Failed to log in',
          description: JSON.stringify(loginRes.error),
        });
        return;
      }

      navigate('/dashboard');
    },
  });

  return (
    <Card className="m-auto flex w-[360px] flex-col gap-3">
      <h1 className="mb-4 text-center text-2xl">Sign Up</h1>

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
                label="Username"
                placeholder="Enter your username"
              />
            )}
          />
          <form.AppField
            name="password"
            children={field => (
              <field.PasswordField
                label="Password"
                placeholder="Enter your password"
              />
            )}
          />
          <form.AppField
            name="passwordConfirmation"
            children={field => (
              <field.PasswordField
                label="Confirm Password"
                placeholder="Confirm your password"
              />
            )}
          />
        </FieldGroup>

        <form.Subscribe
          selector={state => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting && <Spinner />}
              Submit
            </Button>
          )}
        />
      </form>

      <div className="mt-4 text-center">
        Already have an account?
        <NavLink
          to={'/auth/login'}
          className="ml-2 text-blue-700 hover:opacity-70"
        >
          Login now
        </NavLink>
      </div>
    </Card>
  );
}

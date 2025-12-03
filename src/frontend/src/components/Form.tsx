import { createFormHookContexts, createFormHook } from '@tanstack/react-form';
import { Field, FieldError, FieldLabel } from './Field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './Select';
import { Textarea } from './Textarea';
import { Input } from './Input';

export const { fieldContext, formContext, useFieldContext } =
  createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, SelectField, TextareaField, PasswordField },
  formComponents: {},
});

function TextField(props: {
  label: string;
  placeholder?: string;
  defaultValue?: string | number;
}) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel>
      <Input
        defaultValue={props.defaultValue}
        type="string"
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={e => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        placeholder={props.placeholder}
        autoComplete="off"
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

function PasswordField(props: { label: string; placeholder?: string }) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel>
      <Input
        type="password"
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={e => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        placeholder={props.placeholder}
        autoComplete="off"
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

function SelectField(props: {
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  const field = useFieldContext<string>(); // или используешь useField или другой хук для формы
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel>
      <Select
        name={field.name}
        value={field.state.value}
        onValueChange={value => field.handleChange(value)}
        aria-invalid={isInvalid}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={props.placeholder || 'Select an option'} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{props.label}</SelectLabel>
            {props.options.map((option, index) => (
              <SelectItem key={index} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

function TextareaField(props: { label: string; placeholder?: string }) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        className="max-h-24"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={e => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        placeholder={props.placeholder}
        autoComplete="off"
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

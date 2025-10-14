// src/modules/auth/UI/pages/ForgotPassword.tsx
import { useForm } from 'react-hook-form';
import { supabase } from '../../../../core/supabase/client';

type Form = { email: string };

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<Form>();
  const onSubmit = async ({ email }: Form) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: import.meta.env.VITE_OAUTH_REDIRECT_URL
    });
    if (error) { alert(error.message); return; }
    alert('Si el correo existe, recibirás un enlace para resetear contraseña.');
  };
  return (
    <main style={{ maxWidth: 420, margin: '4rem auto' }}>
      <h1>Recuperar contraseña</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input placeholder='Email' type='email' {...register('email', { required: true })} />
        {errors.email && <small>Email requerido</small>}
        <button disabled={isSubmitting} type='submit'>Enviar enlace</button>
      </form>
    </main>
  );
}

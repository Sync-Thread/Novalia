// src/modules/auth/UI/pages/ResetPassword.tsx
import { useForm } from 'react-hook-form';
import { supabase } from '../../../../core/supabase/client';
type Form = { password: string };

export default function ResetPassword() {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<Form>();
  const onSubmit = async ({ password }: Form) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { alert(error.message); return; }
    alert('Contraseña actualizada. Inicia sesión de nuevo.');
  };
  return (
    <main style={{ maxWidth: 420, margin: '4rem auto' }}>
      <h1>Restablecer contraseña</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input placeholder='Nueva contraseña' type='password' {...register('password', { required: true, minLength: 6 })} />
        {errors.password && <small>Min 6 caracteres</small>}
        <button disabled={isSubmitting} type='submit'>Guardar</button>
      </form>
    </main>
  );
}

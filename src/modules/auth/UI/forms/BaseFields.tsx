// scr/app/auth/components/forms/BaseFields.tsx
import TextField from "../../../../shared/UI/fields/TextField";
import PasswordField from "../../../../shared/UI/fields/PasswordField";

type Props = {
  register: any;
  errors: Record<string, any>;
};

export default function BaseFields({ register, errors }: Props) {
  return (
    <>
      <div className="col">
        <TextField
          label="Nombre"
          placeholder="Juan"
          error={errors.first_name?.message}
          {...register("first_name")}
          autoComplete="given-name"
        />
      </div>
      <div className="col">
        <TextField
          label="Apellido"
          placeholder="Pérez"
          error={errors.last_name?.message}
          {...register("last_name")}
          autoComplete="family-name"
        />
      </div>

      <div className="col">
        <TextField
          label="Correo electrónico"
          type="email"
          placeholder="correo@ejemplo.com"
          error={errors.email?.message}
          {...register("email")}
          autoComplete="email"
          inputMode="email"
        />
      </div>
      <div className="col">
        <TextField
          label="Teléfono (opcional)"
          placeholder="+52 33 0000 0000"
          error={errors.phone?.message}
          {...register("phone")}
          autoComplete="tel"
          inputMode="tel"
        />
      </div>

      <div className="col">
        <PasswordField
          label="Contraseña"
          placeholder="Crea una contraseña"
          error={errors.password?.message}
          {...register("password")}
          autoComplete="new-password"
        />
      </div>
      <div className="col">
        <PasswordField
          label="Confirmar contraseña"
          placeholder="Repite la contraseña"
          error={errors.password_confirm?.message}
          {...register("password_confirm")}
          autoComplete="new-password"
        />
      </div>
    </>
  );
}

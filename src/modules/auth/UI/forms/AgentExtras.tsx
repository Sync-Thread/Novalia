// scr/app/auth/components/forms/AgentExtras.tsx
import TextField from "../../../../shared/UI/fields/TextField";

type Props = {
  register: any;
  watch: any;
  setValue: (name: string, v: any) => void;
  errors: Record<string, any>;
};

export default function AgentExtras({ register, watch, setValue, errors }: Props) {
  const belongs = watch("belongs_to_org") as boolean;

  return (
    <>
      <div className="col col-span-2" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          id="belongs"
          type="checkbox"
          {...register("belongs_to_org")}
          onChange={(e) => {
            // limpiar org_code si desmarca
            if (!e.currentTarget.checked) setValue("org_code", "");
            register("belongs_to_org").onChange(e);
          }}
        />
        <label htmlFor="belongs">Pertenezco a una organización</label>
      </div>

      {belongs && (
        <div className="col">
          <TextField
            label="Código de organización"
            placeholder="ABCD-1234"
            error={errors.org_code?.message}
            {...register("org_code")}
          />
        </div>
      )}
    </>
  );
}

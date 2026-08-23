import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  fragmentos: number;
  blocos: number;
  seccionado: boolean;
  inclusao: "total" | "reserva";
  codigoFaturacao: "31057" | "31077";
  onFragmentosChange: (value: number) => void;
  onBlocosChange: (value: number) => void;
  onSeccionadoChange: (value: boolean) => void;
  onInclusaoChange: (value: "total" | "reserva") => void;
  onCodigoFaturacaoChange: (value: "31057" | "31077") => void;
};

export function ResumoTecnico({
  fragmentos,
  blocos,
  seccionado,
  inclusao,
  codigoFaturacao,
  onFragmentosChange,
  onBlocosChange,
  onSeccionadoChange,
  onInclusaoChange,
  onCodigoFaturacaoChange,
}: Props) {
  return (
    <section className="panel space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Resumo técnico
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Dados técnicos e de faturação do exame.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fragmentos">
            N.º de fragmentos
          </Label>

          <Input
            id="fragmentos"
            type="number"
            min="0"
            value={fragmentos}
            onChange={(e) =>
              onFragmentosChange(
                Number(e.target.value)
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="blocos">
            N.º de blocos
          </Label>

          <Input
            id="blocos"
            type="number"
            min="0"
            value={blocos}
            onChange={(e) =>
              onBlocosChange(
                Number(e.target.value)
              )
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fragmento</Label>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={seccionado}
              onChange={() =>
                onSeccionadoChange(true)
              }
            />
            Seccionado
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={!seccionado}
              onChange={() =>
                onSeccionadoChange(false)
              }
            />
            Não seccionado
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Inclusão</Label>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={inclusao === "total"}
              onChange={() =>
                onInclusaoChange("total")
              }
            />
            Total
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={inclusao === "reserva"}
              onChange={() =>
                onInclusaoChange("reserva")
              }
            />
            Com reserva
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="codigo-faturacao">
          Código de faturação
        </Label>

        <select
          id="codigo-faturacao"
          value={codigoFaturacao}
          onChange={(e) =>
            onCodigoFaturacaoChange(
              e.target.value as
                | "31057"
                | "31077"
            )
          }
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="31057">
            31057
          </option>

          <option value="31077">
            31077
          </option>
        </select>
      </div>
    </section>
  );
}
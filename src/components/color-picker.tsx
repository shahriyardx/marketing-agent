import { type Control, Controller } from "react-hook-form"
import { cn } from "@/lib/utils"
import { Field, FieldLabel } from "@/components/ui/field"

const COLOR_PRESETS = [
  "#5865F2", "#248046", "#da373c", "#f0b232", "#059669",
  "#0891b2", "#7c3aed", "#db2777", "#64748b",
]

export function ColorPicker({
  control,
  name,
}: {
  control: Control<any>
  name: string
}) {
  return (
    <Controller
      name={name as any}
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel>Color</FieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "size-6 rounded-full border border-border ring-offset-background transition-all",
                  field.value === c && "ring-2 ring-ring ring-offset-2",
                )}
                style={{ backgroundColor: c }}
                onClick={() => field.onChange(c)}
              />
            ))}
            <label className="relative ml-1 flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border">
              <input
                type="color"
                value={field.value || "#5865F2"}
                onChange={(e) => field.onChange(e.target.value)}
                className="absolute size-10 cursor-pointer border-none opacity-0"
              />
              <span
                className="size-full rounded-full"
                style={{ backgroundColor: field.value || "#5865F2" }}
              />
            </label>
          </div>
        </Field>
      )}
    />
  )
}

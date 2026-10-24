import { z } from "zod";

type Meta = { id?: string; [key: string]: unknown };

class ApiSchemaNames extends z.core.$ZodRegistry<Meta> {
  override add<S extends z.core.$ZodType>(schema: S, meta: Meta = {}): this {
    const previous = meta.id ? this._idmap.get(meta.id) : undefined;
    if (previous) this.remove(previous);
    return super.add(schema, meta);
  }

  override get<S extends z.core.$ZodType>(schema: S): Meta | undefined {
    const own = super.get(schema);
    const shared = z.globalRegistry.get(schema);
    return own || shared ? { ...shared, ...own } : undefined;
  }
}

export const apiNames = new ApiSchemaNames();

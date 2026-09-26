import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ticketSchema = z.object({
  kind: z.enum(["banner", "roll_pdf"]),
  contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  size: z.number().int().positive(),
});

export const createUploadTicket = createServerFn({ method: "POST" })
  .validator((d: unknown) => ticketSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isPdf = data.kind === "roll_pdf";
    if (isPdf !== (data.contentType === "application/pdf")) throw new Error("Wrong file type");
    if (data.size > (isPdf ? 50 : 5) * 1024 * 1024) throw new Error("File too large");
    const bucket = isPdf ? "voter-raw-lists" : "candidate-photos";
    const ext = isPdf ? "pdf" : data.contentType === "image/png" ? "png" : "jpg";
    const path = `${isPdf ? "uploads" : "orders"}/${crypto.randomUUID()}.${ext}`;
    const { data: t, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { bucket, path, token: t.token };
  });

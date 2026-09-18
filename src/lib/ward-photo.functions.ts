import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const checkPhotoSchema = z.object({
  ward_ids: z.array(z.string().uuid()),
});

export const checkWardPhotoAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkPhotoSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // We only call this when wards are selected.
    if (!data.ward_ids.length) return { available: false, count: 0 };

    // @ts-ignore: RPC function not in generated types yet (Task 9)
    const { data: res, error } = await supabaseAdmin.rpc("ward_photo_availability", {
      p_ward_ids: data.ward_ids,
    });

    if (error) {
      console.error("ward_photo_availability error:", error);
      return { available: false, count: 0 };
    }

    return {
      available: res != null && res > 0 && res === data.ward_ids.length,
      count: res ?? 0,
    };
  });

import { z } from "zod";

const sendMessageSchema = z.object({
  content: z
    .string()
    .optional()
    .refine((val) => val && val.trim(). length > 0, {
      message: "Content is required"
    }),
});

export { sendMessageSchema };
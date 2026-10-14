import { z } from "zod";

export const Trigger = z.object({
  mode: z.enum(["time","beat","feature","hybrid"]),
  at: z.number().optional(),
  feature: z.string().optional(),
  gt: z.number().optional(),
  lt: z.number().optional(),
  pattern: z.string().optional(),
  cooldown: z.number().optional()
});

export const SignatureMoment = z.object({
  id: z.string(),
  type: z.enum(["emergence","transformation","intensity","dissolution","revelation"]),
  trigger: Trigger,
  targets: z.array(z.string()),
  action: z.string(),
  intensity: z.number().min(0).max(1),
  duration: z.number().min(0),
  notes: z.string().optional()
});

export const JourneyV12 = z.object({
  $schemaVersion: z.literal("1.2"),
  track_id: z.string(),
  title: z.string(),
  consciousnessLevel: z.number().min(0).max(1),
  userControl: z.boolean(),
  camera: z.object({
    behavior: z.enum(["float","locked","orbit","tunnel","grid_dolly","first_person"]),
    speed: z.number(),
    shake: z.number(),
    fov: z.number(),
    depthOfField: z.object({
      enabled: z.boolean(),
      focus: z.number(),
      aperture: z.number()
    })
  }),
  scene: z.object({
    scale: z.enum(["small","medium","large","vast"]),
    density: z.enum(["low","medium","high"]),
    background: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
    coverAesthetic: z.enum(["veiled","surgical"]).optional(),
    behavioralFlags: z.array(z.string())
  }),
  postProcessing: z.array(z.string()),
  flow: z.object({
    type: z.string(),
    params: z.record(z.any()),
    reactivity: z.record(z.any()),
    shaders: z.record(z.any())
  }),
  structure: z.object({
    type: z.string(),
    params: z.record(z.any()),
    reactivity: z.record(z.any()),
    shaders: z.record(z.any())
  }),
  core: z.object({
    enabled: z.boolean(),
    morph: z.string().optional(),
    reactivity: z.record(z.any()).optional()
  }),
  phases: z.array(z.object({
    name: z.string(),
    range: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
    notes: z.string().optional()
  })).min(2),
  signatureMoments: z.array(SignatureMoment).min(1),
  palette: z.object({
    primary: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
    secondary: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
    accent: z.string().regex(/^#([A-Fa-f0-9]{6})$/)
  })
});

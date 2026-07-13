import { expect, test, vi } from "vitest";
import { saveFinalResume } from "../../services/finalResume";
import { supabase } from "../../supabase";

vi.mock("../../supabase", () => {
  const eq = vi.fn().mockReturnThis();

  return {
    supabase: {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq,
        })),
      })),
    },
  };
});

test("saves the chosen resume", async () => {
  await saveFinalResume("execution-123", "user-456", "My final resume");

  expect(supabase.from).toHaveBeenCalledWith("tailor_resume_executions");
});

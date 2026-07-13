import { supabase } from "../supabase";

export async function saveFinalResume(executionId, userId, finalResumeText) {
  return supabase
    .from("tailor_resume_executions")
    .update({
      final_chosen_resume: finalResumeText,
    })
    .eq("id", executionId)
    .eq("user_id", userId);
}

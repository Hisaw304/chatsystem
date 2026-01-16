// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY // 🔒 REQUIRED
// );

// export default async function handler(req, res) {
//   // Optional: simple auth guard
//   if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   try {
//     // 1️⃣ Get all active sessions
//     const { data: sessions, error } = await supabase
//       .from("chat_sessions")
//       .select("id")
//       .eq("status", "active");

//     if (error) throw error;

//     // 2️⃣ Bill each session
//     for (const session of sessions) {
//       await supabase.rpc("bill_active_session", {
//         p_session_id: session.id,
//       });

//       await supabase.rpc("stop_session_if_out_of_funds", {
//         p_session_id: session.id,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       processed: sessions.length,
//     });
//   } catch (err) {
//     console.error("Billing cron error:", err);
//     return res.status(500).json({ error: err.message });
//   }
// }

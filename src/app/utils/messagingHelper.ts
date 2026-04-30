import { supabase } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface SendMessageDirectParams {
  text: string;
  propertyId: string;
  ownerId: string;
}

export async function sendMessageDirect({
  text,
  propertyId,
  ownerId,
}: SendMessageDirectParams): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return false;

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
        },
        body: JSON.stringify({
          text,
          propertyId,
          ownerId,
        }),
      }
    );

    const data = await response.json();
    console.log("sendMessageDirect response:", data);
    return data.success === true;
  } catch (e) {
    console.error("sendMessageDirect error:", e);
    return false;
  }
}
export async function GET() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return Response.json({ serverIP: data.ip });
  } catch {
    return Response.json({ error: "Could not fetch IP" });
  }
}

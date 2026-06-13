export async function GET() {
  const response = await fetch("https://api.ipify.org?format=json");
  const data = await response.json();
  return Response.json({ serverIP: data.ip });
}

// Vercel serverless function: proxies Roblox's public avatar thumbnail API.
// Roblox's thumbnails endpoint does not send CORS headers, so browsers can't
// call it directly. This runs server-side (no CORS restriction) and returns
// clean JSON: { avatars: { <userId>: <imageUrl|null> } }
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");

  const raw = (req.query.userIds || "").toString();
  const userIds = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .slice(0, 100);

  if (userIds.length === 0) {
    res.status(400).json({ error: "Provide userIds, e.g. ?userIds=1,2,3" });
    return;
  }

  try {
    const url =
      "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" +
      userIds.join(",") +
      "&size=150x150&format=Png&isCircular=true";
    const r = await fetch(url);
    const json = await r.json();

    const avatars = {};
    userIds.forEach((id) => (avatars[id] = null));
    (json.data || []).forEach((item) => {
      if (item.state === "Completed" && item.imageUrl) {
        avatars[item.targetId] = item.imageUrl;
      }
    });

    res.status(200).json({ avatars });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Roblox thumbnails API" });
  }
}

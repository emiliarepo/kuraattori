const USER_AGENT =
  "KuraattoriBot/0.1 (+https://kuraattori.emialis.com; hi@emialis.com)";
const MIN_INTERVAL_MS = 550; // stays under museot.fi's ~2 req/s budget

export class MuseotFiHttpClient {
  private lastRequestAt = 0;

  async getText(path: string): Promise<string> {
    const wait = this.lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastRequestAt = Date.now();

    const url = new URL(path, "https://museot.fi/");
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(
        `museot.fi request failed: ${response.status} ${url.toString()}`,
      );
    }
    return response.text();
  }
}

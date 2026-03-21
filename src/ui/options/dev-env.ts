export async function loadDevEnv(): Promise<{ uid?: string; sk?: string }> {
  try {
    const response = await fetch("../../../../evn");
    if (!response.ok) {
      return {};
    }

    const content = await response.text();
    const result: { uid?: string; sk?: string } = {};
    for (const line of content.split("\n")) {
      const [key, value] = line.split("=").map((part) => part.trim());
      if (key === "uid") result.uid = value;
      if (key === "sk") result.sk = value;
    }
    return result;
  } catch {
    return {};
  }
}

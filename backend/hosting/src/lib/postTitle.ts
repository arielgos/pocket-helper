function headingName(line: string) {
  return line
    .trim()
    .replace(/^(?:##\s+)?/, "")
    .replace(/\*\*/g, "")
    .replace(/:$/, "")
    .trim()
    .toLowerCase();
}

function findSocialPostHeading(lines: string[]) {
  const linkedInHeadingIndex = lines.findIndex(
    (line) => headingName(line) === "linkedin / tech twitter post",
  );
  if (linkedInHeadingIndex !== -1) return linkedInHeadingIndex;

  return lines.findIndex((line) => headingName(line) === "social media post");
}

export function getPostTitle(content = "", fallback = "Untitled post") {
  const lines = content.split(/\r?\n/);
  const headingIndex = findSocialPostHeading(lines);

  if (headingIndex === -1) return fallback;
  return (
    lines.slice(headingIndex + 1).find((line) => line.trim())?.trim() ??
    fallback
  );
}
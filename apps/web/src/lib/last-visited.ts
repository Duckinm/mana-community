const PREFIX = 'fos:last-visited:'

export function saveLastVisited(section: string, path: string) {
  try {
    sessionStorage.setItem(PREFIX + section, path)
  } catch {}
}

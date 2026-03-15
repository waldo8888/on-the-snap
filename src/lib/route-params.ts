export function readSingleRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export function resolveTournamentAdminRouteId(
  value: string | string[] | undefined,
  pathname: string
) {
  const directValue = readSingleRouteParam(value);
  if (directValue && directValue !== 'undefined' && directValue !== 'null') {
    return directValue;
  }

  const match = pathname.match(/\/admin\/tournaments\/([^/]+)/);
  return match?.[1] ?? '';
}

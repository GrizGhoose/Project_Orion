// Classification is source-owned and stateful; React uses these presentation selectors only.
export function statusFor(alerts, id, parameters) {
  const relevant = alerts.filter(
    (a) => a.astronautId === id && (!parameters || parameters.includes(a.parameter)),
  );
  return relevant.some((a) => a.severity === 'critical')
    ? 'critical'
    : relevant.length
      ? 'warning'
      : 'normal';
}

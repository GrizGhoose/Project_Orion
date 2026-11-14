export const SCENARIOS = [
  { id: 'normal', name: 'Normal EVA', description: 'Stable simulated physiology; no gated alert.' },
  {
    id: 'heart',
    name: 'Physical exertion',
    description:
      'HR rises with an explicit simulated 160 BPM workload expectation. SpO2 stays stable.',
  },
  {
    id: 'co2',
    name: 'Suit scrubber fault',
    description: 'Explicit verified simulated scrubber fault, independent of hypoxia.',
  },
  {
    id: 'oxygen',
    name: 'Low oxygen reserve only',
    description: 'Estimated reserve decreases; this does not invent a supply fault.',
  },
  {
    id: 'buddy',
    name: 'Buddy health alert',
    description: 'EV2 saturation falls through trend, persistence and immediate rules.',
  },
  {
    id: 'comms',
    name: 'Loss of communication',
    description: 'Independent operational link alert.',
  },
  {
    id: 'gradual',
    name: 'Gradual SpO2 decline',
    description: '1.2 percentage points/minute, evaluated with a multi-sample regression.',
  },
  {
    id: 'rapid',
    name: 'Rapid SpO2 decline',
    description: '4.8 percentage points/minute; faster escalation does not wait for persistence.',
  },
  {
    id: 'startle',
    name: 'Startle, stable SpO2',
    description:
      'Transient HR spike recovers toward baseline within about a minute; no hypoxia alert.',
  },
  {
    id: 'suit',
    name: 'Suit oxygen fault',
    description: 'Explicit oxygen flow fault with stable SpO2.',
  },
  {
    id: 'suit-decline',
    name: 'Suit fault + declining SpO2',
    description: 'Verified supply pressure fault combined with a downward saturation trend.',
  },
  {
    id: 'reaction',
    name: 'Failed reaction check',
    description: 'A scheduled stimulus receives an explicit simulated incorrect response.',
  },
  {
    id: 'disconnected',
    name: 'Sensor disconnection',
    description: 'SpO2 unavailable; data-quality alert instead of confirmed hypoxia.',
  },
  {
    id: 'invalid',
    name: 'Invalid physiological reading',
    description: 'Invalid SpO2 payload; no confirmed physiological emergency.',
  },
];

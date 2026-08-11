export const P = {
  green:       '#2D5016',
  greenDark:   '#1E3A0F',
  greenLight:  '#3D6B1F',
  greenMuted:  'rgba(45,80,22,0.08)',
  greenMuted2: 'rgba(45,80,22,0.14)',
  brown:       '#8B4513',
  brownMuted:  'rgba(139,69,19,0.10)',
  gold:        '#D4A017',
  goldLight:   '#F0BB30',
  goldMuted:   'rgba(212,160,23,0.15)',
  bg:          '#FAF7F0',
  bgCard:      '#FFFFFF',
  bgMuted:     '#F3EDE0',
  text:        '#1C1208',
  textMid:     '#4A3520',
  textMuted:   '#7A6048',
  border:      'rgba(45,80,22,0.18)',
  borderBrown: 'rgba(139,69,19,0.22)',
  red:         '#C0392B',
  redMuted:    'rgba(192,57,43,0.10)',
  teal:        '#1A6B5A',
  tealMuted:   'rgba(26,107,90,0.10)',
} as const

export const F = {
  heading: "'Lora', Georgia, serif",
  body:    "'Nunito', system-ui, sans-serif",
} as const

export type Screen =
  | 'home'
  | 'new-job-alert'
  | 'job-details'
  | 'tool-pickup'
  | 'en-route'
  | 'arrived'
  | 'work-in-progress'
  | 'work-completed'
  | 'return-tool'
  | 'return-inspection'
  | 'earnings'
  | 'job-history'
  | 'disputes'
  | 'profile'
  | 'availability'

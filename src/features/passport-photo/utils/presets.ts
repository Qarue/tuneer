export type PassportPreset = {
  id: string
  country: string
  label: string
  widthPx: number
  heightPx: number
  widthInches: number
  heightInches: number
  dpi: number
  description: string
  notes?: string
  defaultBackground: string
}

export const passportPresets: PassportPreset[] = [
  {
    id: 'usa-600',
    country: 'United States',
    label: 'USA (2x2 in, 600×600 px)',
    widthPx: 600,
    heightPx: 600,
    widthInches: 2,
    heightInches: 2,
    dpi: 300,
    description: 'Meets U.S. Department of State requirements for printed or digital submissions.',
    notes: 'Head height between 1" and 1 3/8" (25–35 mm). Submit JPEG between 54 KB and 10 MB.',
    defaultBackground: '#ffffff',
  },
  {
    id: 'india-1000',
    country: 'India',
    label: 'India (2x2 in, 1000×1000 px)',
    widthPx: 1000,
    heightPx: 1000,
    widthInches: 2,
    heightInches: 2,
    dpi: 500,
    description: 'Optimized for Indian passport Seva applications and most consular workflows.',
    notes: 'JPEG between 20 KB and 1 MB. Ensure face covers 70–80% of the frame.',
    defaultBackground: '#f9fbff',
  },
  {
    id: 'canada-840x1200',
    country: 'Canada',
    label: 'Canada (50×70 mm, 840×1180 px)',
    widthPx: 840,
    heightPx: 1180,
    widthInches: 1.97,
    heightInches: 2.76,
    dpi: 432,
    description: 'Aligns with Immigration, Refugees and Citizenship Canada (IRCC) guidance.',
    notes: 'Face length 31–36 mm from chin to crown. Provide matte finish when printed.',
    defaultBackground: '#f5f7ff',
  },
]

export const passportPresetMap = new Map(passportPresets.map(preset => [preset.id, preset]))

export const defaultPassportPresetId = passportPresets[0]?.id ?? ''

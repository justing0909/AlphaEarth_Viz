import Plot from 'react-plotly.js'

interface MetricData {
  experiment_id: string
  metric_name: string
  metric_value: number | null
  country: string
  model: string
}

interface CountryMapProps {
  data: MetricData[]
}

// ISO country codes mapping
const COUNTRY_ISO: Record<string, string> = {
  'Colombia': 'COL',
  'Armenia': 'ARM',
  'Brazil': 'BRA',
  'Peru': 'PER',
  'Ecuador': 'ECU',
  'Venezuela': 'VEN',
  'Bolivia': 'BOL',
  'Argentina': 'ARG',
  'Chile': 'CHL',
  'Mexico': 'MEX',
  'USA': 'USA',
  'United States': 'USA',
}

export default function CountryMap({ data }: CountryMapProps) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No data available</div>
  }

  // Group experiments by country
  const countryData: Record<string, { 
    count: number
    avgAccuracy: number
    accuracySum: number
    accuracyCount: number 
  }> = {}

  // Aggregate metrics by country
  data.forEach(row => {
    if (row.metric_name === 'accuracy' && row.metric_value !== null && row.country) {
      const country = row.country.trim()
      
      if (!countryData[country]) {
        countryData[country] = { count: 0, avgAccuracy: 0, accuracySum: 0, accuracyCount: 0 }
      }
      
      countryData[country].count++
      countryData[country].accuracySum += row.metric_value
      countryData[country].accuracyCount++
    }
  })

  console.log('Countries found in data:', Object.keys(countryData))

  // Calculate averages
  Object.keys(countryData).forEach(country => {
    countryData[country].avgAccuracy = countryData[country].accuracySum / countryData[country].accuracyCount
  })

  // Find max count excluding Armenia
  const maxCount = Math.max(...Object.entries(countryData)
    .filter(([country]) => country !== 'Armenia')
    .map(([_, stats]) => stats.count), 1)

  // Prepare data for choropleth
  const locations: string[] = []
  const z: number[] = [] // Accuracy values
  const text: string[] = []
  const customdata: any[] = []
  const marker_opacity: number[] = []

  Object.entries(countryData).forEach(([country, stats]) => {
    const iso = COUNTRY_ISO[country]
    if (!iso) {
      console.warn(`No ISO code for country: ${country}`)
      return
    }

    locations.push(iso)
    z.push(stats.avgAccuracy * 100) // Convert to percentage
    
    const opacity = country === 'Armenia' 
      ? 0.3 
      : Math.max(0.4, Math.min(1, stats.count / maxCount))
    
    marker_opacity.push(opacity)
    
    const label = country === 'Armenia' ? `${country} (Synthetic)` : country
    text.push(`${label}<br>Experiments: ${stats.count}<br>Avg Accuracy: ${(stats.avgAccuracy * 100).toFixed(1)}%`)
    customdata.push({ country, isSynthetic: country === 'Armenia' })
  })

  return (
    <div>
      <Plot
        data={[
          {
            type: 'choropleth',
            locations: locations,
            z: z,
            text: text,
            customdata: customdata,
            hovertemplate: '%{text}<extra></extra>',
            colorscale: [
              [0, '#ea4335'],
              [0.8, '#fbbc04'],
              [0.9, '#34a853'],
              [1, '#34a853']
            ],
            zmin: 0,
            zmax: 100,
            marker: {
              opacity: marker_opacity,
              line: {
                color: 'white',
                width: 1.5
              }
            },
            colorbar: {
              title: 'Accuracy<br>(%)',
              titleside: 'right',
              len: 0.6,
              thickness: 12,
              ticksuffix: '%',
              x: 1.02
            },
            // Force grey color for Armenia using locationmode
            locationmode: 'ISO-3'
          } as any
        ]}
        layout={{
          geo: {
            scope: 'world',
            projection: { type: 'natural earth' },
            showland: true,
            landcolor: '#fafafa',
            showocean: true,
            oceancolor: '#e8f4f8',
            showcountries: true,
            countrycolor: '#e0e0e0',
            countrywidth: 0.5,
            showframe: false,
            bgcolor: '#fff'
          },
          height: 600,
          margin: { l: 0, r: 40, t: 10, b: 10 },
          paper_bgcolor: 'transparent'
        }}
        style={{ width: '100%' }}
        config={{ 
          responsive: true,
          displayModeBar: false
        }}
      />
      <div style={{ marginTop: 12, fontSize: 11, color: '#5f6368' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Accuracy:</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#34a853', marginRight: 2 }} />
            <span style={{ fontSize: 10 }}>&gt;90%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#fbbc04', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 10 }}>80-90%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ea4335', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 10 }}>&lt;80%</span>
          </div>
          <div style={{ color: '#80868b', fontSize: 11 }}>
            • Opacity = experiment count • 
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#9e9e9e', margin: '0 4px' }} />
            = Synthetic
          </div>
        </div>
      </div>
    </div>
  )
}
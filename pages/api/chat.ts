import type { NextApiRequest, NextApiResponse } from 'next'

// Valid class names from your data
const VALID_CLASSES = [
  'Water',
  'Tree cover',
  'Mangroves',
  'Shrubland',
  'Cropland',
  'Built-up',
  'Bare/sparse',
  'Snow/ice',
  'Grassland',
  'Wetland',
  'Herb. wetland'
]

// Geocode location using Nominatim
async function geocodeLocation(location: string): Promise<[number, number, number, number] | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'AlphaEarth-Dashboard/1.0'
        }
      }
    )
    
    const data = await response.json()
    
    if (data.length === 0) return null
    
    const result = data[0]
    const [south, north, west, east] = result.boundingbox.map(Number)
    
    return [west, south, east, north]
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Call Groq API instead of Ollama
async function processQuery(
  message: string,
  lastConfirmed?: { class1: string, class2: string, location: string } | null
): Promise<{ 
  class1: string | null
  class2: string | null
  location: string | null
  needsConfirmation: boolean
  responseMessage?: string
}> {
  try {
    const validClassList = VALID_CLASSES.join(', ')
    
    const contextSection = lastConfirmed 
      ? `\n\nIMPORTANT CONTEXT - Previous confirmed comparison:
- Classes: ${lastConfirmed.class1} vs ${lastConfirmed.class2}
- Location: ${lastConfirmed.location}

If the user refers to "here", "there", "same place", "this location", etc., use: "${lastConfirmed.location}"
If the user says "same classification", "same comparison", etc., use: "${lastConfirmed.class1}" and "${lastConfirmed.class2}"
If the user says "show me X vs Y there/here", use their new classes but previous location.`
      : ''

    const prompt = `You are extracting information from a land cover classification request.

VALID LAND COVER CLASSES (you must map user input to these exact names):
${validClassList}

MAPPING RULES:
- "water", "water bodies", "ocean", "sea" → "Water"
- "trees", "forest", "forests" → "Tree cover"  
- "mangrove", "mangroves" → "Mangroves"
- "shrubs", "shrubland" → "Shrubland"
- "crops", "cropland", "agriculture", "farmland" → "Cropland"
- "urban", "city", "buildings", "developed", "urban areas" → "Built-up"
- "bare", "barren", "sparse", "rural", "rural areas" → "Bare/sparse"
- "snow", "ice" → "Snow/ice"
- "grass", "grassland" → "Grassland"
- "wetlands", "marsh", "swamp" → "Wetland"${contextSection}

User query: "${message}"

Respond with ONLY a JSON object:
{
  "class1": "exact class name from valid list or null",
  "class2": "exact class name from valid list or null",
  "location": "location name or null"
}

IMPORTANT: 
- Use EXACT class names from the valid list above
- Apply the mapping rules
- Use context from previous comparison if user refers to it
- If you cannot determine something with confidence, use null`

    console.log('=== GROQ API REQUEST ===')
    console.log('API Key exists:', !!process.env.GROQ_API_KEY)
    console.log('API Key prefix:', process.env.GROQ_API_KEY?.substring(0, 10))

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-3b-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts structured data from natural language queries. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    })

    console.log('Groq response status:', response.status)
    console.log('Groq response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('=== GROQ API ERROR ===')
      console.error('Status:', response.status)
      console.error('Error body:', errorText)
      throw new Error(`Groq API failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('=== GROQ API SUCCESS ===')
    console.log('Full response:', JSON.stringify(data, null, 2))
    console.log('Raw content:', data.choices[0].message.content)
    
    const extracted = JSON.parse(data.choices[0].message.content)
    console.log('Parsed extraction:', extracted)
    
    return {
      class1: extracted.class1,
      class2: extracted.class2,
      location: extracted.location,
      needsConfirmation: true
    }
  } catch (error) {
    console.error('=== GROQ EXTRACTION ERROR ===')
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Full error:', error)
    return { 
      class1: null, 
      class2: null, 
      location: null, 
      needsConfirmation: false,
      responseMessage: "I'm having trouble processing that. Could you try rephrasing?"
    }
  }
}
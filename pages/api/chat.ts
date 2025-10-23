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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-3b-preview', // Fast and free
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error:', errorText)
      throw new Error(`Groq API failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Groq raw response:', data.choices[0].message.content)
    
    const extracted = JSON.parse(data.choices[0].message.content)
    console.log('Parsed extraction:', extracted)
    
    return {
      class1: extracted.class1,
      class2: extracted.class2,
      location: extracted.location,
      needsConfirmation: true
    }
  } catch (error) {
    console.error('Groq extraction error:', error)
    return { 
      class1: null, 
      class2: null, 
      location: null, 
      needsConfirmation: false,
      responseMessage: "I'm having trouble processing that. Could you try rephrasing?"
    }
  }
}

// Check if message is affirmative
function isAffirmative(message: string): boolean {
  const lower = message.toLowerCase().trim()
  const affirmatives = ['yes', 'yeah', 'yep', 'correct', 'right', 'sure', 'okay', 'ok', 'yup', 'affirmative', 'that\'s right', 'exactly', 'sounds good', 'perfect', 'great']
  return affirmatives.some(word => 
    lower === word || 
    lower.startsWith(word + ' ') || 
    lower.endsWith(' ' + word) ||
    lower.startsWith(word + ',') ||
    lower.startsWith(word + '!')
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, pendingComparison, lastConfirmedComparison } = req.body

  console.log('Received message:', message)
  console.log('Pending comparison:', pendingComparison)
  console.log('Last confirmed:', lastConfirmedComparison)

  // Only treat as confirmation if pending exists AND doesn't have bbox yet
  const isAwaitingConfirmation = pendingComparison && !pendingComparison.bbox

  // If there's a pending comparison (awaiting confirmation), check response
  if (isAwaitingConfirmation) {
    console.log('In confirmation mode')
    if (isAffirmative(message)) {
      console.log('User confirmed, geocoding:', pendingComparison.location)
      const bbox = await geocodeLocation(pendingComparison.location)
      
      console.log('Geocoding result:', bbox)
      
      if (!bbox) {
        return res.status(200).json({
          message: `I couldn't find the location "${pendingComparison.location}". Could you try a different location name?`,
          pendingComparison: null
        })
      }

      console.log('Returning confirmed bbox for', pendingComparison.location)
      
      return res.status(200).json({
        message: `Great! Here's the bounding box for ${pendingComparison.location}. The classification will compare ${pendingComparison.class1} vs ${pendingComparison.class2}.`,
        confirmed: true,
        pendingComparison: pendingComparison,
        bbox: bbox
      })
    } else {
      // Not affirmative - treat as new query instead of rejection
      console.log('User response was not affirmative, treating as new query with context')
      // Fall through to extraction below (don't return here)
    }
  }

  // Extract entities (LLM handles all context resolution)
  const result = await processQuery(message, lastConfirmedComparison)
  
  console.log('processQuery result:', result)
  
  if (result.responseMessage) {
    return res.status(200).json({
      message: result.responseMessage
    })
  }

  if (!result.class1 || !result.class2 || !result.location) {
    return res.status(200).json({
      message: "I couldn't quite understand that. Could you specify two land cover types and a location? For example: 'Show me mangroves vs water in the Florida Keys'\n\nValid classes: " + VALID_CLASSES.join(', ')
    })
  }

  // Validate classes are in our valid list
  if (!VALID_CLASSES.includes(result.class1) || !VALID_CLASSES.includes(result.class2)) {
    const invalid = []
    if (!VALID_CLASSES.includes(result.class1)) invalid.push(result.class1)
    if (!VALID_CLASSES.includes(result.class2)) invalid.push(result.class2)
    
    return res.status(200).json({
      message: `I extracted these classes but they don't match our valid types: ${invalid.join(', ')}. Valid classes are: ${VALID_CLASSES.join(', ')}`
    })
  }

  // Ask for confirmation
  return res.status(200).json({
    message: `Okay! Just to make sure, you would like to run a pairwise comparison classification of ${result.class1} versus ${result.class2} in the region of ${result.location}, correct?`,
    pendingComparison: {
      class1: result.class1,
      class2: result.class2,
      location: result.location
    }
  })
}
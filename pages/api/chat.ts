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

// Map class names to codes for the notebook
function mapClassToCode(className: string): number {
  const mapping: Record<string, number> = {
    'Tree cover': 10,
    'Shrubland': 20,
    'Grassland': 30,
    'Cropland': 40,
    'Built-up': 50,
    'Bare/sparse': 60,
    'Snow/ice': 70,
    'Water': 80,
    'Herb. wetland': 90,
    'Mangroves': 95,
    'Wetland': 90
  }
  return mapping[className] || 10
}

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
        model: 'groq/compound',
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add health check for debugging
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok',
      hasGroqKey: !!process.env.GROQ_API_KEY,
      keyPrefix: process.env.GROQ_API_KEY?.substring(0, 7) || 'missing'
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, pendingComparison, lastConfirmedComparison } = req.body

    // If there's a pending comparison without bbox, this is a confirmation request
    if (pendingComparison && !pendingComparison.bbox) {
      const lowerMessage = message.toLowerCase()
      
      // Check for confirmation
      if (lowerMessage.includes('yes') || lowerMessage.includes('correct') || lowerMessage.includes('right')) {
        // Get bbox for the location
        const bbox = await geocodeLocation(pendingComparison.location)
        
        if (bbox) {
          const classACode = mapClassToCode(pendingComparison.class1)
          const classBCode = mapClassToCode(pendingComparison.class2)
          
          // Format bbox for easy copy-paste
          const bboxFormatted = `[${bbox[0].toFixed(4)}, ${bbox[1].toFixed(4)}, ${bbox[2].toFixed(4)}, ${bbox[3].toFixed(4)}]`
          
          const instructions = `Great! While unfortunately I can't complete this classification for you yet, I will recommend you fill out the Jupyter notebook.

Here's what you need to enter in the notebook to accomplish your classification:

📍 Region Selection:
- Draw a rectangle on the map with these coordinates:
  - Min Longitude: ${bbox[0].toFixed(4)}
  - Min Latitude: ${bbox[1].toFixed(4)}
  - Max Longitude: ${bbox[2].toFixed(4)}
  - Max Latitude: ${bbox[3].toFixed(4)}

🏞️ Land Cover Classes:
- Class A: ${pendingComparison.class1} (Select code: ${classACode})
- Class B: ${pendingComparison.class2} (Select code: ${classBCode})

📊 Algorithm Settings:
You can keep the default settings or adjust as needed.

Once you've entered these values, click "RUN ANALYSIS" in the notebook!`

          return res.status(200).json({
            message: instructions,
            confirmed: true,
            pendingComparison: pendingComparison,
            bbox: bbox,
            analysisParams: {
              classACode,
              classBCode,
              bbox,
              bboxFormatted,
              location: pendingComparison.location
            },
            showNotebookButton: true
          })
        } else {
          return res.status(200).json({
            message: `I found the location but couldn't get the exact boundaries. Could you try a more specific location?`,
            pendingComparison: null
          })
        }
      }
      
      // Check for rejection
      if (lowerMessage.includes('no') || lowerMessage.includes('wrong') || lowerMessage.includes('incorrect')) {
        return res.status(200).json({
          message: `I understand. Could you please rephrase what you're looking for?`,
          pendingComparison: null
        })
      }
    }

    // Extract information from the query
    const extracted = await processQuery(message, lastConfirmedComparison)

    // If extraction failed
    if (extracted.responseMessage) {
      return res.status(200).json({
        message: extracted.responseMessage,
        pendingComparison: null
      })
    }

    // Check if we have all required information
    if (extracted.class1 && extracted.class2 && extracted.location) {
      // We have everything - ask for confirmation
      return res.status(200).json({
        message: `I'll show you ${extracted.class1} vs ${extracted.class2} in ${extracted.location}. Is this correct?`,
        pendingComparison: {
          class1: extracted.class1,
          class2: extracted.class2,
          location: extracted.location
        }
      })
    }

    // Missing information - ask for what's missing
    const missing: string[] = []
    if (!extracted.class1) missing.push('first land cover class')
    if (!extracted.class2) missing.push('second land cover class')
    if (!extracted.location) missing.push('location')

    return res.status(200).json({
      message: `I need more information. Please specify: ${missing.join(', ')}.`,
      pendingComparison: null
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Sorry, something went wrong. Please try again.'
    })
  }
}